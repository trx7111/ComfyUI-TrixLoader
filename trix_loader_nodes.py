import os
os.environ["ALBUMENTATIONS_DISABLE_VERSION_CHECK"] = "1"
os.environ["NO_ALBUMENTATIONS_UPDATE"] = "1"

# Pre-configure Hugging Face mirror if system locale is Russian
try:
    import locale
    loc = locale.getdefaultlocale()[0]
    if loc and loc.lower().startswith("ru"):
        os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
except Exception:
    pass

import torch
import numpy as np
import json
from PIL import Image, ImageOps, ImageFilter, ImageDraw, ImageEnhance
import folder_paths
import node_helpers
from io import BytesIO
from server import PromptServer 
import base64
import asyncio
from contextlib import nullcontext

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False
any_typ = AnyType("*")

class TrixLoadImageAIO:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        aio_dir = os.path.join(input_dir, "aio_input")
        if not os.path.exists(aio_dir):
            try:
                os.makedirs(aio_dir, exist_ok=True)
            except:
                pass
        
        valid_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tiff', '.tif')
        
        files = [
            f for f in os.listdir(input_dir)
            if os.path.isfile(os.path.join(input_dir, f))
            and f.lower().endswith(valid_extensions)
            and not f.lower().startswith("aio_")
        ]
        
        if os.path.exists(aio_dir):
            aio_files = [f"aio_input/{f}" for f in os.listdir(aio_dir) if os.path.isfile(os.path.join(aio_dir, f)) and f.lower().endswith(valid_extensions)]
            files.extend(aio_files)
            
        return {
            "required": {
                "image": (sorted(files),),
                "width": ("INT", {"default": 1024, "min": 16, "max": 16384}),
                "height": ("INT", {"default": 1024, "min": 16, "max": 16384}),
                "pad_left": ("INT", {"default": 0, "min": 0, "max": 16384, "step": 1}),
                "pad_top": ("INT", {"default": 0, "min": 0, "max": 16384, "step": 1}),
                "pad_right": ("INT", {"default": 0, "min": 0, "max": 16384, "step": 1}),
                "pad_bottom": ("INT", {"default": 0, "min": 0, "max": 16384, "step": 1}),
                "upscale_method": (["nearest-exact", "bilinear", "area", "bicubic", "lanczos"], {"default": "nearest-exact"}),
                "keep_proportion": (["stretch", "resize", "scale_by", "pad", "pad_edge_pixel", "crop", "pad_for_outpainting"], {"default": "resize"}),
                "crop_position": (["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"], {"default": "center"}),
                "scale_by": ("FLOAT", {"default": 1.0, "min": 0.01, "max": 64.0, "step": 0.01}),
                "condition": (["always", "downscale if bigger", "upscale if smaller", "if bigger area", "if smaller area"], {"default": "always"}),
                "feathering": ("INT", {"default": 0, "min": 0, "max": 250, "step": 1}),
                "divisible_by": ("INT", {"default": 8, "min": 1, "max": 256, "step": 1}),
                "enable_resize": ("BOOLEAN", {"default": False}),
                "mode": (["Preview", "Mask", "Filter", "Resize"], {"default": "Preview"}),
                "mask_data": ("STRING", {"default": ""}),
                "crop_data": ("STRING", {"default": "{}"}),
                
                # ==== Camera Raw Settings ====
                "cr_enable": ("BOOLEAN", {"default": False}),
                "cr_offset": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_exp": ("INT", {"default": 0, "min": -200, "max": 200, "step": 1}),
                "cr_cont": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_high": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_shad": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_white": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_black": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_temp": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_tint": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_vibrance": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_colorfulness": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_sat": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_tex": ("INT", {"default": 0, "min": -200, "max": 200, "step": 1}),
                "cr_clar": ("INT", {"default": 0, "min": -200, "max": 200, "step": 1}),
                "cr_dehz": ("INT", {"default": 0, "min": -150, "max": 150, "step": 1}),
                "cr_sharp": ("INT", {"default": 0, "min": 0, "max": 150, "step": 1}),
                "cr_denoise": ("INT", {"default": 0, "min": 0, "max": 150, "step": 1}),
                "cr_blur": ("INT", {"default": 0, "min": 0, "max": 150, "step": 1}),
                "cr_surface_blur": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1}),
                "cr_grain": ("INT", {"default": 0, "min": 0, "max": 150, "step": 1}),
                "cr_vignette": ("INT", {"default": 0, "min": 0, "max": 150, "step": 1}),
                "cr_sketch_kernel_size": ("INT", {"default": 0, "min": 0, "max": 25, "step": 1}),
                "cr_sketch_sigma": ("FLOAT", {"default": 1.4, "min": 0.1, "max": 5.0, "step": 0.05}),
                "cr_sketch_k_sigma": ("FLOAT", {"default": 1.6, "min": 1.0, "max": 5.0, "step": 0.05}),
                "cr_sketch_epsilon": ("FLOAT", {"default": -0.03, "min": -0.2, "max": 0.2, "step": 0.005}),
                "cr_sketch_phi": ("FLOAT", {"default": 10.0, "min": 1.0, "max": 50.0, "step": 1.0}),
                "cr_sketch_gamma": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 1.0, "step": 0.005}),
                "cr_sketch_color": (["gray", "rgb"], {"default": "gray"}),
                "cr_pixel_colors": ("INT", {"default": 128, "min": 2, "max": 256, "step": 1}),
                "cr_pixel_dot_size": ("INT", {"default": 0, "min": 0, "max": 32, "step": 1}),
                "cr_pixel_outline": ("INT", {"default": 0, "min": 0, "max": 9, "step": 1}),
                "cr_pixel_smoothing": ("INT", {"default": 0, "min": 0, "max": 10, "step": 1}),
                "cr_pixel_algo": (["kmeans", "dithering", "kmeans with dithering"], {"default": "kmeans"}),
                
                # ==== Halftone Settings ====
                "cr_ht_size": ("INT", {"default": 0, "min": 0, "max": 50, "step": 1}),
                "cr_ht_angle": ("INT", {"default": 15, "min": -180, "max": 180, "step": 1}),
                "cr_ht_contrast": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_ht_brightness": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_ht_dither": ("INT", {"default": 100, "min": 0, "max": 100, "step": 1}),
                "cr_ht_inverse": ("BOOLEAN", {"default": False}),
                "cr_ht_shape": (["Dot", "Square Dot", "Line", "Rhomboid", "Cross Cut", "Saddle", "Random Dots"], {"default": "Dot"}),
                
                # ==== Sharpen Settings ====
                "cr_usm_amount": ("INT", {"default": 0, "min": 0, "max": 200, "step": 1}),
                "cr_usm_radius": ("INT", {"default": 1, "min": 1, "max": 10, "step": 1}),
                "cr_usm_threshold": ("INT", {"default": 0, "min": 0, "max": 255, "step": 1}),
                "cr_lap_amount": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "cr_lap_kernel": (["8-neighbor", "4-neighbor"], {"default": "8-neighbor"}),
                
                # ==== Color Filter Settings ====
                "cr_cf_hue": ("INT", {"default": 0, "min": 0, "max": 360, "step": 1}),
                "cr_cf_density": ("INT", {"default": 0, "min": 0, "max": 255, "step": 1}),
                "cr_cf_preserve": ("INT", {"default": 50, "min": 0, "max": 100, "step": 1}),
                
                # ==== Posterize Settings ====
                "cr_post_enable": ("BOOLEAN", {"default": False}),
                "cr_post_levels": ("INT", {"default": 4, "min": 2, "max": 32, "step": 1}),
                "cr_post_mode": (["RGB", "Luminance"], {"default": "RGB"}),
                "cr_post_dither_mode": (["None", "Bayer", "Random", "Floyd-Steinberg", "Atkinson"], {"default": "None"}),
                "cr_post_dither": ("INT", {"default": 0, "min": 0, "max": 100, "step": 1}),
                
                # ==== Levels Settings ====
                "cr_lvl_channel": (["rgb", "r", "g", "b"], {"default": "rgb"}),
                "cr_lvl_in_black": ("INT", {"default": 0, "min": 0, "max": 254, "step": 1}),
                "cr_lvl_in_white": ("INT", {"default": 255, "min": 1, "max": 255, "step": 1}),
                "cr_lvl_gamma": ("FLOAT", {"default": 1.0, "min": 0.1, "max": 10.0, "step": 0.01}),
                "cr_lvl_out_black": ("INT", {"default": 0, "min": 0, "max": 254, "step": 1}),
                "cr_lvl_out_white": ("INT", {"default": 255, "min": 1, "max": 255, "step": 1}),
                
                # ==== Color Balance Settings ====
                "cr_cb_shad_r": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_shad_g": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_shad_b": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_mid_r": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_mid_g": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_mid_b": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_high_r": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_high_g": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                "cr_cb_high_b": ("INT", {"default": 0, "min": -100, "max": 100, "step": 1}),
                
                # ==== Advanced Blur Settings ====
                "cr_blur_mode": (["Gaussian", "Average", "Edge Average", "Surface Blur"], {"default": "Gaussian"}),
                "cr_blur_radius": ("INT", {"default": 0, "min": 0, "max": 50, "step": 1}),
                
                # ==== HSL Settings ====
                "hsl_active": ("BOOLEAN", {"default": False}),
                "hsl_data": ("STRING", {"default": "{}"}),
                "curve_active": ("BOOLEAN", {"default": False}),
                "curve_data": ("STRING", {"default": "{}"}),
                "trix_uuid": ("STRING", {"default": ""}),
            },
            "optional": {
                "in_image": ("IMAGE",),
                "in_mask": ("MASK",),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID" 
            }
        }

    CATEGORY = "TrixLoader 🪬"
    DESCRIPTION = """TABS CONTROLS: 
❂ COLOR GRADING [FILTER]
➥ Dbl-Click tab: Open full-screen Trix Camera Raw
➥ Toggle "Enable Filter" to apply RAW, HSL, Curves, or effects during generation
➥ Click "Live Camera Raw" for visual color adjustments

✎ MASKING [MASK]
➥ Dbl-Click tab: Open full-screen Trix Mask Editor
➥ Click "Open Advanced Mask Editor" for in-tab tools
➥ Color Swapper Circle: Changes brush color & recolors existing mask pixels
➥ Alt + RMB (Drag): Resize Brush size and Hardness on node canvas

回 RESIZING & CROPPING [RESIZE] 
➥ Toggle "Enable Resize" to apply dimensions & outpainting during generation
➥ Dbl-Click tab / Click "Open CPO Editor": Open full-screen Trix Crop/Pad/Outpaint
➥ Crop Position: Click for interactive 5-direction alignment grid
➥ Outpaint Feathering: Set edge blending radius

★ PRO TIP: Right-click the node to directly Copy/Paste Images and Masks!"""

    RETURN_TYPES = ("IMAGE", "MASK", "IMAGE")
    RETURN_NAMES = ("IMAGE", "MASK", "↓ original_input")
    FUNCTION = "process"
    OUTPUT_NODE = True

    @classmethod
    def VALIDATE_INPUTS(s, image, **kwargs):
        return True

    @staticmethod
    def rgb_to_hsl(rgb):
        rgb = np.clip(rgb, 0.0, 1.0)
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        maxc = np.max(rgb, axis=-1)
        minc = np.min(rgb, axis=-1)
        l = (maxc + minc) / 2.0
        
        s = np.zeros_like(l)
        h = np.zeros_like(l)
        
        mask = maxc != minc
        d = np.zeros_like(l)
        d[mask] = maxc[mask] - minc[mask]
        
        denom = np.where(l > 0.5, 2.0 - maxc - minc, maxc + minc)
        denom = np.where(denom == 0, 1.0, denom) 
        s[mask] = d[mask] / denom[mask]
        s = np.clip(s, 0.0, 1.0)
        
        idx_r = mask & (maxc == r)
        idx_g = mask & (maxc == g) & (~idx_r)
        idx_b = mask & (maxc == b) & (~idx_r) & (~idx_g)
        
        d_safe = np.where(d == 0, 1.0, d)
        h[idx_r] = (g[idx_r] - b[idx_r]) / d_safe[idx_r] + np.where(g[idx_r] < b[idx_r], 6.0, 0.0)
        h[idx_g] = (b[idx_g] - r[idx_g]) / d_safe[idx_g] + 2.0
        h[idx_b] = (r[idx_b] - g[idx_b]) / d_safe[idx_b] + 4.0
        
        h = (h / 6.0) * 360.0
        h = np.mod(h, 360.0)
        return np.stack([h, s, l], axis=-1)

    @staticmethod
    def hsl_to_rgb(hsl):
        hsl = np.clip(hsl, [0.0, 0.0, 0.0], [360.0, 1.0, 1.0])
        h, s, l = hsl[..., 0] / 360.0, hsl[..., 1], hsl[..., 2]
        
        def hue_to_rgb(p, q, t):
            t = np.where(t < 0.0, t + 1.0, t)
            t = np.where(t > 1.0, t - 1.0, t)
            
            res = np.empty_like(t)
            m1 = t < 1.0/6.0
            m2 = (~m1) & (t < 0.5)
            m3 = (~m1) & (~m2) & (t < 2.0/3.0)
            m4 = (~m1) & (~m2) & (~m3)
            
            res[m1] = p[m1] + (q[m1] - p[m1]) * 6.0 * t[m1]
            res[m2] = q[m2]
            res[m3] = p[m3] + (q[m3] - p[m3]) * (2.0/3.0 - t[m3]) * 6.0
            res[m4] = p[m4]
            return res
            
        q = np.where(l < 0.5, l * (1.0 + s), l + s - l * s)
        p = 2.0 * l - q
        
        r = np.where(s == 0, l, hue_to_rgb(p, q, h + 1.0/3.0))
        g = np.where(s == 0, l, hue_to_rgb(p, q, h))
        b = np.where(s == 0, l, hue_to_rgb(p, q, h - 1.0/3.0))
        
        return np.clip(np.stack([r, g, b], axis=-1), 0.0, 1.0)

    @staticmethod
    def build_curve_lut(points):
        default_points = [(0.0, 0.0), (255.0, 255.0)]
        parsed_points = []

        if isinstance(points, list):
            for p in points:
                if not isinstance(p, dict):
                    continue
                try:
                    x = float(p.get("x", 0))
                    y = float(p.get("y", 0))
                except Exception:
                    continue
                parsed_points.append((float(np.clip(x, 0, 255)), float(np.clip(y, 0, 255))))

        if len(parsed_points) < 2:
            parsed_points = default_points.copy()

        parsed_points.sort(key=lambda pt: pt[0])

        dedup_points = []
        for pt in parsed_points:
            if dedup_points and abs(dedup_points[-1][0] - pt[0]) < 1e-6:
                dedup_points[-1] = pt
            else:
                dedup_points.append(pt)
        parsed_points = dedup_points

        if parsed_points[0][0] > 0:
            parsed_points.insert(0, (0.0, parsed_points[0][1]))
        if parsed_points[-1][0] < 255:
            parsed_points.append((255.0, parsed_points[-1][1]))

        n = len(parsed_points)
        if n == 2:
            xs = np.array([p[0] for p in parsed_points], dtype=np.float32)
            ys = np.array([p[1] for p in parsed_points], dtype=np.float32)
            lut = np.interp(np.arange(256, dtype=np.float32), xs, ys)
            return np.clip(lut, 0, 255).astype(np.uint8)

        # Monotone Cubic Spline (Fritsch-Carlson algorithm) in Python
        xs = np.array([p[0] for p in parsed_points], dtype=np.float32)
        ys = np.array([p[1] for p in parsed_points], dtype=np.float32)

        dx = xs[1:] - xs[:-1]
        dy = ys[1:] - ys[:-1]
        ms = dy / np.where(dx == 0.0, 1.0, dx)

        # Tangents
        c1s = np.zeros(n, dtype=np.float32)
        c1s[0] = ms[0]
        for i in range(1, n - 1):
            m = ms[i - 1]
            next_m = ms[i]
            if m * next_m <= 0.0:
                c1s[i] = 0.0
            else:
                w1 = 2.0 * dx[i] + dx[i - 1]
                w2 = dx[i] + 2.0 * dx[i - 1]
                c1s[i] = (w1 + w2) / (w1 / m + w2 / next_m)
        c1s[n - 1] = ms[n - 2]

        # Coefficients for Hermite spline
        c2s = np.zeros(n - 1, dtype=np.float32)
        c3s = np.zeros(n - 1, dtype=np.float32)
        for i in range(n - 1):
            c1 = c1s[i]
            m = ms[i]
            inv_dx = 1.0 / np.where(dx[i] == 0.0, 1.0, dx[i])
            common = c1 + c1s[i + 1] - 2.0 * m
            c2s[i] = (m - c1 - common) * inv_dx
            c3s[i] = common * inv_dx * inv_dx

        lut = np.zeros(256, dtype=np.float32)
        for x in range(256):
            i = 0
            while i < n - 2 and x > xs[i + 1]:
                i += 1
            diff = x - xs[i]
            y = ys[i] + c1s[i] * diff + c2s[i] * (diff ** 2) + c3s[i] * (diff ** 3)
            lut[x] = y

        return np.clip(lut, 0, 255).astype(np.uint8)

    @staticmethod
    def curve_is_active(curve_state):
        if not isinstance(curve_state, dict):
            return False
        default_line = [(0, 0), (255, 255)]

        for ch in ["rgb", "r", "g", "b"]:
            points = curve_state.get(ch, [])
            if not isinstance(points, list) or len(points) < 2:
                continue
            normalized = []
            for p in points:
                if not isinstance(p, dict):
                    continue
                normalized.append((
                    int(np.clip(round(float(p.get("x", 0))), 0, 255)),
                    int(np.clip(round(float(p.get("y", 0))), 0, 255))
                ))
            normalized.sort(key=lambda pt: pt[0])
            if len(normalized) >= 2 and normalized != default_line:
                return True
        return False

    @staticmethod
    def apply_lightness_like_photoshop(lightness, delta):
        delta = np.clip(delta, -1.0, 1.0)
        positive = delta >= 0
        out = np.where(
            positive,
            lightness + (1.0 - lightness) * delta,
            lightness + lightness * delta
        )
        return np.clip(out, 0.0, 1.0)

    @staticmethod
    def apply_detail_pass(arr, radius, amount, midtone_only=False):
        if abs(amount) < 1e-6:
            return arr

        base_img = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8))
        blur_img = base_img.filter(ImageFilter.GaussianBlur(radius=max(0.1, float(radius))))
        blur_arr = np.array(blur_img).astype(np.float32) / 255.0

        if amount < 0:
            blend_factor = min(0.8, -amount)
            if midtone_only:
                luma = np.dot(arr[..., :3], [0.2126, 0.7152, 0.0722])
                mask = 1.0 - np.clip(np.abs(luma - 0.5) * 2.0, 0.0, 1.0)
                mask = np.power(mask, 1.25)[..., None]
                blend_factor = blend_factor * mask
            arr = arr + (blur_arr - arr) * blend_factor
        else:
            diff = arr - blur_arr
            if midtone_only:
                luma = np.dot(arr[..., :3], [0.2126, 0.7152, 0.0722])
                mask = 1.0 - np.clip(np.abs(luma - 0.5) * 2.0, 0.0, 1.0)
                mask = np.power(mask, 1.25)[..., None]
                diff = diff * mask
            arr = arr + diff * float(amount)
        return np.clip(arr, 0.0, 1.0)

    @staticmethod
    def apply_clarity(arr, amount, scale_ratio=1.0):
        if amount == 0:
            return arr
        base_img = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8))
        blur_img = base_img.filter(ImageFilter.GaussianBlur(radius=max(0.1, 20.0 * scale_ratio)))
        blur_arr = np.array(blur_img).astype(np.float32) / 255.0
        
        factor = amount / 200.0
        luma = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
        weight = 1.0 - np.power(np.abs(luma - 0.5) * 2.0, 2.0)
        
        if factor > 0:
            arr = arr + (arr - blur_arr) * (factor * weight * 0.8)
        else:
            arr = arr + (blur_arr - arr) * ((-factor) * weight * 0.8)
        return np.clip(arr, 0.0, 1.0)

    def apply_camera_raw(self, img, kwargs):
        cr_enable = kwargs.get("cr_enable", False)
        hsl_active = kwargs.get("hsl_active", False)
        curve_active = kwargs.get("curve_active", False)
        
        if not cr_enable and not hsl_active and not curve_active:
            return img

        def safe_int(val, default=0):
            if val is None:
                return default
            try:
                return int(val)
            except:
                try:
                    return int(float(val))
                except:
                    return default

        def safe_float(val, default=0.0):
            if val is None:
                return default
            try:
                return float(val)
            except:
                return default

        offset = safe_int(kwargs.get("cr_offset", 0))
        exp = safe_int(kwargs.get("cr_exp", 0))
        cont = safe_int(kwargs.get("cr_cont", 0))
        sat = safe_int(kwargs.get("cr_sat", 0))
        sharp = safe_int(kwargs.get("cr_sharp", 0))
        denoise = safe_int(kwargs.get("cr_denoise", 0))
        clar = safe_int(kwargs.get("cr_clar", 0))
        tex = safe_int(kwargs.get("cr_tex", 0))
        blur = safe_int(kwargs.get("cr_blur", 0))
        surface_blur = safe_int(kwargs.get("cr_surface_blur", 0))
        
        high = safe_int(kwargs.get("cr_high", 0))
        shad = safe_int(kwargs.get("cr_shad", 0))
        white = safe_int(kwargs.get("cr_white", 0))
        black = safe_int(kwargs.get("cr_black", 0))
        temp = safe_int(kwargs.get("cr_temp", 0))
        tint = safe_int(kwargs.get("cr_tint", 0))
        vibrance = safe_int(kwargs.get("cr_vibrance", kwargs.get("cr_colorfulness", 0)))
        dehz = safe_int(kwargs.get("cr_dehz", 0))
        grain = safe_int(kwargs.get("cr_grain", 0))
        vignette = safe_int(kwargs.get("cr_vignette", 0))

        sketch_sigma = safe_float(kwargs.get("cr_sketch_sigma", 1.4), 1.4)
        sketch_kernel_size = safe_int(kwargs.get("cr_sketch_kernel_size", 0))
        pixel_dot_size = safe_int(kwargs.get("cr_pixel_dot_size", 0))

        # Calculate dynamic scale ratio matching the JS frontend preview canvas width (MAX_PREVIEW_SIZE = 1200)
        h_orig_img, w_orig_img = img.height, img.width
        pW = float(w_orig_img)
        pH = float(h_orig_img)
        max_size = 1200.0
        if pW > max_size or pH > max_size:
            ratio = min(max_size / pW, max_size / pH)
            pW = max(1.0, round(pW * ratio))
            pH = max(1.0, round(pH * ratio))
        scale_ratio = float(w_orig_img) / pW

        # Check all new filters too
        postEnable = kwargs.get("cr_post_enable", False)
        htSize = safe_int(kwargs.get("cr_ht_size", 0))
        usmAmount = safe_float(kwargs.get("cr_usm_amount", 0))
        lapAmount = safe_float(kwargs.get("cr_lap_amount", 0.0))
        blurRadius = safe_int(kwargs.get("cr_blur_radius", 0))
        blurMode = str(kwargs.get("cr_blur_mode", "Gaussian")).strip()
        
        cbShadR = safe_float(kwargs.get("cr_cb_shad_r", 0))
        cbShadG = safe_float(kwargs.get("cr_cb_shad_g", 0))
        cbShadB = safe_float(kwargs.get("cr_cb_shad_b", 0))
        cbMidR  = safe_float(kwargs.get("cr_cb_mid_r", 0))
        cbMidG  = safe_float(kwargs.get("cr_cb_mid_g", 0))
        cbMidB  = safe_float(kwargs.get("cr_cb_mid_b", 0))
        cbHighR = safe_float(kwargs.get("cr_cb_high_r", 0))
        cbHighG = safe_float(kwargs.get("cr_cb_high_g", 0))
        cbHighB = safe_float(kwargs.get("cr_cb_high_b", 0))
        hasCb = any(v != 0 for v in [cbShadR, cbShadG, cbShadB, cbMidR, cbMidG, cbMidB, cbHighR, cbHighG, cbHighB])

        cfDensity = safe_float(kwargs.get("cr_cf_density", 0))
        hasCf = cfDensity > 0
        
        lvlInBlack = safe_float(kwargs.get("cr_lvl_in_black", 0))
        lvlInWhite = safe_float(kwargs.get("cr_lvl_in_white", 255))
        lvlGamma = safe_float(kwargs.get("cr_lvl_gamma", 1.0))
        lvlOutBlack = safe_float(kwargs.get("cr_lvl_out_black", 0))
        lvlOutWhite = safe_float(kwargs.get("cr_lvl_out_white", 255))
        hasLevels = lvlInBlack != 0 or lvlInWhite != 255 or lvlGamma != 1.0 or lvlOutBlack != 0 or lvlOutWhite != 255

        needs_cr = cr_enable and (
            any(v != 0 for v in [offset, exp, cont, high, shad, white, black, temp, tint, vibrance, sat, tex, clar, dehz, sharp, denoise, blur, surface_blur, grain, vignette])
            or sketch_kernel_size > 0
            or pixel_dot_size > 1
            or postEnable
            or htSize > 0
            or usmAmount > 0
            or lapAmount > 0
            or hasCb
            or hasCf
            or hasLevels
            or blurRadius > 0
        )
        
        
        needs_hsl = kwargs.get("hsl_active", False) and kwargs.get("hsl_data", "{}") != "{}"
        hsl_state = {}
        if needs_hsl:
            try:
                hsl_state = json.loads(kwargs["hsl_data"])
                has_hsl_changes = hsl_state.get("colorize", False)
                if not has_hsl_changes:
                    for key in ["master", "reds", "yellows", "greens", "cyans", "blues", "magentas"]:
                        conf = hsl_state.get(key, {})
                        if conf.get("h", 0) != 0 or conf.get("s", 0) != 0 or conf.get("l", 0) != 0:
                            has_hsl_changes = True
                            break
                needs_hsl = has_hsl_changes
            except:
                needs_hsl = False

        needs_curve = kwargs.get("curve_active", False) and kwargs.get("curve_data", "{}") != "{}"
        curve_state = {}
        if needs_curve:
            try:
                curve_state = json.loads(kwargs.get("curve_data", "{}"))
                needs_curve = self.curve_is_active(curve_state)
            except:
                needs_curve = False

        if needs_cr or needs_hsl or needs_curve:
            arr = np.array(img.convert("RGB")).astype(np.float32) / 255.0
            
            if needs_cr:
                # 1. Temperature & Tint - Luminance-preserving color balance
                if temp != 0 or tint != 0:
                    lum = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
                    # Color deviations from gray
                    dev = arr[..., :3] - lum

                    if temp != 0:
                        t = temp / 100.0
                        dev[..., 0] += t * 0.05  # red
                        dev[..., 2] -= t * 0.05  # blue

                    if tint != 0:
                        t = tint / 100.0
                        dev[..., 1] -= t * 0.04  # green
                        dev[..., 0] += t * 0.02  # red
                        dev[..., 2] += t * 0.02  # blue

                    arr[..., :3] = lum + dev

                arr = np.clip(arr, 0.0, 1.0)
                luma = np.dot(arr[..., :3], [0.299, 0.587, 0.114])

                # 2. Offset
                if offset != 0:
                    arr += offset / 100.0

                # 3. Exposure
                if exp != 0: 
                    mult = 2.0 ** (exp / 100.0)
                    arr = arr * mult
                    luma = luma * mult

                # Highlights, Shadows, Whites, Blacks smoothstep masking
                def smoothstep(edge0, edge1, x):
                    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
                    return t * t * (3.0 - 2.0 * t)

                if shad != 0: 
                    shad_v = shad / 100.0
                    shad_mask = (1.0 - smoothstep(0.0, 0.65, luma))[..., None]
                    if shad_v > 0:
                        arr += (1.0 - arr) * (shad_mask * shad_v * 0.75)
                    else:
                        arr += arr * (shad_mask * shad_v * 0.75)

                if high != 0:
                    high_v = high / 100.0
                    high_mask = smoothstep(0.3, 1.0, luma)
                    boost = high_mask * high_v * 0.8
                    if high_v > 0:
                        luma_new = luma + (1.0 - luma) * boost
                    else:
                        luma_new = luma + luma * boost
                    ratio = luma_new / np.maximum(1e-5, luma)
                    arr[..., :3] *= ratio[..., None]
                    luma = luma_new

                if white != 0:
                    white_v = white / 100.0
                    white_mask = smoothstep(0.45, 1.0, luma)
                    boost = white_mask * white_v * 1.2
                    if white_v > 0:
                        luma_new = luma + (1.0 - luma) * boost
                    else:
                        luma_new = luma + luma * boost
                    ratio = luma_new / np.maximum(1e-5, luma)
                    arr[..., :3] *= ratio[..., None]
                    luma = luma_new

                if black != 0:
                    black_v = black / 100.0
                    black_mask = (1.0 - smoothstep(0.0, 0.35, luma))[..., None]
                    if black_v > 0:
                        arr += (1.0 - arr) * (black_mask * black_v * 0.8)
                    else:
                        arr += arr * (black_mask * black_v * 0.8)

                if cont != 0:
                    f = 1.0 + (cont / 100.0)
                    arr = (arr - 0.5) * f + 0.5

                # Clamp basic adjustments to [0.0, 1.0] range before entering color stages
                arr = np.clip(arr, 0.0, 1.0)

                # Saturation: chroma-based (luminance-deviation scaling)
                if sat != 0:
                    luma_s = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
                    sat_val = sat / 100.0
                    if sat_val > 0:
                        factor = 1.0 + sat_val * 1.5
                    else:
                        factor = 1.0 + sat_val
                    arr[..., :3] = luma_s + (arr[..., :3] - luma_s) * factor
                    arr = np.clip(arr, 0.0, 1.0)

                if vibrance != 0:
                    arr = np.clip(arr, 0.0, 1.0)
                    luma_c = np.dot(arr[..., :3], [0.299, 0.587, 0.114])
                    max_color = np.max(arr[..., :3], axis=2, keepdims=True)
                    min_color = np.min(arr[..., :3], axis=2, keepdims=True)
                    sat_mask = np.clip(1.0 - (max_color - min_color), 0.0, 1.0)
                    arr[..., :3] = arr[..., :3] + (arr[..., :3] - luma_c[..., None]) * (vibrance/100.0) * sat_mask
                    arr = np.clip(arr, 0.0, 1.0)

                if dehz != 0:
                    arr = np.clip(arr, 0.0, 1.0)
                    dehz_v = dehz / 150.0
                    luma_d = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
                    max_color = np.max(arr[..., :3], axis=2, keepdims=True)
                    min_color = np.min(arr[..., :3], axis=2, keepdims=True)
                    haze = np.clip(1.0 - (max_color - min_color) * 2.0, 0.0, 1.0)
                    mid = 1.0 - np.clip(np.abs(luma_d - 0.5) * 2.0, 0.0, 1.0)
                    weight = np.clip(0.35 + 0.65 * haze * mid, 0.0, 1.0)

                    if dehz_v > 0:
                        contrast = 1.0 + dehz_v * 0.9 * weight
                        arr = (arr - 0.5) * contrast + 0.5
                        neutral = np.mean(arr[..., :3], axis=2, keepdims=True)
                        sat_boost = dehz_v * 0.18 * weight
                        arr[..., :3] += (arr[..., :3] - neutral) * sat_boost
                    else:
                        soften = (-dehz_v) * 0.45 * weight
                        arr = (arr - 0.5) * (1.0 - soften) + 0.5
                    arr = np.clip(arr, 0.0, 1.0)

                if vignette > 0:
                    h_img, w_img = arr.shape[:2]
                    y_mesh, x_mesh = np.ogrid[:h_img, :w_img]
                    center_y, center_x = h_img / 2, w_img / 2
                    radius = np.sqrt((x_mesh - center_x)**2 + (y_mesh - center_y)**2)
                    max_radius = np.sqrt(center_x**2 + center_y**2)
                    vig_mask = 1.0 - np.clip((radius / max_radius - 0.3) * (vignette / 50.0), 0, 1)
                    arr = arr * vig_mask[..., None]

                if grain > 0:
                    noise = np.random.normal(0, grain/200.0, arr.shape)
                    arr += noise

            arr = np.clip(arr, 0.0, 1.0)
            
            if needs_hsl:
                hsl = self.rgb_to_hsl(arr)
                hh, ss, ll = hsl[..., 0], hsl[..., 1], hsl[..., 2]
                
                if hsl_state.get("colorize", False):
                    master = hsl_state.get("master", {"h":0, "s":0, "l":0})
                    h_val = master.get("h", 0)
                    if h_val < 0: h_val += 360
                    hh = np.full_like(hh, h_val)
                    ss = np.clip(0.5 + (master.get("s", 0) / 100.0), 0.0, 1.0)
                    ll = self.apply_lightness_like_photoshop(ll, master.get("l", 0) / 100.0)
                    hsl = np.stack([hh, ss, ll], axis=-1)
                    arr = self.hsl_to_rgb(hsl)
                    arr = np.clip(arr, 0.0, 1.0)
                else:
                    master = hsl_state.get("master", {"h":0, "s":0, "l":0})
                    total_h_shift = np.full_like(hh, master.get("h", 0))
                    total_l_shift = np.full_like(ll, master.get("l", 0) / 100.0)
                    # Accumulate saturation as chroma multiplier
                    total_chroma_mult = np.full_like(ss, 1.0 + (master.get("s", 0) / 100.0) * 1.2)
                    
                    for ch in ['reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas']:
                        if ch in hsl_state:
                            conf = hsl_state[ch]
                            if conf.get("h",0) == 0 and conf.get("s",0) == 0 and conf.get("l",0) == 0:
                                continue
                            
                            center = conf.get("center", 0)
                            width = conf.get("width", 60)
                            
                            diff = np.abs(hh - center)
                            diff = np.where(diff > 180, 360.0 - diff, diff)
                            half = max(5.0, width / 2.0)
                            falloff = max(12.0, half * 0.65)
                            
                            weight = np.zeros_like(hh)
                            m1 = diff <= half
                            m2 = (~m1) & (diff <= half + falloff)
                            
                            weight[m1] = 1.0
                            t = (diff[m2] - half) / falloff
                            weight[m2] = 0.5 * (1.0 + np.cos(np.pi * t))
                            
                            if np.any(weight > 0):
                                total_h_shift += conf.get("h",0) * weight
                                total_chroma_mult += (conf.get("s",0) / 100.0) * 1.2 * weight
                                total_l_shift += (conf.get("l",0) / 100.0) * weight
                                
                    new_h = (hh + total_h_shift) % 360.0
                    new_h = np.where(new_h < 0, new_h + 360.0, new_h)
                    new_l = self.apply_lightness_like_photoshop(ll, total_l_shift)
                    
                    # Convert back with original saturation (only hue + lightness changed)
                    hsl = np.stack([new_h, ss, new_l], axis=-1)
                    arr = self.hsl_to_rgb(hsl)
                    arr = np.clip(arr, 0.0, 1.0)
                    
                    # Apply saturation as chroma scaling
                    chroma_mult = np.clip(total_chroma_mult, 0.0, None)
                    has_chroma_change = np.any(chroma_mult != 1.0)
                    if has_chroma_change:
                        luma_hsl = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
                        arr[..., :3] = luma_hsl + (arr[..., :3] - luma_hsl) * chroma_mult[..., None]
                        arr = np.clip(arr, 0.0, 1.0)

            if needs_curve:
                lut_rgb = self.build_curve_lut(curve_state.get("rgb", []))
                lut_r = self.build_curve_lut(curve_state.get("r", []))
                lut_g = self.build_curve_lut(curve_state.get("g", []))
                lut_b = self.build_curve_lut(curve_state.get("b", []))

                rgb = np.clip(np.round(arr[..., :3] * 255.0), 0, 255).astype(np.uint8)

                rgb[..., 0] = lut_rgb[rgb[..., 0]]
                rgb[..., 1] = lut_rgb[rgb[..., 1]]
                rgb[..., 2] = lut_rgb[rgb[..., 2]]

                rgb[..., 0] = lut_r[rgb[..., 0]]
                rgb[..., 1] = lut_g[rgb[..., 1]]
                rgb[..., 2] = lut_b[rgb[..., 2]]

                arr[..., :3] = rgb.astype(np.float32) / 255.0

            # --- Color Balance ---
            cbShadR = safe_float(kwargs.get("cr_cb_shad_r", 0)) / 100.0
            cbShadG = safe_float(kwargs.get("cr_cb_shad_g", 0)) / 100.0
            cbShadB = safe_float(kwargs.get("cr_cb_shad_b", 0)) / 100.0
            cbMidR  = safe_float(kwargs.get("cr_cb_mid_r", 0)) / 100.0
            cbMidG  = safe_float(kwargs.get("cr_cb_mid_g", 0)) / 100.0
            cbMidB  = safe_float(kwargs.get("cr_cb_mid_b", 0)) / 100.0
            cbHighR = safe_float(kwargs.get("cr_cb_high_r", 0)) / 100.0
            cbHighG = safe_float(kwargs.get("cr_cb_high_g", 0)) / 100.0
            cbHighB = safe_float(kwargs.get("cr_cb_high_b", 0)) / 100.0

            hasCb = any(v != 0 for v in [cbShadR, cbShadG, cbShadB, cbMidR, cbMidG, cbMidB, cbHighR, cbHighG, cbHighB])
            if hasCb:
                lum_cb = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
                shadowW = np.maximum(0.0, 1.0 - lum_cb * 2.0)
                highlightW = np.maximum(0.0, lum_cb * 2.0 - 1.0)
                midW = np.maximum(0.0, 1.0 - 2.0 * np.abs(lum_cb - 0.5))
                
                arr[..., 0] += cbShadR * shadowW[..., 0] + cbMidR * midW[..., 0] + cbHighR * highlightW[..., 0]
                arr[..., 1] += cbShadG * shadowW[..., 0] + cbMidG * midW[..., 0] + cbHighG * highlightW[..., 0]
                arr[..., 2] += cbShadB * shadowW[..., 0] + cbMidB * midW[..., 0] + cbHighB * highlightW[..., 0]
                arr = np.clip(arr, 0.0, 1.0)

            # --- Color Filter ---
            cfHue = safe_int(kwargs.get("cr_cf_hue", 0))
            cfDensity = safe_float(kwargs.get("cr_cf_density", 0)) / 255.0
            cfPreserve = safe_float(kwargs.get("cr_cf_preserve", 50)) / 100.0
            
            if cfDensity > 0.0:
                h6 = cfHue / 60.0
                ii = int(h6)
                f = h6 - ii
                p, q, t = 0.0, 1.0 - f, f
                ii_mod = ((ii % 6) + 6) % 6
                if ii_mod == 0:
                    cfTintR, cfTintG, cfTintB = 1.0, t, p
                elif ii_mod == 1:
                    cfTintR, cfTintG, cfTintB = q, 1.0, p
                elif ii_mod == 2:
                    cfTintR, cfTintG, cfTintB = p, 1.0, t
                elif ii_mod == 3:
                    cfTintR, cfTintG, cfTintB = p, q, 1.0
                elif ii_mod == 4:
                    cfTintR, cfTintG, cfTintB = t, p, 1.0
                else:
                    cfTintR, cfTintG, cfTintB = 1.0, p, q
                    
                lum_cf = np.dot(arr[..., :3], [0.299, 0.587, 0.114])[..., None]
                hlightMask = np.ones_like(lum_cf)
                if cfPreserve > 0.0:
                    hlightMask = 1.0 - np.maximum(0.0, (lum_cf - (1.0 - cfPreserve)) / cfPreserve)
                blend = cfDensity * hlightMask
                
                arr[..., 0] = arr[..., 0] * (1.0 - blend[..., 0]) + cfTintR * blend[..., 0]
                arr[..., 1] = arr[..., 1] * (1.0 - blend[..., 0]) + cfTintG * blend[..., 0]
                arr[..., 2] = arr[..., 2] * (1.0 - blend[..., 0]) + cfTintB * blend[..., 0]
                arr = np.clip(arr, 0.0, 1.0)

            # --- Levels ---
            lvlCh = kwargs.get("cr_lvl_channel", "rgb")
            lvlInBlack = safe_float(kwargs.get("cr_lvl_in_black", 0)) / 255.0
            lvlInWhite = safe_float(kwargs.get("cr_lvl_in_white", 255)) / 255.0
            lvlGamma = safe_float(kwargs.get("cr_lvl_gamma", 1.0))
            lvlOutBlack = safe_float(kwargs.get("cr_lvl_out_black", 0)) / 255.0
            lvlOutWhite = safe_float(kwargs.get("cr_lvl_out_white", 255)) / 255.0

            hasLevels = lvlInBlack != 0.0 or lvlInWhite != 1.0 or lvlGamma != 1.0 or lvlOutBlack != 0.0 or lvlOutWhite != 1.0
            if hasLevels:
                lvlRange = max(0.00001, lvlInWhite - lvlInBlack)
                lvlGammaInv = 1.0 / lvlGamma if lvlGamma != 1.0 else 1.0
                lvlOutRange = lvlOutWhite - lvlOutBlack
                
                def apply_levels(v):
                    t = np.clip((v - lvlInBlack) / lvlRange, 0.0, 1.0)
                    if lvlGamma != 1.0:
                        t = np.power(t, lvlGammaInv)
                    return lvlOutBlack + t * lvlOutRange

                if lvlCh == "rgb":
                    arr[..., 0] = apply_levels(arr[..., 0])
                    arr[..., 1] = apply_levels(arr[..., 1])
                    arr[..., 2] = apply_levels(arr[..., 2])
                elif lvlCh == "r":
                    arr[..., 0] = apply_levels(arr[..., 0])
                elif lvlCh == "g":
                    arr[..., 1] = apply_levels(arr[..., 1])
                elif lvlCh == "b":
                    arr[..., 2] = apply_levels(arr[..., 2])
                arr = np.clip(arr, 0.0, 1.0)

            # --- Posterize (Bayer, Random, None) ---
            postEnable = kwargs.get("cr_post_enable", False)
            postLevels = safe_int(kwargs.get("cr_post_levels", 4))
            postMode = kwargs.get("cr_post_mode", "RGB")
            postDitherMode = kwargs.get("cr_post_dither_mode", "None").lower()
            postDither = safe_float(kwargs.get("cr_post_dither", 0)) / 100.0

            if postEnable and postLevels >= 2 and postDitherMode not in ["floyd-steinberg", "atkinson"]:
                step = postLevels - 1
                h_img, w_img = arr.shape[:2]
                bVal = np.zeros((h_img, w_img), dtype=np.float32)
                if postDitherMode == "bayer" and postDither > 0:
                    bayer_matrix = np.array([
                        [0, 8, 2, 10],
                        [12, 4, 14, 6],
                        [3, 11, 1, 9],
                        [15, 7, 13, 5]
                    ], dtype=np.float32)
                    y_indices = np.arange(h_img)[:, None] % 4
                    x_indices = np.arange(w_img)[None, :] % 4
                    bVal = (bayer_matrix[y_indices, x_indices] / 16.0 - 0.5) * postDither / step
                elif postDitherMode == "random" and postDither > 0:
                    y_indices = np.arange(h_img)[:, None]
                    x_indices = np.arange(w_img)[None, :]
                    seed = np.abs(x_indices * 12.9898 + y_indices * 78.233) % 1.0
                    bVal = (seed - 0.5) * postDither / step
                
                def quantize(v):
                    return np.clip(np.round((v + bVal) * step) / step, 0.0, 1.0)
                
                if postMode == "Luminance":
                    lum = np.dot(arr[..., :3], [0.299, 0.587, 0.114])
                    lumQ = quantize(lum)
                    ratio = np.where(lum > 1e-4, lumQ / (lum + 1e-8), 1.0)
                    arr[..., 0] = np.clip(arr[..., 0] * ratio, 0.0, 1.0)
                    arr[..., 1] = np.clip(arr[..., 1] * ratio, 0.0, 1.0)
                    arr[..., 2] = np.clip(arr[..., 2] * ratio, 0.0, 1.0)
                else:
                    arr[..., 0] = quantize(arr[..., 0])
                    arr[..., 1] = quantize(arr[..., 1])
                    arr[..., 2] = quantize(arr[..., 2])
                arr = np.clip(arr, 0.0, 1.0)

            if tex != 0:
                arr = self.apply_detail_pass(arr, radius=0.9 * scale_ratio, amount=tex / 140.0, midtone_only=False)
            if clar != 0:
                arr = self.apply_clarity(arr, clar, scale_ratio=scale_ratio)
            if sharp > 0:
                arr = self.apply_detail_pass(arr, radius=1.6 * scale_ratio, amount=sharp / 110.0, midtone_only=False)

            if denoise > 0:
                cv2 = import_cv2()
                img_u8 = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
                sigma_color = (denoise / 150.0) * 35.0 + 5.0
                sigma_space = 3.0 + denoise / 50.0
                img_u8 = cv2.bilateralFilter(img_u8, d=9, sigmaColor=sigma_color, sigmaSpace=sigma_space)
                arr = img_u8.astype(np.float32) / 255.0

            if blur > 0:
                blur_img = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8))
                blur_img = blur_img.filter(ImageFilter.GaussianBlur(radius=(blur / 10.0) * scale_ratio))
                arr = np.array(blur_img).astype(np.float32) / 255.0

            if surface_blur > 0:
                cv2 = import_cv2()
                img_u8 = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
                r = max(1, min(8, int(round(surface_blur / 25.0))))
                d = r * 2 + 1
                sigma_color = (surface_blur / 200.0) * 90.0 + 10.0
                sigma_space = d * 2.0
                img_u8 = cv2.bilateralFilter(img_u8, d=d, sigmaColor=sigma_color, sigmaSpace=sigma_space)
                arr = img_u8.astype(np.float32) / 255.0

            # --- Advanced Blur (cr_blur_radius / cr_blur_mode from Blur tab) ---
            if blurRadius > 0:
                r_scaled = max(1, blurRadius * scale_ratio)
                blur_mode_lower = blurMode.lower()
                if blur_mode_lower in ('surface blur', 'surface_blur'):
                    # Bilateral filter — surface-aware smoothing
                    cv2 = import_cv2()
                    img_u8 = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
                    d = max(3, int(round(r_scaled)) * 2 + 1)
                    d = min(d, 31)  # cv2 bilateral max recommended d
                    sigma_color = min(blurRadius * 2.5 + 10.0, 150.0)
                    sigma_space = r_scaled * 2.0
                    img_u8 = cv2.bilateralFilter(img_u8, d=d, sigmaColor=sigma_color, sigmaSpace=sigma_space)
                    arr = img_u8.astype(np.float32) / 255.0
                elif blur_mode_lower in ('average',):
                    # Box / Average blur
                    blur_pil = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8))
                    box_r = max(1, int(round(r_scaled)))
                    blur_pil = blur_pil.filter(ImageFilter.BoxBlur(box_r))
                    arr = np.array(blur_pil).astype(np.float32) / 255.0
                elif blur_mode_lower in ('edge average',):
                    # Gaussian, then subtract a fraction of edge-detected version for sharpening residual
                    blur_pil = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8))
                    blur_pil = blur_pil.filter(ImageFilter.GaussianBlur(radius=r_scaled))
                    arr = np.array(blur_pil).astype(np.float32) / 255.0
                else:
                    # Default: Gaussian
                    blur_pil = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8))
                    blur_pil = blur_pil.filter(ImageFilter.GaussianBlur(radius=r_scaled))
                    arr = np.array(blur_pil).astype(np.float32) / 255.0

            if sketch_kernel_size > 0:
                cv2 = import_cv2()
                img_u8 = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
                
                try:
                    k_sigma = float(kwargs.get("cr_sketch_k_sigma", 1.6))
                except:
                    k_sigma = 1.6
                    
                try:
                    epsilon = float(kwargs.get("cr_sketch_epsilon", -0.03))
                except:
                    epsilon = -0.03
                    
                try:
                    phi = float(kwargs.get("cr_sketch_phi", 10.0))
                except:
                    phi = 10.0
                    
                try:
                    gamma = float(kwargs.get("cr_sketch_gamma", 1.0))
                except:
                    gamma = 1.0
                    
                color_mode = kwargs.get("cr_sketch_color", "gray")
                if color_mode is None:
                    color_mode = "gray"
                elif isinstance(color_mode, int):
                    color_list = ["gray", "rgb"]
                    if 0 <= color_mode < len(color_list):
                        color_mode = color_list[color_mode]
                    else:
                        color_mode = "gray"
                else:
                    color_mode = str(color_mode)

                if color_mode == "gray":
                    gray = cv2.cvtColor(img_u8, cv2.COLOR_RGB2GRAY)
                else:
                    gray = img_u8

                # Scale the sigma value and compute Gaussian kernel sizes and standard deviations
                if sketch_kernel_size > 0:
                    ksize1 = sketch_kernel_size | 1
                    ksize2 = int(round(sketch_kernel_size * k_sigma)) | 1
                    
                    sigma1 = min(sketch_sigma, 0.3 * ((ksize1 - 1) * 0.5 - 1) + 0.8)
                    sigma2 = min(sketch_sigma * k_sigma, 0.3 * ((ksize2 - 1) * 0.5 - 1) + 0.8)
                    
                    scaled_sigma1 = sigma1 * scale_ratio
                    scaled_sigma2 = sigma2 * scale_ratio
                else:
                    scaled_sigma = sketch_sigma * scale_ratio
                    scaled_k_sigma = scaled_sigma * k_sigma
                    ksize1 = int(round(scaled_sigma * 3.0)) * 2 + 1
                    ksize1 = max(1, ksize1)
                    ksize2 = int(round(scaled_k_sigma * 3.0)) * 2 + 1
                    ksize2 = max(1, ksize2)
                    scaled_sigma1 = scaled_sigma
                    scaled_sigma2 = scaled_k_sigma

                g1 = cv2.GaussianBlur(gray, (ksize1, ksize1), scaled_sigma1)
                g2 = cv2.GaussianBlur(gray, (ksize2, ksize2), scaled_sigma2)
                
                gamma_fixed = float(gamma) - 0.001
                dog = g1.astype(np.float32) / 255.0 - gamma_fixed * (g2.astype(np.float32) / 255.0)
                
                dog_max = dog.max()
                if dog_max > 0:
                    dog = dog / dog_max
                
                phi_fixed = float(phi) - 0.001
                eps_fixed = float(epsilon) - 0.001
                
                e = 1.0 + np.tanh(phi_fixed * (dog - eps_fixed))
                e[e >= 1.0] = 1.0
                
                res_u8 = np.clip(e * 255.0, 0, 255).astype(np.uint8)
                if color_mode == "gray":
                    img_u8 = cv2.cvtColor(res_u8, cv2.COLOR_GRAY2RGB)
                else:
                    img_u8 = res_u8
                arr = img_u8.astype(np.float32) / 255.0

            if pixel_dot_size > 1:
                import cv2
                img_u8 = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
                h_orig, w_orig = img_u8.shape[:2]
                
                erode = safe_int(kwargs.get("cr_pixel_outline", 0))
                blur_val = safe_int(kwargs.get("cr_pixel_smoothing", 0))
                
                if erode > 0 and erode <= 9:
                    inflate_filters = [
                        None,
                        np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], np.uint8),
                        np.array([[1, 1, 1], [1, 1, 1], [1, 1, 1]], np.uint8),
                        np.array([[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]], np.uint8),
                        np.array([[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]], np.uint8),
                        np.ones((7, 7), np.uint8),
                        np.ones((9, 9), np.uint8),
                        np.ones((11, 11), np.uint8),
                        np.ones((13, 13), np.uint8),
                        np.ones((15, 15), np.uint8)
                    ]
                    img_u8 = cv2.erode(img_u8, inflate_filters[erode], iterations=1)
                
                # Scale the dot size based on the scale ratio so it visually matches the editor preview canvas
                scaled_dot_size = max(2, int(round(pixel_dot_size * scale_ratio)))
                d_h = max(1, h_orig // scaled_dot_size)
                d_w = max(1, w_orig // scaled_dot_size)
                img_down = cv2.resize(img_u8, (d_w, d_h), interpolation=cv2.INTER_NEAREST)
                
                # Apply bilateral filter smoothing on the downscaled intermediate image (matching optimized JS applyPixelize)
                if blur_val > 0:
                    d = max(3, int(round(15.0 / scaled_dot_size)))
                    if d % 2 == 0:
                        d += 1
                    d = min(15, d)
                    sigma_space = max(1.5, 20.0 / scaled_dot_size)
                    img_down = cv2.bilateralFilter(img_down, d, blur_val * 20.0, sigma_space)
                
                k_colors = safe_int(kwargs.get("cr_pixel_colors", 128), 128)
                algo = kwargs.get("cr_pixel_algo", "kmeans")
                if algo is None:
                    algo = "kmeans"
                elif isinstance(algo, int):
                    algo_list = ["kmeans", "dithering", "kmeans with dithering"]
                    if 0 <= algo < len(algo_list):
                        algo = algo_list[algo]
                    else:
                        algo = "kmeans"
                else:
                    algo = str(algo)
                
                if "kmeans" in algo:
                    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.01)
                    img_flat = img_down.reshape(-1, 3).astype(np.float32)
                    compactness, labels, centers = cv2.kmeans(img_flat, k_colors, None, criteria, 1, cv2.KMEANS_PP_CENTERS)
                    centers = centers.astype(np.uint8)
                    
                    if "dithering" in algo:
                        palette = centers.astype(np.float32) / 255.0
                        img_float = img_down.astype(np.float32) / 255.0
                        
                        h_d, w_d, c_d = img_float.shape
                        for dy_d in range(h_d):
                            for dx_d in range(w_d):
                                old_v = img_float[dy_d, dx_d].copy()
                                diffs = palette - old_v
                                dists = np.sum(diffs * diffs, axis=1)
                                best_idx = np.argmin(dists)
                                new_v = palette[best_idx]
                                img_float[dy_d, dx_d] = new_v
                                err = old_v - new_v
                                if dx_d < w_d - 1:
                                    img_float[dy_d, dx_d + 1] += err * 7.0 / 16.0
                                if dy_d < h_d - 1:
                                    img_float[dy_d + 1, dx_d] += err * 5.0 / 16.0
                                    if dx_d > 0:
                                        img_float[dy_d + 1, dx_d - 1] += err * 3.0 / 16.0
                                    if dx_d < w_d - 1:
                                        img_float[dy_d + 1, dx_d + 1] += err * 1.0 / 16.0
                        
                        img_down = np.clip(img_float * 255.0, 0, 255).astype(np.uint8)
                    else:
                        img_down = centers[labels.flatten()].reshape(img_down.shape)
                elif algo == "dithering":
                    palette = np.array([[r, g, b] for r in np.linspace(0, 1, int(np.cbrt(k_colors))) 
                                                  for g in np.linspace(0, 1, int(np.cbrt(k_colors))) 
                                                  for b in np.linspace(0, 1, int(np.cbrt(k_colors)))], dtype=np.float32)
                    if len(palette) < 2:
                        palette = np.array([[0, 0, 0], [1, 1, 1]], dtype=np.float32)
                    img_float = img_down.astype(np.float32) / 255.0
                    h_d, w_d, c_d = img_float.shape
                    for dy_d in range(h_d):
                        for dx_d in range(w_d):
                            old_v = img_float[dy_d, dx_d].copy()
                            diffs = palette - old_v
                            dists = np.sum(diffs * diffs, axis=1)
                            best_idx = np.argmin(dists)
                            new_v = palette[best_idx]
                            img_float[dy_d, dx_d] = new_v
                            err = old_v - new_v
                            if dx_d < w_d - 1:
                                img_float[dy_d, dx_d + 1] += err * 7.0 / 16.0
                            if dy_d < h_d - 1:
                                img_float[dy_d + 1, dx_d] += err * 5.0 / 16.0
                                if dx_d > 0:
                                    img_float[dy_d + 1, dx_d - 1] += err * 3.0 / 16.0
                                if dx_d < w_d - 1:
                                    img_float[dy_d + 1, dx_d + 1] += err * 1.0 / 16.0
                    img_down = np.clip(img_float * 255.0, 0, 255).astype(np.uint8)
                    
                img_up = cv2.resize(img_down, (w_orig, h_orig), interpolation=cv2.INTER_NEAREST)
                arr = img_up.astype(np.float32) / 255.0

            # --- Halftone ---
            htSize = safe_int(kwargs.get("cr_ht_size", 0))
            if htSize > 1:
                htAngle = safe_int(kwargs.get("cr_ht_angle", 15))
                htContrast = safe_float(kwargs.get("cr_ht_contrast", 0))
                htBrightness = safe_float(kwargs.get("cr_ht_brightness", 0))
                htDither = safe_float(kwargs.get("cr_ht_dither", 100)) / 100.0
                htInverse = kwargs.get("cr_ht_inverse", False)
                htShape = kwargs.get("cr_ht_shape", "Dot").lower()
                
                h_img, w_img = arr.shape[:2]
                cFac = (htContrast + 100.0) / 100.0
                bOff = htBrightness / 100.0
                ht_src = np.clip((arr[..., :3] - 0.5) * cFac + 0.5 + bOff, 0.0, 1.0)
                ht_lum = 0.299 * ht_src[..., 0] + 0.587 * ht_src[..., 1] + 0.114 * ht_src[..., 2]
                
                angleRad = htAngle * np.pi / 180.0
                cosA = np.cos(angleRad)
                sinA = np.sin(angleRad)
                
                cxImg = (w_img - 1) / 2.0
                cyImg = (h_img - 1) / 2.0
                
                y_indices = np.arange(h_img, dtype=np.float32)[:, None] - cyImg
                x_indices = np.arange(w_img, dtype=np.float32)[None, :] - cxImg

                scaled_ht_size = max(2, int(round(htSize * scale_ratio)))
                rx = (x_indices * cosA + y_indices * sinA) / scaled_ht_size
                ry = (-x_indices * sinA + y_indices * cosA) / scaled_ht_size
                
                lx = rx - np.floor(rx) - 0.5
                ly = ry - np.floor(ry) - 0.5
                
                if htShape == "square dot":
                    d = 2.0 * np.maximum(np.abs(lx), np.abs(ly))
                    screen = 1.0 - np.clip(d, 0.0, 1.0)
                elif htShape in ["line", "line centered"]:
                    screen = 1.0 - np.clip(2.0 * np.abs(ly), 0.0, 1.0)
                elif htShape in ["rhomboid", "spot diamond"]:
                    d = 2.0 * (np.abs(lx) + np.abs(ly))
                    screen = 1.0 - np.clip(d, 0.0, 1.0)
                elif htShape == "cross cut":
                    d = 2.0 * np.minimum(np.abs(lx), np.abs(ly))
                    screen = 1.0 - np.clip(d, 0.0, 1.0)
                elif htShape == "saddle":
                    d = 4.0 * np.abs(lx * ly)
                    screen = 1.0 - np.clip(d, 0.0, 1.0)
                elif htShape == "random dots":
                    cxCell = np.floor(rx).astype(np.int32)
                    cyCell = np.floor(ry).astype(np.int32)
                    seed = np.abs(cxCell * 73856093 + cyCell * 19349663)
                    dxJit = ((seed % 1000) / 1000.0 - 0.5) * 0.6
                    dyJit = (((seed // 1000) % 1000) / 1000.0 - 0.5) * 0.6
                    d = np.sqrt((lx - dxJit)**2 + (ly - dyJit)**2) / 0.7071
                    screen = 1.0 - np.clip(d, 0.0, 1.0)
                else: # dot
                    d = np.sqrt(lx*lx + ly*ly) / 0.7071
                    screen = 1.0 - np.clip(d, 0.0, 1.0)
                    
                if htDither > 0:
                    bayerCell = max(1, scaled_ht_size // 5)
                    bayer_matrix_8 = np.array([
                        [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
                        [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
                        [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
                        [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
                    ], dtype=np.float32)
                    by = (np.arange(h_img)[:, None] // bayerCell) % 8
                    bx = (np.arange(w_img)[None, :] // bayerCell) % 8
                    ht_lum += (bayer_matrix_8[by, bx] / 64.0 - 0.5) * htDither

                if htDither > 0:
                    result = np.where(ht_lum > screen, 1.0, 0.0)
                else:
                    result = np.clip((ht_lum - screen) * 4.0 + 0.5, 0.0, 1.0)
                    
                if htInverse:
                    result = 1.0 - result
                    
                arr[..., 0] = result
                arr[..., 1] = result
                arr[..., 2] = result
                arr = np.clip(arr, 0.0, 1.0)

            # --- Sharpen USM ---
            # Match JS: sigma = radiusParam / 3.0, kr = round(3 * sigma) = round(radiusParam)
            usmAmount = safe_float(kwargs.get("cr_usm_amount", 0)) / 100.0
            usmRadius = safe_float(kwargs.get("cr_usm_radius", 1.0)) * scale_ratio
            usmThreshold = safe_float(kwargs.get("cr_usm_threshold", 0)) / 255.0
            if usmAmount > 0:
                import cv2
                sigma = max(0.5, usmRadius / 3.0)
                kr = max(1, round(3 * sigma))
                k_sz = kr * 2 + 1
                blurred = cv2.GaussianBlur(arr[..., :3], (k_sz, k_sz), sigma)
                diff = arr[..., :3] - blurred
                if usmThreshold > 0:
                    mask = np.abs(diff) > usmThreshold
                    arr[..., :3] = np.where(mask, arr[..., :3] + diff * usmAmount, arr[..., :3])
                else:
                    arr[..., :3] += diff * usmAmount
                arr = np.clip(arr, 0.0, 1.0)

            # --- Laplacian Sharpen ---
            # Matches JS crApplyLaplacianSharpen: v = c - amount * lap
            lapAmount = safe_float(kwargs.get("cr_lap_amount", 0.0))
            lapKernel = kwargs.get("cr_lap_kernel", "8-neighbor")
            if lapAmount > 0:
                import cv2
                img_f = arr[..., :3].astype(np.float32)
                if lapKernel == "4-neighbor":
                    kernel = np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]], dtype=np.float32)
                else:  # 8-neighbor
                    kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], dtype=np.float32)
                laplacian = cv2.filter2D(img_f, -1, kernel)
                # filter2D gives laplacian = 8c - sum = -(lap_JS), so:
                # JS: result = c - amount * lap_JS = c + amount * laplacian_cv2
                arr[..., :3] = np.clip(img_f + lapAmount * laplacian, 0.0, 1.0)

            # --- Posterize (Floyd-Steinberg / Atkinson) ---
            postEnable = kwargs.get("cr_post_enable", False)
            postLevels = safe_int(kwargs.get("cr_post_levels", 4))
            postMode = kwargs.get("cr_post_mode", "RGB")
            postDitherMode = kwargs.get("cr_post_dither_mode", "None").lower()
            if postEnable and postLevels >= 2 and postDitherMode in ["floyd-steinberg", "atkinson"]:
                step = postLevels - 1
                def diffuse_plane(plane, kind):
                    buf = plane.copy()
                    h, w = buf.shape
                    if kind == "floyd-steinberg":
                        for y in range(h):
                            for x in range(w):
                                old = buf[y, x]
                                ne = round(old * step) / step
                                err = old - ne
                                buf[y, x] = ne
                                if x + 1 < w:
                                    buf[y, x + 1] += err * (7.0 / 16.0)
                                if y + 1 < h:
                                    if x > 0:
                                        buf[y + 1, x - 1] += err * (3.0 / 16.0)
                                    buf[y + 1, x] += err * (5.0 / 16.0)
                                    if x + 1 < w:
                                        buf[y + 1, x + 1] += err * (1.0 / 16.0)
                    else: # atkinson
                        for y in range(h):
                            for x in range(w):
                                old = buf[y, x]
                                ne = round(old * step) / step
                                err = (old - ne) / 8.0
                                buf[y, x] = ne
                                if x + 1 < w:
                                    buf[y, x + 1] += err
                                if x + 2 < w:
                                    buf[y, x + 2] += err
                                if y + 1 < h:
                                    if x > 0:
                                        buf[y + 1, x - 1] += err
                                    buf[y + 1, x] += err
                                    if x + 1 < w:
                                        buf[y + 1, x + 1] += err
                                if y + 2 < h:
                                    buf[y + 2, x] += err
                    return np.clip(buf, 0.0, 1.0)
                
                if postMode == "Luminance":
                    lum = np.dot(arr[..., :3], [0.299, 0.587, 0.114])
                    lumQ = diffuse_plane(lum, postDitherMode)
                    ratio = np.where(lum > 1e-4, lumQ / (lum + 1e-8), 1.0)
                    arr[..., 0] = np.clip(arr[..., 0] * ratio, 0.0, 1.0)
                    arr[..., 1] = np.clip(arr[..., 1] * ratio, 0.0, 1.0)
                    arr[..., 2] = np.clip(arr[..., 2] * ratio, 0.0, 1.0)
                else:
                    arr[..., 0] = diffuse_plane(arr[..., 0], postDitherMode)
                    arr[..., 1] = diffuse_plane(arr[..., 1], postDitherMode)
                    arr[..., 2] = diffuse_plane(arr[..., 2], postDitherMode)
                arr = np.clip(arr, 0.0, 1.0)

            # Convert back to Pillow Image
            arr = np.clip(arr, 0.0, 1.0)
            img = Image.fromarray((arr * 255.0).astype(np.uint8))

        elif blur > 0:
            img = img.filter(ImageFilter.GaussianBlur(radius=blur / 10.0))

        return img

    def process(self, image, width, height, pad_left, pad_top, pad_right, pad_bottom, upscale_method, keep_proportion, scale_by, condition, feathering, divisible_by, enable_resize, mode, mask_data, crop_data="{}", hsl_data="{}", hsl_active=False, curve_data="{}", curve_active=False, crop_position="center", in_image=None, in_mask=None, unique_id=None, trix_uuid="", **kwargs):
        
        # Cleanup old trix_edited files for this node to save disk space
        if unique_id:
            try:
                import folder_paths
                import re
                input_dir = folder_paths.get_input_directory()
                aio_dir = os.path.join(input_dir, "aio_input")
                if os.path.exists(aio_dir):
                    safe_id = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(unique_id))
                    current_filename = os.path.basename(image) if image else ""
                    
                    # 1. Clean up new naming formats
                    m = re.match(r"^(.*?_)(edited|masked|pasted)_([a-zA-Z0-9_-]+)_\d+\.png$", current_filename)
                    if m:
                        base_prefix = m.group(1)
                        node_id = m.group(3)
                        for f in os.listdir(aio_dir):
                            pattern = rf"^{re.escape(base_prefix)}(edited|masked|pasted)_{re.escape(node_id)}_\d+\.png$"
                            if re.match(pattern, f) and f != current_filename:
                                try:
                                    os.remove(os.path.join(aio_dir, f))
                                except Exception:
                                    pass
                    
                    # 2. Fallback clean up old prefix formats
                    prefix = f"trix_edited_{safe_id}_"
                    for f in os.listdir(aio_dir):
                        if f.startswith(prefix) and f.endswith(".png") and f != current_filename:
                            try:
                                os.remove(os.path.join(aio_dir, f))
                            except Exception:
                                pass
            except Exception:
                pass

        ui_images = None
        fill_color = (127, 127, 127)
        if crop_data and crop_data != "{}":
            try:
                import json
                cdata = json.loads(crop_data)
                hex_color = cdata.get("pad_color", "#808080")
                if hex_color.startswith("#"):
                    hex_color = hex_color.lstrip('#')
                    if len(hex_color) == 6:
                        fill_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            except Exception as e:
                pass
        file_name_full = "image.png"
        orig_image_tensor = None
        
        if in_image is not None:
            i = 255. * in_image[0].cpu().numpy()
            img = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
            
            # Save original image as a separate variable before any resize/crop/base edits
            orig_image_tensor = in_image
            
            input_dir = folder_paths.get_input_directory()
            aio_dir = os.path.join(input_dir, "aio_input")
            os.makedirs(aio_dir, exist_ok=True)
            if trix_uuid:
                safe_unique_id = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(trix_uuid))
            else:
                safe_unique_id = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(unique_id)) if unique_id else "preview"
            preview_filename = f"aio_wired_{safe_unique_id}.png"
            file_name_full = f"aio_input/{preview_filename}"
            
            img.save(os.path.join(aio_dir, preview_filename), compress_level=1)
            ui_images = [{"filename": preview_filename, "subfolder": "aio_input", "type": "input"}]
            
            if 'A' in img.getbands():
                alpha_channel = np.array(img.getchannel('A')).astype(np.float32) / 255.0
                file_mask_np = (1. - alpha_channel) * 255.0
                file_mask_img = Image.fromarray(file_mask_np.astype(np.uint8), mode="L")
            else:
                file_mask_img = Image.new("L", img.size, 0)
        else:
            input_dir = folder_paths.get_input_directory()
            
            # Resolve image path safely
            image_path = None
            if image:
                try:
                    image_path = folder_paths.get_annotated_filepath(image)
                except Exception:
                    pass
            
            # Check if file exists and is valid, otherwise fallback
            if not image_path or not os.path.exists(image_path) or os.path.isdir(image_path):
                fallback_image = None
                valid_extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif"}
                
                # Check root of input directory first
                if os.path.exists(input_dir):
                    for f in os.listdir(input_dir):
                        f_path = os.path.join(input_dir, f)
                        if os.path.isfile(f_path) and os.path.splitext(f.lower())[1] in valid_extensions:
                            fallback_image = f
                            image_path = f_path
                            break
                
                # Check subdirectories if no image found in root
                if not fallback_image and os.path.exists(input_dir):
                    for root, dirs, files in os.walk(input_dir):
                        for f in files:
                            f_path = os.path.join(root, f)
                            if os.path.splitext(f.lower())[1] in valid_extensions:
                                fallback_image = os.path.relpath(f_path, input_dir)
                                image_path = f_path
                                break
                        if fallback_image:
                            break
                
                # If still no image found anywhere, create a gray placeholder
                if not image_path or not os.path.exists(image_path):
                    placeholder_path = os.path.join(input_dir, "trix_placeholder.png")
                    print(f"TrixLoader: No images found in input folder. Creating a placeholder image at {placeholder_path}")
                    try:
                        placeholder_img = Image.new("RGB", (512, 512), (128, 128, 128))
                        placeholder_img.save(placeholder_path)
                        image_path = placeholder_path
                        image = "trix_placeholder.png"
                    except Exception as e:
                        print(f"TrixLoader: Failed to create placeholder: {e}")
                else:
                    print(f"TrixLoader: Selected image '{image}' was not found. Loaded fallback image: '{fallback_image}'")
                    image = fallback_image
            
            if not image_path or not os.path.exists(image_path):
                raise FileNotFoundError("TrixLoader: No valid input image could be found or created.")

            img = node_helpers.pillow(Image.open, image_path)
            img = ImageOps.exif_transpose(img)
            
            # Save original image as a separate variable before any resize/crop/base edits
            orig_img = img.convert("RGB")
            orig_image_tensor = np.array(orig_img).astype(np.float32) / 255.0
            orig_image_tensor = torch.from_numpy(orig_image_tensor)[None,]
            
            if os.name == "nt":
                file_name_full = image_path.rsplit("\\", 1)[-1]
            else:
                file_name_full = image_path.rsplit("/", 1)[-1]
            
            if 'A' in img.getbands():
                alpha_channel = np.array(img.getchannel('A')).astype(np.float32) / 255.0
                file_mask_np = (1. - alpha_channel) * 255.0
                file_mask_img = Image.fromarray(file_mask_np.astype(np.uint8), mode="L")
            else:
                file_mask_img = Image.new("L", img.size, 0)

        if in_mask is not None:
            # Safe shape check to handle both 2D (H, W) and 3D (B, H, W) mask tensors
            if in_mask.ndim == 2:
                in_m = in_mask.cpu().numpy() * 255.0
            elif in_mask.ndim >= 3:
                in_m = in_mask[0].cpu().numpy() * 255.0
            else:
                in_m = in_mask.view(-1, in_mask.shape[-2], in_mask.shape[-1])[0].cpu().numpy() * 255.0
            base_mask_img = Image.fromarray(np.clip(in_m, 0, 255).astype(np.uint8), mode="L")
            if base_mask_img.size != img.size:
                base_mask_img = base_mask_img.resize(img.size, Image.NEAREST)
        else:
            base_mask_img = Image.new("L", img.size, 0)

        # Apply CPO Editor crop if crop_data is present
        if crop_data and crop_data != "{}":
            try:
                cdata = json.loads(crop_data)
                cx = int(cdata.get("x", 0))
                cy = int(cdata.get("y", 0))
                cw = int(cdata.get("w", img.size[0]))
                ch = int(cdata.get("h", img.size[1]))
                
                # Crop image if it matches original size (not cropped yet) or in_image is wired
                if img.size[0] > cw or img.size[1] > ch or in_image is not None:
                    pad_color = fill_color
                    cropped_img = Image.new("RGB", (cw, ch), pad_color)
                    cropped_img.paste(img, (-cx, -cy))
                    img = cropped_img
                
                # Crop base mask if present
                if in_mask is not None:
                    cropped_mask = Image.new("L", (cw, ch), 0)
                    cropped_mask.paste(base_mask_img, (-cx, -cy))
                    base_mask_img = cropped_mask
                else:
                    base_mask_img = Image.new("L", img.size, 0)
                    
                # Crop file mask if present
                if file_mask_img is not None:
                    cropped_file_mask = Image.new("L", (cw, ch), 0)
                    cropped_file_mask.paste(file_mask_img, (-cx, -cy))
                    file_mask_img = cropped_file_mask
            except Exception as e:
                print(f"TrixLoader: Error applying crop_data to image/mask: {e}")

        mask_combined_np = np.maximum(np.array(base_mask_img), np.array(file_mask_img))

        mask_png_b64 = None
        decont_png_b64 = None
        if mask_data:
            if mask_data.startswith("{"):
                try:
                    parsed = json.loads(mask_data)
                    mask_png_b64 = parsed.get("mask")
                    decont_png_b64 = parsed.get("decont_image")
                except Exception as e:
                    print(f"TrixLoader: Error parsing mask_data JSON: {e}")
            elif mask_data.startswith("data:image"):
                mask_png_b64 = mask_data

        if decont_png_b64:
            try:
                if decont_png_b64.startswith("data:image"):
                    base64_data = decont_png_b64.split(",")[1]
                    img_decont = Image.open(BytesIO(base64.b64decode(base64_data))).convert("RGB")
                else:
                    decont_path = folder_paths.get_annotated_filepath(decont_png_b64)
                    img_decont = Image.open(decont_path).convert("RGB")
                    
                if img_decont.size == img.size:
                    img = img_decont
                else:
                    img = img_decont.resize(img.size, Image.BILINEAR)
                print("TrixLoader: Applied color-decontaminated image from mask editor.")
            except Exception as e:
                print(f"TrixLoader: Error loading decontaminated image: {e}")

        if mask_png_b64 and mask_png_b64.startswith("data:image"):
            try:
                base64_data = mask_png_b64.split(",")[1]
                drawn_img = Image.open(BytesIO(base64.b64decode(base64_data))).convert("RGBA")
                if drawn_img.size != img.size:
                    drawn_img = drawn_img.resize(img.size, Image.BILINEAR)
                
                drawn_np = np.array(drawn_img)[:, :, 3].astype(np.uint8)
                mask_combined_np = np.maximum(mask_combined_np, drawn_np)
            except Exception as e:
                print(f"TrixLoader: Error applying drawn mask: {e}")
                
        mask_combined = Image.fromarray(mask_combined_np, mode="L")

        resample_filters = {
            "nearest-exact": Image.NEAREST, "bilinear": Image.BILINEAR,
            "area": Image.BOX, "bicubic": Image.BICUBIC, "lanczos": Image.LANCZOS
        }
        resample = resample_filters.get(upscale_method, Image.LANCZOS)

        # Apply Camera Raw filters (exposure, HSL, curves) before resize/padding/outpainting
        kwargs["hsl_data"] = hsl_data
        kwargs["hsl_active"] = hsl_active
        kwargs["curve_data"] = curve_data
        kwargs["curve_active"] = curve_active
        img = self.apply_camera_raw(img, kwargs)

        if enable_resize:
            old_w, old_h = img.size
            
            if keep_proportion == "pad_for_outpainting":
                target_w = old_w + pad_left + pad_right
                target_h = old_h + pad_top + pad_bottom
                
                if divisible_by > 1:
                    rem_w = target_w % divisible_by
                    if rem_w != 0:
                        pad_right += divisible_by - rem_w
                        target_w += divisible_by - rem_w
                    rem_h = target_h % divisible_by
                    if rem_h != 0:
                        pad_bottom += divisible_by - rem_h
                        target_h += divisible_by - rem_h
                
                new_img = Image.new("RGB", (target_w, target_h), fill_color)
                new_img.paste(img, (pad_left, pad_top))
                img = new_img
                
                outpaint_mask = Image.new("L", (target_w, target_h), 255)
                draw = ImageDraw.Draw(outpaint_mask)
                
                grow = feathering * 2
                
                black_x1 = pad_left + (grow if pad_left > 0 else 0)
                black_y1 = pad_top + (grow if pad_top > 0 else 0)
                black_x2 = pad_left + old_w - (grow if pad_right > 0 else 0)
                black_y2 = pad_top + old_h - (grow if pad_bottom > 0 else 0)
                
                black_x1 = min(black_x1, pad_left + old_w)
                black_y1 = min(black_y1, pad_top + old_h)
                black_x2 = max(black_x2, pad_left)
                black_y2 = max(black_y2, pad_top)

                if black_x1 < black_x2 and black_y1 < black_y2:
                    draw.rectangle([black_x1, black_y1, black_x2 - 1, black_y2 - 1], fill=0)
                
                if feathering > 0:
                    outpaint_mask = outpaint_mask.filter(ImageFilter.GaussianBlur(radius=feathering))
                
                user_mask_canvas = Image.new("L", (target_w, target_h), 0)
                user_mask_canvas.paste(mask_combined, (pad_left, pad_top))
                
                final_mask_np = np.maximum(np.array(outpaint_mask), np.array(user_mask_canvas))
                mask_combined = Image.fromarray(final_mask_np)

            else:
                target_w, target_h = width, height
                
                if keep_proportion == "scale_by":
                    try:
                        scale = float(scale_by)
                    except Exception:
                        scale = 1.0
                    scale = max(0.01, min(64.0, scale))
                    target_w = max(1, round(old_w * scale))
                    target_h = max(1, round(old_h * scale))
                    new_w, new_h = target_w, target_h
                elif keep_proportion == "stretch":
                    new_w, new_h = target_w, target_h
                elif keep_proportion in ["resize", "pad", "pad_edge_pixel"]:
                    ratio = min(target_w / old_w, target_h / old_h)
                    new_w, new_h = max(1, round(old_w * ratio)), max(1, round(old_h * ratio))
                elif keep_proportion == "crop":
                    ratio = max(target_w / old_w, target_h / old_h)
                    new_w, new_h = max(1, round(old_w * ratio)), max(1, round(old_h * ratio))

                do_resize = True
                if keep_proportion != "scale_by":
                    if condition == "downscale if bigger" and old_w <= new_w and old_h <= new_h:
                        do_resize = False
                    elif condition == "upscale if smaller" and old_w >= new_w and old_h >= new_h:
                        do_resize = False
                    elif condition == "if bigger area" and (old_w * old_h) <= (new_w * new_h):
                        do_resize = False
                    elif condition == "if smaller area" and (old_w * old_h) >= (new_w * new_h):
                        do_resize = False

                if do_resize:
                    if keep_proportion in ["stretch", "scale_by"]:
                        img = img.resize((target_w, target_h), resample)
                        mask_combined = mask_combined.resize((target_w, target_h), Image.BILINEAR)
                        
                    elif keep_proportion == "resize":
                        img = img.resize((new_w, new_h), resample)
                        mask_combined = mask_combined.resize((new_w, new_h), Image.BILINEAR)
                        
                    elif keep_proportion == "pad":
                        img_resized = img.resize((new_w, new_h), resample)
                        img = Image.new("RGB", (target_w, target_h), fill_color)
                        paste_x, paste_y = (target_w - new_w) // 2, (target_h - new_h) // 2
                        img.paste(img_resized, (paste_x, paste_y))
                        
                        mask_resized = mask_combined.resize((new_w, new_h), Image.BILINEAR)
                        mask_combined = Image.new("L", (target_w, target_h), 0)
                        mask_combined.paste(mask_resized, (paste_x, paste_y))
                        
                    elif keep_proportion == "pad_edge_pixel":
                        img_resized = img.resize((new_w, new_h), resample)
                        img_np = np.array(img_resized.convert("RGB"))
                        
                        pad_top = (target_h - new_h) // 2
                        pad_bottom = target_h - new_h - pad_top
                        pad_left = (target_w - new_w) // 2
                        pad_right = target_w - new_w - pad_left
                        
                        img_np = np.pad(img_np, ((pad_top, pad_bottom), (pad_left, pad_right), (0, 0)), mode='edge')
                        img = Image.fromarray(img_np)
                        
                        mask_resized = mask_combined.resize((new_w, new_h), Image.BILINEAR)
                        mask_np = np.pad(np.array(mask_resized), ((pad_top, pad_bottom), (pad_left, pad_right)), mode='constant', constant_values=0)
                        mask_combined = Image.fromarray(mask_np)
                        
                    elif keep_proportion == "crop":
                        img_resized = img.resize((new_w, new_h), resample)
                        mask_resized = mask_combined.resize((new_w, new_h), Image.BILINEAR)
                        
                        if crop_position == "top-left":
                            left = 0
                            top = 0
                        elif crop_position == "top":
                            left = (new_w - target_w) // 2
                            top = 0
                        elif crop_position == "top-right":
                            left = new_w - target_w
                            top = 0
                        elif crop_position == "left":
                            left = 0
                            top = (new_h - target_h) // 2
                        elif crop_position == "center":
                            left = (new_w - target_w) // 2
                            top = (new_h - target_h) // 2
                        elif crop_position == "right":
                            left = new_w - target_w
                            top = (new_h - target_h) // 2
                        elif crop_position == "bottom-left":
                            left = 0
                            top = new_h - target_h
                        elif crop_position == "bottom":
                            left = (new_w - target_w) // 2
                            top = new_h - target_h
                        elif crop_position == "bottom-right":
                            left = new_w - target_w
                            top = new_h - target_h
                        else:
                            left = (new_w - target_w) // 2
                            top = (new_h - target_h) // 2

                        right = left + target_w
                        bottom = top + target_h
                        
                        if right > new_w:
                            left -= (right - new_w)
                        if left < 0:
                            left = 0
                        if bottom > new_h:
                            top -= (bottom - new_h)
                        if top < 0:
                            top = 0
                        
                        img = img_resized.crop((left, top, right, bottom))
                        mask_combined = mask_resized.crop((left, top, right, bottom))

                if divisible_by > 1 and (img.size[0] % divisible_by != 0 or img.size[1] % divisible_by != 0):
                    curr_w, curr_h = img.size
                    x = (curr_w % divisible_by) // 2
                    y = (curr_h % divisible_by) // 2
                    x2 = curr_w - ((curr_w % divisible_by) - x)
                    y2 = curr_h - ((curr_h % divisible_by) - y)
                    img = img.crop((x, y, x2, y2))
                    mask_combined = mask_combined.crop((x, y, x2, y2))

        output_image = img.convert("RGB")
        
        output_image = np.array(output_image).astype(np.float32) / 255.0
        output_image = torch.from_numpy(output_image)[None,]
        
        mask_out = np.array(mask_combined).astype(np.float32) / 255.0
        mask_out = torch.from_numpy(mask_out)[None,]

        final_result = (output_image, mask_out, orig_image_tensor)

        if unique_id is not None and ui_images:
            payload = {"id": unique_id}
            if ui_images: payload["images"] = ui_images
            if trix_uuid: payload["trix_uuid"] = trix_uuid
            PromptServer.instance.send_sync("trix-update-preview", payload)
        
        ui_return = {}
        if ui_images: ui_return["images"] = ui_images
        if trix_uuid: ui_return["trix_uuid"] = trix_uuid

        if ui_return:
            return {"ui": ui_return, "result": final_result}
        else:
            return {"result": final_result}

    @classmethod
    def IS_CHANGED(s, **kwargs):
        # If upstream image or mask are connected, we bypass caching to avoid freezing dynamic frames/tensors
        if kwargs.get("in_image") is not None or kwargs.get("in_mask") is not None:
            return float("nan")

        import hashlib
        m = hashlib.sha256()
        
        # Hash all input parameter values that are basic types
        for key in sorted(kwargs.keys()):
            val = kwargs[key]
            if isinstance(val, (str, int, float, bool)):
                m.update(f"{key}:{val}".encode('utf-8'))
                
        # Hash the input image filename's size and mtime if present
        image = kwargs.get("image", None)
        if image:
            try:
                import folder_paths
                image_path = folder_paths.get_annotated_filepath(image)
                if os.path.exists(image_path):
                    import os
                    mtime = os.path.getmtime(image_path)
                    size = os.path.getsize(image_path)
                    m.update(f"file:{image_path}:{mtime}:{size}".encode('utf-8'))
            except Exception:
                pass
                
        return m.hexdigest()

# ==============================================================================
# TRIXLOADER HTTP API ROUTES FOR ADVANCED MASK EDITOR
# ==============================================================================
from aiohttp import web
import urllib.request
import threading
import traceback
import gc
import shutil
import ssl

_ACTIVE_DOWNLOADS = {}
_ACTIVE_DOWNLOADS_LOCK = threading.Lock()

# New model weights Hugging Face URLs (indexed by weights filename)
MODEL_URLS = {
    "sam2.1_hiera_tiny-fp16.safetensors": "https://huggingface.co/Kijai/sam2-safetensors/resolve/main/sam2.1_hiera_tiny-fp16.safetensors",
    "sam2.1_hiera_large-fp16.safetensors": "https://huggingface.co/Kijai/sam2-safetensors/resolve/main/sam2.1_hiera_large-fp16.safetensors",
    "sam3-fp16.safetensors": "https://huggingface.co/yolain/sam3-safetensors/resolve/main/sam3-fp16.safetensors",
    "groundingdino_swint_ogc.safetensors": "https://huggingface.co/IDEA-Research/grounding-dino-tiny/resolve/main/model.safetensors",
    "inspyrenet-bf16.safetensors": "https://huggingface.co/dummy9996/inspyrenet-bf16/resolve/main/inspyrenet.safetensors",
    "Ben2.safetensors": "https://huggingface.co/PramaLLC/BEN2/resolve/main/model.safetensors",
    "Birefnet-lite.safetensors": "https://huggingface.co/TheGuy444/BiRefNet-lite/resolve/main/model.safetensors",
    "Birefnet.safetensors": "https://huggingface.co/ezzdev/BiRefNet/resolve/main/model.safetensors",
    "BiRefNet_HR.safetensors": "https://huggingface.co/ZhengPeng7/BiRefNet_HR/resolve/main/model.safetensors",
    "BiRefNet-portrait.safetensors": "https://huggingface.co/ZhengPeng7/BiRefNet-portrait/resolve/main/model.safetensors",
    "birefnet_finetuned_toonout.pth": "https://huggingface.co/joelseytre/toonout/resolve/main/birefnet_finetuned_toonout.pth"
}

# Directories relative to ComfyUI models_dir
MODEL_FOLDERS = {
    "sam2.1_hiera_tiny-fp16.safetensors": "sams",
    "sam2.1_hiera_large-fp16.safetensors": "sams",
    "sam3-fp16.safetensors": "sams",
    "groundingdino_swint_ogc.safetensors": "grounding-dino",
    "inspyrenet-bf16.safetensors": "RMBG",
    "Ben2.safetensors": "RMBG",
    "Birefnet-lite.safetensors": "RMBG",
    "Birefnet.safetensors": "RMBG",
    "BiRefNet_HR.safetensors": "RMBG",
    "BiRefNet-portrait.safetensors": "RMBG",
    "birefnet_finetuned_toonout.pth": "RMBG"
}

_CURRENT_SAM3_STATE = None
_CURRENT_SAM3_IMAGE = None
_CURRENT_SAM3_DEVICE = None
_CURRENT_SAM3_MTIME = 0.0
_CURRENT_SAM3_SIZE = 0
_CURRENT_SAM3_CROP_BOUNDS = None
_CURRENT_SAM2_CACHE = {}
_LOADED_MODELS = {}
_LOADED_MODELS_LOCK = threading.Lock()
_SAM_INFERENCE_LOCK = threading.Lock()

def offload_other_models(current_model_key):
    global _LOADED_MODELS, _CURRENT_SAM3_STATE, _CURRENT_SAM3_IMAGE, _CURRENT_SAM3_DEVICE, _CURRENT_SAM3_MTIME, _CURRENT_SAM3_SIZE, _CURRENT_SAM3_CROP_BOUNDS, _CURRENT_SAM2_CACHE
    _CURRENT_SAM3_STATE = None
    _CURRENT_SAM3_IMAGE = None
    _CURRENT_SAM3_DEVICE = None
    _CURRENT_SAM3_MTIME = 0.0
    _CURRENT_SAM3_SIZE = 0
    _CURRENT_SAM3_CROP_BOUNDS = None
    _CURRENT_SAM2_CACHE.clear()
    with _LOADED_MODELS_LOCK:
        offloaded = False
        for key, model_inst in list(_LOADED_MODELS.items()):
            if key != current_model_key:
                print(f"TrixLoader: Offloading model {key} to CPU...")
                try:
                    # Move model elements to CPU
                    if hasattr(model_inst, "to"):
                        model_inst.to("cpu")
                    elif isinstance(model_inst, tuple):
                        for part in model_inst:
                            if hasattr(part, "to"):
                                part.to("cpu")
                    elif hasattr(model_inst, "model") and hasattr(model_inst.model, "to"):
                        model_inst.model.to("cpu")
                    offloaded = True
                except Exception as e:
                    print(f"TrixLoader: Error offloading {key}: {e}")
                    
        if offloaded:
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            try:
                import comfy.model_management
                comfy.model_management.soft_empty_cache()
            except Exception:
                pass

def locale_is_ru():
    try:
        import locale
        loc = locale.getdefaultlocale()[0]
        if loc and loc.lower().startswith("ru"):
            return True
    except Exception:
        pass
    return False

def snapshot_download_with_progress(repo_id, local_dir, model_name, use_mirror=False):
    import time
    import threading
    import sys
    import os
    from huggingface_hub import snapshot_download
    
    if use_mirror:
        os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
        
    stop_event = threading.Event()
    expected_size = 690 * 1024 * 1024  # ~723,000,000 bytes (model.safetensors is 689MB + config/tokenizer files)
    
    def monitor():
        while not stop_event.is_set():
            time.sleep(0.5)
            current_size = 0
            if os.path.exists(local_dir):
                for root, dirs, files in os.walk(local_dir):
                    for file in files:
                        fp = os.path.join(root, file)
                        if os.path.exists(fp):
                            current_size += os.path.getsize(fp)
            
            percent = int((current_size / expected_size) * 100)
            percent = min(99, percent)
            
            # Print single-line progress to stdout
            sys.stdout.write(f"\rTrixLoader: Downloading '{model_name}': {percent}% ({current_size / (1024*1024):.1f} / {expected_size / (1024*1024):.1f} MB)")
            sys.stdout.flush()
            
            PromptServer.instance.send_sync("trix-download-progress", {
                "model_name": model_name,
                "progress": percent,
                "status": "downloading"
            })
            
    monitor_thread = threading.Thread(target=monitor, daemon=True)
    monitor_thread.start()
    
    try:
        os.makedirs(local_dir, exist_ok=True)
        snapshot_download(
            repo_id=repo_id,
            local_dir=local_dir,
            local_dir_use_symlinks=False,
            ignore_patterns=["*.bin", "*.pth"]
        )
    finally:
        stop_event.set()
        monitor_thread.join()
        
    # Finalize line output
    sys.stdout.write(f"\rTrixLoader: Downloading '{model_name}': 100% ({expected_size / (1024*1024):.1f} / {expected_size / (1024*1024):.1f} MB)\n")
    sys.stdout.flush()
    PromptServer.instance.send_sync("trix-download-progress", {
        "model_name": model_name,
        "progress": 100,
        "status": "completed",
        "save_path": local_dir
    })

def download_model_thread(url, dest_path, model_name, dest_dir):
    import urllib.request
    import ssl
    import os
    import sys
    import time
    import socket
    
    # Auto-detect if we should use HF mirror by default based on system locale
    use_mirror = False
    try:
        import locale
        loc = locale.getdefaultlocale()[0]
        if loc and loc.lower().startswith("ru"):
            use_mirror = True
    except Exception:
        pass
        
    if use_mirror:
        print("TrixLoader: Russian locale detected. Pre-configuring Hugging Face mirror (hf-mirror.com) for faster downloads.")
        os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
        
    print(f"TrixLoader: Starting download of '{model_name}' to {dest_path}")
    try:
        if model_name == "groundingdino_swint_ogc.safetensors":
            snapshot_download_with_progress(
                repo_id="IDEA-Research/grounding-dino-tiny",
                local_dir=dest_dir,
                model_name=model_name,
                use_mirror=use_mirror
            )
            return

        temp_dest = dest_path + ".tmp"
        context = ssl._create_unverified_context()
        
        # Determine if tqdm is available
        use_tqdm = False
        try:
            from tqdm import tqdm
            use_tqdm = True
        except ImportError:
            pass

        # Try up to 5 attempts, using mirror on failure or pre-emptively
        max_attempts = 5
        attempt = 0
        downloaded = 0
        total_size = 0
        
        current_url = url
        
        # Start with mirror immediately if Russian locale detected to avoid initial timeout
        if use_mirror and "huggingface.co" in current_url:
            current_url = current_url.replace("huggingface.co", "hf-mirror.com")
            print(f"TrixLoader: Redirecting download to mirror: {current_url}")

        while attempt < max_attempts:
            attempt += 1
            try:
                if os.path.exists(temp_dest):
                    downloaded = os.path.getsize(temp_dest)
                else:
                    downloaded = 0
                
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                if downloaded > 0:
                    headers['Range'] = f"bytes={downloaded}-"
                    print(f"TrixLoader: Resuming download from byte {downloaded} (attempt {attempt}/{max_attempts})...")
                else:
                    print(f"TrixLoader: Initiating download (attempt {attempt}/{max_attempts})...")
                
                req = urllib.request.Request(current_url, headers=headers)
                
                with urllib.request.urlopen(req, context=context, timeout=30) as response:
                    status_code = response.getcode()
                    content_length = int(response.headers.get('content-length', 0))
                    
                    if status_code == 206:
                        if total_size <= 0:
                            total_size = downloaded + content_length
                        file_mode = 'ab'
                    else:
                        total_size = content_length
                        downloaded = 0
                        file_mode = 'wb'
                    
                    if total_size > 0:
                        print(f"TrixLoader: Total size: {total_size / (1024*1024):.2f} MB")
                    else:
                        print("TrixLoader: Total size unknown")
                    
                    block_size = 1024 * 1024 # 1 MB chunks
                    last_percent = -1
                    
                    t = None
                    if use_tqdm and total_size > 0:
                        t = tqdm(total=total_size, initial=downloaded, unit='B', unit_scale=True, desc=f"TrixLoader: Downloading {model_name}", miniters=1, file=sys.stdout)
                    
                    with open(temp_dest, file_mode) as f:
                        while True:
                            try:
                                buffer = response.read(block_size)
                            except (socket.timeout, TimeoutError) as e:
                                raise e
                            except Exception as read_err:
                                raise read_err
                            
                            if not buffer:
                                break
                            
                            f.write(buffer)
                            downloaded += len(buffer)
                            if t:
                                t.update(len(buffer))
                            
                            if total_size > 0:
                                percent = int((downloaded / total_size) * 100)
                                if percent != last_percent:
                                    last_percent = percent
                                    if not use_tqdm:
                                        sys.stdout.write(f"\rTrixLoader: Downloading '{model_name}': {percent}% ({downloaded / (1024*1024):.1f} / {total_size / (1024*1024):.1f} MB)")
                                        sys.stdout.flush()
                                    try:
                                        PromptServer.instance.send_sync("trix-download-progress", {
                                            "model_name": model_name,
                                            "progress": percent,
                                            "status": "downloading"
                                        })
                                    except Exception:
                                        pass
                            else:
                                if not use_tqdm:
                                    mb_downloaded = downloaded / (1024*1024)
                                    sys.stdout.write(f"\rTrixLoader: Downloading '{model_name}': {mb_downloaded:.1f} MB downloaded...")
                                    sys.stdout.flush()
                                    
                    if t:
                        t.close()
                    if not use_tqdm:
                        sys.stdout.write("\n")
                        sys.stdout.flush()
                        
                    if total_size > 0 and downloaded >= total_size:
                        break
                    elif total_size <= 0:
                        break
                        
            except Exception as e:
                print(f"\nTrixLoader: Download attempt {attempt} failed: {e}")
                if "huggingface.co" in current_url:
                    current_url = current_url.replace("huggingface.co", "hf-mirror.com")
                    print(f"TrixLoader: Switching to mirror for next attempt: {current_url}")
                    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
                
                if attempt >= max_attempts:
                    raise e
                
                sleep_time = min(2 * attempt, 10)
                print(f"TrixLoader: Waiting {sleep_time}s before retrying...")
                time.sleep(sleep_time)

        print(f"TrixLoader: Download complete. Finalizing file...")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        os.rename(temp_dest, dest_path)
        print(f"TrixLoader: Model successfully installed at: {dest_path}")
            
        if model_name == "inspyrenet-bf16.safetensors":
            print("TrixLoader: Pre-installing packages transparent-background and albumentations...")
            auto_pip_install("transparent-background")
            auto_pip_install("albumentations")
        
        elif model_name in ["Birefnet-lite.safetensors", "Birefnet.safetensors", "BiRefNet_HR.safetensors", "BiRefNet-portrait.safetensors", "birefnet_finetuned_toonout.pth"]:
            print("TrixLoader: Pre-caching BiRefNet config and remote code modules...")
            try:
                from transformers import AutoConfig
                BIREFNET_REPOS = {
                    "Birefnet-lite.safetensors": "ZhengPeng7/BiRefNet_lite",
                    "Birefnet.safetensors": "ZhengPeng7/BiRefNet",
                    "BiRefNet_HR.safetensors": "ZhengPeng7/BiRefNet_HR",
                    "BiRefNet-portrait.safetensors": "ZhengPeng7/BiRefNet-portrait",
                    "birefnet_finetuned_toonout.pth": "ZhengPeng7/BiRefNet"
                }
                repo_id = BIREFNET_REPOS.get(model_name, "ZhengPeng7/BiRefNet")
                config = AutoConfig.from_pretrained(repo_id, trust_remote_code=True)
                print(f"TrixLoader: Pre-caching of BiRefNet ({repo_id}) finished successfully.")
            except Exception as birefnet_err:
                print(f"TrixLoader BiRefNet caching warning: {birefnet_err}")
        
        elif model_name == "sam3-fp16.safetensors":
            print("TrixLoader: Installing SAM3 custom node and all required libraries...")
            current_dir = os.path.dirname(os.path.abspath(__file__))
            sam3_path = os.path.join(current_dir, "comfyui-easy-sam3")
            if not os.path.exists(sam3_path):
                custom_nodes_path = os.path.abspath(os.path.join(folder_paths.models_dir, "..", "custom_nodes"))
                sam3_path = os.path.join(custom_nodes_path, "comfyui-easy-sam3")
                if not os.path.exists(sam3_path):
                    try:
                        auto_install_custom_node(
                            "https://github.com/yolain/comfyui-easy-sam3/archive/refs/heads/main.zip",
                            "comfyui-easy-sam3",
                            parent_path=current_dir
                        )
                        sam3_path = os.path.join(current_dir, "comfyui-easy-sam3")
                    except Exception as e:
                        try:
                            auto_install_custom_node(
                                "https://github.com/yolain/comfyui-easy-sam3/archive/refs/heads/main.zip",
                                "comfyui-easy-sam3",
                                parent_path=custom_nodes_path
                            )
                            sam3_path = os.path.join(custom_nodes_path, "comfyui-easy-sam3")
                        except Exception as e2:
                            print(f"TrixLoader: Failed to install comfyui-easy-sam3 node: {e2}")
            
            sam3_deps = {
                "torchvision": "torchvision",
                "timm": "timm",
                "ftfy": "ftfy",
                "regex": "regex",
                "iopath": "iopath",
                "einops": "einops",
                "decord": "decord",
                "pycocotools": "pycocotools",
                "scipy": "scipy",
                "scikit-image": "skimage",
                "scikit-learn": "sklearn",
                "pandas": "pandas",
                "open-clip-torch": "open_clip"
            }
            for pip_name, import_name in sam3_deps.items():
                try:
                    __import__(import_name)
                except (ImportError, ModuleNotFoundError):
                    auto_pip_install(pip_name)
        
        try:
            PromptServer.instance.send_sync("trix-download-progress", {
                "model_name": model_name,
                "progress": 100,
                "status": "completed",
                "save_path": dest_path
            })
        except Exception:
            pass
    except Exception as e:
        print(f"TrixLoader download error for '{model_name}': {e}")
        traceback.print_exc()
        try:
            PromptServer.instance.send_sync("trix-download-progress", {
                "model_name": model_name,
                "progress": 0,
                "status": "failed",
                "error": str(e)
            })
        except Exception:
            pass
    finally:
        with _ACTIVE_DOWNLOADS_LOCK:
            if model_name in _ACTIVE_DOWNLOADS:
                del _ACTIVE_DOWNLOADS[model_name]

@PromptServer.instance.routes.get('/trix/list_input_images')
async def api_list_input_images(request):
    try:
        import folder_paths
        input_dir = folder_paths.get_input_directory()
        files_info = []
        valid_exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff"}

        if os.path.exists(input_dir):
            for root, dirs, files in os.walk(input_dir):
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in valid_exts:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, input_dir).replace("\\", "/")
                        try:
                            mtime = os.path.getmtime(full_path)
                        except Exception:
                            mtime = 0.0
                        files_info.append({
                            "filename": rel_path,
                            "mtime": mtime
                        })

        return web.json_response({"files": files_info})
    except Exception as e:
        print(f"TrixLoader error listing input images: {e}")
        return web.json_response({"files": [], "error": str(e)}, status=500)

@PromptServer.instance.routes.get('/trix/get_presets')
async def api_get_presets(request):
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        presets_path = os.path.join(current_dir, "trix_presets.json")
        if os.path.exists(presets_path):
            with open(presets_path, 'r', encoding='utf-8') as f:
                presets = json.load(f)
        else:
            presets = []
        return web.json_response(presets)
    except Exception as e:
        print(f"TrixLoader error getting presets: {e}")
        return web.json_response([], status=500)

@PromptServer.instance.routes.post('/trix/save_presets')
async def api_save_presets(request):
    try:
        data = await request.json()
        current_dir = os.path.dirname(os.path.abspath(__file__))
        presets_path = os.path.join(current_dir, "trix_presets.json")
        tmp_path = presets_path + ".tmp"
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, presets_path)
        return web.json_response({"status": "ok"})
    except Exception as e:
        print(f"TrixLoader error saving presets: {e}")
        return web.json_response({"error": str(e)}, status=500)

@PromptServer.instance.routes.get('/trix/model_status')
async def api_model_status(request):
    sam_dir = os.path.join(folder_paths.models_dir, "sams")
    dino_dir = os.path.join(folder_paths.models_dir, "grounding-dino")
    bg_dir = os.path.join(folder_paths.models_dir, "RMBG")
    
    sam_models = {
        "sam2.1_hiera_tiny-fp16.safetensors": os.path.exists(os.path.join(sam_dir, "sam2.1_hiera_tiny-fp16.safetensors")),
        "sam2.1_hiera_large-fp16.safetensors": os.path.exists(os.path.join(sam_dir, "sam2.1_hiera_large-fp16.safetensors")),
        "sam3-fp16.safetensors": os.path.exists(os.path.join(sam_dir, "sam3-fp16.safetensors")),
        "groundingdino_swint_ogc.safetensors": os.path.exists(os.path.join(dino_dir, "model.safetensors")) and os.path.exists(os.path.join(dino_dir, "config.json"))
    }
    
    bg_models = {
        "inspyrenet-bf16.safetensors": os.path.exists(os.path.join(bg_dir, "inspyrenet-bf16.safetensors")),
        "Ben2.safetensors": os.path.exists(os.path.join(bg_dir, "Ben2.safetensors")),
        "Birefnet-lite.safetensors": os.path.exists(os.path.join(bg_dir, "Birefnet-lite.safetensors")),
        "Birefnet.safetensors": os.path.exists(os.path.join(bg_dir, "Birefnet.safetensors")),
        "BiRefNet_HR.safetensors": os.path.exists(os.path.join(bg_dir, "BiRefNet_HR.safetensors")),
        "BiRefNet-portrait.safetensors": os.path.exists(os.path.join(bg_dir, "BiRefNet-portrait.safetensors")),
        "birefnet_finetuned_toonout.pth": os.path.exists(os.path.join(bg_dir, "birefnet_finetuned_toonout.pth"))
    }
    
    with _ACTIVE_DOWNLOADS_LOCK:
        active = list(_ACTIVE_DOWNLOADS.keys())
        
    return web.json_response({
        "sam": sam_models,
        "background_removal": bg_models,
        "active_downloads": active
    })
 
def pre_install_cv2_bg():
    def worker():
        try:
            import cv2
        except (ImportError, ModuleNotFoundError):
            print("TrixLoader: Pre-emptively installing OpenCV ('opencv-python') in the background...")
            auto_pip_install("opencv-python")
    
    t = threading.Thread(target=worker, daemon=True)
    t.start()

@PromptServer.instance.routes.post('/trix/download_model')
async def api_download_model(request):
    try:
        pre_install_cv2_bg()
        data = await request.json()
        model_name = data.get("model_name")
        
        if model_name not in MODEL_URLS:
            return web.json_response({"error": f"Unknown model: {model_name}"}, status=400)
            
        folder_name = MODEL_FOLDERS[model_name]
        dest_dir = os.path.join(folder_paths.models_dir, folder_name)
        os.makedirs(dest_dir, exist_ok=True)
        # GroundingDINO saves as model.safetensors (matches HF repo structure)
        if model_name == "groundingdino_swint_ogc.safetensors":
            dest_path = os.path.join(dest_dir, "model.safetensors")
        else:
            dest_path = os.path.join(dest_dir, model_name)
        
        # Check if already exists
        if os.path.exists(dest_path):
            if model_name == "groundingdino_swint_ogc.safetensors":
                if os.path.exists(os.path.join(dest_dir, "config.json")):
                    return web.json_response({"status": "already_exists"})
            else:
                return web.json_response({"status": "already_exists"})
            
        with _ACTIVE_DOWNLOADS_LOCK:
            if model_name in _ACTIVE_DOWNLOADS:
                return web.json_response({"status": "downloading"})
            
            thread = threading.Thread(
                target=download_model_thread,
                args=(MODEL_URLS[model_name], dest_path, model_name, dest_dir)
            )
            _ACTIVE_DOWNLOADS[model_name] = thread
            thread.start()
            
        return web.json_response({"status": "started"})
    except Exception as e:
        traceback.print_exc()
        return web.json_response({"error": str(e)}, status=500)

_PIP_INSTALL_LOCK = threading.Lock()

def auto_pip_install(package_name):
    import sys
    import subprocess
    
    with _PIP_INSTALL_LOCK:
        # Double-check if already installed
        try:
            if package_name == "opencv-python":
                import cv2
            elif package_name == "transparent-background":
                import transparent_background
            else:
                import importlib
                importlib.import_module(package_name.replace("-", "_"))
            print(f"TrixLoader: '{package_name}' is already installed (verified via import). skipping pip.")
            return True
        except (ImportError, ModuleNotFoundError):
            pass

        print(f"TrixLoader: Missing Python package '{package_name}'. Auto-installing via pip...")
        try:
            python_exe = sys.executable
            subprocess.check_call([python_exe, "-m", "pip", "install", package_name])
            print(f"TrixLoader: Successfully installed '{package_name}'!")
            return True
        except Exception as e:
            print(f"TrixLoader: Standard installation of '{package_name}' failed: {e}")
            print("TrixLoader: Attempting fallback installation (installing dependencies without overriding OpenCV)...")
            try:
                python_exe = sys.executable
                # Install known safe dependencies that do not conflict with running cv2
                deps = ["albucore==0.0.24", "pymatting", "timm", "kornia", "gdown", "wget", "easydict", "scipy", "pydantic"]
                for dep in deps:
                    try:
                        if dep.startswith("albucore"):
                            subprocess.check_call([python_exe, "-m", "pip", "install", "--no-deps", dep])
                        else:
                            subprocess.check_call([python_exe, "-m", "pip", "install", dep])
                    except Exception as dep_err:
                        print(f"TrixLoader: Warning: Failed to install dependency '{dep}': {dep_err}")
                
                # Install package with --no-deps to avoid cv2 conflicts
                subprocess.check_call([python_exe, "-m", "pip", "install", "--no-deps", package_name])
                print(f"TrixLoader: Successfully installed '{package_name}' using fallback strategy!")
                return True
            except Exception as fallback_err:
                print(f"TrixLoader: Fallback installation failed: {fallback_err}")
                return False

def import_cv2():
    try:
        import cv2
        return cv2
    except (ImportError, ModuleNotFoundError):
        print("TrixLoader: OpenCV ('opencv-python') is missing. Attempting auto-install...")
        installed = auto_pip_install("opencv-python")
        if installed:
            import importlib
            importlib.invalidate_caches()
            try:
                import cv2
                return cv2
            except Exception:
                pass
        raise ImportError(
            "TrixLoader requires 'opencv-python' for PRO mode post-processing and edge refinement. "
            "Auto-installation failed. Please run 'pip install opencv-python' manually in your python environment."
        )

def auto_install_custom_node(zip_url, folder_name, parent_path=None):
    import urllib.request
    import zipfile
    import shutil
    import tempfile
    import ssl
    
    if parent_path is None:
        parent_path = os.path.abspath(os.path.join(folder_paths.models_dir, "..", "custom_nodes"))
    dest_path = os.path.join(parent_path, folder_name)
    
    if os.path.exists(dest_path):
        return
        
    print(f"TrixLoader: Custom node dependency '{folder_name}' not found. Auto-installing from {zip_url} into {parent_path}...")
    try:
        context = ssl._create_unverified_context()
        req = urllib.request.Request(zip_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=context, timeout=60) as response:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp_file:
                shutil.copyfileobj(response, tmp_file)
                tmp_zip = tmp_file.name
                
        with zipfile.ZipFile(tmp_zip, 'r') as zip_ref:
            top_dir = zip_ref.namelist()[0].split('/')[0]
            zip_ref.extractall(parent_path)
            
        extracted_path = os.path.join(parent_path, top_dir)
        if os.path.exists(dest_path):
            shutil.rmtree(dest_path)
        os.rename(extracted_path, dest_path)
        print(f"TrixLoader: Successfully installed custom node '{folder_name}'!")
        
        try:
            os.remove(tmp_zip)
        except:
            pass
    except Exception as e:
        print(f"TrixLoader: Failed to install custom node '{folder_name}': {e}")
        raise RuntimeError(f"Failed to auto-install custom node dependency '{folder_name}'. (Error: {e})") from e

def import_sam2_libs():
    import sys
    import importlib
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sam2_path = os.path.join(current_dir, "ComfyUI-segment-anything-2")
    
    if not os.path.exists(sam2_path):
        custom_nodes_path = os.path.abspath(os.path.join(folder_paths.models_dir, "..", "custom_nodes"))
        sam2_path = os.path.join(custom_nodes_path, "ComfyUI-segment-anything-2")
        if not os.path.exists(sam2_path):
            try:
                auto_install_custom_node(
                    "https://github.com/Kijai/ComfyUI-segment-anything-2/archive/refs/heads/main.zip",
                    "ComfyUI-segment-anything-2",
                    parent_path=current_dir
                )
                sam2_path = os.path.join(current_dir, "ComfyUI-segment-anything-2")
            except Exception as e:
                try:
                    auto_install_custom_node(
                        "https://github.com/Kijai/ComfyUI-segment-anything-2/archive/refs/heads/main.zip",
                        "ComfyUI-segment-anything-2",
                        parent_path=custom_nodes_path
                    )
                    sam2_path = os.path.join(custom_nodes_path, "ComfyUI-segment-anything-2")
                except Exception as e2:
                    raise ImportError(
                        "SAM 2.1 is missing dependencies. The custom node 'ComfyUI-segment-anything-2' is not installed, "
                        f"and auto-installation failed: {e2}. Please install it manually via ComfyUI Manager."
                    ) from e2

    parent_dir = os.path.dirname(sam2_path)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    try:
        mod = importlib.import_module("ComfyUI-segment-anything-2.load_model")
        return mod.load_model
    except (ImportError, ModuleNotFoundError) as e:
        raise ImportError(
            "SAM 2.1 is missing dependencies. Failed to load 'ComfyUI-segment-anything-2'. "
            "Please reinstall 'ComfyUI-segment-anything-2' and restart ComfyUI."
        ) from e

def get_sam2_predictor(model_name, device):
    global _LOADED_MODELS
    model_key = f"sam2.1_{model_name}"
    
    with _LOADED_MODELS_LOCK:
        if model_key in _LOADED_MODELS:
            predictor = _LOADED_MODELS[model_key]
            predictor.model.to(device)
            return predictor

    offload_other_models(model_key)
    
    load_model_fn = import_sam2_libs()
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sam2_node_path = os.path.abspath(os.path.join(current_dir, "ComfyUI-segment-anything-2"))
    if not os.path.exists(sam2_node_path):
        custom_nodes_path = os.path.abspath(os.path.join(folder_paths.models_dir, "..", "custom_nodes"))
        sam2_node_path = os.path.abspath(os.path.join(custom_nodes_path, "ComfyUI-segment-anything-2"))
    
    sam_dir = os.path.join(folder_paths.models_dir, "sams")
    model_path = os.path.join(sam_dir, model_name)
    
    cfg_filename = "sam2.1_hiera_t.yaml" if "tiny" in model_name else "sam2.1_hiera_l.yaml"
    model_cfg_path = os.path.join(sam2_node_path, "sam2_configs", cfg_filename)
    
    print(f"TrixLoader: Loading SAM2.1 model {model_name} from {model_path} on {device}...")
    dtype = torch.float16 if device == "cuda" else torch.float32
    predictor = load_model_fn(
        model_path=model_path,
        model_cfg_path=model_cfg_path,
        segmentor="single_image",
        dtype=dtype,
        device=device
    )
    
    with _LOADED_MODELS_LOCK:
        _LOADED_MODELS[model_key] = predictor
    return predictor

def import_sam3_libs():
    import sys
    import importlib
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sam3_path = os.path.join(current_dir, "comfyui-easy-sam3")
    
    if not os.path.exists(sam3_path):
        custom_nodes_path = os.path.abspath(os.path.join(folder_paths.models_dir, "..", "custom_nodes"))
        sam3_path = os.path.join(custom_nodes_path, "comfyui-easy-sam3")
        if not os.path.exists(sam3_path):
            try:
                auto_install_custom_node(
                    "https://github.com/yolain/comfyui-easy-sam3/archive/refs/heads/main.zip",
                    "comfyui-easy-sam3",
                    parent_path=current_dir
                )
                sam3_path = os.path.join(current_dir, "comfyui-easy-sam3")
            except Exception as e:
                try:
                    auto_install_custom_node(
                        "https://github.com/yolain/comfyui-easy-sam3/archive/refs/heads/main.zip",
                        "comfyui-easy-sam3",
                        parent_path=custom_nodes_path
                    )
                    sam3_path = os.path.join(custom_nodes_path, "comfyui-easy-sam3")
                except Exception as e2:
                    raise ImportError(
                        "SAM 3 is missing dependencies. The custom node 'comfyui-easy-sam3' is not installed, "
                        f"and auto-installation failed: {e2}. Please install it manually via ComfyUI Manager."
                    ) from e2

    sam3_deps = {
        "torchvision": "torchvision",
        "timm": "timm",
        "ftfy": "ftfy",
        "regex": "regex",
        "iopath": "iopath",
        "einops": "einops",
        "decord": "decord",
        "pycocotools": "pycocotools",
        "scipy": "scipy",
        "scikit-image": "skimage",
        "scikit-learn": "sklearn",
        "pandas": "pandas",
        "open-clip-torch": "open_clip"
    }
    for pip_name, import_name in sam3_deps.items():
        try:
            __import__(import_name)
        except (ImportError, ModuleNotFoundError):
            auto_pip_install(pip_name)

    easy_sam3_path = os.path.abspath(sam3_path)
    
    if easy_sam3_path not in sys.path:
        sys.path.insert(0, easy_sam3_path)
        
    if 'sam3' in sys.modules:
        mod = sys.modules['sam3']
        if hasattr(mod, '__file__') and mod.__file__ and not mod.__file__.startswith(easy_sam3_path):
            print(f"TrixLoader: Removing conflicting 'sam3' from sys.modules ({mod.__file__})")
            for key in list(sys.modules.keys()):
                if key == 'sam3' or key.startswith('sam3.'):
                    del sys.modules[key]

    # Auto-download CLIP vocabulary if missing
    sam3_assets_dir = os.path.join(easy_sam3_path, "sam3", "assets")
    bpe_path = os.path.join(sam3_assets_dir, "bpe_simple_vocab_16e6.txt.gz")
    if not os.path.exists(bpe_path):
        print(f"TrixLoader: BPE vocabulary missing. Downloading to {bpe_path}...")
        try:
            os.makedirs(sam3_assets_dir, exist_ok=True)
            import urllib.request
            import ssl
            url = "https://github.com/openai/CLIP/raw/main/clip/bpe_simple_vocab_16e6.txt.gz"
            ssl_context = ssl._create_unverified_context()
            with urllib.request.urlopen(url, context=ssl_context) as response, open(bpe_path, "wb") as out_file:
                out_file.write(response.read())
            print("TrixLoader: BPE vocabulary downloaded successfully.")
        except Exception as e:
            print(f"TrixLoader: Error downloading BPE vocabulary: {e}")

    # Mock Triton if missing to prevent compile/import errors
    try:
        import triton
    except ImportError:
        import types
        import importlib.machinery
        spec = importlib.machinery.ModuleSpec("triton", None)
        triton_mock = types.ModuleType("triton")
        triton_mock.__spec__ = spec
        triton_mock.language = types.ModuleType("triton.language")
        triton_mock.language.__spec__ = importlib.machinery.ModuleSpec("triton.language", None)
        triton_mock.language.constexpr = None
        triton_mock.jit = lambda *args, **kwargs: (lambda f: f)
        triton_mock.autotune = lambda *args, **kwargs: (lambda f: f)
        triton_mock.Config = lambda *args, **kwargs: None
        triton_mock.is_mock = True
        sys.modules["triton"] = triton_mock
        sys.modules["triton.language"] = triton_mock.language
        print("TrixLoader: Triton was not found. Injected dummy triton mocks with ModuleSpec to allow compilation.")

    # Monkey-patch sdpa_kernel to ensure other backends are appended for Flash Attention fallbacks
    try:
        import torch
        from torch.nn.attention import SDPBackend, sdpa_kernel
        original_sdpa_kernel = torch.nn.attention.sdpa_kernel
        
        def patched_sdpa_kernel(backends):
            new_backends = [SDPBackend.MATH, SDPBackend.EFFICIENT_ATTENTION]
            if isinstance(backends, (list, tuple, set)):
                for b in backends:
                    if b not in new_backends:
                        new_backends.append(b)
            else:
                if backends not in new_backends:
                    new_backends.append(backends)
            return original_sdpa_kernel(new_backends)
            
        torch.nn.attention.sdpa_kernel = patched_sdpa_kernel
        print("TrixLoader: Monkey-patched sdpa_kernel for robust attention fallbacks.")
    except Exception as e:
        print(f"TrixLoader: Failed to patch sdpa_kernel: {e}")
                    
    try:
        from sam3.model_builder import build_sam3_image_model
        from sam3.model.sam3_image_processor import Sam3Processor
        return build_sam3_image_model, Sam3Processor
    except (ImportError, ModuleNotFoundError) as err:
        raise ImportError(
            "SAM 3 is missing dependencies. Failed to load 'comfyui-easy-sam3'. "
            "Please reinstall 'comfyui-easy-sam3' and restart ComfyUI."
        ) from err

def move_tensor_to_device(val, device):
    if isinstance(val, torch.Tensor):
        try:
            if val.dtype in (torch.float16, torch.float32, torch.float64):
                if device == "cpu":
                    if val.dtype == torch.float16:
                        val = val.float()
                else:
                    if val.dtype == torch.float32:
                        val = val.half()
            return val.to(device)
        except Exception:
            try:
                return val.to(device)
            except Exception:
                return val
    elif isinstance(val, list):
        return [move_tensor_to_device(item, device) for item in val]
    elif isinstance(val, tuple):
        return tuple(move_tensor_to_device(item, device) for item in val)
    elif isinstance(val, dict):
        return {k: move_tensor_to_device(v, device) for k, v in val.items()}
    elif hasattr(val, "__dict__") and not isinstance(val, torch.nn.Module):
        for k, v in list(val.__dict__.items()):
            val.__dict__[k] = move_tensor_to_device(v, device)
        return val
    return val

def move_custom_tensors(module, device):
    for name, val in list(module.__dict__.items()):
        module.__dict__[name] = move_tensor_to_device(val, device)
    for child in module.children():
        move_custom_tensors(child, device)

def move_processor_tensors(processor, device):
    # 1. Move model parameters and buffers
    processor.model.to(device)
    if device == "cpu":
        processor.model.float()
    else:
        processor.model.half()
        
    # 2. Move custom model tensors (e.g. RoPE freqs, coord_cache, compilable_cord_cache)
    move_custom_tensors(processor.model, device)
    
    # 3. Update device string
    processor.device = device
    
    # 4. Move find_stage and other helper tensors
    if hasattr(processor, "__dict__"):
        for name, val in list(processor.__dict__.items()):
            if not isinstance(val, torch.nn.Module):
                processor.__dict__[name] = move_tensor_to_device(val, device)

def get_sam3_predictor(device):
    global _LOADED_MODELS
    model_key = "sam3-fp16.safetensors"
    
    with _LOADED_MODELS_LOCK:
        if model_key in _LOADED_MODELS:
            processor = _LOADED_MODELS[model_key]
            move_processor_tensors(processor, device)
            return processor

    offload_other_models(model_key)
    
    build_sam3_image_model, Sam3Processor = import_sam3_libs()
    
    sam_dir = os.path.join(folder_paths.models_dir, "sams")
    checkpoint_path = os.path.join(sam_dir, "sam3-fp16.safetensors")
    
    print(f"TrixLoader: Loading SAM3 model from {checkpoint_path} on {device}...")
    model = build_sam3_image_model(
        device=device,
        eval_mode=True,
        checkpoint_path=checkpoint_path,
        load_from_HF=False,
        enable_segmentation=True,
        enable_inst_interactivity=False,
        compile=False
    )
    
    processor = Sam3Processor(
        model=model,
        resolution=1008,
        confidence_threshold=0.3,
        device=device
    )
    
    move_processor_tensors(processor, device)
    
    with _LOADED_MODELS_LOCK:
        _LOADED_MODELS[model_key] = processor
    return processor

def get_groundingdino_model(device):
    global _LOADED_MODELS
    model_key = "groundingdino_swint_ogc.safetensors"
    
    with _LOADED_MODELS_LOCK:
        if model_key in _LOADED_MODELS:
            processor, model = _LOADED_MODELS[model_key]
            model.to(device)
            return processor, model

    offload_other_models(model_key)
    
    try:
        from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
        from huggingface_hub import snapshot_download
    except (ImportError, ModuleNotFoundError):
        print("TrixLoader: transformers or huggingface_hub is missing. Attempting auto-install...")
        installed_tr = auto_pip_install("transformers")
        installed_hf = auto_pip_install("huggingface_hub")
        if installed_tr and installed_hf:
            import importlib
            importlib.invalidate_caches()
            from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
            from huggingface_hub import snapshot_download
        else:
            raise ImportError(
                "GroundingDINO requires the 'transformers' and 'huggingface_hub' packages. "
                "Auto-installation failed. Please run 'pip install transformers huggingface_hub' manually."
            )
    
    dino_dir = os.path.join(folder_paths.models_dir, "grounding-dino")
    
    # Auto-download from Hugging Face if files are missing locally (need model and config files)
    if not os.path.exists(dino_dir) or not os.path.exists(os.path.join(dino_dir, "model.safetensors")) or not os.path.exists(os.path.join(dino_dir, "config.json")):
        print(f"TrixLoader: GroundingDINO model or config files not found locally in {dino_dir}. Downloading automatically...")
        try:
            snapshot_download_with_progress(
                repo_id="IDEA-Research/grounding-dino-tiny",
                local_dir=dino_dir,
                model_name=model_key,
                use_mirror=locale_is_ru()
            )
        except Exception as conn_err:
            raise RuntimeError(
                f"Failed to auto-download GroundingDINO config files from Hugging Face. "
                f"Please ensure you have an active internet connection. (Error: {conn_err})"
            ) from conn_err
        
    print(f"TrixLoader: Loading GroundingDINO SwinT OGC model from local folder {dino_dir} on {device}...")
    try:
        processor = AutoProcessor.from_pretrained(dino_dir)
        model = AutoModelForZeroShotObjectDetection.from_pretrained(dino_dir)
    except Exception as load_err:
        raise RuntimeError(
            f"Failed to initialize GroundingDINO model from {dino_dir}. (Error: {load_err})"
        ) from load_err
    
    model.to(device)
    model.eval()
    
    with _LOADED_MODELS_LOCK:
        _LOADED_MODELS[model_key] = (processor, model)
    return processor, model

@PromptServer.instance.routes.post('/trix/load_model')
async def api_load_model(request):
    try:
        data = await request.json()
        model_name = data.get("model")
        image_filename = data.get("image")
        
        if not model_name:
            return web.json_response({"status": "error", "error": "Missing model parameter"}, status=400)
            
        device_selection = data.get("device", "AUTO")
        if device_selection == "GPU":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        elif device_selection == "CPU":
            device = "cpu"
        else:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        def do_load():
            global _CURRENT_SAM3_STATE, _CURRENT_SAM3_IMAGE, _CURRENT_SAM3_DEVICE, _CURRENT_SAM3_MTIME, _CURRENT_SAM3_SIZE, _CURRENT_SAM3_CROP_BOUNDS, _CURRENT_SAM2_CACHE
            if "sam2.1" in model_name:
                predictor = get_sam2_predictor(model_name, device)
                if image_filename:
                    image_path = folder_paths.get_annotated_filepath(image_filename)
                    if os.path.exists(image_path):
                        img = Image.open(image_path).convert("RGB")
                        print("TrixLoader: Pre-computing SAM2.1 features during model load...")
                        dtype = torch.float16 if device == "cuda" else torch.float32
                        autocast_ctx = torch.autocast("cuda", dtype=dtype) if device == "cuda" else nullcontext()
                        with autocast_ctx:
                            predictor.set_image(img)
                        try:
                            stat = os.stat(image_path)
                            mtime = stat.st_mtime
                            size = stat.st_size
                        except Exception:
                            mtime = 0.0
                            size = 0
                        _CURRENT_SAM2_CACHE[f"sam2.1_{model_name}"] = {
                            "image_path": image_path,
                            "mtime": mtime,
                            "size": size,
                            "crop_bounds": None
                        }
            elif "sam3" in model_name:
                if _CURRENT_SAM3_DEVICE != device:
                    _CURRENT_SAM3_STATE = None
                    _CURRENT_SAM3_IMAGE = None
                    _CURRENT_SAM3_DEVICE = device
                    _CURRENT_SAM3_MTIME = 0.0
                    _CURRENT_SAM3_SIZE = 0
                    _CURRENT_SAM3_CROP_BOUNDS = None
                processor = get_sam3_predictor(device)
                if image_filename:
                    image_path = folder_paths.get_annotated_filepath(image_filename)
                    if os.path.exists(image_path):
                        img = Image.open(image_path).convert("RGB")
                        print("TrixLoader: Pre-computing SAM3 features during model load...")
                        dtype = torch.float16 if device == "cuda" else torch.float32
                        autocast_ctx = torch.autocast("cuda", dtype=dtype) if device == "cuda" else nullcontext()
                        with autocast_ctx:
                            _CURRENT_SAM3_STATE = processor.set_image(img)
                        _CURRENT_SAM3_IMAGE = image_path
                        try:
                            stat = os.stat(image_path)
                            _CURRENT_SAM3_MTIME = stat.st_mtime
                            _CURRENT_SAM3_SIZE = stat.st_size
                        except Exception:
                            _CURRENT_SAM3_MTIME = 0.0
                            _CURRENT_SAM3_SIZE = 0
                        _CURRENT_SAM3_CROP_BOUNDS = None
                        
        await asyncio.to_thread(do_load)
        return web.json_response({"status": "success"})
    except Exception as e:
        traceback.print_exc()
        return web.json_response({"status": "error", "error": str(e)}, status=500)

def postprocess_mask_pro(mask_np, input_points=None):
    try:
        cv2 = import_cv2()
        if mask_np is None or mask_np.size == 0:
            return mask_np
            
        print("TrixLoader: Running SAM PRO Mode post-processing...")
        
        # 1. Median blur to eliminate checkerboard and salt-and-pepper noise
        mask_np = cv2.medianBlur(mask_np, 5)
        
        # 2. Morphological closing to fill small holes and gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask_np = cv2.morphologyEx(mask_np, cv2.MORPH_CLOSE, kernel)
        
        # 3. Connected components analysis
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_np, connectivity=8)
        
        keep_labels = set()
        if input_points and len(input_points) > 0:
            for pt in input_points:
                px, py = int(pt[0]), int(pt[1])
                # Check a 5x5 window around the click
                found = False
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        cx = max(0, min(px + dx, mask_np.shape[1] - 1))
                        cy = max(0, min(py + dy, mask_np.shape[0] - 1))
                        lbl = labels[cy, cx]
                        if lbl > 0:
                            keep_labels.add(lbl)
                            found = True
                            break
                    if found:
                        break
                        
        cleaned_count = 0
        kept_count = 0
        if len(keep_labels) > 0:
            mask_pro = np.zeros_like(mask_np)
            for lbl in keep_labels:
                mask_pro[labels == lbl] = 255
            kept_count = len(keep_labels)
            cleaned_count = (num_labels - 1) - kept_count
            mask_np = mask_pro
        else:
            # For text prompts or when no label was hit by points, keep labels based on minimum area threshold
            min_area = int(mask_np.shape[0] * mask_np.shape[1] * 0.001)
            min_area = max(100, min_area)
            mask_pro = np.zeros_like(mask_np)
            for lbl in range(1, num_labels):
                if stats[lbl, cv2.CC_STAT_AREA] >= min_area:
                    mask_pro[labels == lbl] = 255
                    kept_count += 1
            cleaned_count = (num_labels - 1) - kept_count
            mask_np = mask_pro
            
        # 4. A final morphological opening to smooth edges
        mask_np = cv2.morphologyEx(mask_np, cv2.MORPH_OPEN, kernel)
        
        print(f"TrixLoader: PRO Mode complete. Detected {num_labels - 1} components, kept {kept_count}, discarded {cleaned_count} background noise islands.")
        return mask_np
    except Exception as e:
        print(f"TrixLoader: PRO mode post-processing failed: {e}")
        return mask_np

@PromptServer.instance.routes.post('/trix/sam_predict')
async def api_sam_predict(request):
    try:
        data = await request.json()
        image_filename = data.get("image")
        model_name = data.get("model")
        
        points_data = data.get("points", None)
        if points_data is not None:
            input_points = []
            for pt in points_data:
                if pt is not None and len(pt) >= 2 and pt[0] is not None and pt[1] is not None:
                    input_points.append([float(pt[0]), float(pt[1])])
        else:
            x_val = data.get("x")
            y_val = data.get("y")
            x = float(x_val) if x_val is not None else 0.0
            y = float(y_val) if y_val is not None else 0.0
            input_points = [[x, y]]
            
        threshold_val = data.get("threshold")
        threshold = float(threshold_val) if threshold_val is not None else 0.0
        
        text_prompt = data.get("text_prompt", "").strip()
        
        is_hover = data.get("is_hover", False)
        if "sam3" in model_name:
            model_key = "sam3-fp16.safetensors"
        else:
            model_key = f"sam2.1_{model_name}"
        is_loaded = False
        with _LOADED_MODELS_LOCK:
            is_loaded = model_key in _LOADED_MODELS
            
        if is_hover and not is_loaded:
            return web.json_response({"status": "not_loaded"})
            
        image_path = folder_paths.get_annotated_filepath(image_filename)
        img = Image.open(image_path).convert("RGB")
        
        device_selection = data.get("device", "AUTO")
        if device_selection == "GPU":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        elif device_selection == "CPU":
            device = "cpu"
        else:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            
        # Get image metadata for caching
        try:
            stat = os.stat(image_path)
            mtime = stat.st_mtime
            size = stat.st_size
        except Exception:
            mtime = 0.0
            size = 0

        image_width = data.get("image_width")
        image_height = data.get("image_height")
        pro = data.get("pro", False)
        pro_crop = data.get("pro_crop", None)

        w_img, h_img = img.size  # original PIL size

        scale_x = w_img / float(image_width) if image_width else 1.0
        scale_y = h_img / float(image_height) if image_height else 1.0

        crop_bounds = None
        if pro and pro_crop is not None:
            crop_x = float(pro_crop.get("x", 0.0))
            crop_y = float(pro_crop.get("y", 0.0))
            crop_w = float(pro_crop.get("width", 0.0))
            crop_h = float(pro_crop.get("height", 0.0))

            x0 = int(round(crop_x * scale_x))
            y0 = int(round(crop_y * scale_y))
            w0 = int(round(crop_w * scale_x))
            h0 = int(round(crop_h * scale_y))

            x0 = max(0, min(x0, w_img - 1))
            y0 = max(0, min(y0, h_img - 1))
            x1 = max(x0 + 1, min(x0 + w0, w_img))
            y1 = max(y0 + 1, min(y0 + h0, h_img))

            crop_bounds = (x0, y0, x1, y1)

        # Prepare image and points for inference
        if crop_bounds is not None:
            x0, y0, x1, y1 = crop_bounds
            img_for_inference = img.crop((x0, y0, x1, y1))
            crop_w_backend = x1 - x0
            crop_h_backend = y1 - y0

            inference_points = []
            for pt in input_points:
                px = pt[0] * scale_x - x0
                py = pt[1] * scale_y - y0
                px = max(0.0, min(px, float(crop_w_backend - 1)))
                py = max(0.0, min(py, float(crop_h_backend - 1)))
                inference_points.append([px, py])
        else:
            img_for_inference = img
            inference_points = []
            for pt in input_points:
                px = pt[0] * scale_x
                py = pt[1] * scale_y
                px = max(0.0, min(px, float(w_img - 1)))
                py = max(0.0, min(py, float(h_img - 1)))
                inference_points.append([px, py])
        
        def run_inference():
            def finalize_mask(mask):
                if crop_bounds is not None:
                    x0, y0, x1, y1 = crop_bounds
                    full_mask = np.zeros((h_img, w_img), dtype=bool)
                    full_mask[y0:y1, x0:x1] = mask
                    mask = full_mask
                return (mask * 255).astype(np.uint8)

            # 1. SAM 2.1 TEXT PROMPT via GroundingDINO
            if "sam2.1" in model_name and text_prompt:
                dino_device = device
                processor, dino_model = get_groundingdino_model(dino_device)
                
                prompt_str = text_prompt.lower()
                if not prompt_str.endswith("."):
                    prompt_str += "."
                    
                inputs = processor(images=img_for_inference, text=prompt_str, return_tensors="pt").to(dino_device)
                with torch.no_grad():
                    outputs = dino_model(**inputs)
                    
                import inspect
                post_process_args = {
                    "outputs": outputs,
                    "input_ids": inputs.input_ids,
                    "text_threshold": 0.25,
                    "target_sizes": [img_for_inference.size[::-1]]
                }
                sig = inspect.signature(processor.post_process_grounded_object_detection)
                if "box_threshold" in sig.parameters:
                    post_process_args["box_threshold"] = threshold
                else:
                    post_process_args["threshold"] = threshold
                    
                results = processor.post_process_grounded_object_detection(**post_process_args)
                
                boxes = results[0]["boxes"]
                
                predictor = get_sam2_predictor(model_name, device)
                
                # Autocast context for float16 models on CUDA
                dtype = torch.float16 if device == "cuda" else torch.float32
                autocast_ctx = torch.autocast("cuda", dtype=dtype) if device == "cuda" else nullcontext()
                
                with autocast_ctx:
                    predictor.set_image(img_for_inference)
                
                h, w = img_for_inference.height, img_for_inference.width
                combined_mask = np.zeros((h, w), dtype=bool)
                
                if len(boxes) > 0:
                    print(f"TrixLoader: GroundingDINO detected {len(boxes)} boxes for '{text_prompt}'")
                    eps = 1e-8
                    logit_threshold = np.log(threshold / (1.0 - threshold + eps))
                    for box in boxes:
                        box_np = box.cpu().numpy()
                        with autocast_ctx:
                            masks, _, _ = predictor.predict(
                                box=box_np,
                                multimask_output=False,
                                return_logits=True
                            )
                        best_logits = masks[0]
                        if hasattr(best_logits, "cpu"):
                            best_logits = best_logits.cpu().numpy()
                        combined_mask = np.maximum(combined_mask, best_logits > logit_threshold)
                else:
                    print(f"TrixLoader: GroundingDINO did not detect any objects for '{text_prompt}'")
                    
                return finalize_mask(combined_mask)

            # 2. SAM 3 (TEXT & CLICK PROMPT)
            elif "sam3" in model_name:
                global _CURRENT_SAM3_STATE, _CURRENT_SAM3_IMAGE, _CURRENT_SAM3_DEVICE, _CURRENT_SAM3_MTIME, _CURRENT_SAM3_SIZE, _CURRENT_SAM3_CROP_BOUNDS
                
                if _CURRENT_SAM3_DEVICE != device:
                    _CURRENT_SAM3_STATE = None
                    _CURRENT_SAM3_IMAGE = None
                    _CURRENT_SAM3_DEVICE = device
                    _CURRENT_SAM3_MTIME = 0.0
                    _CURRENT_SAM3_SIZE = 0
                    _CURRENT_SAM3_CROP_BOUNDS = None
                
                # Clean up cached GPU memory fragments
                try:
                    import comfy.model_management
                    comfy.model_management.soft_empty_cache()
                    import gc
                    gc.collect()
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception as e:
                    print(f"TrixLoader: Failed to clear cache: {e}")
                    
                processor = get_sam3_predictor(device)
                processor.set_confidence_threshold(min(0.25, threshold))
                
                # Autocast context for float16 models on CUDA
                dtype = torch.float16 if device == "cuda" else torch.float32
                autocast_ctx = torch.autocast("cuda", dtype=dtype) if device == "cuda" else nullcontext()
                
                if text_prompt:
                    text_prompts = [p.strip() for p in text_prompt.split(',') if p.strip()]
                    h, w = img_for_inference.height, img_for_inference.width
                    combined_mask = np.zeros((h, w), dtype=bool)
                    
                    # Compute image embedding ONCE
                    with autocast_ctx:
                        base_state = processor.set_image(img_for_inference)
                    
                    for single_prompt in text_prompts:
                        # Copy the state to avoid polluting features across prompts
                        state = {
                            'original_height': base_state['original_height'],
                            'original_width': base_state['original_width'],
                            'backbone_out': dict(base_state['backbone_out'])
                        }
                        with autocast_ctx:
                            state = processor.set_text_prompt(single_prompt, state)
                        
                        masks_logits = state.get('masks_logits', None)
                        if masks_logits is not None and len(masks_logits) > 0:
                            for m_tensor in masks_logits:
                                m_np = m_tensor[0].cpu().numpy() > threshold
                                combined_mask = np.maximum(combined_mask, m_np)
                        else:
                            masks = state.get('masks', None)
                            if masks is not None and len(masks) > 0:
                                for m_tensor in masks:
                                    m_np = m_tensor[0].cpu().numpy() > 0.5
                                    combined_mask = np.maximum(combined_mask, m_np)
                                
                    return finalize_mask(combined_mask)
                else:
                    is_sam3_cache_valid = (
                        _CURRENT_SAM3_IMAGE == image_path and
                        _CURRENT_SAM3_STATE is not None and
                        _CURRENT_SAM3_MTIME == mtime and
                        _CURRENT_SAM3_SIZE == size and
                        _CURRENT_SAM3_CROP_BOUNDS == crop_bounds
                    )
                    
                    if not is_sam3_cache_valid:
                        print("TrixLoader: Computing image embedding for SAM3...")
                        with autocast_ctx:
                            _CURRENT_SAM3_STATE = processor.set_image(img_for_inference)
                        _CURRENT_SAM3_IMAGE = image_path
                        _CURRENT_SAM3_MTIME = mtime
                        _CURRENT_SAM3_SIZE = size
                        _CURRENT_SAM3_CROP_BOUNDS = crop_bounds
                        
                    # Extract fresh, unpolluted copy of cached state features
                    state = {
                        'original_height': _CURRENT_SAM3_STATE['original_height'],
                        'original_width': _CURRENT_SAM3_STATE['original_width'],
                        'backbone_out': dict(_CURRENT_SAM3_STATE['backbone_out'])
                    }
                    
                    if len(inference_points) > 0:
                        # Normalize point coordinates to [0, 1] range for SAM 3
                        w_inference, h_inference = img_for_inference.size
                        point_coords = [[float(pt[0]) / w_inference, float(pt[1]) / h_inference] for pt in inference_points]
                        point_labels = [1] * len(inference_points)
                        with autocast_ctx:
                            state = processor.add_point_prompt(point_coords, point_labels, state)
                        
                        masks_logits = state.get('masks_logits', None)
                        scores = state.get('scores', None)
                        h, w = img_for_inference.height, img_for_inference.width
                        combined_mask = np.zeros((h, w), dtype=bool)
                        
                        if masks_logits is not None and len(masks_logits) > 0:
                            best_idx = torch.argmax(scores).item()
                            best_mask = masks_logits[best_idx, 0].cpu().numpy() > threshold
                            combined_mask = best_mask
                        else:
                            masks = state.get('masks', None)
                            if masks is not None and len(masks) > 0:
                                best_idx = torch.argmax(scores).item()
                                best_mask = masks[best_idx, 0].cpu().numpy() > 0.5
                                combined_mask = best_mask
                    else:
                        combined_mask = np.zeros((img_for_inference.height, img_for_inference.width), dtype=bool)
                        
                    return finalize_mask(combined_mask)

            # 3. SAM 2.1 CLICK PROMPT
            else:
                predictor = get_sam2_predictor(model_name, device)
                
                # Autocast context for float16 models on CUDA
                dtype = torch.float16 if device == "cuda" else torch.float32
                autocast_ctx = torch.autocast("cuda", dtype=dtype) if device == "cuda" else nullcontext()
                
                # Check if we can reuse the set image
                global _CURRENT_SAM2_CACHE
                cache_key = model_key
                cached = _CURRENT_SAM2_CACHE.get(cache_key)
                
                is_cache_valid = (
                    cached is not None and
                    cached.get("image_path") == image_path and
                    cached.get("mtime") == mtime and
                    cached.get("size") == size and
                    cached.get("crop_bounds") == crop_bounds
                )
                
                if not is_cache_valid:
                    print(f"TrixLoader: Computing image embedding for SAM2.1 ({model_name})...")
                    with autocast_ctx:
                        predictor.set_image(img_for_inference)
                    _CURRENT_SAM2_CACHE[cache_key] = {
                        "image_path": image_path,
                        "mtime": mtime,
                        "size": size,
                        "crop_bounds": crop_bounds
                    }
                else:
                    print(f"TrixLoader: Using cached image embedding for SAM2.1 ({model_name}).")
                
                h, w = img_for_inference.height, img_for_inference.width
                combined_mask = np.zeros((h, w), dtype=bool)
                
                if len(inference_points) > 0:
                    point_coords = np.array(inference_points, dtype=np.float32)
                    point_labels = np.ones(len(inference_points), dtype=np.int32)
                    
                    with autocast_ctx:
                        masks, scores, _ = predictor.predict(
                            point_coords=point_coords,
                            point_labels=point_labels,
                            multimask_output=True,
                            return_logits=True
                        )
                    
                    best_idx = np.argmax(scores)
                    eps = 1e-8
                    logit_threshold = np.log(threshold / (1.0 - threshold + eps))
                    best_logits = masks[best_idx]
                    if hasattr(best_logits, "cpu"):
                        best_logits = best_logits.cpu().numpy()
                    combined_mask = best_logits > logit_threshold
                    
                return finalize_mask(combined_mask)

        def run_inference_locked():
            with _SAM_INFERENCE_LOCK:
                return run_inference()

        mask_np = await asyncio.to_thread(run_inference_locked)
        
        if pro:
            is_text_only = bool(text_prompt) and (data.get("x") is None) and (points_data is None)
            pts_for_pro = None if is_text_only else [[pt[0] * scale_x, pt[1] * scale_y] for pt in input_points]
            mask_np = await asyncio.to_thread(postprocess_mask_pro, mask_np, pts_for_pro)
        
        # We keep the active model in GPU VRAM during the session for instant clicks.
        # It will be offloaded manually when the editor is closed.
            
        mask_img = Image.fromarray(mask_np, mode="L")
        
        buffered = BytesIO()
        mask_img.save(buffered, format="PNG", compress_level=1)
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return web.json_response({"status": "success", "mask": img_str})
    except Exception as e:
        traceback.print_exc()
        return web.json_response({"status": "error", "error": str(e)}, status=500)


def get_inspyrenet_remover(device):
    global _LOADED_MODELS
    model_key = "inspyrenet-bf16.safetensors"
    
    with _LOADED_MODELS_LOCK:
        if model_key in _LOADED_MODELS:
            remover = _LOADED_MODELS[model_key]
            remover.model.to(device)
            return remover
            
    offload_other_models(model_key)
    
    def patch_albucore_numpy2():
        try:
            import sys
            import numpy as np
            patched_dicts = []
            for mod_name in ["albucore", "albucore.utils"]:
                try:
                    __import__(mod_name)
                    mod = sys.modules[mod_name]
                    for dct_name in ["MAX_VALUES_BY_DTYPE", "NPDTYPE_TO_OPENCV_DTYPE"]:
                        if hasattr(mod, dct_name):
                            dct = getattr(mod, dct_name)
                            if isinstance(dct, dict) and id(dct) not in patched_dicts:
                                patched_dicts.append(id(dct))
                                # Select appropriate dtype mappings to force into the dictionary
                                if dct_name == "MAX_VALUES_BY_DTYPE":
                                    mappings = {
                                        "uint8": 255,
                                        "uint16": 65535,
                                        "uint32": 4294967295,
                                        "float16": 1.0,
                                        "float32": 1.0,
                                        "float64": 1.0,
                                        "int32": 2147483647,
                                    }
                                elif dct_name == "NPDTYPE_TO_OPENCV_DTYPE":
                                    mappings = {
                                        "uint8": 0,
                                        "int8": 1,
                                        "uint16": 2,
                                        "int16": 3,
                                        "int32": 4,
                                        "float32": 5,
                                        "float64": 6,
                                    }
                                else:
                                    mappings = {}
                                
                                for t_name, val in mappings.items():
                                    try:
                                        t_class = getattr(np, t_name)
                                        dt = np.dtype(t_class)
                                        dct[t_class] = val
                                        dct[dt] = val
                                    except Exception:
                                        pass
                except Exception as e:
                    print(f"TrixLoader: albucore pre-patch failed for {mod_name}: {e}")
            print(f"TrixLoader: successfully patched {len(patched_dicts)} dictionary objects for NumPy 2.x compatibility.")
        except Exception as e:
            print(f"TrixLoader: patch_albucore_numpy2 error: {e}")

    patch_albucore_numpy2()
    try:
        import transparent_background
        from transparent_background.utils import load_config
        import shutil
        from transparent_background.InSPyReNet import InSPyReNet_SwinB
        from safetensors.torch import load_file
        from transparent_background.utils import static_resize, tonumpy, normalize, totensor
        import albumentations as A
        import albumentations.pytorch as AP
        import torchvision.transforms as transforms
    except (ImportError, ModuleNotFoundError, KeyError):
        print("TrixLoader: transparent-background or albumentations is missing or incompatible. Attempting auto-install...")
        installed_tb = auto_pip_install("transparent-background")
        installed_al = auto_pip_install("albumentations")
        if installed_tb and installed_al:
            import importlib
            importlib.invalidate_caches()
            patch_albucore_numpy2()
            import transparent_background
            from transparent_background.utils import load_config
            import shutil
            from transparent_background.InSPyReNet import InSPyReNet_SwinB
            from safetensors.torch import load_file
            from transparent_background.utils import static_resize, tonumpy, normalize, totensor
            import albumentations as A
            import albumentations.pytorch as AP
            import torchvision.transforms as transforms
        else:
            raise ImportError(
                "InSPyReNet background removal requires the 'transparent-background' and 'albumentations' packages. "
                "Auto-installation failed. Please run 'pip install transparent-background albumentations' manually."
            )
    
    class CustomInspyrenetRemover(transparent_background.Remover):
        def __init__(self, mode="base", device=None, ckpt_path=None):
            repopath = os.path.dirname(transparent_background.__file__)
            cfg_path = os.environ.get('TRANSPARENT_BACKGROUND_FILE_PATH', os.path.abspath(os.path.expanduser('~')))
            home_dir = os.path.join(cfg_path, ".transparent-background")
            os.makedirs(home_dir, exist_ok=True)
            if not os.path.isfile(os.path.join(home_dir, "config.yaml")):
                shutil.copy(os.path.join(repopath, "config.yaml"), os.path.join(home_dir, "config.yaml"))
            self.meta = load_config(os.path.join(home_dir, "config.yaml"))[mode]

            self.device = device if device is not None else ("cuda:0" if torch.cuda.is_available() else "cpu")
            
            self.model = InSPyReNet_SwinB(depth=64, pretrained=False, threshold=None, **self.meta)
            print(f"TrixLoader: Loading InSPyReNet weights from {ckpt_path}...")
            state_dict = load_file(ckpt_path)
            self.model.load_state_dict(state_dict, strict=True)
            self.model.eval()
            self.model = self.model.to(self.device)
            
            resize_tf = static_resize(self.meta.base_size)
            resize_fn = A.Resize(*self.meta.base_size)
            self.transform = transforms.Compose([
                resize_tf,
                tonumpy(),
                normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                totensor(),
            ])
            self.cv2_transform = A.Compose([
                resize_fn,
                A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                AP.ToTensorV2(),
            ])
            self.background = {'img': None, 'name': None, 'shape': None}
            self.matting_fn = None  # Disabled slow CPU alpha matting to make it run instantly

    bg_dir = os.path.join(folder_paths.models_dir, "RMBG")
    weights_path = os.path.join(bg_dir, "inspyrenet-bf16.safetensors")
    
    remover = CustomInspyrenetRemover(mode="base", device=device, ckpt_path=weights_path)
    with _LOADED_MODELS_LOCK:
        _LOADED_MODELS[model_key] = remover
    return remover

def auto_install_ben2(parent_path):
    import urllib.request
    import zipfile
    import shutil
    import tempfile
    import ssl
    
    dest_path = os.path.join(parent_path, "ben2")
    if os.path.exists(dest_path):
        return
        
    zip_url = "https://github.com/PramaLLC/BEN2/archive/refs/heads/main.zip"
    print(f"TrixLoader: Downloading BEN2 library from {zip_url} into {parent_path}...")
    try:
        context = ssl._create_unverified_context()
        req = urllib.request.Request(zip_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=context, timeout=60) as response:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp_file:
                shutil.copyfileobj(response, tmp_file)
                tmp_zip = tmp_file.name
                
        with tempfile.TemporaryDirectory() as tmp_dir:
            with zipfile.ZipFile(tmp_zip, 'r') as zip_ref:
                zip_ref.extractall(tmp_dir)
            
            top_dir = os.listdir(tmp_dir)[0]
            src_ben2 = os.path.join(tmp_dir, top_dir, "src", "ben2")
            if os.path.exists(src_ben2):
                shutil.copytree(src_ben2, dest_path)
                print(f"TrixLoader: Successfully installed BEN2 library at {dest_path}")
            else:
                raise RuntimeError("Could not find 'src/ben2' folder inside extracted ZIP.")
        
        try:
            os.remove(tmp_zip)
        except:
            pass
    except Exception as e:
        print(f"TrixLoader: Failed to install BEN2: {e}")
        raise RuntimeError(f"Failed to auto-install BEN2 library. (Error: {e})") from e

def import_ben2_libs():
    import sys
    import importlib
    current_dir = os.path.dirname(os.path.abspath(__file__))
    ben2_path = os.path.join(current_dir, "ben2")
    
    if not os.path.exists(ben2_path):
        try:
            auto_install_ben2(current_dir)
        except Exception as e:
            raise ImportError(
                "BEN2 is missing dependencies. Failed to auto-install 'ben2' library: "
                f"{e}. Please install it manually."
            ) from e
            
    try:
        from safetensors.torch import load_file
    except (ImportError, ModuleNotFoundError):
        auto_pip_install("safetensors")
        
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
        
    try:
        from ben2 import BEN_Base
        from safetensors.torch import load_file
        return BEN_Base, load_file
    except (ImportError, ModuleNotFoundError) as e:
        raise ImportError(
            "BEN2 is missing dependencies. Failed to import 'ben2' from local directory. "
            "Please restart ComfyUI."
        ) from e

def get_ben2_remover(device):
    global _LOADED_MODELS
    model_key = "Ben2.safetensors"
    
    with _LOADED_MODELS_LOCK:
        if model_key in _LOADED_MODELS:
            model = _LOADED_MODELS[model_key]
            model.to(device)
            return model
            
    offload_other_models(model_key)
    
    BEN_Base, load_file = import_ben2_libs()
    
    bg_dir = os.path.join(folder_paths.models_dir, "RMBG")
    weights_path = os.path.join(bg_dir, "Ben2.safetensors")
    
    print(f"TrixLoader: Loading BEN2 model from {weights_path} on {device}...")
    model = BEN_Base()
    
    state_dict = load_file(weights_path)
    # Check key mappings
    model_keys = set(model.state_dict().keys())
    state_keys = set(state_dict.keys())
    if not state_keys.intersection(model_keys):
        new_state_dict = {}
        for k, v in state_dict.items():
            if k.startswith("model."):
                new_state_dict[k[6:]] = v
            else:
                new_state_dict[f"model.{k}"] = v
        state_dict = new_state_dict
        
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    
    with _LOADED_MODELS_LOCK:
        _LOADED_MODELS[model_key] = model
    return model

def get_birefnet_model(model_name, device):
    global _LOADED_MODELS
    model_key = f"birefnet_{model_name}"
    
    with _LOADED_MODELS_LOCK:
        if model_key in _LOADED_MODELS:
            model = _LOADED_MODELS[model_key]
            model.to(device)
            return model
            
    offload_other_models(model_key)
    
    try:
        from transformers import AutoConfig, AutoModelForImageSegmentation
        from safetensors.torch import load_file
        import timm
    except (ImportError, ModuleNotFoundError):
        print("TrixLoader: transformers, safetensors, or timm is missing. Attempting auto-install...")
        installed_tr = auto_pip_install("transformers")
        installed_st = auto_pip_install("safetensors")
        installed_ti = auto_pip_install("timm")
        if installed_tr and installed_st and installed_ti:
            import importlib
            importlib.invalidate_caches()
            from transformers import AutoConfig, AutoModelForImageSegmentation
            from safetensors.torch import load_file
            import timm
        else:
            raise ImportError(
                "BiRefNet requires the 'transformers', 'safetensors', and 'timm' packages. "
                "Auto-installation failed. Please run 'pip install transformers safetensors timm' manually."
            )
    
    bg_dir = os.path.join(folder_paths.models_dir, "RMBG")
    config_dir = os.path.join(bg_dir, "birefnet_config")
    
    print(f"TrixLoader: Instantiating BiRefNet structure for {model_name}...")
    BIREFNET_REPOS = {
        "Birefnet-lite.safetensors": "ZhengPeng7/BiRefNet_lite",
        "Birefnet.safetensors": "ZhengPeng7/BiRefNet",
        "BiRefNet_HR.safetensors": "ZhengPeng7/BiRefNet_HR",
        "BiRefNet-portrait.safetensors": "ZhengPeng7/BiRefNet-portrait",
        "birefnet_finetuned_toonout.pth": "ZhengPeng7/BiRefNet"
    }
    repo_id = BIREFNET_REPOS.get(model_name, "ZhengPeng7/BiRefNet")
    
    try:
        # Only load from local config directory if it contains the remote code module birefnet.py and matches standard BiRefNet
        if os.path.exists(config_dir) and os.path.exists(os.path.join(config_dir, "birefnet.py")) and model_name == "Birefnet.safetensors":
            config = AutoConfig.from_pretrained(config_dir, trust_remote_code=True)
        else:
            config = AutoConfig.from_pretrained(repo_id, trust_remote_code=True)
            
        model = AutoModelForImageSegmentation.from_config(config, trust_remote_code=True)
    except Exception as conn_err:
        raise RuntimeError(
            f"Failed to load/instantiate BiRefNet model structure from Hugging Face ({repo_id}). "
            f"Please ensure you have an active internet connection. (Error: {conn_err})"
        ) from conn_err
    
    weights_path = os.path.join(bg_dir, model_name)
    print(f"TrixLoader: Loading BiRefNet weights from {weights_path}...")
    
    if weights_path.endswith(".safetensors"):
        state_dict = load_file(weights_path)
    else:
        state_dict = torch.load(weights_path, map_location="cpu")
        if isinstance(state_dict, dict):
            if "model" in state_dict:
                state_dict = state_dict["model"]
            elif "state_dict" in state_dict:
                state_dict = state_dict["state_dict"]
                
    # Clean up prefixes from DDP and compiled wrappers
    cleaned_state_dict = {}
    for k, v in state_dict.items():
        new_key = k
        while True:
            if new_key.startswith("module."):
                new_key = new_key[7:]
            elif new_key.startswith("_orig_mod."):
                new_key = new_key[10:]
            else:
                break
        cleaned_state_dict[new_key] = v
    state_dict = cleaned_state_dict
                
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    
    with _LOADED_MODELS_LOCK:
        _LOADED_MODELS[model_key] = model
    return model

@PromptServer.instance.routes.post('/trix/offload')
async def api_offload_models(request):
    try:
        def run_offload():
            global _LOADED_MODELS, _CURRENT_SAM3_STATE, _CURRENT_SAM3_IMAGE, _CURRENT_SAM3_DEVICE, _CURRENT_SAM3_MTIME, _CURRENT_SAM3_SIZE, _CURRENT_SAM3_CROP_BOUNDS, _CURRENT_SAM2_CACHE
            with _LOADED_MODELS_LOCK:
                print(f"TrixLoader: Exiting editor, clearing all cached models completely ({list(_LOADED_MODELS.keys())})...")
                _LOADED_MODELS.clear()
            _CURRENT_SAM3_STATE = None
            _CURRENT_SAM3_IMAGE = None
            _CURRENT_SAM3_DEVICE = None
            _CURRENT_SAM3_MTIME = 0.0
            _CURRENT_SAM3_SIZE = 0
            _CURRENT_SAM3_CROP_BOUNDS = None
            _CURRENT_SAM2_CACHE.clear()
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        await asyncio.to_thread(run_offload)
        return web.json_response({"status": "success"})
    except Exception as e:
        return web.json_response({"status": "error", "error": str(e)}, status=500)
 
@PromptServer.instance.routes.post('/trix/unload_model')
async def api_unload_model(request):
    try:
        data = await request.json()
        model_type = data.get("type") # "sam", "bg", or "all"
        
        def run_unload():
            global _LOADED_MODELS, _CURRENT_SAM3_STATE, _CURRENT_SAM3_IMAGE, _CURRENT_SAM3_DEVICE, _CURRENT_SAM3_MTIME, _CURRENT_SAM3_SIZE, _CURRENT_SAM3_CROP_BOUNDS, _CURRENT_SAM2_CACHE
            with _LOADED_MODELS_LOCK:
                if model_type == "all":
                    print("TrixLoader: Unloading all models completely...")
                    _LOADED_MODELS.clear()
                    _CURRENT_SAM3_STATE = None
                    _CURRENT_SAM3_IMAGE = None
                    _CURRENT_SAM3_DEVICE = None
                    _CURRENT_SAM3_MTIME = 0.0
                    _CURRENT_SAM3_SIZE = 0
                    _CURRENT_SAM3_CROP_BOUNDS = None
                    _CURRENT_SAM2_CACHE.clear()
                elif model_type == "sam":
                    print("TrixLoader: Unloading SAM models...")
                    for key in list(_LOADED_MODELS.keys()):
                        if "sam" in key or "groundingdino" in key:
                            del _LOADED_MODELS[key]
                    _CURRENT_SAM3_STATE = None
                    _CURRENT_SAM3_IMAGE = None
                    _CURRENT_SAM3_DEVICE = None
                    _CURRENT_SAM3_MTIME = 0.0
                    _CURRENT_SAM3_SIZE = 0
                    _CURRENT_SAM3_CROP_BOUNDS = None
                    _CURRENT_SAM2_CACHE.clear()
                elif model_type == "bg":
                    print("TrixLoader: Unloading background removal models...")
                    for key in list(_LOADED_MODELS.keys()):
                        if "sam" not in key and "groundingdino" not in key:
                            del _LOADED_MODELS[key]
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        await asyncio.to_thread(run_unload)
        return web.json_response({"status": "success"})
    except Exception as e:
        return web.json_response({"status": "error", "error": str(e)}, status=500)

@PromptServer.instance.routes.post('/trix/remove_background')
async def api_remove_background(request):
    try:
        data = await request.json()
        image_filename = data.get("image")
        model_name = data.get("model")
        alpha_matting = data.get("alpha_matting", False)
        
        image_path = folder_paths.get_annotated_filepath(image_filename)
        img = Image.open(image_path).convert("RGB")
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        def run_inference():
            if model_name == "inspyrenet-bf16.safetensors":
                remover = get_inspyrenet_remover(device)
                print("TrixLoader: Running InSPyReNet background removal...")
                rgba_img = remover.process(img, type="rgba")
                alpha = rgba_img.split()[3]
                mask_img = ImageOps.invert(alpha)
                
            elif model_name == "Ben2.safetensors":
                model = get_ben2_remover(device)
                print("TrixLoader: Running BEN2 background removal...")
                rgba_img = model.inference(img, refine_foreground=alpha_matting)
                alpha = rgba_img.split()[3]
                mask_img = ImageOps.invert(alpha)
                
            else:
                # BiRefNet variants
                model = get_birefnet_model(model_name, device)
                print(f"TrixLoader: Running BiRefNet ({model_name}) background removal...")
                
                input_size = 2048 if "HR" in model_name else 1024
                
                img_resized = img.resize((input_size, input_size), Image.BILINEAR)
                img_np = np.array(img_resized).astype(np.float32) / 255.0
                
                mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
                std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
                img_norm = (img_np - mean) / std
                
                img_tensor = torch.from_numpy(img_norm).permute(2, 0, 1).unsqueeze(0).to(device)
                
                with torch.no_grad():
                    output = model(img_tensor)
                    pred = torch.sigmoid(output[0][0, 0])
                    
                if not alpha_matting:
                    pred = (pred > 0.5).float()
                    
                mask_tensor = 1.0 - pred
                mask_np = mask_tensor.cpu().numpy()
                mask_img = Image.fromarray((mask_np * 255).astype(np.uint8), mode="L")
                mask_img = mask_img.resize(img.size, Image.BILINEAR)
                
            return mask_img

        mask_img = await asyncio.to_thread(run_inference)
        
        # Offload other models, but keep the current background removal model cached on GPU
        current_model_key = model_name
        if model_name not in ["inspyrenet-bf16.safetensors", "Ben2.safetensors"]:
            current_model_key = f"birefnet_{model_name}"
        offload_other_models(current_model_key)
        
        buffered = BytesIO()
        mask_img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return web.json_response({"status": "success", "mask": img_str})
    except Exception as e:
        traceback.print_exc()
        return web.json_response({"status": "error", "error": str(e)}, status=500)


def pytorch_guided_filter(guide, src, r, eps):
    # Add batch and channel dimensions: (1, 1, H, W)
    guide = guide.unsqueeze(0).unsqueeze(0)
    src = src.unsqueeze(0).unsqueeze(0)
    
    k = 2 * r + 1
    pad = (r, r, r, r)
    
    # Replicate pad to keep boundary sizes aligned
    g_pad = torch.nn.functional.pad(guide, pad, mode='replicate')
    s_pad = torch.nn.functional.pad(src, pad, mode='replicate')
    
    mean_I = torch.nn.functional.avg_pool2d(g_pad, k, stride=1)
    mean_p = torch.nn.functional.avg_pool2d(s_pad, k, stride=1)
    mean_Ip = torch.nn.functional.avg_pool2d(g_pad * s_pad, k, stride=1)
    
    cov_Ip = mean_Ip - mean_I * mean_p
    
    mean_II = torch.nn.functional.avg_pool2d(g_pad * g_pad, k, stride=1)
    var_I = mean_II - mean_I * mean_I
    
    a = cov_Ip / (var_I + eps)
    b = mean_p - a * mean_I
    
    a_pad = torch.nn.functional.pad(a, pad, mode='replicate')
    b_pad = torch.nn.functional.pad(b, pad, mode='replicate')
    
    mean_a = torch.nn.functional.avg_pool2d(a_pad, k, stride=1)
    mean_b = torch.nn.functional.avg_pool2d(b_pad, k, stride=1)
    
    q = mean_a * guide + mean_b
    return q.squeeze().clamp(0, 1)


def pytorch_color_guided_filter(guide, src, r, eps):
    # guide: (3, H, W) or (1, 3, H, W)
    # src: (1, H, W) or (1, 1, H, W)
    if guide.ndim == 3:
        guide = guide.unsqueeze(0)
    if src.ndim == 2:
        src = src.unsqueeze(0).unsqueeze(0)
    elif src.ndim == 3:
        src = src.unsqueeze(0)
        
    N = 2 * r + 1
    pad = (r, r, r, r)
    
    def box_filter(x):
        x_pad = torch.nn.functional.pad(x, pad, mode='replicate')
        return torch.nn.functional.avg_pool2d(x_pad, N, stride=1)
        
    mean_I = box_filter(guide)
    mean_p = box_filter(src)
    
    mean_Ip = box_filter(guide * src)
    cov_Ip = mean_Ip - mean_I * mean_p
    
    I_r, I_g, I_b = guide[:, 0:1], guide[:, 1:2], guide[:, 2:3]
    mean_I_r, mean_I_g, mean_I_b = mean_I[:, 0:1], mean_I[:, 1:2], mean_I[:, 2:3]
    
    var_I_rr = box_filter(I_r * I_r) - mean_I_r * mean_I_r
    var_I_rg = box_filter(I_r * I_g) - mean_I_r * mean_I_g
    var_I_rb = box_filter(I_r * I_b) - mean_I_r * mean_I_b
    var_I_gg = box_filter(I_g * I_g) - mean_I_g * mean_I_g
    var_I_gb = box_filter(I_g * I_b) - mean_I_g * mean_I_b
    var_I_bb = box_filter(I_b * I_b) - mean_I_b * mean_I_b
    
    var_I_rr += eps
    var_I_gg += eps
    var_I_bb += eps
    
    det = (var_I_rr * (var_I_gg * var_I_bb - var_I_gb * var_I_gb) -
           var_I_rg * (var_I_rg * var_I_bb - var_I_rb * var_I_gb) +
           var_I_rb * (var_I_rg * var_I_gb - var_I_gg * var_I_rb))
           
    # Safe division by det to prevent NaN in singular/flat regions
    det_sign = torch.sign(det)
    det_sign = torch.where(det_sign == 0, torch.tensor(1.0, device=det.device), det_sign)
    safe_det = det_sign * torch.clamp(torch.abs(det), min=1e-8)
           
    inv_rr = (var_I_gg * var_I_bb - var_I_gb * var_I_gb) / safe_det
    inv_rg = -(var_I_rg * var_I_bb - var_I_rb * var_I_gb) / safe_det
    inv_rb = (var_I_rg * var_I_gb - var_I_gg * var_I_rb) / safe_det
    inv_gg = (var_I_rr * var_I_bb - var_I_rb * var_I_rb) / safe_det
    inv_gb = -(var_I_rr * var_I_gb - var_I_rg * var_I_rb) / safe_det
    inv_bb = (var_I_rr * var_I_gg - var_I_rg * var_I_rg) / safe_det
    
    cov_Ip_r, cov_Ip_g, cov_Ip_b = cov_Ip[:, 0:1], cov_Ip[:, 1:2], cov_Ip[:, 2:3]
    
    a_r = inv_rr * cov_Ip_r + inv_rg * cov_Ip_g + inv_rb * cov_Ip_b
    a_g = inv_rg * cov_Ip_r + inv_gg * cov_Ip_g + inv_gb * cov_Ip_b
    a_b = inv_rb * cov_Ip_r + inv_gb * cov_Ip_g + inv_bb * cov_Ip_b
    
    b = mean_p - (a_r * mean_I_r + a_g * mean_I_g + a_b * mean_I_b)
    
    mean_a_r = box_filter(a_r)
    mean_a_g = box_filter(a_g)
    mean_a_b = box_filter(a_b)
    mean_b = box_filter(b)
    
    q = mean_a_r * I_r + mean_a_g * I_g + mean_a_b * I_b + mean_b
    return q[0, 0].clamp(0, 1)


def decontaminate_colors(image, alpha, r=32, threshold=0.85, eps=1e-5):
    # image: (3, H, W)
    # alpha: (1, H, W)
    fg_mask = (alpha >= threshold).float()
    fg_color = image * fg_mask
    
    fg_color_4d = fg_color.unsqueeze(0)
    fg_mask_4d = fg_mask.unsqueeze(0)
    
    k = 2 * r + 1
    pad = (r, r, r, r)
    
    color_pad = torch.nn.functional.pad(fg_color_4d, pad, mode='replicate')
    mask_pad = torch.nn.functional.pad(fg_mask_4d, pad, mode='replicate')
    
    sum_color = torch.nn.functional.avg_pool2d(color_pad, k, stride=1) * (k * k)
    sum_mask = torch.nn.functional.avg_pool2d(mask_pad, k, stride=1) * (k * k)
    
    # Squeeze batch dimension to return to 3D immediately
    sum_color = sum_color.squeeze(0) # (3, H, W)
    sum_mask = sum_mask.squeeze(0) # (1, H, W)
    
    conf = torch.clamp(sum_mask * 10.0, 0.0, 1.0) # (1, H, W)
    
    decont_color = sum_color / (sum_mask + eps) # (3, H, W)
    decont_color = conf * decont_color + (1.0 - conf) * image # (3, H, W)

    # Blending: only decontaminate at transition edges (around alpha=0.5)
    w_edge = torch.clamp(1.0 - torch.abs(alpha - 0.5) / 0.5, 0.0, 1.0) # (1, H, W)
    decont_image = w_edge * decont_color + (1.0 - w_edge) * image # (3, H, W)
    return decont_image.clamp(0, 1)


def morph_boundary(mask, r):
    mask_4d = mask.unsqueeze(0).unsqueeze(0)
    k = 2 * r + 1
    pad = r
    dilated = torch.nn.functional.max_pool2d(mask_4d, kernel_size=k, stride=1, padding=pad)
    eroded = -torch.nn.functional.max_pool2d(-mask_4d, kernel_size=k, stride=1, padding=pad)
    boundary = dilated - eroded
    return boundary[0, 0].clamp(0, 1)


@PromptServer.instance.routes.post('/trix/refine_mask')
async def api_refine_mask(request):
    try:
        data = await request.json()
        image_filename = data.get("image")
        mask_b64 = data.get("mask")
        method = data.get("method") # "refine_edge" or "refine_hair"
        
        # 1. Load guide image (RGB)
        image_path = folder_paths.get_annotated_filepath(image_filename)
        img_pil = Image.open(image_path)
        img_rgb = img_pil.convert("RGB")
        
        # 2. Load mask image
        if "," in mask_b64:
            mask_b64 = mask_b64.split(",")[1]
        mask_data = base64.b64decode(mask_b64)
        mask_pil = Image.open(BytesIO(mask_data)).convert("RGBA")
        
        # Ensure guide matches mask size
        if img_rgb.size != mask_pil.size:
            img_rgb = img_rgb.resize(mask_pil.size, Image.BILINEAR)
            
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        guide_rgb_np = np.array(img_rgb).astype(np.float32) / 255.0
        guide_rgb_tensor = torch.from_numpy(guide_rgb_np).permute(2, 0, 1).to(device) # (3, H, W)
        
        mask_channels = mask_pil.split()
        mask_alpha_np = np.array(mask_channels[3]).astype(np.float32) / 255.0
        mask_tensor = torch.from_numpy(mask_alpha_np).to(device) # (H, W)
        
        # 3. Process based on method
        if method == "refine_edge":
            # Smart Color-Guided Edge Refinement:
            # 1. Compute soft boundary search zone via Distance Transform (tighter 2-pixel radius)
            cv2 = import_cv2()
            mask_uint8 = (mask_alpha_np * 255.0).astype(np.uint8)
            _, mask_bin = cv2.threshold(mask_uint8, 127, 255, cv2.THRESH_BINARY)
            
            dist_in = cv2.distanceTransform(mask_bin, cv2.DIST_L2, 5)
            inverse_mask = cv2.bitwise_not(mask_bin)
            dist_out = cv2.distanceTransform(inverse_mask, cv2.DIST_L2, 5)
            
            feathered = mask_bin.astype(np.float32)
            R = 2.0  # Tighter search window to avoid wide halos
            
            inside_idx = (mask_bin > 0) & (dist_in < R)
            feathered[inside_idx] = 128.0 + 127.0 * (dist_in[inside_idx] / R)
            
            outside_idx = (mask_bin == 0) & (dist_out < R)
            feathered[outside_idx] = 128.0 - 128.0 * (dist_out[outside_idx] / R)
            
            feathered_tensor = torch.from_numpy(feathered / 255.0).to(device)
            
            # 2. Run local Color Guided Filter (r=2, eps=1e-6) to snap boundaries tightly to RGB details
            q_tensor = pytorch_color_guided_filter(guide_rgb_tensor, feathered_tensor, r=2, eps=1e-6)
            
            # 3. Apply a tighter, crisper soft-thresholding to avoid wide grey zones
            refined_tensor = torch.clamp((q_tensor - 0.25) / 0.5, 0.0, 1.0)
            r_decont = 8
        else: # "refine_hair"
            r_gf = 6
            eps = 0.001
            r_morph = 12
            r_decont = 12
            
            # Compute grayscale guide
            guide_gray_tensor = 0.299 * guide_rgb_tensor[0] + 0.587 * guide_rgb_tensor[1] + 0.114 * guide_rgb_tensor[2]
            
            # Pre-soften the mask to reduce high-frequency ripples/halos
            mask_4d = mask_tensor.unsqueeze(0).unsqueeze(0)
            k_blur = 7
            pad_blur = 3
            soft_mask_4d = torch.nn.functional.avg_pool2d(
                torch.nn.functional.pad(mask_4d, (pad_blur, pad_blur, pad_blur, pad_blur), mode='replicate'),
                kernel_size=k_blur, stride=1
            )
            soft_mask_tensor = soft_mask_4d[0, 0]

            # Run Grayscale Guided Filter
            q_tensor = pytorch_guided_filter(guide_gray_tensor, soft_mask_tensor, r_gf, eps)
            
            # Run boundary morph
            boundary_tensor = morph_boundary(mask_tensor, r_morph)
            
            # Blend: (1 - W) * M + W * Q
            refined_tensor = (1.0 - boundary_tensor) * mask_tensor + boundary_tensor * q_tensor
            
            # Post-process: Apply soft-thresholding to clean up gray halos/smudges
            refined_tensor = torch.clamp((refined_tensor - 0.08) / 0.84, 0.0, 1.0)
        
        # Run Color Decontamination
        refined_alpha_tensor = refined_tensor.unsqueeze(0) # (1, H, W)
        decont_tensor = decontaminate_colors(guide_rgb_tensor, refined_alpha_tensor, r=r_decont, threshold=0.85)
        
        # Convert tensors back to PIL
        refined_np = (refined_tensor.cpu().numpy() * 255.0).astype(np.uint8)
        refined_alpha_pil = Image.fromarray(refined_np, mode="L")
        
        # Determine the base color of the original mask (e.g., Red, Green, or White)
        # We can look at the RGB channels of the original mask pixels that had alpha > 0
        mask_rgb = np.array(mask_pil.convert("RGB"))
        mask_a = np.array(mask_channels[3])
        
        # Default mask color is red (255, 0, 0)
        base_r, base_g, base_b = 255, 0, 0
        
        non_zero_indices = np.where(mask_a > 10)
        if len(non_zero_indices[0]) > 0:
            # Get the average color of the drawn mask pixels
            r_vals = mask_rgb[non_zero_indices[0], non_zero_indices[1], 0]
            g_vals = mask_rgb[non_zero_indices[0], non_zero_indices[1], 1]
            b_vals = mask_rgb[non_zero_indices[0], non_zero_indices[1], 2]
            
            mean_r = np.mean(r_vals)
            mean_g = np.mean(g_vals)
            mean_b = np.mean(b_vals)
            
            # Let's classify as Red, Green, White or Black based on standard colors:
            if mean_r > 128 and mean_g < 128 and mean_b < 128:
                base_r, base_g, base_b = 255, 0, 0
            elif mean_g > 128 and mean_r < 128 and mean_b < 128:
                base_r, base_g, base_b = 0, 255, 0
            elif mean_r > 200 and mean_g > 200 and mean_b > 200:
                base_r, base_g, base_b = 255, 255, 255
            elif mean_r < 50 and mean_g < 50 and mean_b < 50:
                base_r, base_g, base_b = 0, 0, 0
        
        # Colorize the output RGB channels with this base color to prevent black shadows
        h_mask, w_mask = refined_np.shape
        out_r = np.full((h_mask, w_mask), base_r, dtype=np.uint8)
        out_g = np.full((h_mask, w_mask), base_g, dtype=np.uint8)
        out_b = np.full((h_mask, w_mask), base_b, dtype=np.uint8)
        
        refined_r_pil = Image.fromarray(out_r, mode="L")
        refined_g_pil = Image.fromarray(out_g, mode="L")
        refined_b_pil = Image.fromarray(out_b, mode="L")
        
        merged_pil = Image.merge("RGBA", (refined_r_pil, refined_g_pil, refined_b_pil, refined_alpha_pil))
        
        buffered_mask = BytesIO()
        merged_pil.save(buffered_mask, format="PNG")
        mask_str = base64.b64encode(buffered_mask.getvalue()).decode("utf-8")
        
        if decont_tensor.ndim == 4:
            decont_tensor = decont_tensor.squeeze(0)
        decont_np = (decont_tensor.permute(1, 2, 0).cpu().numpy() * 255.0).astype(np.uint8)
        decont_pil = Image.fromarray(decont_np, mode="RGB")
        
        # Return decontaminated image as base64 data URL to keep disk clean
        buffered_decont = BytesIO()
        decont_pil.save(buffered_decont, format="JPEG", quality=92)
        decont_str = "data:image/jpeg;base64," + base64.b64encode(buffered_decont.getvalue()).decode("utf-8")
        
        return web.json_response({
            "status": "success",
            "mask": mask_str,
            "decont_image": decont_str
        })
    except Exception as e:
        traceback.print_exc()
        return web.json_response({"status": "error", "error": str(e)}, status=500)


@PromptServer.instance.routes.post('/trix/save_image_with_mask')
async def api_save_image_with_mask(request):
    try:
        post = await request.post()
        image_file = post.get("image")
        mask_file = post.get("mask")
        filename = post.get("filename")
        subfolder = post.get("subfolder", "")
        dir_type = post.get("type", "input")
        overwrite = post.get("overwrite", "true")

        if not image_file or not filename:
            return web.json_response({"error": "Missing image or filename"}, status=400)

        import folder_paths
        upload_dir = folder_paths.get_directory_by_type(dir_type)
        if upload_dir is None:
            return web.json_response({"error": f"Invalid directory type: {dir_type}"}, status=400)

        if subfolder:
            full_output_folder = os.path.join(upload_dir, os.path.normpath(subfolder))
        else:
            full_output_folder = upload_dir

        filepath = os.path.abspath(os.path.join(full_output_folder, filename))

        # Security check: prevent traversal
        if os.path.commonpath((upload_dir, filepath)) != upload_dir:
            return web.json_response({"error": "Access denied"}, status=403)

        if not os.path.exists(full_output_folder):
            os.makedirs(full_output_folder)

        # Cleanup old versions of this node's files before saving new one
        import re
        m = re.match(r"^(.*?_)(edited|masked|pasted)_([a-zA-Z0-9_-]+)_\d+\.png$", filename)
        if m:
            base_prefix = m.group(1)
            node_id = m.group(3)
            try:
                # 1. Clean up same base name and same node edits
                for f in os.listdir(full_output_folder):
                    pattern = rf"^{re.escape(base_prefix)}(edited|masked|pasted)_{re.escape(node_id)}_\d+\.png$"
                    if re.match(pattern, f) and f != filename:
                        try:
                            os.remove(os.path.join(full_output_folder, f))
                        except Exception:
                            pass
                
                # 2. Clean up any leftover old format names for this node
                old_patterns = [
                    rf"^masked_{re.escape(node_id)}_\d+\.png$",
                    rf"^trix_crop_{re.escape(node_id)}_\d+\.png$",
                    rf"^trix_edited_{re.escape(node_id)}_\d+\.png$"
                ]
                for f in os.listdir(full_output_folder):
                    for pat in old_patterns:
                        if re.match(pat, f) and f != filename:
                            try:
                                os.remove(os.path.join(full_output_folder, f))
                            except Exception:
                                pass
            except Exception:
                pass

        if overwrite != "true" and overwrite != "1":
            split = os.path.splitext(filename)
            i = 1
            while os.path.exists(filepath):
                filename = f"{split[0]} ({i}){split[1]}"
                filepath = os.path.join(full_output_folder, filename)
                i += 1

        # If mask_file is provided, merge mask into image alpha channel.
        # Otherwise, save the uploaded image directly to disk.
        if mask_file:
            opaque_img = Image.open(image_file.file).convert("RGB")
            mask_img = Image.open(mask_file.file).convert("RGBA")
            r, g, b, a = mask_img.split()
            r_np = np.array(r)
            g_np = np.array(g)
            b_np = np.array(b)
            a_np = np.array(a).astype(np.float32) / 255.0
            
            if np.any(a_np < 1.0):
                mask_val = (a_np * 255.0).astype(np.uint8)
            else:
                max_rgb = np.maximum(np.maximum(r_np, g_np), b_np)
                mask_val = max_rgb
            
            alpha_channel = Image.fromarray(255 - mask_val, mode="L")
            if alpha_channel.size != opaque_img.size:
                alpha_channel = alpha_channel.resize(opaque_img.size, Image.BILINEAR)
            opaque_img.putalpha(alpha_channel)
            opaque_img.save(filepath, compress_level=4)
        else:
            image_file.file.seek(0)
            with open(filepath, "wb") as f:
                f.write(image_file.file.read())

        # Save a copy if "save_every_step" is enabled
        save_every_step = post.get("save_every_step", "false") == "true"
        if save_every_step:
            custom_path = post.get("save_every_step_path", "").strip()
            if custom_path:
                try:
                    if not os.path.isabs(custom_path):
                        import folder_paths
                        comfy_root = os.path.dirname(folder_paths.get_input_directory())
                        target_dir = os.path.abspath(os.path.join(comfy_root, custom_path))
                    else:
                        target_dir = os.path.abspath(custom_path)
                    
                    if not os.path.exists(target_dir):
                        os.makedirs(target_dir)
                    
                    target_file = os.path.join(target_dir, filename)
                    import shutil
                    shutil.copy2(filepath, target_file)
                    print(f"TrixLoader: Saved step copy to {target_file}")
                except Exception as e:
                    print(f"TrixLoader: Error saving step copy: {e}")

        resp = {"name": filename, "subfolder": subfolder, "type": dir_type}
        return web.json_response(resp)

    except Exception as e:
        traceback.print_exc()
        return web.json_response({"error": str(e)}, status=500)


