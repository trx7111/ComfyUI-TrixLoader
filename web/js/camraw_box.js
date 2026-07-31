import { app } from '../../../scripts/app.js';

const svgUndoCR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; width: 14px; height: 14px;"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`;
const svgRedoCR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; width: 14px; height: 14px;"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>`;
const svgEyeCR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; width: 14px; height: 14px; margin-right: 4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const svgChevronDown = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const svgFinger = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M10 13a4 4 0 0 0 7.42 2.72l2.3-2.3a1.42 1.42 0 0 0-2-2l-2.3 2.3"></path><path d="M14 13.5v-7a2 2 0 0 0-4 0v7"></path><path d="M10 13.5v-3a2 2 0 0 0-4 0v4.5"></path><path d="M6 15v-1a2 2 0 0 0-4 0v5a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-3a2 2 0 0 0-4 0"></path></svg>`;
const svgResetHSL = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>`;
const svgResetCR = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3 8a9 9 0 1 0 2.64-4.64L3 6"></path></svg>`;
const svgHQ = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M8 8h2.5v8H8zM13.5 8h2.3a3 3 0 0 1 0 6h-2.3zM13.5 14h2.6l1.6 2"></path></svg>`;
const svgRecenterCR = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="1.5" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22.5"></line><line x1="1.5" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22.5" y2="12"></line></svg>`;
const svgCurve = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c4 0 4-10 9-10 3.5 0 3.5 6 9 6"></path><path d="M3 21h18"></path></svg>`;

const HSL_SATURATION_MULTIPLIER = 3;
const HSL_SATURATION_LOG = Math.log(1 + HSL_SATURATION_MULTIPLIER);

function createDefaultCurveState() {
    return {
        activeChannel: "rgb",
        rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
    };
}

function cloneCurveState(curveState) {
    return JSON.parse(JSON.stringify(curveState));
}

function normalizeCurvePoints(points) {
    const fallback = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    if (!Array.isArray(points)) return fallback;

    const parsed = [];
    for (const pt of points) {
        if (!pt || typeof pt !== "object") continue;
        const x = Number.isFinite(pt.x) ? pt.x : parseFloat(pt.x);
        const y = Number.isFinite(pt.y) ? pt.y : parseFloat(pt.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        parsed.push({
            x: Math.max(0, Math.min(255, x)),
            y: Math.max(0, Math.min(255, y))
        });
    }

    if (parsed.length < 2) return fallback;
    parsed.sort((a, b) => a.x - b.x);

    const dedup = [];
    for (const p of parsed) {
        if (dedup.length > 0 && Math.abs(dedup[dedup.length - 1].x - p.x) < 0.01) dedup[dedup.length - 1] = p;
        else dedup.push(p);
    }

    if (dedup.length < 2) return fallback;
    if (dedup[0].x > 0) dedup.unshift({ x: 0, y: dedup[0].y });
    if (dedup[dedup.length - 1].x < 255) dedup.push({ x: 255, y: dedup[dedup.length - 1].y });
    return dedup;
}

function ensureCurveState(state) {
    const def = createDefaultCurveState();
    const out = { ...def, ...(state || {}) };
    out.activeChannel = ["rgb", "r", "g", "b"].includes(out.activeChannel) ? out.activeChannel : "rgb";
    out.rgb = normalizeCurvePoints(out.rgb);
    out.r = normalizeCurvePoints(out.r);
    out.g = normalizeCurvePoints(out.g);
    out.b = normalizeCurvePoints(out.b);
    return out;
}

function curveHasAdjustments(curveState) {
    const normalized = ensureCurveState(curveState);
    const isDefault = (arr) => arr.length === 2 && arr[0].x === 0 && arr[0].y === 0 && arr[1].x === 255 && arr[1].y === 255;
    return !(isDefault(normalized.rgb) && isDefault(normalized.r) && isDefault(normalized.g) && isDefault(normalized.b));
}

function buildCurveLut(points) {
    const pts = normalizeCurvePoints(points);
    const lut = new Float32Array(256);
    const n = pts.length;
    
    if (n === 2) {
        // Standard linear interpolation for default 2 points (typically 0,0 and 255,255)
        for (let x = 0; x <= 255; x++) {
            const t = x / 255;
            const y = pts[0].y + (pts[1].y - pts[0].y) * t;
            lut[x] = Math.max(0, Math.min(255, y));
        }
        return lut;
    }

    // Monotone Cubic Spline Interpolation (Fritsch-Carlson algorithm)
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        xs[i] = pts[i].x;
        ys[i] = pts[i].y;
    }

    const dx = new Float32Array(n - 1);
    const dy = new Float32Array(n - 1);
    const ms = new Float32Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
        dx[i] = xs[i + 1] - xs[i];
        dy[i] = ys[i + 1] - ys[i];
        ms[i] = dy[i] / (dx[i] || 1);
    }

    // Weighted harmonic mean of secants to calculate tangents c1s at vertices
    const c1s = new Float32Array(n);
    c1s[0] = ms[0];
    for (let i = 1; i < n - 1; i++) {
        const m = ms[i - 1];
        const next = ms[i];
        if (m * next <= 0) {
            c1s[i] = 0;
        } else {
            const w1 = 2 * dx[i] + dx[i - 1];
            const w2 = dx[i] + 2 * dx[i - 1];
            c1s[i] = (w1 + w2) / (w1 / m + w2 / next);
        }
    }
    c1s[n - 1] = ms[n - 2];

    // Calculate degree 2 and degree 3 Hermite coefficients
    const c2s = new Float32Array(n - 1);
    const c3s = new Float32Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
        const c1 = c1s[i];
        const m = ms[i];
        const invDx = 1.0 / (dx[i] || 1.0);
        const common = c1 + c1s[i + 1] - 2 * m;
        c2s[i] = (m - c1 - common) * invDx;
        c3s[i] = common * invDx * invDx;
    }

    // Populate LUT using computed spline segments
    for (let x = 0; x <= 255; x++) {
        let i = 0;
        while (i < n - 2 && x > xs[i + 1]) {
            i++;
        }
        const diff = x - xs[i];
        const y = ys[i] + c1s[i] * diff + c2s[i] * diff * diff + c3s[i] * diff * diff * diff;
        lut[x] = Math.max(0, Math.min(255, y));
    }
    return lut;
}

function applyLightnessLikePhotoshop(lightness, delta) {
    // Simple and reliable: just shift L in HSL space with soft-clipping
    // Matches Photoshop's Hue/Sat lightness behavior closely enough
    const d = Math.max(-1, Math.min(1, delta));
    if (d >= 0) return Math.max(0, Math.min(1, lightness + (1 - lightness) * d));
    return Math.max(0, Math.min(1, lightness + lightness * d));
}

function rgbToHsl(r, g, b) {
    r = Math.max(0, Math.min(255, r)) / 255;
    g = Math.max(0, Math.min(255, g)) / 255;
    b = Math.max(0, Math.min(255, b)) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } 
    else {
        let d = max - min;
        s = l > 0.5 ? d / Math.max(0.00001, 2 - max - min) : d / Math.max(0.00001, max + min);
        s = Math.max(0, Math.min(1, s));
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s, Math.max(0, Math.min(1, l))];
}

function rgbToHslFloat(r, g, b) {
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } 
    else {
        let d = max - min;
        s = l > 0.5 ? d / Math.max(0.00001, 2 - max - min) : d / Math.max(0.00001, max + min);
        s = Math.max(0, Math.min(1, s));
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    if (s === 0) { r = g = b = l; } 
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        h = ((h % 360) + 360) % 360 / 360;
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [
        Math.max(0, Math.min(255, r * 255)),
        Math.max(0, Math.min(255, g * 255)),
        Math.max(0, Math.min(255, b * 255))
    ];
}

// ============================================================
// NEW FILTER ALGORITHMS (ported from ComfyUI_Channel_Ops)
// ============================================================

// --- Blur Primitives (Float32 plane-based) ---
// --- Downsample/Upsample Helpers for Fast Blur ---
function crDownsamplePlane(s, w, h, dw, dh, ds) {
    const out = new Float32Array(dw * dh);
    for (let y = 0; y < dh; y++) {
        const sy = Math.min(h - 1, Math.round(y * ds));
        const sRow = sy * w;
        const dRow = y * dw;
        for (let x = 0; x < dw; x++) {
            const sx = Math.min(w - 1, Math.round(x * ds));
            out[dRow + x] = s[sRow + sx];
        }
    }
    return out;
}

function crUpsamplePlane(s, dw, dh, o, w, h, ds) {
    for (let y = 0; y < h; y++) {
        const sy = y / ds;
        const y0 = Math.floor(sy);
        const y1 = Math.min(dh - 1, y0 + 1);
        const wy = sy - y0;
        const dRow = y * w;
        const r0 = y0 * dw;
        const r1 = y1 * dw;

        for (let x = 0; x < w; x++) {
            const sx = x / ds;
            const x0 = Math.floor(sx);
            const x1 = Math.min(dw - 1, x0 + 1);
            const wx = sx - x0;

            const p00 = s[r0 + x0];
            const p10 = s[r0 + x1];
            const p01 = s[r1 + x0];
            const p11 = s[r1 + x1];

            const top = p00 + wx * (p10 - p00);
            const bottom = p01 + wx * (p11 - p01);
            o[dRow + x] = top + wy * (bottom - top);
        }
    }
}

// --- Blur Primitives (Float32 plane-based) ---
function crBoxBlurPlane(s, tmp, o, w, h, radius) {
    if (radius <= 0) { o.set(s); return; }
    const r = radius | 0;
    const k = 2 * r + 1;
    const invK = 1.0 / k;

    // Horizontal sliding-window pass
    for (let yy = 0; yy < h; yy++) {
        const row = yy * w;
        let sum = 0;
        for (let dx = -r; dx <= r; dx++) {
            const sx = dx < 0 ? 0 : (dx >= w ? w - 1 : dx);
            sum += s[row + sx];
        }
        tmp[row] = sum * invK;
        for (let xx = 1; xx < w; xx++) {
            const ax = (xx + r) >= w ? w - 1 : (xx + r);
            const rx = (xx - r - 1) < 0 ? 0 : (xx - r - 1);
            sum += s[row + ax] - s[row + rx];
            tmp[row + xx] = sum * invK;
        }
    }

    // Vertical cache-friendly sliding-window pass
    const sumLine = new Float32Array(w);
    for (let dy = -r; dy <= r; dy++) {
        const sy = dy < 0 ? 0 : (dy >= h ? h - 1 : dy);
        const srcRow = sy * w;
        for (let xx = 0; xx < w; xx++) {
            sumLine[xx] += tmp[srcRow + xx];
        }
    }
    for (let xx = 0; xx < w; xx++) {
        o[xx] = sumLine[xx] * invK;
    }
    for (let yy = 1; yy < h; yy++) {
        const destRow = yy * w;
        const ay = (yy + r) >= h ? h - 1 : (yy + r);
        const ry = (yy - r - 1) < 0 ? 0 : (yy - r - 1);
        const addRow = ay * w;
        const subRow = ry * w;
        for (let xx = 0; xx < w; xx++) {
            sumLine[xx] += tmp[addRow + xx] - tmp[subRow + xx];
            o[destRow + xx] = sumLine[xx] * invK;
        }
    }
}

function crBresenhamCircleOffsets(r) {
    if (r <= 0) return [[0, 0]];
    const seen = new Set();
    const out = [];
    let x = 0, y = r | 0, d = 1 - (r | 0);
    while (x <= y) {
        const pts = [[x, y], [-x, y], [x, -y], [-x, -y], [y, x], [-y, x], [y, -x], [-y, -x]];
        for (const p of pts) {
            const k = p[0] + ',' + p[1];
            if (!seen.has(k)) { seen.add(k); out.push(p); }
        }
        x++;
        if (d < 0) d += 2 * x + 1;
        else { y--; d += 2 * (x - y) + 1; }
    }
    return out;
}

function crAverageEdgeBlurPlaneRaw(s, o, w, h, radius) {
    const offs = crBresenhamCircleOffsets(radius | 0);
    const n = offs.length;
    const invN = 1.0 / n;
    
    o.fill(0);
    for (let i = 0; i < n; i++) {
        const dx = offs[i][0];
        const dy = offs[i][1];
        for (let yy = 0; yy < h; yy++) {
            let sy = yy + dy;
            if (sy < 0) sy = 0; else if (sy >= h) sy = h - 1;
            const srcRow = sy * w;
            const destRow = yy * w;
            for (let xx = 0; xx < w; xx++) {
                let sx = xx + dx;
                if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
                o[destRow + xx] += s[srcRow + sx];
            }
        }
    }
    const N = w * h;
    for (let i = 0; i < N; i++) {
        o[i] *= invN;
    }
}

function crAverageEdgeBlurPlane(s, o, w, h, radius) {
    if (radius <= 0) { o.set(s); return; }
    const ds = radius > 12 ? 4 : (radius > 4 ? 2 : 1);
    if (ds > 1) {
        const dw = Math.ceil(w / ds);
        const dh = Math.ceil(h / ds);
        const ds_radius = radius / ds;
        const down_s = crDownsamplePlane(s, w, h, dw, dh, ds);
        const down_o = new Float32Array(dw * dh);
        crAverageEdgeBlurPlaneRaw(down_s, down_o, dw, dh, ds_radius);
        crUpsamplePlane(down_o, dw, dh, o, w, h, ds);
    } else {
        crAverageEdgeBlurPlaneRaw(s, o, w, h, radius);
    }
}

function crGaussianBlurPlaneRaw(s, tmp, o, w, h, radiusParam) {
    const sigma = Math.max(0.5, radiusParam / 3.0);
    const kr = Math.max(1, Math.round(3 * sigma));
    const kArr = new Float32Array(2 * kr + 1);
    let ksum = 0;
    for (let i = -kr; i <= kr; i++) {
        const v = Math.exp(-(i * i) / (2 * sigma * sigma));
        kArr[i + kr] = v; ksum += v;
    }
    for (let i = 0; i < kArr.length; i++) kArr[i] /= ksum;

    // Horizontal pass (optimized cache-friendly)
    for (let yy = 0; yy < h; yy++) {
        const row = yy * w;
        for (let xx = 0; xx < w; xx++) {
            let acc = 0;
            for (let i = -kr; i <= kr; i++) {
                let sx = xx + i;
                if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
                acc += s[row + sx] * kArr[i + kr];
            }
            tmp[row + xx] = acc;
        }
    }

    // Vertical pass (optimized cache-friendly 1D accumulation)
    o.fill(0);
    for (let i = -kr; i <= kr; i++) {
        const weight = kArr[i + kr];
        for (let yy = 0; yy < h; yy++) {
            let sy = yy + i;
            if (sy < 0) sy = 0; else if (sy >= h) sy = h - 1;
            const srcRow = sy * w;
            const destRow = yy * w;
            for (let xx = 0; xx < w; xx++) {
                o[destRow + xx] += tmp[srcRow + xx] * weight;
            }
        }
    }
}

function crGaussianBlurPlane(s, tmp, o, w, h, radiusParam) {
    if (radiusParam <= 0) { o.set(s); return; }
    const ds = radiusParam > 12 ? 4 : (radiusParam > 4 ? 2 : 1);
    if (ds > 1) {
        const dw = Math.ceil(w / ds);
        const dh = Math.ceil(h / ds);
        const ds_radius = radiusParam / ds;
        const down_s = crDownsamplePlane(s, w, h, dw, dh, ds);
        const down_tmp = new Float32Array(dw * dh);
        const down_o = new Float32Array(dw * dh);
        crGaussianBlurPlaneRaw(down_s, down_tmp, down_o, dw, dh, ds_radius);
        crUpsamplePlane(down_o, dw, dh, o, w, h, ds);
    } else {
        crGaussianBlurPlaneRaw(s, tmp, o, w, h, radiusParam);
    }
}

function crApplyBlurFilter(targetCtx, w, h, mode, radius) {
    if (radius <= 0) return;
    const m = (mode || 'gaussian').toLowerCase();
    if (m.includes('surface')) {
        const r = Math.max(1, Math.min(8, Math.round(radius / 6.0)));
        const d = r * 2 + 1;
        applyBilateralFilter(targetCtx, w, h, d, (radius / 50.0) * 90.0 + 10.0, d * 2.0);
        return;
    }
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const N = w * h;
    const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
    const oR = new Float32Array(N), oG = new Float32Array(N), oB = new Float32Array(N);
    const tmp = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        sR[i] = src[i * 4] / 255;
        sG[i] = src[i * 4 + 1] / 255;
        sB[i] = src[i * 4 + 2] / 255;
    }
    if (m === 'average') {
        crBoxBlurPlane(sR, tmp, oR, w, h, radius);
        crBoxBlurPlane(sG, tmp, oG, w, h, radius);
        crBoxBlurPlane(sB, tmp, oB, w, h, radius);
    } else if (m === 'edge average') {
        crAverageEdgeBlurPlane(sR, oR, w, h, radius);
        crAverageEdgeBlurPlane(sG, oG, w, h, radius);
        crAverageEdgeBlurPlane(sB, oB, w, h, radius);
    } else {
        crGaussianBlurPlane(sR, tmp, oR, w, h, radius);
        crGaussianBlurPlane(sG, tmp, oG, w, h, radius);
        crGaussianBlurPlane(sB, tmp, oB, w, h, radius);
    }
    for (let i = 0; i < N; i++) {
        src[i * 4] = Math.max(0, Math.min(255, Math.round(oR[i] * 255)));
        src[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(oG[i] * 255)));
        src[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(oB[i] * 255)));
    }
    targetCtx.putImageData(imgData, 0, 0);
}


// --- Halftone ---
const CR_BAYER_8 = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
];

function crApplyHalftone(targetCtx, w, h, params) {
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const N = w * h;
    const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
    for (let i = 0; i < N; i++) { sR[i] = src[i * 4] / 255; sG[i] = src[i * 4 + 1] / 255; sB[i] = src[i * 4 + 2] / 255; }
    const oR = new Float32Array(N), oG = new Float32Array(N), oB = new Float32Array(N);
    const tmpP = new Float32Array(N);

    const shape = String(params.shape || 'Dot').toLowerCase();
    const inverse = !!params.inverse;
    const sz = Math.max(1, params.size | 0);
    const angleRad = (params.angle || 0) * Math.PI / 180;
    const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
    const dStrength = Math.max(0, Math.min(100, params.dither | 0)) / 100;
    const bayerCell = Math.max(1, (sz / 5) | 0);
    const cxImg = (w - 1) / 2, cyImg = (h - 1) / 2;
    const bOff = (params.brightness || 0) / 100.0;
    const cFac = ((params.contrast || 0) + 100.0) / 100.0;
    const invSz = 1 / sz;

    for (let p = 0; p < N; p++) {
        let r = (sR[p] - 0.5) * cFac + 0.5 + bOff;
        let g = (sG[p] - 0.5) * cFac + 0.5 + bOff;
        let b = (sB[p] - 0.5) * cFac + 0.5 + bOff;
        if (r < 0) r = 0; else if (r > 1) r = 1;
        if (g < 0) g = 0; else if (g > 1) g = 1;
        if (b < 0) b = 0; else if (b > 1) b = 1;
        tmpP[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    for (let y = 0; y < h; y++) {
        const ys = y - cyImg;
        for (let x = 0; x < w; x++) {
            const xs = x - cxImg;
            const rx = (xs * cosA + ys * sinA) * invSz;
            const ry = (-xs * sinA + ys * cosA) * invSz;
            const lx = rx - Math.floor(rx) - 0.5;
            const ly = ry - Math.floor(ry) - 0.5;
            let d, screen;
            switch (shape) {
                case 'square dot': d = 2 * Math.max(Math.abs(lx), Math.abs(ly)); screen = 1 - Math.min(1, Math.max(0, d)); break;
                case 'line': case 'line centered': screen = 1 - Math.min(1, Math.max(0, 2 * Math.abs(ly))); break;
                case 'rhomboid': case 'spot diamond': d = 2 * (Math.abs(lx) + Math.abs(ly)); screen = 1 - Math.min(1, Math.max(0, d)); break;
                case 'cross cut': d = 2 * Math.min(Math.abs(lx), Math.abs(ly)); screen = 1 - Math.min(1, Math.max(0, d)); break;
                case 'saddle': d = 4 * Math.abs(lx * ly); screen = 1 - Math.min(1, Math.max(0, d)); break;
                case 'random dots': {
                    const cxCell = Math.floor(rx), cyCell = Math.floor(ry);
                    const seed = (Math.abs((cxCell | 0) * 73856093 + (cyCell | 0) * 19349663)) >>> 0;
                    const dxJit = ((seed % 1000) / 1000 - 0.5) * 0.6;
                    const dyJit = ((Math.floor(seed / 1000) % 1000) / 1000 - 0.5) * 0.6;
                    d = Math.sqrt((lx - dxJit) ** 2 + (ly - dyJit) ** 2) / 0.7071;
                    screen = 1 - Math.min(1, Math.max(0, d)); break;
                }
                default: d = Math.sqrt(lx * lx + ly * ly) / 0.7071; screen = 1 - Math.min(1, Math.max(0, d));
            }
            const p = y * w + x;
            let effLum = tmpP[p];
            if (dStrength > 0) {
                const by = ((y / bayerCell) | 0) & 7;
                const bx = ((x / bayerCell) | 0) & 7;
                effLum += (CR_BAYER_8[by][bx] / 64 - 0.5) * dStrength;
            }
            let result;
            if (dStrength > 0) { result = effLum > screen ? 1 : 0; }
            else { result = Math.min(1, Math.max(0, (effLum - screen) * 4 + 0.5)); }
            if (inverse) result = 1 - result;
            oR[p] = result; oG[p] = result; oB[p] = result;
        }
    }
    for (let i = 0; i < N; i++) {
        src[i * 4] = Math.max(0, Math.min(255, Math.round(oR[i] * 255)));
        src[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(oG[i] * 255)));
        src[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(oB[i] * 255)));
    }
    targetCtx.putImageData(imgData, 0, 0);
}

// --- Color Balance Wheel Math ---
function cbShiftsToPos(r, g, b) {
    const tr = 0.5 + r / 200;
    const tg = 0.5 + g / 200;
    const tb = 0.5 + b / 200;
    const cr = Math.max(0, Math.min(1, tr));
    const cg = Math.max(0, Math.min(1, tg));
    const cb_ = Math.max(0, Math.min(1, tb));
    const mx = Math.max(cr, cg, cb_);
    const mn = Math.min(cr, cg, cb_);
    const d = mx - mn;
    let hue = 0;
    if (d > 1e-8) {
        if (mx === cr) hue = (((cg - cb_) / d) / 6) % 1;
        else if (mx === cg) hue = ((2 + (cb_ - cr) / d) / 6) % 1;
        else hue = ((4 + (cr - cg) / d) / 6) % 1;
        if (hue < 0) hue += 1;
    }
    const s = mx > 0 ? d / mx : 0;
    return { hue: hue, distance: s * mx };
}

let cbDiscCanvas = null;
function getCbDiscCanvas() {
    if (cbDiscCanvas) return cbDiscCanvas;
    const sz = 76;
    const c = document.createElement('canvas');
    c.width = sz; c.height = sz;
    const cx = c.getContext('2d');
    const img = cx.createImageData(sz, sz);
    const cc = sz / 2, rmax = sz / 2 - 1;
    for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
            const dx = x - cc, dy = y - cc;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const idx = (y * sz + x) * 4;
            if (dist > rmax) { img.data[idx + 3] = 0; continue; }
            const ang = Math.atan2(dx, -dy);
            let hue = ((ang * 180 / Math.PI) + 360) % 360;
            const s = Math.min(1, dist / rmax);
            const h6 = hue / 60, ii = Math.floor(h6), f = h6 - ii;
            const p = 1 - s, q = 1 - s * f, t = 1 - s * (1 - f);
            let r, g, b;
            switch (((ii % 6) + 6) % 6) {
                case 0: r = 1; g = t; b = p; break; case 1: r = q; g = 1; b = p; break;
                case 2: r = p; g = 1; b = t; break; case 3: r = p; g = q; b = 1; break;
                case 4: r = t; g = p; b = 1; break; default: r = 1; g = p; b = q;
            }
            img.data[idx] = (r * 255) | 0; img.data[idx + 1] = (g * 255) | 0;
            img.data[idx + 2] = (b * 255) | 0; img.data[idx + 3] = 255;
        }
    }
    cx.putImageData(img, 0, 0);
    cbDiscCanvas = c;
    return c;
}

// --- Posterize Error Diffusion ---
function crApplyPosterizeErrorDiffuse(targetCtx, w, h, levels, mode, kind) {
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const N = w * h;
    const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        sR[i] = src[i * 4] / 255;
        sG[i] = src[i * 4 + 1] / 255;
        sB[i] = src[i * 4 + 2] / 255;
    }
    const step = levels - 1;
    const m = (mode || 'RGB').toLowerCase();
    if (m === 'luminance') {
        const luma = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            luma[i] = sR[i] * 0.299 + sG[i] * 0.587 + sB[i] * 0.114;
        }
        crErrorDiffusePlane(luma, w, h, step, kind);
        for (let i = 0; i < N; i++) {
            const oldL = sR[i] * 0.299 + sG[i] * 0.587 + sB[i] * 0.114;
            const ratio = oldL > 1e-4 ? luma[i] / (oldL + 1e-8) : 1;
            src[i * 4] = Math.max(0, Math.min(255, Math.round(sR[i] * ratio * 255)));
            src[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(sG[i] * ratio * 255)));
            src[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(sB[i] * ratio * 255)));
        }
    } else {
        crErrorDiffusePlane(sR, w, h, step, kind);
        crErrorDiffusePlane(sG, w, h, step, kind);
        crErrorDiffusePlane(sB, w, h, step, kind);
        for (let i = 0; i < N; i++) {
            src[i * 4] = Math.max(0, Math.min(255, Math.round(sR[i] * 255)));
            src[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(sG[i] * 255)));
            src[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(sB[i] * 255)));
        }
    }
    targetCtx.putImageData(imgData, 0, 0);
}

// --- Color Filter Wheel ---
let _crColorWheelCanvas = null;
function getCRColorWheelCanvas() {
    if (_crColorWheelCanvas) return _crColorWheelCanvas;
    const sz = 150;
    const c = document.createElement('canvas');
    c.width = sz; c.height = sz;
    const cx = c.getContext('2d');
    const img = cx.createImageData(sz, sz);
    const cc = sz / 2, rmax = sz / 2 - 1;
    for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
            const dx = x - cc, dy = y - cc;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const idx = (y * sz + x) * 4;
            if (dist > rmax) { img.data[idx + 3] = 0; continue; }
            const ang = Math.atan2(dx, -dy);
            let hue = ((ang * 180 / Math.PI) + 360) % 360;
            const s = Math.min(1, dist / rmax);
            const h6 = hue / 60, ii = Math.floor(h6), f = h6 - ii;
            const p = 1 - s, q = 1 - s * f, t = 1 - s * (1 - f);
            let r, g, b;
            switch (((ii % 6) + 6) % 6) {
                case 0: r = 1; g = t; b = p; break; case 1: r = q; g = 1; b = p; break;
                case 2: r = p; g = 1; b = t; break; case 3: r = p; g = q; b = 1; break;
                case 4: r = t; g = p; b = 1; break; default: r = 1; g = p; b = q;
            }
            img.data[idx] = (r * 255) | 0; img.data[idx + 1] = (g * 255) | 0;
            img.data[idx + 2] = (b * 255) | 0; img.data[idx + 3] = 255;
        }
    }
    cx.putImageData(img, 0, 0);
    _crColorWheelCanvas = c;
    return c;
}

// --- Sharpen (Unsharp Mask) ---
function crApplySharpenUSM(targetCtx, w, h, amount, radius, threshold) {
    if (amount <= 0) return;
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const N = w * h;
    const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
    for (let i = 0; i < N; i++) { sR[i] = src[i * 4] / 255; sG[i] = src[i * 4 + 1] / 255; sB[i] = src[i * 4 + 2] / 255; }
    const blurR = new Float32Array(N), blurG = new Float32Array(N), blurB = new Float32Array(N);
    const tmp = new Float32Array(N);
    crGaussianBlurPlane(sR, tmp, blurR, w, h, radius);
    crGaussianBlurPlane(sG, tmp, blurG, w, h, radius);
    crGaussianBlurPlane(sB, tmp, blurB, w, h, radius);
    const thr = threshold / 255;
    const amt = amount / 100;
    for (let i = 0; i < N; i++) {
        let dr = sR[i] - blurR[i], dg = sG[i] - blurG[i], db = sB[i] - blurB[i];
        if (thr > 0) {
            if (Math.abs(dr) <= thr) dr = 0;
            if (Math.abs(dg) <= thr) dg = 0;
            if (Math.abs(db) <= thr) db = 0;
        }
        let r = sR[i] + dr * amt, g = sG[i] + dg * amt, b = sB[i] + db * amt;
        src[i * 4] = Math.max(0, Math.min(255, Math.round(r * 255)));
        src[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
        src[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    }
    targetCtx.putImageData(imgData, 0, 0);
}

// --- Laplacian Sharpen ---
function crApplyLaplacianSharpen(targetCtx, w, h, amount, kernel) {
    if (amount <= 0) return;
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = imgData.data;
    const N = w * h;
    const sR = new Float32Array(N), sG = new Float32Array(N), sB = new Float32Array(N);
    for (let i = 0; i < N; i++) { sR[i] = src[i * 4] / 255; sG[i] = src[i * 4 + 1] / 255; sB[i] = src[i * 4 + 2] / 255; }
    const use8 = String(kernel || '').indexOf('4') < 0;
    function plane(s, o) {
        for (let y = 0; y < h; y++) {
            const ym = y > 0 ? y - 1 : 0, yp = y < h - 1 ? y + 1 : h - 1;
            for (let x = 0; x < w; x++) {
                const xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : w - 1;
                const c = s[y * w + x];
                let lap;
                if (use8) {
                    lap = s[ym * w + xm] + s[ym * w + x] + s[ym * w + xp]
                        + s[y * w + xm] + s[y * w + xp]
                        + s[yp * w + xm] + s[yp * w + x] + s[yp * w + xp] - 8 * c;
                } else { lap = s[ym * w + x] + s[y * w + xm] + s[y * w + xp] + s[yp * w + x] - 4 * c; }
                let v = c - amount * lap;
                o[y * w + x] = v < 0 ? 0 : (v > 1 ? 1 : v);
            }
        }
    }
    const oR = new Float32Array(N), oG = new Float32Array(N), oB = new Float32Array(N);
    plane(sR, oR); plane(sG, oG); plane(sB, oB);
    for (let i = 0; i < N; i++) {
        src[i * 4] = Math.max(0, Math.min(255, Math.round(oR[i] * 255)));
        src[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(oG[i] * 255)));
        src[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(oB[i] * 255)));
    }
    targetCtx.putImageData(imgData, 0, 0);
}

// --- Posterize ---
function crErrorDiffusePlane(arr, w, h, step, kind) {
    if (kind === 'floyd-steinberg') {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const old = arr[i], ne = Math.round(old * step) / step, err = old - ne;
                arr[i] = ne;
                if (x + 1 < w) arr[i + 1] += err * (7 / 16);
                if (y + 1 < h) {
                    if (x > 0) arr[i + w - 1] += err * (3 / 16);
                    arr[i + w] += err * (5 / 16);
                    if (x + 1 < w) arr[i + w + 1] += err * (1 / 16);
                }
            }
        }
    } else { // atkinson
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const old = arr[i], ne = Math.round(old * step) / step, err = (old - ne) / 8;
                arr[i] = ne;
                if (x + 1 < w) arr[i + 1] += err;
                if (x + 2 < w) arr[i + 2] += err;
                if (y + 1 < h) {
                    if (x > 0) arr[i + w - 1] += err;
                    arr[i + w] += err;
                    if (x + 1 < w) arr[i + w + 1] += err;
                }
                if (y + 2 < h) arr[i + 2 * w] += err;
            }
        }
    }
    for (let i = 0; i < arr.length; i++) { if (arr[i] < 0) arr[i] = 0; else if (arr[i] > 1) arr[i] = 1; }
}

// --- Levels (per-pixel, applied inside processPixels) ---
// Integrated directly into processPixels via parameters

// --- Color Balance (per-pixel, applied inside processPixels) ---
// Integrated directly into processPixels via parameters

// ============================================================
// END NEW FILTER ALGORITHMS
// ============================================================

function getCRTooltipText() {
    return `◩ Trix Camera Raw — Professional Color Grading
Professional RAW image editor.

Key Features:
✦ Layers — Multi-layer correction support with Photoshop blending modes and opacity. Add new layers using the [+ Add Layer] button on the left panel (slide out using the notch on the left edge). Baking composites layers automatically when saving.
✦ Color Grading — Complete adjustment of exposure, contrast, highlights, shadows, temperature, vibrance, vignetting.
✦ HSL Sliders — Adjust hue, saturation, and luminance for 8 individual color channels.
✦ Curves — Precise contrast and color curves mapping for R, G, B, and RGB channels.
✦ Effects — Halftone, Pixel Art (with K-Means and Dithering), and Sketch (pencil drawing effect).
✦ Advanced Filters — Levels, Color Balance, Color Filter (HSV Wheel), Advanced Vignette, Blur (Gaussian/Average/Edge/Surface), Sharpen (USM & Laplacian), Posterize (with Atkinson/Floyd-Steinberg dithering).

Shortcuts & Tips:
⌨ [F] in HSL / Curves mode — Activates the pipette. Click and drag up/down on the image to adjust parameters for the color under the cursor.
⌨ [Ctrl + Z] / [Ctrl + Y] — Undo / Redo actions.
⌨ [LMB + Drag] — Pan / Move the canvas.
⌨ [Mouse Wheel] — Zoom in and out.
⌨ [Double-Click a slider] — Reset slider to its default value.
- [Save Settings] — Save changes and update node parameters

⚠️ Important: To apply RAW filters during workflow execution, check the "cr_enable" checkbox (or "Enable Filter" on the node panel).`;
}

function ensureTooltipStyles() {
    if (!document.getElementById("trix-tooltip-styles")) {
        const style = document.createElement("style");
        style.id = "trix-tooltip-styles";
        style.innerHTML = `
            .trix-tooltip-container {
                position: relative;
                display: inline-flex;
                align-items: center;
                cursor: pointer;
                vertical-align: middle;
            }
            .trix-help-mark {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 1.5px solid #00bfff;
                color: #00bfff;
                font-size: 10px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                transition: all 0.2s;
                background: transparent;
                box-sizing: border-box;
            }
            .trix-tooltip-container:hover .trix-help-mark {
                background-color: rgba(0, 191, 255, 0.2);
                box-shadow: 0 0 6px rgba(0, 191, 255, 0.5);
            }
            .trix-tooltip-text-left, .trix-tooltip-text-right {
                visibility: hidden;
                opacity: 0;
                position: fixed;
                top: 50px;
                width: 380px;
                background-color: #1a1a1e;
                border: 1.5px solid #00bfff;
                border-radius: 6px;
                padding: 12px;
                color: #e0e0e0;
                font-family: sans-serif;
                font-size: 11px;
                line-height: 1.45;
                box-shadow: 0 4px 20px rgba(0,0,0,0.8);
                z-index: 999999;
                transition: opacity 0.2s, visibility 0.2s;
                white-space: pre-line;
                pointer-events: none;
                text-transform: none;
                font-weight: normal;
                text-align: left;
            }
            .trix-tooltip-text-left {
                left: 290px;
                right: auto;
            }
            .trix-tooltip-text-right {
                right: 290px;
                left: auto;
            }
            .trix-tooltip-container:hover .trix-tooltip-text-left,
            .trix-tooltip-container:hover .trix-tooltip-text-right {
                visibility: visible;
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
}

export function openTrixCamrawBox(node, imgElement, savedMaskCanvas) {
    try {
        const abortCtrl = new AbortController();
        if (!imgElement || !imgElement.naturalWidth) {
            alert("Please load an image first!");
            return;
        }

        let drawCfWheel, drawHtDial, drawCbWheels, drawLevelsBar;

    const origImgObj = new Image();
    origImgObj.crossOrigin = "Anonymous";
    let opaqueSrc = imgElement.src;
    if (opaqueSrc && !opaqueSrc.startsWith("data:") && !opaqueSrc.startsWith("blob:")) {
        try {
            const url = new URL(opaqueSrc, window.location.origin);
            url.searchParams.set("channel", "rgb");
            opaqueSrc = url.toString();
        } catch(e) {}
    }
    origImgObj.src = opaqueSrc;

    const TRIX_AIO_SUBFOLDER = "aio_input";
    const getCleanOrigBaseName = (src) => {
        if (!src) return "image";
        let filename = "";
        try {
            const url = new URL(src, window.location.origin);
            filename = url.searchParams.get("filename") || "";
        } catch(e) {
            filename = src;
        }
        let basename = filename.split('/').pop().split('\\').pop();
        let dotIdx = basename.lastIndexOf('.');
        if (dotIdx !== -1) basename = basename.substring(0, dotIdx);
        basename = basename.replace(/_(edited|masked|pasted|crop|cutout|camera_raw_HQ)_[a-zA-Z0-9_-]+_\d+/g, "");
        basename = basename.replace(/_(edited|masked|pasted|crop|cutout|camera_raw_HQ)_\d+/g, "");
        basename = basename.replace(/^(trix_crop_|trix_edited_|trix_camera_raw_HQ_|trix_cutout_|masked_)/g, "");
        basename = basename.replace(/[^a-zA-Z0-9_-]/g, "_");
        return basename || "image";
    };
    const trixCropFilename = (nodeId, version) => {
        const uWgt = node.widgets ? node.widgets.find(w => w.name === "trix_uuid") : null;
        const idToUse = uWgt && uWgt.value ? uWgt.value : nodeId;
        const origBase = getCleanOrigBaseName(imgElement.src);
        return `${origBase}_edited_${idToUse}_${version}.png`;
    };

    const getW = (name) => node.widgets ? node.widgets.find(w => w && w.name === name) : null;
    const getV = (name) => { const w = getW(name); return w ? parseInt(w.value) || 0 : 0; };
    const getFV = (name, fallback = 0.0) => {
        const w = getW(name);
        if (!w || w.value === undefined) return fallback;
        const parsed = parseFloat(w.value);
        return isNaN(parsed) ? fallback : parsed;
    };
    const getSV = (name, fallback = "") => {
        const w = getW(name);
        return w && w.value !== undefined ? String(w.value) : fallback;
    };

    let state = {
        cr_offset: getV('cr_offset'),
        cr_exp: getV('cr_exp'),
        cr_cont: getV('cr_cont'),
        cr_high: getV('cr_high'),
        cr_shad: getV('cr_shad'),
        cr_white: getV('cr_white'),
        cr_black: getV('cr_black'),
        cr_temp: getV('cr_temp'),
        cr_tint: getV('cr_tint'),
        cr_vibrance: getW('cr_vibrance') ? getV('cr_vibrance') : getV('cr_colorfulness'),
        cr_colorfulness: getV('cr_colorfulness'),
        cr_sat: getV('cr_sat'),
        cr_tex: getV('cr_tex'),
        cr_clar: getV('cr_clar'),
        cr_dehz: getV('cr_dehz'),
        cr_sharp: getV('cr_sharp'),
        cr_denoise: getV('cr_denoise'),
        cr_blur: getV('cr_blur'),
        cr_surface_blur: getV('cr_surface_blur'),
        cr_grain: getV('cr_grain'),
        cr_vignette: getV('cr_vignette'),
        cr_sketch_kernel_size: getV('cr_sketch_kernel_size'),
        cr_sketch_sigma: getFV('cr_sketch_sigma', 1.4),
        cr_sketch_k_sigma: getFV('cr_sketch_k_sigma', 1.6),
        cr_sketch_epsilon: getFV('cr_sketch_epsilon', -0.03),
        cr_sketch_phi: getFV('cr_sketch_phi', 10.0),
        cr_sketch_gamma: getFV('cr_sketch_gamma', 1.0),
        cr_sketch_color: getSV('cr_sketch_color', 'gray'),
        cr_pixel_colors: getV('cr_pixel_colors') || 128,
        cr_pixel_dot_size: getV('cr_pixel_dot_size'),
        cr_pixel_outline: getV('cr_pixel_outline'),
        cr_pixel_smoothing: getV('cr_pixel_smoothing'),
        cr_pixel_algo: getSV('cr_pixel_algo', 'kmeans'),
        // Blur Advanced
        cr_blur_radius: getV('cr_blur_radius'),
        cr_blur_mode: getSV('cr_blur_mode', 'gaussian'),
        // Halftone
        cr_ht_size: getV('cr_ht_size') || 0,
        cr_ht_angle: getW('cr_ht_angle') !== null ? getV('cr_ht_angle') : 15,
        cr_ht_contrast: getV('cr_ht_contrast'),
        cr_ht_brightness: getV('cr_ht_brightness'),
        cr_ht_dither: getW('cr_ht_dither') !== null ? getV('cr_ht_dither') : 100,
        cr_ht_inverse: !!getV('cr_ht_inverse'),
        cr_ht_shape: getSV('cr_ht_shape', 'Dot'),
        // Sharpen USM
        cr_usm_amount: getV('cr_usm_amount'),
        cr_usm_radius: getW('cr_usm_radius') !== null ? (getV('cr_usm_radius') || 2) : 2,
        cr_usm_threshold: getV('cr_usm_threshold'),
        // Laplacian
        cr_lap_amount: getFV('cr_lap_amount', 0),
        cr_lap_kernel: getSV('cr_lap_kernel', '8-neighbor'),
        // Color Filter
        cr_cf_hue: getV('cr_cf_hue'),
        cr_cf_density: getV('cr_cf_density'),
        cr_cf_preserve: getW('cr_cf_preserve') !== null ? getV('cr_cf_preserve') : 50,
        // Posterize
        cr_post_enable: false,
        cr_post_levels: getW('cr_post_levels') !== null ? getV('cr_post_levels') : 4,
        cr_post_mode: getSV('cr_post_mode', 'RGB'),
        cr_post_dither_mode: getSV('cr_post_dither_mode', 'None'),
        cr_post_dither: getV('cr_post_dither'),
        // Levels
        cr_lvl_channel: getSV('cr_lvl_channel', 'rgb'),
        cr_lvl_in_black: getV('cr_lvl_in_black'),
        cr_lvl_in_white: (() => { const w = getW('cr_lvl_in_white'); if (!w) return 255; const v = parseInt(w.value); return (isNaN(v) || v <= 0) ? 255 : v; })(),
        cr_lvl_gamma: getFV('cr_lvl_gamma', 1.0),
        cr_lvl_out_black: getV('cr_lvl_out_black'),
        cr_lvl_out_white: (() => { const w = getW('cr_lvl_out_white'); if (!w) return 255; const v = parseInt(w.value); return (isNaN(v) || v <= 0) ? 255 : v; })(),
        // Color Balance
        cr_cb_shad_r: getV('cr_cb_shad_r'), cr_cb_shad_g: getV('cr_cb_shad_g'), cr_cb_shad_b: getV('cr_cb_shad_b'),
        cr_cb_mid_r: getV('cr_cb_mid_r'), cr_cb_mid_g: getV('cr_cb_mid_g'), cr_cb_mid_b: getV('cr_cb_mid_b'),
        cr_cb_high_r: getV('cr_cb_high_r'), cr_cb_high_g: getV('cr_cb_high_g'), cr_cb_high_b: getV('cr_cb_high_b')
    };

    const defaultCrState = {
        cr_offset: 0, cr_exp: 0, cr_cont: 0, cr_high: 0, cr_shad: 0, cr_white: 0, cr_black: 0,
        cr_temp: 0, cr_tint: 0, cr_vibrance: 0, cr_colorfulness: 0, cr_sat: 0,
        cr_tex: 0, cr_clar: 0, cr_dehz: 0, cr_sharp: 0, cr_denoise: 0,
        cr_blur: 0, cr_surface_blur: 0, cr_grain: 0, cr_vignette: 0,
        cr_sketch_kernel_size: 0, cr_sketch_sigma: 1.4, cr_sketch_k_sigma: 1.6, cr_sketch_epsilon: -0.03, cr_sketch_phi: 10.0, cr_sketch_gamma: 1.0, cr_sketch_color: 'gray',
        cr_pixel_colors: 128, cr_pixel_dot_size: 0, cr_pixel_outline: 0, cr_pixel_smoothing: 0, cr_pixel_algo: 'kmeans',
        cr_blur_radius: 0, cr_blur_mode: 'gaussian',
        cr_ht_size: 0, cr_ht_angle: 15, cr_ht_contrast: 0, cr_ht_brightness: 0, cr_ht_dither: 100, cr_ht_inverse: false, cr_ht_shape: 'Dot',
        cr_usm_amount: 0, cr_usm_radius: 1, cr_usm_threshold: 0,
        cr_lap_amount: 0, cr_lap_kernel: '8-neighbor',
        cr_cf_hue: 0, cr_cf_density: 0, cr_cf_preserve: 50,
        cr_post_enable: false, cr_post_levels: 4, cr_post_mode: 'RGB', cr_post_dither_mode: 'None', cr_post_dither: 0,
        cr_lvl_channel: 'rgb', cr_lvl_in_black: 0, cr_lvl_in_white: 255, cr_lvl_gamma: 1.0, cr_lvl_out_black: 0, cr_lvl_out_white: 255,
        cr_cb_shad_r: 0, cr_cb_shad_g: 0, cr_cb_shad_b: 0,
        cr_cb_mid_r: 0, cr_cb_mid_g: 0, cr_cb_mid_b: 0,
        cr_cb_high_r: 0, cr_cb_high_g: 0, cr_cb_high_b: 0
    };

    for (const key in defaultCrState) {
        const val = state[key];
        if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
            state[key] = defaultCrState[key];
        }
    }

    const defaultHslState = {
        colorize: false,
        activeChannel: 'master',
        master:   { h: 0, s: 0, l: 0 },
        reds:     { h: 0, s: 0, l: 0, center: 0, width: 60 },
        yellows:  { h: 0, s: 0, l: 0, center: 60, width: 60 },
        greens:   { h: 0, s: 0, l: 0, center: 120, width: 60 },
        cyans:    { h: 0, s: 0, l: 0, center: 180, width: 60 },
        blues:    { h: 0, s: 0, l: 0, center: 240, width: 60 },
        magentas: { h: 0, s: 0, l: 0, center: 300, width: 60 }
    };

    const defaultCurvesState = {
        rgb: [{x:0, y:0}, {x:255, y:255}],
        r:   [{x:0, y:0}, {x:255, y:255}],
        g:   [{x:0, y:0}, {x:255, y:255}],
        b:   [{x:0, y:0}, {x:255, y:255}]
    };

    let hslState = {
        colorize: false,
        activeChannel: 'master', 
        master:   { h: 0, s: 0, l: 0 },
        reds:     { h: 0, s: 0, l: 0, center: 0, width: 60 },
        yellows:  { h: 0, s: 0, l: 0, center: 60, width: 60 },
        greens:   { h: 0, s: 0, l: 0, center: 120, width: 60 },
        cyans:    { h: 0, s: 0, l: 0, center: 180, width: 60 },
        blues:    { h: 0, s: 0, l: 0, center: 240, width: 60 },
        magentas: { h: 0, s: 0, l: 0, center: 300, width: 60 }
    };
    let curvesState = createDefaultCurveState();

    const wHslData = getW("hsl_data");
    if (wHslData && wHslData.value && wHslData.value !== "{}") {
        try {
            const parsed = JSON.parse(wHslData.value);
            hslState = { ...hslState, ...parsed };
        } catch(e) {}
    }
    const wCurveData = getW("curve_data");
    if (wCurveData && wCurveData.value && wCurveData.value !== "{}") {
        try {
            curvesState = ensureCurveState(JSON.parse(wCurveData.value));
        } catch(e) {}
    }

    // --- Layers Initialization ---
    let layers = [];
    if (node.properties && node.properties.trix_layers) {
        try {
            layers = typeof node.properties.trix_layers === "string" 
                ? JSON.parse(node.properties.trix_layers) 
                : node.properties.trix_layers;
            if (Array.isArray(layers)) {
                layers.forEach(layer => {
                    if (layer) {
                        if (!layer.state) layer.state = {};
                        const sanitizedState = {};
                        for (const key in defaultCrState) {
                            const val = layer.state[key];
                            if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
                                sanitizedState[key] = defaultCrState[key];
                            } else {
                                sanitizedState[key] = val;
                            }
                        }
                        layer.state = sanitizedState;

                        if (!layer.hslState) {
                            layer.hslState = JSON.parse(JSON.stringify(defaultHslState));
                        } else {
                            const hs = layer.hslState;
                            if (hs.colorize === undefined) hs.colorize = defaultHslState.colorize;
                            if (!hs.activeChannel) hs.activeChannel = defaultHslState.activeChannel;
                            for (const ch of ['master', 'reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas']) {
                                if (!hs[ch]) {
                                    hs[ch] = { ...defaultHslState[ch] };
                                } else {
                                    if (hs[ch].h === undefined || hs[ch].h === null || isNaN(hs[ch].h)) hs[ch].h = 0;
                                    if (hs[ch].s === undefined || hs[ch].s === null || isNaN(hs[ch].s)) hs[ch].s = 0;
                                    if (hs[ch].l === undefined || hs[ch].l === null || isNaN(hs[ch].l)) hs[ch].l = 0;
                                    if (ch !== 'master') {
                                        if (hs[ch].center === undefined) hs[ch].center = defaultHslState[ch].center;
                                        if (hs[ch].width === undefined) hs[ch].width = defaultHslState[ch].width;
                                    }
                                }
                            }
                        }

                        if (!layer.curvesState) {
                            layer.curvesState = JSON.parse(JSON.stringify(defaultCurvesState));
                        } else {
                            layer.curvesState = ensureCurveState(layer.curvesState);
                        }
                    }
                });
            }
        } catch (e) {
            console.error("Failed to parse saved layers:", e);
        }
    }
    let layersMode = (node.properties && node.properties.trix_layers_mode) || "filter";
    if (!Array.isArray(layers) || layers.length === 0) {
        layers = [{
            id: "layer_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            name: "Layer 1",
            visible: true,
            opacity: 100,
            blendMode: "source-over",
            state: { ...state },
            hslState: JSON.parse(JSON.stringify(hslState)),
            curvesState: JSON.parse(JSON.stringify(curvesState))
        }];
    }
    let selectedLayerIndex = 0;
    
    // Bind initial references to the selected layer
    state = layers[selectedLayerIndex].state;
    hslState = layers[selectedLayerIndex].hslState;
    curvesState = layers[selectedLayerIndex].curvesState;

    let crHistory = [ JSON.stringify({
        layers: JSON.parse(JSON.stringify(layers)),
        selectedLayerIndex: selectedLayerIndex
    }) ];
    let crHistoryIdx = 0;

    let curvesFingerBtn;
    let curvesFingerActive = false;
    let curvesDragging = false;
    let dragStartTargetY = 0;
    let curvesFingerPointIdx = -1;
    let curvesFingerStartValY = 0;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background-color: #1a1a1a;
        z-index: 10000; display: flex; flex-direction: row; font-family: sans-serif; user-select: none;
    `;
    overlay.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // --- Layers Panel UI ---
    const layersPanel = document.createElement("div");
    layersPanel.style.cssText = `
        width: 0px; min-width: 0px; height: 100%; max-height: 100vh; background: #151515;
        border-right: 0px solid #333; z-index: 10; overflow: visible;
        position: relative; transition: width 0.3s ease, min-width 0.3s ease, border-right 0.3s ease;
    `;
    
    const layersPanelContent = document.createElement("div");
    layersPanelContent.style.cssText = `
        width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;
    `;
    layersPanel.appendChild(layersPanelContent);
    const layersNotch = document.createElement("div");
    layersNotch.style.cssText = `
        position: absolute;
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        width: 28px;
        height: 140px;
        background: #33789a;
        border: 1px solid #33789a;
        border-left: none;
        border-radius: 0 8px 8px 0;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #fff;
        z-index: 10001;
        box-shadow: 2px 0 5px rgba(0,0,0,0.3);
        transition: background 0.2s, color 0.2s, border-color 0.2s;
        gap: 4px;
    `;
    layersNotch.innerHTML = `
        <span style="font-size: 11px; font-weight: 900; font-family: sans-serif; pointer-events: none; line-height: 1.1; color: #fff;">L</span>
        <span style="font-size: 11px; font-weight: 900; font-family: sans-serif; pointer-events: none; line-height: 1.1; color: #fff;">A</span>
        <span style="font-size: 11px; font-weight: 900; font-family: sans-serif; pointer-events: none; line-height: 1.1; color: #fff;">Y</span>
        <span style="font-size: 11px; font-weight: 900; font-family: sans-serif; pointer-events: none; line-height: 1.1; color: #fff;">E</span>
        <span style="font-size: 11px; font-weight: 900; font-family: sans-serif; pointer-events: none; line-height: 1.1; color: #fff;">R</span>
        <span style="font-size: 11px; font-weight: 900; font-family: sans-serif; pointer-events: none; line-height: 1.1; color: #fff;">S</span>
    `;
    layersNotch.onmouseenter = () => { layersNotch.style.background = "#3f8eb4"; layersNotch.style.borderColor = "#3f8eb4"; };
    layersNotch.onmouseleave = () => { layersNotch.style.background = "#33789a"; layersNotch.style.borderColor = "#33789a"; };
    layersPanel.appendChild(layersNotch);
    const layersHeader = document.createElement("div");
    layersHeader.style.cssText = "padding: 18px 18px 10px 18px; border-bottom: 1px solid #333; font-weight: bold; color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; min-height: 50px; box-sizing: border-box;";
    
    const titleSpan = document.createElement("span");
    titleSpan.innerText = "Layers";
    layersHeader.appendChild(titleSpan);

    const pillContainer = document.createElement("div");
    pillContainer.title = "Filter Mode: Apply adjustments sequentially (additive).\nImage Mode: Treat each layer as a standalone canvas.";
    pillContainer.style.cssText = `
        display: flex;
        position: relative;
        background: #111;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 2px;
        font-size: 10px;
        cursor: pointer;
        user-select: none;
        width: 100px;
        height: 20px;
        align-items: center;
        box-sizing: border-box;
        margin-left: auto;
    `;

    const filterBtn = document.createElement("div");
    filterBtn.innerText = "Filter";
    filterBtn.style.cssText = `
        flex: 1;
        text-align: center;
        z-index: 2;
        transition: color 0.2s;
        font-weight: bold;
        line-height: 14px;
        color: #fff;
    `;

    const imageBtn = document.createElement("div");
    imageBtn.innerText = "Image";
    imageBtn.style.cssText = `
        flex: 1;
        text-align: center;
        z-index: 2;
        transition: color 0.2s;
        font-weight: bold;
        line-height: 14px;
        color: #888;
    `;

    const pillBg = document.createElement("div");
    pillBg.style.cssText = `
        position: absolute;
        top: 2px;
        left: 2px;
        width: 46px;
        height: 14px;
        background: #33789a;
        border-radius: 9px;
        transition: transform 0.2s ease;
        z-index: 1;
    `;

    pillContainer.append(pillBg, filterBtn, imageBtn);
    layersHeader.appendChild(pillContainer);
    layersPanelContent.appendChild(layersHeader);

    const setLayersMode = (mode) => {
        layersMode = mode;
        if (mode === "filter") {
            pillBg.style.transform = "translateX(0px)";
            filterBtn.style.color = "#fff";
            imageBtn.style.color = "#888";
        } else {
            pillBg.style.transform = "translateX(48px)";
            filterBtn.style.color = "#888";
            imageBtn.style.color = "#fff";
        }
        scheduleRender();
    };

    filterBtn.onclick = (e) => {
        e.stopPropagation();
        setLayersMode("filter");
    };
    imageBtn.onclick = (e) => {
        e.stopPropagation();
        setLayersMode("image");
    };
    pillContainer.onclick = () => {
        if (layersMode === "filter") {
            setLayersMode("image");
        } else {
            setLayersMode("filter");
        }
    };
    
    setTimeout(() => {
        setLayersMode(layersMode);
    }, 0);

    const layersListContainer = document.createElement("div");
    layersListContainer.style.cssText = "flex: 1; overflow-y: auto; padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px;";
    layersListContainer.className = "trix-cr-panel";
    layersPanelContent.appendChild(layersListContainer);

    const layersButtonsRow = document.createElement("div");
    layersButtonsRow.style.cssText = "display: flex; gap: 8px; margin-top: 4px; flex-shrink: 0; width: 100%; box-sizing: border-box;";

    const addLayerBtn = document.createElement("button");
    addLayerBtn.innerText = "Add New";
    addLayerBtn.style.cssText = "flex: 1; padding: 8px; background: #2a2a2f; color: #eee; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;";
    addLayerBtn.onmouseenter = () => { addLayerBtn.style.background = "#333a45"; addLayerBtn.style.color = "#fff"; };
    addLayerBtn.onmouseleave = () => { addLayerBtn.style.background = "#2a2a2f"; addLayerBtn.style.color = "#eee"; };

    const duplicateLayerBtn = document.createElement("button");
    duplicateLayerBtn.innerText = "Duplicate";
    duplicateLayerBtn.style.cssText = "flex: 1; padding: 8px; background: #2a2a2f; color: #eee; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;";
    duplicateLayerBtn.onmouseenter = () => { duplicateLayerBtn.style.background = "#333a45"; duplicateLayerBtn.style.color = "#fff"; };
    duplicateLayerBtn.onmouseleave = () => { duplicateLayerBtn.style.background = "#2a2a2f"; duplicateLayerBtn.style.color = "#eee"; };

    layersButtonsRow.appendChild(addLayerBtn);
    layersButtonsRow.appendChild(duplicateLayerBtn);
    
    const blendModes = [
        { value: "source-over", label: "Normal" },
        { value: "multiply", label: "Multiply" },
        { value: "screen", label: "Screen" },
        { value: "overlay", label: "Overlay" },
        { value: "darken", label: "Darken" },
        { value: "lighten", label: "Lighten" },
        { value: "color-dodge", label: "Color Dodge" },
        { value: "color-burn", label: "Color Burn" },
        { value: "hard-light", label: "Hard Light" },
        { value: "soft-light", label: "Soft Light" },
        { value: "difference", label: "Difference" },
        { value: "exclusion", label: "Exclusion" },
        { value: "hue", label: "Hue" },
        { value: "saturation", label: "Saturation" },
        { value: "color", label: "Color" },
        { value: "luminosity", label: "Luminosity" }
    ];

    const updateRightPanelUI = () => {
        for (const key in state) {
            const iEl = document.getElementById(`cr_input_${key}`);
            const sEl = document.getElementById(`cr_slider_${key}`);
            if (iEl) iEl.value = state[key];
            if (sEl) sEl.value = state[key];
        }
        const sketchColorEl = document.getElementById("cr_sketch_color");
        if (sketchColorEl) sketchColorEl.value = state.cr_sketch_color;
        const pixelAlgoEl = document.getElementById("cr_pixel_algo");
        if (pixelAlgoEl) pixelAlgoEl.value = state.cr_pixel_algo;

        const cfHueInputEl = document.getElementById("cr_cf_hue_input");
        if (cfHueInputEl) cfHueInputEl.value = state.cr_cf_hue;

        const blurModeEl = document.getElementById("cr_blur_mode");
        if (blurModeEl) blurModeEl.value = state.cr_blur_mode;

        const htShapeEl = document.getElementById("cr_ht_shape");
        if (htShapeEl) htShapeEl.value = state.cr_ht_shape;

        const htInverseEl = document.getElementById("cr_ht_inverse");
        if (htInverseEl) htInverseEl.checked = !!state.cr_ht_inverse;

        const postEnableEl = document.getElementById("cr_post_enable");
        if (postEnableEl) postEnableEl.checked = !!state.cr_post_enable;

        const lapKernelEl = document.getElementById("cr_lap_kernel");
        if (lapKernelEl) lapKernelEl.value = state.cr_lap_kernel;

        const postModeEl = document.getElementById("cr_post_mode");
        if (postModeEl) postModeEl.value = state.cr_post_mode;

        const postDitherModeEl = document.getElementById("cr_post_dither_mode");
        if (postDitherModeEl) postDitherModeEl.value = state.cr_post_dither_mode;

        const lvlChannelEl = document.getElementById("cr_lvl_channel");
        if (lvlChannelEl) lvlChannelEl.value = state.cr_lvl_channel;

        if (typeof drawCfWheel === "function") {
            try { drawCfWheel(); } catch(e) {}
        }
        if (typeof drawLevelsBar === "function") {
            try { drawLevelsBar(); } catch(e) {}
        }
        if (typeof drawHtDial === "function") {
            try { drawHtDial(); } catch(e) {}
        }
        if (typeof drawCbWheels === "function") {
            try { drawCbWheels(); } catch(e) {}
        }

        updateHslUI();
        updateCurvesUI();
    };

    const renderLayersList = () => {
        layersListContainer.innerHTML = "";
        
        for (let idx = 0; idx < layers.length; idx++) {
            const layer = layers[idx];
            
            const block = document.createElement("div");
            block.draggable = true;
            block.style.cssText = `
                padding: 8px 10px;
                background: #1a1a1a;
                border: 1px solid ${selectedLayerIndex === idx ? "#33789a" : "#444"};
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                cursor: grab;
                transition: border-color 0.2s, background 0.2s;
                user-select: none;
            `;
            if (selectedLayerIndex !== idx) {
                block.onmouseenter = () => block.style.borderColor = "#666";
                block.onmouseleave = () => block.style.borderColor = "#444";
            }
            block.onclick = () => {
                if (selectedLayerIndex !== idx) {
                    selectedLayerIndex = idx;
                    state = layers[selectedLayerIndex].state;
                    hslState = layers[selectedLayerIndex].hslState;
                    curvesState = layers[selectedLayerIndex].curvesState;
                    updateRightPanelUI();
                    renderLayersList();
                }
            };
            
            // Row 1
            const row1 = document.createElement("div");
            row1.style.cssText = "display: flex; align-items: center; justify-content: space-between; width: 100%;";
            
            const label = document.createElement("span");
            label.innerText = layer.name;
            label.style.cssText = "color: #eee; font-size: 11px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 6px; cursor: pointer;";
            label.title = "Double-click to rename";
            
            label.ondblclick = (e) => {
                e.stopPropagation();
                
                const input = document.createElement("input");
                input.type = "text";
                input.value = layer.name;
                input.style.cssText = "background: #2a2a2f; color: #fff; border: 1px solid #33789a; border-radius: 3px; font-size: 11px; padding: 2px 4px; width: 100%; box-sizing: border-box; font-family: inherit; font-weight: bold; outline: none; margin: 0;";
                
                row1.replaceChild(input, label);
                input.focus();
                input.select();
                
                let finished = false;
                const finishRename = () => {
                    if (finished) return;
                    finished = true;
                    const val = input.value.trim();
                    if (val) {
                        layer.name = val;
                    }
                    renderLayersList();
                    pushCrHistory();
                };
                
                input.onblur = finishRename;
                input.onkeydown = (evt) => {
                    if (evt.key === "Enter") {
                        evt.preventDefault();
                        finishRename();
                    } else if (evt.key === "Escape") {
                        evt.preventDefault();
                        finished = true;
                        renderLayersList();
                    }
                    evt.stopPropagation();
                };
                
                input.onclick = (evt) => evt.stopPropagation();
                input.onmousedown = (evt) => evt.stopPropagation();
            };
            
            const btns = document.createElement("div");
            btns.style.cssText = "display: flex; gap: 4px; align-items: center;";
            
            // Eye Button
            const eyeBtn = document.createElement("button");
            eyeBtn.innerHTML = "👁";
            eyeBtn.title = layer.visible ? "Hide Layer" : "Show Layer";
            eyeBtn.style.cssText = `
                background: none; border: none;
                color: #eee;
                opacity: ${layer.visible ? "1" : "0.25"};
                cursor: pointer; padding: 2px 4px; font-size: 12px;
                display: flex; align-items: center; justify-content: center;
                transition: opacity 0.1s, color 0.1s;
            `;
            eyeBtn.onmouseenter = () => { eyeBtn.style.color = "#33789a"; };
            eyeBtn.onmouseleave = () => { eyeBtn.style.color = "#eee"; };
            eyeBtn.onclick = (e) => {
                e.stopPropagation();
                layer.visible = !layer.visible;
                pushCrHistory();
                scheduleRender();
                renderLayersList();
            };
            
            // Blend Mode Button
            const blendBtn = document.createElement("button");
            blendBtn.innerHTML = "❐";
            blendBtn.title = "Blending Mode: " + (blendModes.find(m => m.value === layer.blendMode)?.label || "Normal");
            blendBtn.style.cssText = "background: none; border: none; color: #aaa; cursor: pointer; padding: 2px 4px; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: color 0.1s;";
            blendBtn.onmouseenter = () => blendBtn.style.color = "#fff";
            blendBtn.onmouseleave = () => blendBtn.style.color = "#aaa";
            blendBtn.onclick = (e) => {
                e.stopPropagation();
                const existingMenu = document.getElementById("trix-blend-menu");
                if (existingMenu) existingMenu.remove();
                
                const menu = document.createElement("div");
                menu.id = "trix-blend-menu";
                menu.style.cssText = `
                    position: absolute;
                    background: #18181c;
                    border: 1px solid #3d3d42;
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    z-index: 10002;
                    max-height: 250px;
                    overflow-y: auto;
                    padding: 4px 0;
                    min-width: 120px;
                `;
                const rect = blendBtn.getBoundingClientRect();
                menu.style.top = `${rect.bottom + window.scrollY + 4}px`;
                menu.style.left = `${rect.left + window.scrollX}px`;
                
                blendModes.forEach(mode => {
                    const item = document.createElement("div");
                    item.innerText = mode.label;
                    item.style.cssText = `
                        padding: 6px 12px;
                        cursor: pointer;
                        color: ${layer.blendMode === mode.value ? "#33789a" : "#eee"};
                        font-size: 11px;
                        font-weight: ${layer.blendMode === mode.value ? "bold" : "normal"};
                        transition: background 0.1s;
                    `;
                    item.onmouseenter = () => item.style.background = "#2a2a30";
                    item.onmouseleave = () => item.style.background = "transparent";
                    item.onclick = (evt) => {
                        evt.stopPropagation();
                        layer.blendMode = mode.value;
                        blendBtn.title = "Blending Mode: " + mode.label;
                        menu.remove();
                        pushCrHistory();
                        scheduleRender();
                        renderLayersList();
                    };
                    menu.appendChild(item);
                });
                document.body.appendChild(menu);
                const closeMenu = () => {
                    menu.remove();
                    document.removeEventListener("click", closeMenu);
                };
                setTimeout(() => { document.addEventListener("click", closeMenu); }, 10);
            };
            
            // Delete Button
            const delBtn = document.createElement("button");
            delBtn.innerHTML = "✕";
            delBtn.title = "Delete Layer";
            delBtn.style.cssText = `
                background: none; border: none;
                color: #eee;
                opacity: ${layers.length > 1 ? "0.6" : "0.1"};
                cursor: ${layers.length > 1 ? "pointer" : "default"};
                padding: 2px 4px; font-size: 11px;
                display: flex; align-items: center; justify-content: center;
                transition: opacity 0.1s, color 0.1s;
            `;
            if (layers.length > 1) {
                delBtn.onmouseenter = () => { delBtn.style.color = "#ff4757"; delBtn.style.opacity = "1"; };
                delBtn.onmouseleave = () => { delBtn.style.color = "#eee"; delBtn.style.opacity = "0.6"; };
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete layer "${layer.name}"?`)) {
                        layers.splice(idx, 1);
                        if (selectedLayerIndex >= layers.length) {
                            selectedLayerIndex = layers.length - 1;
                        }
                        state = layers[selectedLayerIndex].state;
                        hslState = layers[selectedLayerIndex].hslState;
                        curvesState = layers[selectedLayerIndex].curvesState;
                        updateRightPanelUI();
                        renderLayersList();
                        pushCrHistory();
                        scheduleRender();
                    }
                };
            }
            
            btns.append(eyeBtn, blendBtn, delBtn);
            row1.append(label, btns);
            
            // Row 2: Opacity
            const opacityRow = document.createElement("div");
            opacityRow.style.cssText = "display: flex; align-items: center; gap: 8px; margin-top: 6px; width: 100%; box-sizing: border-box;";
            
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "0";
            slider.max = "100";
            slider.value = layer.opacity;
            slider.style.cssText = "flex: 1; height: 4px; accent-color: #33789a; cursor: pointer; margin: 0;";
            
            const percent = document.createElement("span");
            percent.innerText = layer.opacity + "%";
            percent.style.cssText = "color: #888; font-size: 10px; min-width: 28px; text-align: right;";
            
            slider.oninput = (e) => {
                layer.opacity = parseInt(e.target.value);
                percent.innerText = layer.opacity + "%";
                scheduleRender();
            };
            slider.onchange = () => {
                pushCrHistory();
            };
            
            // Avoid drag conflict
            [slider, eyeBtn, blendBtn, delBtn].forEach(el => {
                el.addEventListener("mousedown", (e) => {
                    e.stopPropagation();
                    block.draggable = false;
                });
                el.addEventListener("mouseup", () => { block.draggable = true; });
                el.addEventListener("mouseleave", () => { block.draggable = true; });
            });
            
            opacityRow.append(slider, percent);
            block.append(row1, opacityRow);
            
            // Drag and Drop
            block.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", idx);
                block.style.opacity = "0.4";
            });
            block.addEventListener("dragend", () => {
                block.style.opacity = "1";
            });
            block.addEventListener("dragover", (e) => {
                e.preventDefault();
            });
            block.addEventListener("drop", (e) => {
                e.preventDefault();
                const srcIdx = parseInt(e.dataTransfer.getData("text/plain"));
                const destIdx = idx;
                if (srcIdx !== destIdx && !isNaN(srcIdx)) {
                    const [moved] = layers.splice(srcIdx, 1);
                    layers.splice(destIdx, 0, moved);
                    if (selectedLayerIndex === srcIdx) {
                        selectedLayerIndex = destIdx;
                    } else if (selectedLayerIndex > srcIdx && selectedLayerIndex <= destIdx) {
                        selectedLayerIndex--;
                    } else if (selectedLayerIndex < srcIdx && selectedLayerIndex >= destIdx) {
                        selectedLayerIndex++;
                    }
                    state = layers[selectedLayerIndex].state;
                    hslState = layers[selectedLayerIndex].hslState;
                    curvesState = layers[selectedLayerIndex].curvesState;
                    updateRightPanelUI();
                    renderLayersList();
                    pushCrHistory();
                    scheduleRender();
                }
            });
            
            layersListContainer.appendChild(block);
        }
        
        layersListContainer.appendChild(layersButtonsRow);
    };

    addLayerBtn.onclick = () => {
        const newLayer = {
            id: "layer_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            name: "Layer " + (layers.length + 1),
            visible: true,
            opacity: 100,
            blendMode: "source-over",
            state: JSON.parse(JSON.stringify(defaultCrState)),
            hslState: JSON.parse(JSON.stringify(defaultHslState)),
            curvesState: ensureCurveState(JSON.parse(JSON.stringify(defaultCurvesState)))
        };
        layers.push(newLayer);
        selectedLayerIndex = layers.length - 1;
        state = layers[selectedLayerIndex].state;
        hslState = layers[selectedLayerIndex].hslState;
        curvesState = layers[selectedLayerIndex].curvesState;
        updateRightPanelUI();
        renderLayersList();
        pushCrHistory();
        scheduleRender();
    };

    duplicateLayerBtn.onclick = () => {
        if (selectedLayerIndex < 0 || selectedLayerIndex >= layers.length) return;
        const srcLayer = layers[selectedLayerIndex];
        
        const duplicatedLayer = {
            id: "layer_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            name: srcLayer.name + " Copy",
            visible: srcLayer.visible,
            opacity: srcLayer.opacity,
            blendMode: srcLayer.blendMode,
            state: JSON.parse(JSON.stringify(srcLayer.state)),
            hslState: JSON.parse(JSON.stringify(srcLayer.hslState)),
            curvesState: ensureCurveState(JSON.parse(JSON.stringify(srcLayer.curvesState)))
        };
        
        const targetIndex = selectedLayerIndex + 1;
        layers.splice(targetIndex, 0, duplicatedLayer);
        selectedLayerIndex = targetIndex;
        state = layers[selectedLayerIndex].state;
        hslState = layers[selectedLayerIndex].hslState;
        curvesState = layers[selectedLayerIndex].curvesState;
        
        updateRightPanelUI();
        renderLayersList();
        pushCrHistory();
        scheduleRender();
    };

    let layersPanelOpen = false;
    layersNotch.onclick = () => {
        layersPanelOpen = !layersPanelOpen;
        if (layersPanelOpen) {
            layersPanel.style.width = "220px";
            layersPanel.style.minWidth = "220px";
            layersPanel.style.borderRight = "1px solid #333";
        } else {
            layersPanel.style.width = "0px";
            layersPanel.style.minWidth = "0px";
            layersPanel.style.borderRight = "0px solid #333";
        }
        onResize();
    };
    layersPanel.addEventListener("transitionend", () => {
        onResize();
    });

    const workspace = document.createElement("div");
    workspace.style.cssText = `
        flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
        background-image: linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222),
                          linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222);
        background-size: 16px 16px; background-position: 0 0, 8px 8px;
    `;

    const sidebar = document.createElement("div");
    sidebar.style.cssText = `
        width: min(340px, 42vw); min-width: 280px; height: 100%; max-height: 100vh; background: #151515; border-left: 1px solid #333;
        display: flex; flex-direction: column; box-sizing: border-box;
        box-shadow: -2px 0 10px rgba(0,0,0,0.5); z-index: 10; overflow: hidden;
        min-height: 0; overscroll-behavior: contain;
    `;

    const sidebarContent = document.createElement("div");
    sidebarContent.style.cssText = `
        flex: 1; overflow-y: auto; overflow-x: hidden;
        padding: 18px 18px 10px 18px; box-sizing: border-box;
        scrollbar-gutter: stable;
    `;
    sidebar.appendChild(sidebarContent);

    const mainArea = document.createElement("div");
    mainArea.style.cssText = "flex: 1; height: 100%; display: flex; flex-direction: column; position: relative;";

    const toolbar = document.createElement("div");
    toolbar.style.cssText = `
        min-height: 50px; height: auto; width: 100%;
        background: #151515;
        border-bottom: 1px solid #333;
        display: flex; flex-wrap: wrap; align-items: center; padding: 6px 20px; box-sizing: border-box;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 5; gap: 10px 15px;
    `;

    if (!document.getElementById("trix-cr-inputs")) {
        const style = document.createElement("style");
        style.id = "trix-cr-inputs";
        style.innerHTML = `
            .trix-cr-panel::-webkit-scrollbar { width: 6px; }
            .trix-cr-panel::-webkit-scrollbar-track { background: transparent; }
            .trix-cr-panel::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
            .trix-cr-panel::-webkit-scrollbar-thumb:hover { background: #666; }
        `;
        document.head.appendChild(style);
    }
    sidebarContent.className = "trix-cr-panel";
    sidebarContent.addEventListener("wheel", (e) => {
        const maxScroll = sidebarContent.scrollHeight - sidebarContent.clientHeight;
        if (maxScroll <= 0) return;
        e.stopPropagation();
        if (e.target && e.target.tagName === "INPUT" && e.target.type === "range") {
            e.preventDefault();
            sidebarContent.scrollTop += e.deltaY;
        }
    }, { passive: false, signal: abortCtrl.signal });

    const revealSidebarSection = (element) => {
        requestAnimationFrame(() => {
            if (!element || !document.body.contains(element)) return;
            element.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        });
    };

    ensureTooltipStyles();
    const title = document.createElement("div");
    title.style.cssText = "color: #fff; font-size: 16px; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 6px;";
    title.innerHTML = `◩ Trix Camera Raw <span class="trix-tooltip-container"><span class="trix-help-mark">?</span><span class="trix-tooltip-text-right">${getCRTooltipText()}</span></span>`;
    sidebarContent.appendChild(title);

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.transformOrigin = "0 0";
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    workspace.appendChild(canvas);
    
    let camera = { x: 0, y: 0, zoom: 1 };
    let isPanning = false; let startMx = 0; let startMy = 0;
    let isFirstLaunch = true;
    let lastWorkspaceW = workspace.clientWidth || 0;
    let lastWorkspaceH = workspace.clientHeight || 0;
    
    let hslFingerActive = false;
    let hslDragging = false;
    let dragStartTargetX = 0;
    let dragStartSat = 0;

    let renderTimer = null;
    let renderPending = false;
    let baseImgData = null;
    let pW = 0, pH = 0;

    const getFitScale = () => {
        if (!pW || !pH) return 1.0;
        const fitZoomW = (workspace.clientWidth * 0.9) / pW;
        const fitZoomH = (workspace.clientHeight * 0.9) / pH;
        return Math.min(fitZoomW, fitZoomH, 1.0);
    };

    const updateRecenterBtnText = () => {
        const span = recenterBtn.querySelector("span");
        if (span) {
            const fitScale = getFitScale();
            const pct = Math.round((camera.zoom / fitScale) * 100);
            span.innerText = `Recenter (${pct}%)`;
        }
    };

    const drawWorkspace = () => {
        workspace.style.backgroundPosition = `${camera.x}px ${camera.y}px, ${camera.x + 8}px ${camera.y + 8}px`;
        canvas.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
        if (typeof updateRecenterBtnText === "function") {
            updateRecenterBtnText();
        }
    };

    const makeActionBtn = (iconSvg, text) => {
        const btn = document.createElement("button");
        btn.innerHTML = `${iconSvg} <span style="font-size: 11px; margin-left: 4px; font-weight: bold;">${text}</span>`;
        btn.style.cssText = "background: #2a2a2f; color: #ccc; border: 1px solid #444; border-radius: 4px; padding: 5px 10px; cursor: pointer; display: flex; align-items: center; transition: 0.1s; white-space: nowrap; flex-shrink: 0;";
        btn.onmouseenter = () => {
            if (!btn.dataset.active) {
                btn.style.background = "#333a45";
                btn.style.color = "#fff";
            }
        };
        btn.onmouseleave = () => {
            if (!btn.dataset.active) {
                btn.style.background = "#2a2a2f";
                btn.style.color = "#ccc";
            }
        };
        return btn;
    };

    const resetCrBtn = makeActionBtn(svgResetCR, "Reset");
    resetCrBtn.onmouseenter = () => { if (!resetCrBtn.dataset.active) { resetCrBtn.style.background = "#d44a4a"; resetCrBtn.style.color = "#fff"; } };
    resetCrBtn.onmouseleave = () => { if (!resetCrBtn.dataset.active) { resetCrBtn.style.background = "#2a2a2f"; resetCrBtn.style.color = "#ccc"; } };

    let useFullRes = false;
    const hqBtn = makeActionBtn(svgHQ, "HQ Preview");
    hqBtn.onclick = () => {
        useFullRes = !useFullRes;
        if (useFullRes) {
            hqBtn.dataset.active = "1";
            hqBtn.style.background = "rgb(246, 103, 68)";
            hqBtn.style.color = "#fff";
        } else {
            delete hqBtn.dataset.active;
            hqBtn.style.background = "#2a2a2f";
            hqBtn.style.color = "#ccc";
        }
        initCanvas(); 
    };

    const recenterBtn = makeActionBtn(svgRecenterCR, "Recenter");
    recenterBtn.onmouseenter = () => { if (!recenterBtn.dataset.active) { recenterBtn.style.background = "#333a45"; recenterBtn.style.color = "#fff"; } };
    recenterBtn.onmouseleave = () => { if (!recenterBtn.dataset.active) { recenterBtn.style.background = "#2a2a2f"; recenterBtn.style.color = "#ccc"; } };

    const centerImage = (forceFit = false) => {
        if (!pW || !pH) return;
        camera.zoom = getFitScale();
        camera.x = workspace.clientWidth / 2 - (pW / 2) * camera.zoom;
        camera.y = workspace.clientHeight / 2 - (pH / 2) * camera.zoom;
        drawWorkspace();
    };
    recenterBtn.onclick = () => centerImage(true);

    const undoBtn = document.createElement("button");
    undoBtn.innerHTML = `${svgUndoCR} <span style="font-size: 11px; margin-left: 4px; font-weight: bold;">Undo</span>`;
    undoBtn.title = "Undo";
    undoBtn.style.cssText = "background: #2a2a2f; color: #ccc; border: 1px solid #444; border-radius: 4px; padding: 5px 10px; cursor: pointer; display: flex; align-items: center; transition: 0.1s; white-space: nowrap; flex-shrink: 0;";
    undoBtn.onmouseenter = () => { undoBtn.style.background = "#33789a"; undoBtn.style.color = "#fff"; };
    undoBtn.onmouseleave = () => { undoBtn.style.background = "#2a2a2f"; undoBtn.style.color = "#ccc"; };

    const redoBtn = document.createElement("button");
    redoBtn.innerHTML = `${svgRedoCR} <span style="font-size: 11px; margin-left: 4px; font-weight: bold;">Redo</span>`;
    redoBtn.title = "Redo";
    redoBtn.style.cssText = "background: #2a2a2f; color: #ccc; border: 1px solid #444; border-radius: 4px; padding: 5px 10px; cursor: pointer; display: flex; align-items: center; transition: 0.1s; white-space: nowrap; flex-shrink: 0;";
    redoBtn.onmouseenter = () => { redoBtn.style.background = "#33789a"; redoBtn.style.color = "#fff"; };
    redoBtn.onmouseleave = () => { redoBtn.style.background = "#2a2a2f"; redoBtn.style.color = "#ccc"; };

    const compareBtn = makeActionBtn(svgEyeCR, "Compare");
    
    let isComparing = false;
    const startCompare = () => {
        if (!isComparing) {
            isComparing = true;
            compareBtn.dataset.active = "1";
            compareBtn.style.background = "rgb(246, 103, 68)";
            compareBtn.style.color = "#fff";
            renderPixels(true);
        }
    };
    const stopCompare = () => {
        if (isComparing) {
            isComparing = false;
            delete compareBtn.dataset.active;
            compareBtn.style.background = "#2a2a2f";
            compareBtn.style.color = "#ccc";
            scheduleRender();
        }
    };
    
    compareBtn.onmousedown = startCompare; 
    compareBtn.onmouseup = stopCompare; 
    compareBtn.onmouseleave = () => {
        stopCompare();
        if (!isComparing) {
            compareBtn.style.background = "#2a2a2f";
            compareBtn.style.color = "#ccc";
        }
    };

    toolbar.append(undoBtn, redoBtn);

    const divider = document.createElement("div");
    divider.style.cssText = "width: 1px; height: 18px; background: #333; margin: 0 4px;";
    toolbar.appendChild(divider);

    toolbar.append(hqBtn, compareBtn, recenterBtn);

    // ==============================================================================
    // PRESETS SYSTEM PANEL
    // ==============================================================================
    const builtInPresets = [
        {
            name: "Soft Portrait",
            state: { cr_temp: 8, cr_exp: 5, cr_cont: -10, cr_shad: 15, cr_white: -5, cr_sat: 5, cr_vibrance: 10, cr_tex: -15, cr_denoise: 10 }
        },
        {
            name: "Classic Film Portra",
            state: { cr_temp: 6, cr_tint: 2, cr_cont: 8, cr_high: -10, cr_shad: 12, cr_vibrance: 8, cr_grain: 12, cr_vignette: 8 }
        },
        {
            name: "Muted Sage Landscape",
            state: { cr_temp: -5, cr_tint: -3, cr_cont: 5, cr_high: -8, cr_shad: 10, cr_sat: -15, cr_vibrance: 5, cr_clar: 8, cr_vignette: 12 }
        },
        {
            name: "Warm Editorial",
            state: { cr_temp: 10, cr_tint: 4, cr_exp: 6, cr_cont: 5, cr_shad: 5, cr_white: 10, cr_black: -5, cr_vibrance: 12, cr_tex: 8, cr_vignette: 6 }
        },
        {
            name: "Nordic Fog",
            state: { cr_temp: -12, cr_tint: -2, cr_cont: 8, cr_high: -10, cr_shad: 5, cr_sat: -20, cr_vibrance: 5, cr_dehz: -5, cr_denoise: 15 }
        },
        {
            name: "Cinematic Teal & Orange",
            state: { cr_temp: -8, cr_tint: 8, cr_exp: 3, cr_cont: 12, cr_high: 5, cr_shad: 10, cr_vibrance: 18, cr_sat: 5, cr_vignette: 15 }
        },
        {
            name: "Monochrome Grain",
            state: { cr_sat: -100, cr_vibrance: -100, cr_cont: 25, cr_high: 10, cr_shad: -10, cr_clar: 20, cr_grain: 25, cr_vignette: 18 }
        },
        {
            name: "Soft Matte Dream",
            state: { cr_offset: 15, cr_exp: 10, cr_cont: -15, cr_high: 10, cr_shad: 20, cr_sat: -5, cr_vibrance: 10, cr_blur: 15, cr_vignette: 10 }
        },
        {
            name: "Vintage Polaroid",
            state: { cr_offset: 18, cr_temp: 12, cr_tint: 5, cr_cont: -10, cr_high: -8, cr_shad: 15, cr_sat: -10, cr_vibrance: 8, cr_grain: 18, cr_vignette: 15 }
        },
        {
            name: "Clean Minimalist",
            state: { cr_exp: 12, cr_cont: -5, cr_high: -10, cr_shad: 10, cr_white: 12, cr_black: 5, cr_sat: -12, cr_vibrance: 5, cr_sharp: 12 }
        },
        {
            name: "Golden Hour",
            state: { cr_temp: 18, cr_tint: 5, cr_exp: 8, cr_cont: 5, cr_high: 8, cr_shad: 10, cr_sat: 12, cr_vibrance: 15, cr_vignette: 10 }
        },
        {
            name: "Blue Hour Dusk",
            state: { cr_temp: -20, cr_tint: 6, cr_cont: 10, cr_shad: 5, cr_white: -10, cr_sat: -5, cr_vibrance: 15, cr_dehz: 8, cr_vignette: 12 }
        },
        {
            name: "Studio Clean",
            state: { cr_temp: 2, cr_tint: 1, cr_exp: 5, cr_cont: -5, cr_high: -12, cr_shad: 10, cr_white: 8, cr_black: 2, cr_vibrance: 12, cr_sat: -2, cr_tex: 5, cr_clar: 2, cr_sharp: 15, cr_denoise: 15 }
        },
        {
            name: "HDR Natural",
            state: { cr_exp: 2, cr_cont: 15, cr_high: -45, cr_shad: 50, cr_white: -15, cr_black: 15, cr_vibrance: 15, cr_sat: 2, cr_dehz: 10, cr_clar: 12, cr_tex: 8 }
        },
        {
            name: "Sunset Glow",
            state: { cr_temp: 22, cr_tint: 6, cr_exp: 8, cr_cont: 10, cr_high: -15, cr_shad: 12, cr_white: 10, cr_black: -8, cr_vibrance: 20, cr_sat: 5, cr_vignette: 12, cr_clar: 10 }
        },
        {
            name: "Faded Film",
            state: { cr_offset: 12, cr_temp: 4, cr_tint: -2, cr_exp: -2, cr_cont: -12, cr_high: -20, cr_shad: 25, cr_white: -10, cr_black: 10, cr_vibrance: 5, cr_sat: -8, cr_grain: 15, cr_vignette: 15 }
        },
        {
            name: "Crystal Clear",
            state: { cr_temp: -4, cr_exp: 5, cr_cont: 8, cr_high: -15, cr_shad: 8, cr_white: 12, cr_black: -5, cr_vibrance: 14, cr_sat: 2, cr_dehz: 15, cr_clar: 18, cr_tex: 12, cr_sharp: 20 }
        },
        {
            name: "Retro Arcade (Subtle Pixel)",
            state: { cr_temp: 5, cr_cont: 12, cr_sat: 15, cr_vibrance: 15, cr_clar: 15, cr_grain: 10, cr_pixel_dot_size: 2, cr_pixel_colors: 64, cr_pixel_smoothing: 0, cr_pixel_algo: 'kmeans' }
        },
        {
            name: "Pencil Sketch Blend",
            state: { cr_cont: 15, cr_shad: 15, cr_clar: 10, cr_sketch_kernel_size: 3, cr_sketch_sigma: 1.2, cr_sketch_color: 'gray', cr_vignette: 15 }
        },
        {
            name: "Vintage Newspaper",
            state: { cr_sat: -100, cr_vibrance: -100, cr_cont: 30, cr_clar: 25, cr_grain: 30, cr_pixel_dot_size: 2, cr_pixel_colors: 16, cr_pixel_outline: 1, cr_pixel_algo: 'kmeans' }
        },
        {
            name: "Mist & Fog",
            state: { cr_temp: -5, cr_tint: -2, cr_exp: 5, cr_cont: -10, cr_high: -15, cr_shad: 15, cr_sat: -25, cr_vibrance: -10, cr_dehz: -15, cr_surface_blur: 8 }
        },
        {
            name: "Moody Noir",
            state: { cr_exp: -15, cr_cont: 25, cr_high: -12, cr_shad: -18, cr_black: -15, cr_sat: -20, cr_vibrance: -10, cr_clar: 15, cr_dehz: 10, cr_vignette: 25 }
        },
        {
            name: "Dreamy Glow",
            state: { cr_exp: 5, cr_cont: 10, cr_high: 15, cr_shad: 15, cr_sat: 8, cr_vibrance: 10, cr_surface_blur: 15, cr_clar: -10 }
        },
        {
            name: "Lofi Cyber",
            state: { cr_temp: -12, cr_tint: 12, cr_exp: 5, cr_cont: 10, cr_shad: 10, cr_sat: 10, cr_vibrance: 15, cr_pixel_dot_size: 2, cr_pixel_colors: 128, cr_pixel_smoothing: 1 }
        }
    ];

    let customPresets = [];

    const applyPreset = (preset) => {
        const newState = JSON.parse(JSON.stringify(defaultCrState));
        const newHslState = JSON.parse(JSON.stringify(defaultHslState));
        const newCurvesState = ensureCurveState(JSON.parse(JSON.stringify(defaultCurvesState)));
        
        if (preset.state) {
            for (const key in preset.state) {
                newState[key] = preset.state[key];
            }
        }
        if (preset.hslState) {
            for (const key in preset.hslState) {
                newHslState[key] = preset.hslState[key];
            }
        }
        if (preset.curvesState) {
            for (const key in preset.curvesState) {
                newCurvesState[key] = preset.curvesState[key];
            }
        }
        
        if (preset.state && preset.state.cr_vibrance !== undefined) {
            newState.cr_colorfulness = preset.state.cr_vibrance;
        } else if (preset.state && preset.state.cr_colorfulness !== undefined) {
            newState.cr_vibrance = preset.state.cr_colorfulness;
        }

        layers[selectedLayerIndex].state = newState;
        layers[selectedLayerIndex].hslState = newHslState;
        layers[selectedLayerIndex].curvesState = newCurvesState;
        state = layers[selectedLayerIndex].state;
        hslState = layers[selectedLayerIndex].hslState;
        curvesState = layers[selectedLayerIndex].curvesState;
        renderLayersList();
        
        updateRightPanelUI();
        pushCrHistory();
        scheduleRender();
    };

    const presetsWrapper = document.createElement("div");
    presetsWrapper.style.cssText = "display: flex; gap: 4px; align-items: center; background: #1f1f23; border: 1px solid #3d3d42; border-radius: 4px; padding: 2px 6px; margin-left: 6px; flex-shrink: 0; height: 26px; box-sizing: border-box; position: relative;";

    const presetDropdownBtn = document.createElement("button");
    presetDropdownBtn.style.cssText = "background: transparent; color: #eee; border: none; outline: none; font-size: 11px; font-weight: bold; cursor: pointer; max-width: 130px; font-family: var(--comfy-font-family, sans-serif); padding-right: 4px; display: flex; align-items: center; justify-content: space-between; height: 100%; gap: 6px;";
    presetDropdownBtn.innerText = "⚝ Presets";
    const arrowSpan = document.createElement("span");
    arrowSpan.innerHTML = "&#9662;";
    arrowSpan.style.cssText = "font-size: 9px; color: #888; pointer-events: none;";
    presetDropdownBtn.appendChild(arrowSpan);

    const dropdownList = document.createElement("div");
    dropdownList.style.cssText = "position: absolute; top: calc(100% + 4px); left: 0; min-width: 260px; max-width: 340px; max-height: 400px; overflow-y: auto; background: #18181c; border: 1px solid #3d3d42; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.6); display: none; z-index: 10000; font-family: var(--comfy-font-family, sans-serif); box-sizing: border-box; padding: 4px 0;";

    document.addEventListener("click", (e) => {
        if (!presetsWrapper.contains(e.target)) {
            dropdownList.style.display = "none";
        }
    });

    presetDropdownBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownList.style.display === "block";
        dropdownList.style.display = isOpen ? "none" : "block";
    };

    let favoritePresetNames = [];
    try {
        const stored = localStorage.getItem("trix_camera_raw_favorites");
        if (stored) favoritePresetNames = JSON.parse(stored);
    } catch(e){}
    if (!Array.isArray(favoritePresetNames)) favoritePresetNames = [];

    let deletedBuiltinNames = [];
    try {
        const stored = localStorage.getItem("trix_camera_raw_deleted_builtins");
        if (stored) deletedBuiltinNames = JSON.parse(stored);
    } catch(e){}
    if (!Array.isArray(deletedBuiltinNames)) deletedBuiltinNames = [];

    const rebuildPresetDropdown = () => {
        dropdownList.innerHTML = "";
        
        const activeBuiltIns = builtInPresets.filter(p => !deletedBuiltinNames.includes(p.name));
        
        const favorites = [];
        favoritePresetNames.forEach(name => {
            const bPreset = activeBuiltIns.find(p => p.name === name);
            if (bPreset) {
                favorites.push({ preset: bPreset, type: "builtin", originIndex: builtInPresets.indexOf(bPreset) });
                return;
            }
            const cPreset = customPresets.find(p => p.name === name);
            if (cPreset) {
                favorites.push({ preset: cPreset, type: "custom", originIndex: customPresets.indexOf(cPreset) });
            }
        });
        
        const renderSectionHeader = (title) => {
            const header = document.createElement("div");
            header.style.cssText = "font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; padding: 6px 10px 4px 10px; letter-spacing: 0.5px; border-bottom: 1px solid #2d2d30; margin-bottom: 4px; margin-top: 4px;";
            header.innerText = title;
            dropdownList.appendChild(header);
        };
        
        const renderPresetItem = (p, type, originIndex, isFavList = false) => {
            const item = document.createElement("div");
            item.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; cursor: pointer; transition: background 0.1s; gap: 10px;";
            item.onmouseenter = () => item.style.background = "#2a2a30";
            item.onmouseleave = () => item.style.background = "transparent";
            
            const label = document.createElement("span");
            label.innerText = p.name;
            label.style.cssText = "color: #eee; font-size: 11px; flex-grow: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none;";
            item.appendChild(label);
            
            item.onclick = (e) => {
                applyPreset(p);
                dropdownList.style.display = "none";
            };
            
            const actions = document.createElement("div");
            actions.style.cssText = "display: flex; gap: 8px; align-items: center; flex-shrink: 0;";
            
            const isFav = favoritePresetNames.includes(p.name);
            const favBtn = document.createElement("span");
            favBtn.innerHTML = isFav ? "♥" : "♡";
            favBtn.title = isFav ? "Remove from Favorites" : "Add to Favorites";
            favBtn.style.cssText = `font-size: 14px; color: ${isFav ? "#ff4757" : "#888"}; cursor: pointer; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; transition: color 0.1s;`;
            favBtn.onmouseenter = (e) => { e.stopPropagation(); favBtn.style.color = "#ff4757"; };
            favBtn.onmouseleave = (e) => { e.stopPropagation(); favBtn.style.color = isFav ? "#ff4757" : "#888"; };
            favBtn.onclick = (e) => {
                e.stopPropagation();
                if (isFav) {
                    favoritePresetNames = favoritePresetNames.filter(name => name !== p.name);
                } else {
                    favoritePresetNames.unshift(p.name);
                }
                localStorage.setItem("trix_camera_raw_favorites", JSON.stringify(favoritePresetNames));
                rebuildPresetDropdown();
            };
            actions.appendChild(favBtn);
            
            const delBtn = document.createElement("span");
            delBtn.innerHTML = "✕";
            delBtn.title = "Delete Preset";
            delBtn.style.cssText = "font-size: 11px; color: #888; cursor: pointer; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; transition: color 0.1s;";
            delBtn.onmouseenter = (e) => { e.stopPropagation(); delBtn.style.color = "#ff4757"; };
            delBtn.onmouseleave = (e) => { e.stopPropagation(); delBtn.style.color = "#888"; };
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (!confirm(`Are you sure you want to delete preset "${p.name}"?`)) return;
                
                favoritePresetNames = favoritePresetNames.filter(name => name !== p.name);
                localStorage.setItem("trix_camera_raw_favorites", JSON.stringify(favoritePresetNames));
                
                if (type === "builtin") {
                    deletedBuiltinNames.push(p.name);
                    localStorage.setItem("trix_camera_raw_deleted_builtins", JSON.stringify(deletedBuiltinNames));
                } else if (type === "custom") {
                    customPresets.splice(originIndex, 1);
                    await saveCustomPresetsToServer();
                }
                rebuildPresetDropdown();
            };
            actions.appendChild(delBtn);
            
            item.appendChild(actions);
            dropdownList.appendChild(item);
        };
        
        if (favorites.length > 0) {
            renderSectionHeader("Favorites");
            favorites.forEach(f => {
                renderPresetItem(f.preset, f.type, f.originIndex, true);
            });
        }
        
        if (activeBuiltIns.length > 0) {
            renderSectionHeader("Built-in Filters");
            activeBuiltIns.forEach((p, idx) => {
                const originIdx = builtInPresets.indexOf(p);
                renderPresetItem(p, "builtin", originIdx);
            });
        }
        
        if (customPresets.length > 0) {
            renderSectionHeader("Custom Presets");
            customPresets.forEach((p, idx) => {
                renderPresetItem(p, "custom", idx);
            });
        }
        
        if (favorites.length === 0 && activeBuiltIns.length === 0 && customPresets.length === 0) {
            const empty = document.createElement("div");
            empty.innerText = "No presets available";
            empty.style.cssText = "font-size: 11px; color: #888; text-align: center; padding: 12px;";
            dropdownList.appendChild(empty);
        }
    };

    const savePresetBtn = document.createElement("button");
    savePresetBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    savePresetBtn.title = "Save Current as Custom Preset";
    savePresetBtn.style.cssText = "background: transparent; color: #a4a4a9; border: none; cursor: pointer; padding: 2px 4px; display: flex; align-items: center; border-radius: 3px; font-size: 11px; transition: 0.1s; height: 18px; width: 18px; justify-content: center;";
    savePresetBtn.onmouseenter = () => { savePresetBtn.style.background = "#33789a"; savePresetBtn.style.color = "#fff"; };
    savePresetBtn.onmouseleave = () => { savePresetBtn.style.background = "transparent"; savePresetBtn.style.color = "#a4a4a9"; };
    
    const saveCustomPresetsToServer = async () => {
        try {
            await fetch('/trix/save_presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customPresets)
            });
        } catch (err) {
            console.error("Error saving presets to server:", err);
        }
    };
    
    savePresetBtn.onclick = async () => {
        const name = prompt("Enter a name for the custom preset:", "My Preset " + (customPresets.length + 1));
        if (!name) return;
        
        const cleanName = name.trim();
        if (!cleanName) return;
        
        const newPreset = {
            name: cleanName,
            state: JSON.parse(JSON.stringify(state)),
            hslState: JSON.parse(JSON.stringify(hslState)),
            curvesState: JSON.parse(JSON.stringify(curvesState))
        };
        
        customPresets.push(newPreset);
        rebuildPresetDropdown();
        await saveCustomPresetsToServer();
        alert(`Preset "${cleanName}" saved successfully!`);
    };

    const ioPresetBtn = document.createElement("button");
    ioPresetBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;
    ioPresetBtn.title = "Import/Export Preset Code";
    ioPresetBtn.style.cssText = "background: transparent; color: #a4a4a9; border: none; cursor: pointer; padding: 2px 4px; display: flex; align-items: center; border-radius: 3px; font-size: 11px; transition: 0.1s; height: 18px; width: 18px; justify-content: center;";
    ioPresetBtn.onmouseenter = () => { ioPresetBtn.style.background = "#33789a"; ioPresetBtn.style.color = "#fff"; };
    ioPresetBtn.onmouseleave = () => { ioPresetBtn.style.background = "transparent"; ioPresetBtn.style.color = "#a4a4a9"; };
    ioPresetBtn.onclick = () => {
        const modalOverlay = document.createElement("div");
        modalOverlay.id = "trix-camera-raw-presets-modal";
        modalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 11000; font-family: var(--comfy-font-family, sans-serif);";
        
        const modalContainer = document.createElement("div");
        modalContainer.style.cssText = "background: #18181c; border: 1px solid #3d3d42; border-radius: 8px; width: 420px; padding: 20px; box-sizing: border-box; color: #eee; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);";
        
        const title = document.createElement("div");
        title.innerText = "Preset Import & Export";
        title.style.cssText = "font-size: 14px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 8px;";
        modalContainer.appendChild(title);
        
        const expLabel = document.createElement("div");
        expLabel.innerText = "Export Current State Code:";
        expLabel.style.cssText = "font-size: 11px; color: #aaa;";
        
        const expCode = btoa(JSON.stringify({
            state, hslState, curvesState
        }));
        
        const expInput = document.createElement("textarea");
        expInput.value = expCode;
        expInput.readOnly = true;
        expInput.style.cssText = "width: 100%; height: 60px; background: #000; color: #33789a; border: 1px solid #333; border-radius: 4px; padding: 6px; box-sizing: border-box; font-family: monospace; font-size: 10px; resize: none; outline: none; word-break: break-all;";
        
        const copyBtn = document.createElement("button");
        copyBtn.innerText = "Copy Code";
        copyBtn.style.cssText = "background: #33789a; color: #fff; border: none; border-radius: 4px; padding: 6px; cursor: pointer; font-size: 11px; font-weight: bold; width: 100%; transition: 0.1s;";
        copyBtn.onmouseenter = () => copyBtn.style.background = "#3f8eb4";
        copyBtn.onmouseleave = () => copyBtn.style.background = "#33789a";
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(expCode);
            copyBtn.innerText = "Copied!";
            setTimeout(() => { copyBtn.innerText = "Copy Code"; }, 1500);
        };
        
        modalContainer.append(expLabel, expInput, copyBtn);
        
        const hr = document.createElement("div");
        hr.style.cssText = "height: 1px; background: #333; margin: 4px 0;";
        modalContainer.appendChild(hr);
        
        const impLabel = document.createElement("div");
        impLabel.innerText = "Paste Code to Import Preset:";
        impLabel.style.cssText = "font-size: 11px; color: #aaa;";
        
        const impInput = document.createElement("textarea");
        impInput.placeholder = "Paste base64 code string here...";
        impInput.style.cssText = "width: 100%; height: 60px; background: #000; color: #fff; border: 1px solid #333; border-radius: 4px; padding: 6px; box-sizing: border-box; font-family: monospace; font-size: 10px; resize: none; outline: none; word-break: break-all;";
        
        const impBtn = document.createElement("button");
        impBtn.innerText = "Import Preset";
        impBtn.style.cssText = "background: #28a745; color: #fff; border: none; border-radius: 4px; padding: 6px; cursor: pointer; font-size: 11px; font-weight: bold; width: 100%; transition: 0.1s;";
        impBtn.onmouseenter = () => impBtn.style.background = "#218838";
        impBtn.onmouseleave = () => impBtn.style.background = "#28a745";
        
        impBtn.onclick = async () => {
            const codeStr = impInput.value.trim();
            if (!codeStr) {
                alert("Please paste a valid preset code first.");
                return;
            }
            try {
                const parsed = JSON.parse(atob(codeStr));
                if (!parsed || (!parsed.state && !parsed.hslState && !parsed.curvesState)) {
                    throw new Error("Invalid preset format.");
                }
                const name = prompt("Enter a name for the imported preset:", "Imported Preset " + (customPresets.length + 1));
                if (!name) return;
                
                const cleanName = name.trim();
                if (!cleanName) return;
                
                parsed.name = cleanName;
                customPresets.push(parsed);
                rebuildPresetDropdown();
                await saveCustomPresetsToServer();
                
                applyPreset(parsed);
                
                document.body.removeChild(modalOverlay);
                alert(`Preset "${cleanName}" imported successfully!`);
            } catch (err) {
                alert("Failed to import preset. Make sure the code is a valid, uncorrupted base64 preset string.");
            }
        };
        
        modalContainer.append(impLabel, impInput, impBtn);
        
        const cancelBtn = document.createElement("button");
        cancelBtn.innerText = "Close";
        cancelBtn.style.cssText = "background: #2a2a2f; color: #ccc; border: 1px solid #444; border-radius: 4px; padding: 6px; cursor: pointer; font-size: 11px; font-weight: bold; width: 100%; transition: 0.1s; margin-top: 4px;";
        cancelBtn.onmouseenter = () => cancelBtn.style.background = "#333a45";
        cancelBtn.onmouseleave = () => cancelBtn.style.background = "#2a2a2f";
        cancelBtn.onclick = () => {
            document.body.removeChild(modalOverlay);
        };
        
        modalContainer.appendChild(cancelBtn);
        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);
    };

    presetsWrapper.append(presetDropdownBtn, dropdownList, savePresetBtn, ioPresetBtn);
    toolbar.appendChild(presetsWrapper);

    const loadCustomPresets = async () => {
        try {
            const resp = await fetch('/trix/get_presets');
            if (resp.status === 200) {
                customPresets = await resp.json();
                if (!Array.isArray(customPresets)) customPresets = [];
                rebuildPresetDropdown();
            }
        } catch (err) {
            console.error("Error loading presets from server:", err);
            rebuildPresetDropdown();
        }
    };
    loadCustomPresets();

    const tbSpacer = document.createElement("div");
    tbSpacer.style.flexGrow = "1";
    toolbar.appendChild(tbSpacer);

    toolbar.appendChild(resetCrBtn);

    const updateHistoryBtns = () => {
        undoBtn.style.opacity = crHistoryIdx > 0 ? "1" : "0.3";
        undoBtn.style.pointerEvents = crHistoryIdx > 0 ? "auto" : "none";
        redoBtn.style.opacity = crHistoryIdx < crHistory.length - 1 ? "1" : "0.3";
        redoBtn.style.pointerEvents = crHistoryIdx < crHistory.length - 1 ? "auto" : "none";
    };

    const pushCrHistory = () => {
        const snapshot = {
            layers: JSON.parse(JSON.stringify(layers)),
            selectedLayerIndex: selectedLayerIndex
        };
        const currentStateStr = JSON.stringify(snapshot);
        if (crHistory[crHistoryIdx] === currentStateStr) return; 
        crHistory = crHistory.slice(0, crHistoryIdx + 1);
        crHistory.push(currentStateStr);
        if (crHistory.length > 30) crHistory.shift(); 
        crHistoryIdx = crHistory.length - 1;
        updateHistoryBtns();
    };

    const applyHistoryState = (idx) => {
        if (idx < 0 || idx >= crHistory.length) return;
        crHistoryIdx = idx;
        const snapshot = JSON.parse(crHistory[crHistoryIdx]);
        
        layers = snapshot.layers;
        selectedLayerIndex = snapshot.selectedLayerIndex;
        
        state = layers[selectedLayerIndex].state;
        hslState = layers[selectedLayerIndex].hslState;
        curvesState = layers[selectedLayerIndex].curvesState;
        
        updateRightPanelUI();
        renderLayersList();
        updateHistoryBtns();
        scheduleRender();
    };

    undoBtn.onclick = () => applyHistoryState(crHistoryIdx - 1);
    redoBtn.onclick = () => applyHistoryState(crHistoryIdx + 1);
    updateHistoryBtns();

    
    const panelTrackers = [];
    const updatePanelActiveColoring = () => {
        panelTrackers.forEach(p => {
            let isChanged = false;
            
            // Check custom panels
            if (p.titleText === "Curves") {
                isChanged = curvesHasAdjustments(curvesState);
            } else if (p.titleText === "Hue/Saturation") {
                isChanged = hslState.colorize || ['master','reds','yellows','greens','cyans','blues','magentas'].some(ch => {
                    const hs = hslState[ch] || {};
                    return hs.h !== 0 || hs.s !== 0 || hs.l !== 0;
                });
            } else {
                // Check slider items
                for (const conf of p.items) {
                    const val = state[conf.id];
                    const def = conf.default !== undefined ? conf.default : 0;
                    if (val !== undefined && parseFloat(val) !== parseFloat(def)) {
                        isChanged = true;
                        break;
                    }
                }
                // Check selects / checkboxes
                if (p.titleText === "Blur") {
                    if (state.cr_blur_mode !== "Gaussian" && (state.cr_blur_radius !== 0)) isChanged = true;
                } else if (p.titleText === "Halftone") {
                    if (state.cr_ht_shape !== "Dot" || state.cr_ht_inverse) isChanged = true;
                } else if (p.titleText === "Sharpen") {
                    if (state.cr_lap_kernel !== "8-neighbor") isChanged = true;
                } else if (p.titleText === "Posterize") {
                    if (state.cr_post_enable || state.cr_post_mode !== "RGB" || state.cr_post_dither_mode !== "None") isChanged = true;
                } else if (p.titleText === "Levels") {
                    if (state.cr_lvl_channel !== "rgb") isChanged = true;
                }
            }
            
            if (isChanged) {
                p.header.style.background = "#235a7a"; // Pale blue
            } else {
                p.header.style.background = "#2a2a2f"; // Gray
            }
        });
    };

    const createAccordionPanel = (titleText, defaultOpen = false) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "border: 1px solid #444; border-radius: 4px; background: #1a1a1a; overflow: visible; margin-bottom: 12px; flex-shrink: 0;";

        const header = document.createElement("div");
        header.style.cssText = "padding: 8px 12px; background: #2a2a2f; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #fff; font-size: 12px; font-weight: bold; user-select: none;";
        
        const chev = document.createElement("span");
        chev.innerHTML = svgChevronDown;
        chev.style.transition = "transform 0.2s";
        
        header.innerHTML = `<span>${titleText}</span>`;
        header.appendChild(chev);
        
        const body = document.createElement("div");
        body.style.cssText = `padding: 12px; display: ${defaultOpen ? 'flex' : 'none'}; flex-direction: column; gap: 12px; overflow: visible;`;
        
        if (defaultOpen) {
            chev.style.transform = "rotate(-180deg)";
        }
        
        let isOpen = defaultOpen;
        header.onclick = () => {
            isOpen = !isOpen;
            body.style.display = isOpen ? "flex" : "none";
            chev.style.transform = isOpen ? "rotate(-180deg)" : "rotate(0deg)";
            if (isOpen) {
                revealSidebarSection(wrapper);
            }
        };
        
        wrapper.append(header, body);
        sidebarContent.appendChild(wrapper);
        const pObj = { wrapper, body, header, titleText, items: [] };
        panelTrackers.push(pObj);
        return { wrapper, body, header };
    };

    const createSliderRow = (conf, parentBody, onChangeCallback) => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 4px; margin-bottom: 2px; border-radius: 4px; flex-shrink: 0; min-height: 20px; transition: 0.1s;";
        row.onmouseenter = () => { row.style.background = "#222"; };
        row.onmouseleave = () => { row.style.background = "transparent"; };

        const tSpan = document.createElement("span");
        tSpan.innerText = conf.label;
        tSpan.style.cssText = "color: #bbb; font-family: var(--comfy-font-family, sans-serif); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 0 95px; cursor: pointer;";
        
        const sEl = document.createElement("input");
        sEl.id = `cr_slider_${conf.id}`;
        sEl.type = "range"; sEl.min = conf.min; sEl.max = conf.max; sEl.value = state[conf.id];
        sEl.style.cssText = "flex: 1; margin: 0 8px; min-width: 30px; cursor: pointer; height: 10px; accent-color: #33789a;";
        
        const iEl = document.createElement("input");
        iEl.id = `cr_input_${conf.id}`;
        iEl.type = "number"; iEl.min = conf.min; iEl.max = conf.max; iEl.value = state[conf.id];
        iEl.className = "trix-num";
        iEl.style.cssText = "background: #000; color: #fff; border: 1px solid #444; padding: 2px 4px; border-radius: 3px; font-size: 11px; font-family: var(--comfy-font-family, monospace); outline: none; width: 50px; box-sizing: border-box; cursor: pointer; text-align: center; flex-shrink: 0;";
        
        const updateVals = (val) => {
            let parsed = parseFloat(val);
            if(isNaN(parsed)) parsed = 0;
            const isFloat = conf.step && conf.step < 1.0;
            if (isFloat) {
                parsed = Math.max(conf.min, Math.min(conf.max, parsed));
                let decimals = 2;
                if (conf.step) {
                    const stepStr = conf.step.toString();
                    const dotIdx = stepStr.indexOf('.');
                    if (dotIdx !== -1) {
                        decimals = Math.max(2, stepStr.length - dotIdx - 1);
                    }
                }
                iEl.value = parsed.toFixed(decimals);
            } else {
                parsed = Math.max(conf.min, Math.min(conf.max, Math.round(parsed)));
                iEl.value = parsed;
            }
            sEl.value = parsed;
            state[conf.id] = parsed; if (onChangeCallback) onChangeCallback(); if (typeof updatePanelActiveColoring === 'function') updatePanelActiveColoring();
        };

        if (conf.step) {
            sEl.step = conf.step;
            iEl.step = conf.step;
        }

        iEl.onchange = (e) => { updateVals(e.target.value); pushCrHistory(); };
        sEl.oninput = (e) => updateVals(e.target.value);
        sEl.onchange = () => pushCrHistory();

        const doReset = () => { updateVals(conf.default ?? 0); pushCrHistory(); };
        sEl.ondblclick = doReset;
        tSpan.ondblclick = doReset;

        row.append(tSpan, sEl, iEl);
        parentBody.appendChild(row);
        const p = panelTrackers.find(x => x.body === parentBody);
        if (p) p.items.push(conf);
        return { row, sEl, iEl, updateVals };
    };

    // 1. Light Panel
    const lightPanel = createAccordionPanel("Light", true);
    [
        {id: 'cr_offset', label: 'Offset', min:-100, max:100, default:0},
        {id: 'cr_exp', label: 'Exposure', min:-200, max:200, default:0},
        {id: 'cr_cont', label: 'Contrast', min:-150, max:150, default:0},
        {id: 'cr_high', label: 'Highlights', min:-150, max:150, default:0},
        {id: 'cr_shad', label: 'Shadows', min:-150, max:150, default:0},
        {id: 'cr_white', label: 'Whites', min:-150, max:150, default:0},
        {id: 'cr_black', label: 'Blacks', min:-150, max:150, default:0}
    ].forEach(conf => createSliderRow(conf, lightPanel.body, scheduleRender));

    // 2. Color Panel
    const colorPanel = createAccordionPanel("Color", true);
    [
        {id: 'cr_temp', label: 'Temperature', min:-150, max:150, default:0},
        {id: 'cr_tint', label: 'Tint', min:-150, max:150, default:0},
        {id: 'cr_vibrance', label: 'Vibrance', min:-150, max:150, default:0},
        {id: 'cr_sat', label: 'Saturation', min:-100, max:100, default:0}
    ].forEach(conf => createSliderRow(conf, colorPanel.body, scheduleRender));

    // 3. Detail Panel
    const detailPanel = createAccordionPanel("Detail", false);
    [
        {id: 'cr_tex', label: 'Texture', min:-200, max:200, default:0},
        {id: 'cr_clar', label: 'Clarity', min:-200, max:200, default:0},
        {id: 'cr_dehz', label: 'Dehaze', min:-150, max:150, default:0},
        {id: 'cr_denoise', label: 'Noise Reduction', min:0, max:150, default:0}
    ].forEach(conf => createSliderRow(conf, detailPanel.body, scheduleRender));

    // 4. Effect Panel
    const effectPanel = createAccordionPanel("Effect", false);
    [
        {id: 'cr_grain', label: 'Grain', min:0, max:150, default:0},
        {id: 'cr_vignette', label: 'Vignette', min:0, max:150, default:0}
    ].forEach(conf => createSliderRow(conf, effectPanel.body, scheduleRender));


    // 5. Sketch Panel
    const sketchPanel = createAccordionPanel("Sketch", false);
    [
        {id: 'cr_sketch_kernel_size', label: 'Kernel Size', min:0, max:25, step:1, default:0},
        {id: 'cr_sketch_sigma', label: 'Sigma', min:0.1, max:5.0, step:0.05, default:1.4},
        {id: 'cr_sketch_k_sigma', label: 'K-Sigma', min:1.0, max:5.0, step:0.05, default:1.6},
        {id: 'cr_sketch_epsilon', label: 'Epsilon', min:-0.2, max:0.2, step:0.005, default:-0.03},
        {id: 'cr_sketch_phi', label: 'Phi', min:1.0, max:50.0, step:1.0, default:10.0},
        {id: 'cr_sketch_gamma', label: 'Gamma', min:0.0, max:1.0, step:0.005, default:1.0}
    ].forEach(conf => createSliderRow(conf, sketchPanel.body, scheduleRender));

    // Sketch Color Mode Dropdown
    const skColorRow = document.createElement("div");
    skColorRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 4px;";
    const skColorLabel = document.createElement("span");
    skColorLabel.innerText = "Color Mode:";
    skColorLabel.style.cssText = "color: #bbb; font-size: 11px;";
    const skColorSel = document.createElement("select");
    skColorSel.id = "cr_sketch_color";
    skColorSel.style.cssText = "background: #111; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer; width: 80px;";
    ['gray', 'rgb'].forEach(opt => {
        const o = document.createElement("option"); o.value = opt; o.innerText = opt; skColorSel.appendChild(o);
    });
    skColorSel.value = state.cr_sketch_color;
    skColorSel.onchange = (e) => {
        state.cr_sketch_color = e.target.value;
        pushCrHistory();
        scheduleRender();
    };
    skColorRow.append(skColorLabel, skColorSel);
    sketchPanel.body.appendChild(skColorRow);

    // 6. Pixelize Panel
    const pixelizePanel = createAccordionPanel("Pixelize", false);
    [
        {id: 'cr_pixel_colors', label: 'Colors', min:2, max:256, default:128},
        {id: 'cr_pixel_dot_size', label: 'Dot Size', min:0, max:32, default:0},
        {id: 'cr_pixel_outline', label: 'Outline Inflating', min:0, max:9, default:0},
        {id: 'cr_pixel_smoothing', label: 'Smoothing', min:0, max:10, default:0}
    ].forEach(conf => createSliderRow(conf, pixelizePanel.body, scheduleRender));

    // Pixelize Color Reduce Algo Dropdown
    const pxAlgoRow = document.createElement("div");
    pxAlgoRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 4px;";
    const pxAlgoLabel = document.createElement("span");
    pxAlgoLabel.innerText = "Color Reduce Algo:";
    pxAlgoLabel.style.cssText = "color: #bbb; font-size: 11px;";
    const pxAlgoSel = document.createElement("select");
    pxAlgoSel.id = "cr_pixel_algo";
    pxAlgoSel.style.cssText = "background: #111; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer; width: 140px;";
    ['kmeans', 'dithering', 'kmeans with dithering'].forEach(opt => {
        const o = document.createElement("option"); o.value = opt; o.innerText = opt; pxAlgoSel.appendChild(o);
    });
    pxAlgoSel.value = state.cr_pixel_algo;
    pxAlgoSel.onchange = (e) => {
        state.cr_pixel_algo = e.target.value;
        pushCrHistory();
        scheduleRender();
    };
    pxAlgoRow.append(pxAlgoLabel, pxAlgoSel);
    pixelizePanel.body.appendChild(pxAlgoRow);

    // Helper for small section label inside accordion body
    const makeSectionLabel = (text, body) => {
        const lbl = document.createElement("div");
        lbl.innerText = text;
        lbl.style.cssText = "color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 4px 0 4px; margin-bottom: -4px;";
        body.appendChild(lbl);
    };

    // Helper for dropdown row inside accordion
    const makeSelectRow = (labelText, id, options, initialVal, onChange) => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 4px; margin-bottom: 2px;";
        const lbl = document.createElement("span");
        lbl.innerText = labelText;
        lbl.style.cssText = "color: #bbb; font-size: 11px; flex: 0 0 95px;";
        const sel = document.createElement("select");
        sel.id = id;
        sel.style.cssText = "flex: 1; background: #111; color: #fff; border: 1px solid #444; padding: 3px 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer;";
        options.forEach(opt => {
            const o = document.createElement("option");
            o.value = opt.value !== undefined ? opt.value : opt;
            o.innerText = opt.label !== undefined ? opt.label : opt;
            sel.appendChild(o);
        });
        sel.value = initialVal;
        sel.onchange = (e) => onChange(e.target.value);
        row.append(lbl, sel);
        return { row, sel };
    };

    // Helper for checkbox row inside accordion
    const makeCheckboxRow = (labelText, id, initialVal, onChange) => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 4px; margin-bottom: 2px;";
        const chk = document.createElement("input");
        chk.type = "checkbox"; chk.id = id; chk.checked = !!initialVal; chk.style.cursor = "pointer";
        const lbl = document.createElement("label");
        lbl.htmlFor = id; lbl.innerText = labelText;
        lbl.style.cssText = "color: #bbb; font-size: 11px; cursor: pointer;";
        chk.onchange = (e) => onChange(e.target.checked);
        row.append(chk, lbl);
        return { row, chk };
    };

    // 7. Blur Panel
    const blurAdvPanel = createAccordionPanel("Blur", false);
    createSliderRow({id: 'cr_blur_radius', label: 'Radius', min: 0, max: 50, default: 0}, blurAdvPanel.body, scheduleRender);
    const blurModeRow = makeSelectRow("Mode:", "cr_blur_mode",
        ["Gaussian", "Average", "Edge Average", "Surface Blur"],
        state.cr_blur_mode || 'gaussian',
        (v) => { state.cr_blur_mode = v.toLowerCase(); pushCrHistory(); scheduleRender(); }
    );
    blurAdvPanel.body.appendChild(blurModeRow.row);

    // 8. Halftone Panel
    const halftonePanel = createAccordionPanel("Halftone", false);
    [
        {id: 'cr_ht_size', label: 'Size', min: 0, max: 50, default: 0},
        {id: 'cr_ht_angle', label: 'Angle', min: -180, max: 180, default: 15},
        {id: 'cr_ht_contrast', label: 'Contrast', min: -100, max: 100, default: 0},
        {id: 'cr_ht_brightness', label: 'Brightness', min: -100, max: 100, default: 0},
        {id: 'cr_ht_dither', label: 'Dither', min: 0, max: 100, default: 100}
    ].forEach(conf => createSliderRow(conf, halftonePanel.body, scheduleRender));
    const htShapeRow = makeSelectRow("Shape:", "cr_ht_shape",
        ["Dot", "Square Dot", "Line", "Rhomboid", "Cross Cut", "Saddle", "Random Dots"],
        state.cr_ht_shape || 'Dot',
        (v) => { state.cr_ht_shape = v; pushCrHistory(); scheduleRender(); }
    );
    halftonePanel.body.appendChild(htShapeRow.row);
    const htInvRow = makeCheckboxRow("Inverse", "cr_ht_inverse", state.cr_ht_inverse,
        (v) => { state.cr_ht_inverse = v; pushCrHistory(); scheduleRender(); }
    );
    halftonePanel.body.appendChild(htInvRow.row);

    // Halftone Angle Dial
    const htAngleCanvas = document.createElement("canvas");
    htAngleCanvas.width = 300; htAngleCanvas.height = 86;
    htAngleCanvas.style.cssText = "display: block; margin: 4px auto; background: transparent; cursor: pointer;";
    halftonePanel.body.appendChild(htAngleCanvas);

    drawHtDial = () => {
        const ctx = htAngleCanvas.getContext("2d");
        ctx.clearRect(0, 0, 300, 86);
        const cx = 150, cy = 43, r = 36;
        
        // Disc background
        ctx.fillStyle = '#ccc';
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Line indicator
        const angDeg = state.cr_ht_angle || 0;
        const ang = angDeg * Math.PI / 180;
        const tipX = cx + Math.cos(ang) * (r - 2);
        const tipY = cy + Math.sin(ang) * (r - 2);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    };

    let htDialDragging = false;
    const htPickAngle = (e) => {
        const rect = htAngleCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const dx = mouseX - 150;
        const dy = mouseY - 43;
        if (dx === 0 && dy === 0) return;
        let angDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        angDeg = Math.round(angDeg * 10) / 10;
        state.cr_ht_angle = angDeg;
        
        const sEl = document.getElementById("cr_slider_cr_ht_angle");
        if (sEl) sEl.value = angDeg;
        const iEl = document.getElementById("cr_input_cr_ht_angle");
        if (iEl) iEl.value = angDeg;
        
        drawHtDial();
        scheduleRender();
    };

    htAngleCanvas.addEventListener("mousedown", (e) => {
        e.preventDefault();
        htDialDragging = true;
        htPickAngle(e);
    }, { signal: abortCtrl.signal });

    window.addEventListener("mousemove", (e) => {
        if (htDialDragging) {
            e.preventDefault();
            htPickAngle(e);
        }
    }, { signal: abortCtrl.signal });

    window.addEventListener("mouseup", () => {
        if (htDialDragging) {
            htDialDragging = false;
            pushCrHistory();
        }
    }, { signal: abortCtrl.signal });

    halftonePanel.header.addEventListener("click", () => { requestAnimationFrame(drawHtDial); });

    // 9. Sharpen Panel
    const sharpenPanel = createAccordionPanel("Sharpen", false);
    makeSectionLabel("Unsharp Mask", sharpenPanel.body);
    [
        {id: 'cr_usm_amount', label: 'Amount', min: 0, max: 200, default: 0},
        {id: 'cr_usm_radius', label: 'Radius', min: 1, max: 10, default: 1},
        {id: 'cr_usm_threshold', label: 'Threshold', min: 0, max: 255, default: 0}
    ].forEach(conf => createSliderRow(conf, sharpenPanel.body, scheduleRender));
    makeSectionLabel("Laplacian", sharpenPanel.body);
    createSliderRow({id: 'cr_lap_amount', label: 'Amount', min: 0.0, max: 1.0, step: 0.01, default: 0}, sharpenPanel.body, scheduleRender);
    const lapKernelRow = makeSelectRow("Kernel:", "cr_lap_kernel",
        ["8-neighbor", "4-neighbor"],
        state.cr_lap_kernel || '8-neighbor',
        (v) => { state.cr_lap_kernel = v; pushCrHistory(); scheduleRender(); }
    );
    sharpenPanel.body.appendChild(lapKernelRow.row);

    // 10. Color Filter Panel
    const colorFilterPanel = createAccordionPanel("Color Filter", false);
    // Color Wheel Canvas
    const cfWheelWrapper = document.createElement("div");
    cfWheelWrapper.style.cssText = "display: flex; justify-content: center; margin-bottom: 8px; position: relative;";
    const cfWheel = document.createElement("canvas");
    cfWheel.id = "cr_cf_wheel";
    cfWheel.width = 150; cfWheel.height = 150;
    cfWheel.style.cssText = "border-radius: 50%; cursor: crosshair; border: 2px solid #444; box-sizing: border-box;";
    cfWheelWrapper.appendChild(cfWheel);
    colorFilterPanel.body.appendChild(cfWheelWrapper);

    [
        {id: 'cr_cf_hue', label: 'Hue', min: 0, max: 360, default: 0},
        {id: 'cr_cf_density', label: 'Density', min: 0, max: 255, default: 0},
        {id: 'cr_cf_preserve', label: 'Preserve Highl.', min: 0, max: 100, default: 50}
    ].forEach(conf => createSliderRow(conf, colorFilterPanel.body, () => { drawCfWheel(); scheduleRender(); }));

    drawCfWheel = () => {
        const wCtx = cfWheel.getContext('2d');
        const src = getCRColorWheelCanvas();
        wCtx.clearRect(0, 0, 150, 150);
        wCtx.drawImage(src, 0, 0, 150, 150);
        // Draw cursor directly on the wheel canvas
        const density = state.cr_cf_density || 0;
        const hue = state.cr_cf_hue || 0;
        const ang = ((hue - 90 + 360) % 360) * Math.PI / 180;
        const r = (density / 255) * 73;
        const cx = 75 + Math.cos(ang) * r;
        const cy = 75 + Math.sin(ang) * r;
        
        wCtx.lineWidth = 2.5; wCtx.strokeStyle = '#000';
        wCtx.beginPath(); wCtx.arc(cx, cy, 4.5, 0, Math.PI * 2); wCtx.stroke();
        wCtx.lineWidth = 1.5; wCtx.strokeStyle = '#fff';
        wCtx.beginPath(); wCtx.arc(cx, cy, 4.5, 0, Math.PI * 2); wCtx.stroke();
    };

    // Wheel interaction
    let cfWheelDragging = false;
    const cfPickFromWheel = (e) => {
        const rect = cfWheel.getBoundingClientRect();
        const cx = e.clientX - rect.left - 75;
        const cy = e.clientY - rect.top - 75;
        const dist = Math.sqrt(cx * cx + cy * cy);
        let hue = ((Math.atan2(cy, cx) * 180 / Math.PI) + 90 + 360) % 360;
        const density = Math.min(255, Math.round((dist / 73) * 255));
        
        state.cr_cf_hue = Math.round(hue);
        state.cr_cf_density = density;
        
        // Sync sliders & inputs
        const hueSlider = document.getElementById("cr_slider_cr_cf_hue");
        if (hueSlider) hueSlider.value = state.cr_cf_hue;
        const hueInput = document.getElementById("cr_input_cr_cf_hue");
        if (hueInput) hueInput.value = state.cr_cf_hue;

        const densitySlider = document.getElementById("cr_slider_cr_cf_density");
        if (densitySlider) densitySlider.value = state.cr_cf_density;
        const densityInput = document.getElementById("cr_input_cr_cf_density");
        if (densityInput) densityInput.value = state.cr_cf_density;
        
        drawCfWheel();
        scheduleRender();
    };
    cfWheel.addEventListener("mousedown", (e) => { e.preventDefault(); cfWheelDragging = true; cfPickFromWheel(e); }, { signal: abortCtrl.signal });
    cfWheel.addEventListener("mousemove", (e) => { if (cfWheelDragging) { e.preventDefault(); cfPickFromWheel(e); } }, { signal: abortCtrl.signal });
    window.addEventListener("mouseup", () => { if (cfWheelDragging) { cfWheelDragging = false; pushCrHistory(); } }, { signal: abortCtrl.signal });

    colorFilterPanel.header.addEventListener("click", () => { requestAnimationFrame(drawCfWheel); });

    // 11. Posterize Panel
    const posterizePanel = createAccordionPanel("Posterize", false);
    const postEnableRow = makeCheckboxRow("Enable Posterize", "cr_post_enable", state.cr_post_enable, (v) => {
        state.cr_post_enable = v;
        pushCrHistory();
        scheduleRender();
    });
    posterizePanel.body.appendChild(postEnableRow.row);
    [
        {id: 'cr_post_levels', label: 'Levels', min: 2, max: 32, default: 4},
        {id: 'cr_post_dither', label: 'Dither', min: 0, max: 100, default: 0}
    ].forEach(conf => createSliderRow(conf, posterizePanel.body, scheduleRender));
    const postModeRow = makeSelectRow("Mode:", "cr_post_mode",
        ["RGB", "Luminance"],
        state.cr_post_mode || 'RGB',
        (v) => { state.cr_post_mode = v; pushCrHistory(); scheduleRender(); }
    );
    posterizePanel.body.appendChild(postModeRow.row);
    const postDitherRow = makeSelectRow("Dither Mode:", "cr_post_dither_mode",
        ["None", "Bayer", "Random", "Floyd-Steinberg", "Atkinson"],
        state.cr_post_dither_mode || 'None',
        (v) => { state.cr_post_dither_mode = v; pushCrHistory(); scheduleRender(); }
    );
    posterizePanel.body.appendChild(postDitherRow.row);

    // 12. Levels Panel
    const levelsPanel = createAccordionPanel("Levels", false);
    const lvlChannelRow = makeSelectRow("Channel:", "cr_lvl_channel",
        [{value: 'rgb', label: 'RGB'}, {value: 'r', label: 'Red'}, {value: 'g', label: 'Green'}, {value: 'b', label: 'Blue'}],
        state.cr_lvl_channel || 'rgb',
        (v) => { state.cr_lvl_channel = v; if (typeof drawLevelsBar === "function") drawLevelsBar(); pushCrHistory(); scheduleRender(); }
    );
    levelsPanel.body.appendChild(lvlChannelRow.row);

    // Visual levels bar (Canvas with real-time histogram and interactive draggable handles)
    const lvlBarWrapper = document.createElement("div");
    lvlBarWrapper.style.cssText = "margin: 4px 0 8px 0; user-select: none; display: flex; flex-direction: column; align-items: center;";
    const lvlCanvas = document.createElement("canvas");
    lvlCanvas.width = 276; lvlCanvas.height = 120;
    lvlCanvas.style.cssText = "background: #111; border-radius: 4px; border: 1px solid #333; cursor: pointer; display: block; width: 276px; height: 120px;";
    lvlBarWrapper.appendChild(lvlCanvas);
    levelsPanel.body.appendChild(lvlBarWrapper);

    const computeHistogram = (channel) => {
        const hist = new Uint32Array(256);
        if (!baseImgData) return hist;
        const len = baseImgData.length;
        const chIdx = channel === 'r' ? 0 : (channel === 'g' ? 1 : (channel === 'b' ? 2 : -1));
        
        if (chIdx >= 0) {
            for (let i = 0; i < len; i += 4) {
                const val = baseImgData[i + chIdx];
                hist[val]++;
            }
        } else {
            // RGB
            for (let i = 0; i < len; i += 4) {
                const val = Math.round(baseImgData[i]*0.299 + baseImgData[i+1]*0.587 + baseImgData[i+2]*0.114);
                hist[val]++;
            }
        }
        return hist;
    };

    const getLvlHandlePositions = () => {
        const inB = state.cr_lvl_in_black || 0;
        const inW = state.cr_lvl_in_white !== undefined ? state.cr_lvl_in_white : 255;
        const gam = state.cr_lvl_gamma !== undefined ? state.cr_lvl_gamma : 1.0;
        const outB = state.cr_lvl_out_black || 0;
        const outW = state.cr_lvl_out_white !== undefined ? state.cr_lvl_out_white : 255;
        
        const inBlackX = 10 + (inB / 255) * 256;
        const inWhiteX = 10 + (inW / 255) * 256;
        const gRel = 0.5 - Math.log10(Math.max(0.01, Math.min(99.99, gam))) / 2;
        const gammaX = inBlackX + Math.max(0, Math.min(1, gRel)) * (inWhiteX - inBlackX);
        const outBlackX = 10 + (outB / 255) * 256;
        const outWhiteX = 10 + (outW / 255) * 256;
        
        return { inB, inW, gam, outB, outW, inBlackX, inWhiteX, gammaX, outBlackX, outWhiteX };
    };

    const drawHandle = (ctx, x, y, fill, stroke) => {
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x - 5, y + 4);
        ctx.lineTo(x + 5, y + 4);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    };

    drawLevelsBar = () => {
        const lCtx = lvlCanvas.getContext("2d");
        lCtx.clearRect(0, 0, 276, 120);
        
        // 1. Draw Histogram
        lCtx.fillStyle = '#1a1a1a';
        lCtx.fillRect(10, 5, 256, 60);
        lCtx.strokeStyle = 'rgba(255,255,255,0.12)';
        lCtx.strokeRect(10, 5, 256, 60);
        
        const channel = state.cr_lvl_channel || 'rgb';
        const hist = computeHistogram(channel);
        let maxV = 0;
        for (let i = 0; i < 256; i++) {
            if (hist[i] > maxV) maxV = hist[i];
        }
        if (maxV > 0) {
            lCtx.fillStyle = channel === 'r' ? 'rgba(220,80,80,0.85)' :
                            channel === 'g' ? 'rgba(80,220,80,0.85)' :
                            channel === 'b' ? 'rgba(80,140,255,0.85)' :
                            'rgba(180,180,180,0.85)';
            for (let i = 0; i < 256; i++) {
                const bh = Math.round((hist[i] / maxV) * 58);
                if (bh > 0) {
                    lCtx.fillRect(10 + i, 65 - bh, 1, bh);
                }
            }
        }
        
        // 2. Input gradient bar
        const gradIn = lCtx.createLinearGradient(10, 70, 266, 70);
        gradIn.addColorStop(0, '#000'); gradIn.addColorStop(1, '#fff');
        lCtx.fillStyle = gradIn;
        lCtx.fillRect(10, 70, 256, 8);
        
        const pos = getLvlHandlePositions();
        drawHandle(lCtx, pos.inBlackX, 84, '#000', '#fff');
        drawHandle(lCtx, pos.gammaX,   84, '#808080', '#fff');
        drawHandle(lCtx, pos.inWhiteX, 84, '#fff', '#000');
        
        // 3. Output gradient bar
        const gradOut = lCtx.createLinearGradient(10, 92, 266, 92);
        gradOut.addColorStop(0, '#000'); gradOut.addColorStop(1, '#fff');
        lCtx.fillStyle = gradOut;
        lCtx.fillRect(10, 92, 256, 8);
        
        drawHandle(lCtx, pos.outBlackX, 106, '#000', '#fff');
        drawHandle(lCtx, pos.outWhiteX, 106, '#fff', '#000');
    };

    let activeLvlHandle = null;
    const hitTestLvlHandle = (mx, my) => {
        const pos = getLvlHandlePositions();
        const tol = 10;
        
        // Check Output handles (around y=106)
        if (Math.abs(my - 106) < 12) {
            const dB = Math.abs(mx - pos.outBlackX);
            const dW = Math.abs(mx - pos.outWhiteX);
            if (Math.min(dB, dW) < tol) {
                return dB < dW ? 'out_black' : 'out_white';
            }
        }
        // Check Input handles (around y=84)
        if (Math.abs(my - 84) < 12 || (my > 68 && my < 90)) {
            const dB = Math.abs(mx - pos.inBlackX);
            const dG = Math.abs(mx - pos.gammaX);
            const dW = Math.abs(mx - pos.inWhiteX);
            const min = Math.min(dB, dG, dW);
            if (min < tol) {
                if (min === dB) return 'in_black';
                if (min === dW) return 'in_white';
                return 'in_gamma';
            }
        }
        return null;
    };

    const dragLvlHandle = (e) => {
        if (!activeLvlHandle) return;
        const rect = lvlCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const xNorm = Math.max(0, Math.min(1, (mx - 10) / 256));
        const value = Math.round(xNorm * 255);
        
        const inB = state.cr_lvl_in_black || 0;
        const inW = state.cr_lvl_in_white !== undefined ? state.cr_lvl_in_white : 255;
        const outB = state.cr_lvl_out_black || 0;
        const outW = state.cr_lvl_out_white !== undefined ? state.cr_lvl_out_white : 255;
        
        if (activeLvlHandle === 'in_black') {
            state.cr_lvl_in_black = Math.max(0, Math.min(inW - 1, value));
        } else if (activeLvlHandle === 'in_white') {
            state.cr_lvl_in_white = Math.max(inB + 1, Math.min(255, value));
        } else if (activeLvlHandle === 'in_gamma') {
            const range = Math.max(1, inW - inB);
            const rel = Math.max(0.01, Math.min(0.99, (value - inB) / range));
            const gamma = Math.pow(10, (0.5 - rel) * 2);
            state.cr_lvl_gamma = Math.round(gamma * 100) / 100;
        } else if (activeLvlHandle === 'out_black') {
            state.cr_lvl_out_black = Math.max(0, Math.min(outW - 1, value));
        } else if (activeLvlHandle === 'out_white') {
            state.cr_lvl_out_white = Math.max(outB + 1, Math.min(255, value));
        }
        
        // Sync sliders & inputs
        for (const k of ['cr_lvl_in_black', 'cr_lvl_in_white', 'cr_lvl_gamma', 'cr_lvl_out_black', 'cr_lvl_out_white']) {
            const slider = document.getElementById('cr_slider_' + k);
            if (slider) slider.value = state[k];
            const input = document.getElementById('cr_input_' + k);
            if (input) input.value = state[k];
        }
        
        drawLevelsBar();
        scheduleRender();
    };

    lvlCanvas.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const rect = lvlCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const handle = hitTestLvlHandle(mx, my);
        if (handle) {
            activeLvlHandle = handle;
            dragLvlHandle(e);
        }
    }, { signal: abortCtrl.signal });

    window.addEventListener("mousemove", (e) => {
        if (activeLvlHandle) {
            e.preventDefault();
            dragLvlHandle(e);
        }
    }, { signal: abortCtrl.signal });

    window.addEventListener("mouseup", () => {
        if (activeLvlHandle) {
            activeLvlHandle = null;
            pushCrHistory();
        }
    }, { signal: abortCtrl.signal });

    levelsPanel.header.addEventListener("click", () => requestAnimationFrame(drawLevelsBar));
    [
        {id: 'cr_lvl_in_black', label: 'In Black', min: 0, max: 254, default: 0},
        {id: 'cr_lvl_in_white', label: 'In White', min: 1, max: 255, default: 255},
        {id: 'cr_lvl_gamma', label: 'Gamma', min: 0.1, max: 10.0, step: 0.01, default: 1.0},
        {id: 'cr_lvl_out_black', label: 'Out Black', min: 0, max: 254, default: 0},
        {id: 'cr_lvl_out_white', label: 'Out White', min: 1, max: 255, default: 255}
    ].forEach(conf => {
        createSliderRow(conf, levelsPanel.body, () => { drawLevelsBar(); scheduleRender(); });
    });

    // 13. Color Balance Panel
    const colorBalancePanel = createAccordionPanel("Color Balance", false);
    
    // Canvas Container for three wheels
    const cbCanvasWrapper = document.createElement("div");
    cbCanvasWrapper.style.cssText = "display: flex; justify-content: center; margin-bottom: 8px; position: relative;";
    const cbCanvas = document.createElement("canvas");
    cbCanvas.width = 300; cbCanvas.height = 110;
    cbCanvas.style.cssText = "background: #111; border-radius: 6px; border: 1px solid #333; cursor: crosshair;";
    cbCanvasWrapper.appendChild(cbCanvas);
    colorBalancePanel.body.appendChild(cbCanvasWrapper);

    drawCbWheels = () => {
        const ctx = cbCanvas.getContext("2d");
        ctx.clearRect(0, 0, 300, 110);
        
        const disc = getCbDiscCanvas();
        const rMax = 38;
        const cy = 65;
        const centers = [50, 150, 250];
        const labels = ["Shadows", "Midtones", "Highlights"];
        const prefixes = ["shad", "mid", "high"];
        
        for (let i = 0; i < 3; i++) {
            const cx = centers[i];
            // Label
            ctx.fillStyle = '#cfcfcf';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], cx, 18);
            
            // Disc
            ctx.drawImage(disc, cx - rMax, cy - rMax, rMax * 2, rMax * 2);
            
            // Indicator ring
            const r = state[`cr_cb_${prefixes[i]}_r`] || 0;
            const g = state[`cr_cb_${prefixes[i]}_g`] || 0;
            const b = state[`cr_cb_${prefixes[i]}_b`] || 0;
            
            const pos = cbShiftsToPos(r, g, b);
            const ang = pos.hue * Math.PI * 2;
            const rr = pos.distance * rMax;
            const cxp = cx + Math.sin(ang) * rr;
            const cyp = cy - Math.cos(ang) * rr;
            
            ctx.lineWidth = 2.5; ctx.strokeStyle = '#000';
            ctx.beginPath(); ctx.arc(cxp, cyp, 4.5, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff';
            ctx.beginPath(); ctx.arc(cxp, cyp, 4.5, 0, Math.PI * 2); ctx.stroke();
        }
    };

    let activeCbWheelIdx = -1;
    const updateCbWheelValue = (mouseX, mouseY) => {
        if (activeCbWheelIdx < 0 || activeCbWheelIdx > 2) return;
        const cy = 65;
        const rMax = 38;
        const centers = [50, 150, 250];
        const prefixes = ["shad", "mid", "high"];
        const prefix = `cr_cb_${prefixes[activeCbWheelIdx]}_`;
        
        const cx = centers[activeCbWheelIdx];
        const dx = mouseX - cx;
        const dy = mouseY - cy;
        const dist = Math.min(rMax, Math.sqrt(dx*dx + dy*dy));
        const distance = rMax > 0 ? dist / rMax : 0;
        
        let hue = Math.atan2(dx, -dy) / (Math.PI * 2);
        if (hue < 0) hue += 1;
        
        const h6 = hue * 6;
        const ii = Math.floor(h6);
        const f = h6 - ii;
        const p = 0;
        const q = 1 - f;
        const t = f;
        let r, g, b;
        switch (((ii % 6) + 6) % 6) {
            case 0: r = 1; g = t; b = p; break;
            case 1: r = q; g = 1; b = p; break;
            case 2: r = p; g = 1; b = t; break;
            case 3: r = p; g = q; b = 1; break;
            case 4: r = t; g = p; b = 1; break;
            default: r = 1; g = p; b = q;
        }
        
        state[prefix + 'r'] = Math.round((r - 0.5) * 2 * 100 * distance);
        state[prefix + 'g'] = Math.round((g - 0.5) * 2 * 100 * distance);
        state[prefix + 'b'] = Math.round((b - 0.5) * 2 * 100 * distance);
        
        drawCbWheels();
        scheduleRender();
    };

    cbCanvas.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const rect = cbCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cy = 65;
        const rMax = 38;
        const centers = [50, 150, 250];
        
        for (let i = 0; i < 3; i++) {
            const dx = mouseX - centers[i];
            const dy = mouseY - cy;
            if (dx*dx + dy*dy <= (rMax + 5) * (rMax + 5)) {
                activeCbWheelIdx = i;
                updateCbWheelValue(mouseX, mouseY);
                break;
            }
        }
    }, { signal: abortCtrl.signal });

    window.addEventListener("mousemove", (e) => {
        if (activeCbWheelIdx >= 0) {
            e.preventDefault();
            const rect = cbCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            updateCbWheelValue(mouseX, mouseY);
        }
    }, { signal: abortCtrl.signal });

    window.addEventListener("mouseup", () => {
        if (activeCbWheelIdx >= 0) {
            activeCbWheelIdx = -1;
            pushCrHistory();
        }
    }, { signal: abortCtrl.signal });

    colorBalancePanel.header.addEventListener("click", () => { requestAnimationFrame(drawCbWheels); });

    // --- HUE/SATURATION PANEL ---


    const hslWrapper = document.createElement("div");
    hslWrapper.style.cssText = "border: 1px solid #444; border-radius: 4px; background: #1a1a1a; overflow: visible; margin-bottom: 12px;";

    const hslHeader = document.createElement("div");
    hslHeader.style.cssText = "padding: 8px 12px; background: #2a2a2f; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #fff; font-size: 12px; font-weight: bold; user-select: none;";
    hslHeader.innerHTML = `<span>Hue/Saturation</span> <span id="hsl_chev">${svgChevronDown}</span>`;
    
    const hslBody = document.createElement("div");
    hslBody.style.cssText = "padding: 12px; display: none; flex-direction: column; gap: 12px; overflow: visible;";
    
    let isHslOpen = false;
    hslHeader.onclick = () => {
        isHslOpen = !isHslOpen;
        hslBody.style.display = isHslOpen ? "flex" : "none";
        document.getElementById("hsl_chev").style.transform = isHslOpen ? "rotate(-180deg)" : "rotate(0deg)";
        if (isHslOpen) revealSidebarSection(hslWrapper);
    };

    const topHslRow = document.createElement("div");
    topHslRow.style.cssText = "display: flex; align-items: center; gap: 8px;";

    const fingerBtn = document.createElement("button");
    fingerBtn.innerHTML = svgFinger;
    fingerBtn.title = "Drag in image to modify saturation";
    fingerBtn.style.cssText = "background: #222; color: #aaa; border: 1px solid #444; border-radius: 4px; padding: 4px; cursor: pointer; transition: 0.2s;";
    fingerBtn.onclick = () => {
        hslFingerActive = !hslFingerActive;
        fingerBtn.style.background = hslFingerActive ? "rgb(246, 103, 68)" : "#222";
        fingerBtn.style.color = hslFingerActive ? "#fff" : "#aaa";
        if (hslFingerActive && curvesFingerActive) {
            curvesFingerActive = false;
            curvesFingerBtn.style.background = "#222";
            curvesFingerBtn.style.color = "#aaa";
        }
    };

    const channelSelect = document.createElement("select");
    channelSelect.style.cssText = "flex: 1; background: #111; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 4px; font-size: 11px; outline: none; cursor: pointer;";
    const channels = [
        {val: 'master', text: 'Master'}, {val: 'reds', text: 'Reds'}, {val: 'yellows', text: 'Yellows'},
        {val: 'greens', text: 'Greens'}, {val: 'cyans', text: 'Cyans'}, {val: 'blues', text: 'Blues'}, {val: 'magentas', text: 'Magentas'}
    ];
    channels.forEach(ch => {
        const opt = document.createElement("option"); opt.value = ch.val; opt.innerText = ch.text; channelSelect.appendChild(opt);
    });
    
    const resetHslBtn = document.createElement("button");
    resetHslBtn.innerHTML = svgResetHSL;
    resetHslBtn.title = "Reset Channel";
    resetHslBtn.style.cssText = "background: none; border: none; color: #aaa; cursor: pointer; padding: 2px;";
    resetHslBtn.onclick = () => {
        if(hslState.activeChannel === 'master') {
            hslState.master = {h:0, s:0, l:0};
        } else {
            const defCenters = {reds:0, yellows:60, greens:120, cyans:180, blues:240, magentas:300};
            hslState[hslState.activeChannel] = {h:0, s:0, l:0, center: defCenters[hslState.activeChannel], width: 60};
        }
        updateHslUI(); pushCrHistory(); scheduleRender();
    };

    topHslRow.append(fingerBtn, channelSelect, resetHslBtn);
    hslBody.appendChild(topHslRow);

    const createHslSlider = (id, label, min, max, val) => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between;";
        const t = document.createElement("span"); t.innerText = label; t.style.cssText = "color: #bbb; font-size: 11px; flex: 0 0 65px;";
        const s = document.createElement("input"); s.type = "range"; s.min = min; s.max = max; s.value = val;
        s.style.cssText = "flex: 1; margin: 0 8px; accent-color: #33789a;";
        const i = document.createElement("input"); i.type = "number"; i.min = min; i.max = max; i.value = val;
        i.className = "trix-num";
        i.style.cssText = "width: 40px; background: #000; color: #fff; border: 1px solid #444; border-radius: 3px; font-size: 11px; text-align: center;";
        
        const update = (v) => {
            let parsed = parseInt(v) || 0;
            parsed = Math.max(min, Math.min(max, parsed));
            s.value = parsed; i.value = parsed;
            hslState[hslState.activeChannel][id] = parsed;
            updateGradientBars();
            scheduleRender();
        };
        s.oninput = (e) => update(e.target.value);
        s.onchange = () => pushCrHistory();
        i.onchange = (e) => { update(e.target.value); pushCrHistory(); };

        const reset = () => {
            if (id === "width" && hslState.activeChannel !== "master") {
                hslState[hslState.activeChannel].width = 60;
            } else if (id !== "width") {
                hslState[hslState.activeChannel][id] = 0;
            }
            updateHslUI();
            pushCrHistory();
            scheduleRender();
        };
        s.ondblclick = (e) => { e.preventDefault(); reset(); };
        i.ondblclick = (e) => { e.preventDefault(); reset(); };
        t.ondblclick = (e) => { e.preventDefault(); reset(); };
        
        row.append(t, s, i);
        return { row, s, i };
    };

    const sHue = createHslSlider('h', 'Hue:', -180, 180, 0);
    const sSat = createHslSlider('s', 'Saturation:', -100, 100, 0);
    const sLgt = createHslSlider('l', 'Lightness:', -100, 100, 0);
    hslBody.append(sHue.row, sSat.row, sLgt.row);

    const colorizeRow = document.createElement("div");
    colorizeRow.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 11px; color: #ccc;";
    const colorizeChk = document.createElement("input"); colorizeChk.type = "checkbox"; colorizeChk.style.cursor = "pointer";
    colorizeRow.append(colorizeChk, document.createTextNode("Colorize"));
    colorizeChk.onchange = (e) => {
        hslState.colorize = e.target.checked;
        pushCrHistory();
        scheduleRender();
    };
    hslBody.appendChild(colorizeRow);

    const gradContainer = document.createElement("div");
    gradContainer.style.cssText = "display: flex; flex-direction: column; gap: 4px; margin-top: 5px;";
    
    const gradBase = document.createElement("div");
    gradBase.style.cssText = "height: 8px; width: 100%; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); border-radius: 2px;";
    
    const gradShift = document.createElement("div");
    gradShift.style.cssText = "height: 8px; width: 100%; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); border-radius: 2px;";
    
    gradContainer.append(gradBase, gradShift);
    hslBody.appendChild(gradContainer);

    const sWidth = createHslSlider('width', 'Spread:', 10, 300, 60);
    sWidth.row.style.marginTop = "8px";
    hslBody.appendChild(sWidth.row);

    hslBody.addEventListener("wheel", (e) => {
        if (e.target && e.target.tagName === "INPUT" && e.target.type === "range") {
            e.preventDefault();
            sidebarContent.scrollTop += e.deltaY;
        }
    }, { passive: false, signal: abortCtrl.signal });

    hslWrapper.append(hslHeader, hslBody);
    sidebarContent.appendChild(hslWrapper);

    const updateGradientBars = () => {
        let shift = hslState[hslState.activeChannel].h || 0;
        let c = [];
        for (let i = 0; i <= 6; i++) {
            let hue = (i * 60 + shift) % 360;
            if (hue < 0) hue += 360;
            c.push(`hsl(${hue}, 100%, 50%)`);
        }
        gradShift.style.background = `linear-gradient(to right, ${c.join(', ')})`;
    };

    const updateHslUI = () => {
        channelSelect.value = hslState.activeChannel;
        colorizeChk.checked = hslState.colorize;
        sHue.s.value = hslState[hslState.activeChannel].h; sHue.i.value = hslState[hslState.activeChannel].h;
        sSat.s.value = hslState[hslState.activeChannel].s; sSat.i.value = hslState[hslState.activeChannel].s;
        sLgt.s.value = hslState[hslState.activeChannel].l; sLgt.i.value = hslState[hslState.activeChannel].l;
        
        if (hslState.activeChannel === 'master') {
            sWidth.row.style.display = 'none';
        } else {
            sWidth.row.style.display = 'flex';
            sWidth.s.value = hslState[hslState.activeChannel].width;
            sWidth.i.value = hslState[hslState.activeChannel].width;
        }

        fingerBtn.style.background = hslFingerActive ? "rgb(246, 103, 68)" : "#222";
        fingerBtn.style.color = hslFingerActive ? "#fff" : "#aaa";
        updateGradientBars();
    };

    channelSelect.onchange = (e) => {
        hslState.activeChannel = e.target.value;
        updateHslUI();
    };

    // --- END HUE/SATURATION PANEL ---

    // --- CURVES PANEL ---
    const curvesWrapper = document.createElement("div");
    curvesWrapper.style.cssText = "border: 1px solid #444; border-radius: 4px; background: #1a1a1a; overflow: hidden; margin-bottom: 14px;";

    const curvesHeader = document.createElement("div");
    curvesHeader.style.cssText = "padding: 8px 12px; background: #2a2a2f; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: #fff; font-size: 12px; font-weight: bold; user-select: none;";
    curvesHeader.innerHTML = `<span>${svgCurve} Curves</span> <span id="curve_chev">${svgChevronDown}</span>`;

    const curvesBody = document.createElement("div");
    curvesBody.style.cssText = "padding: 10px; display: none; flex-direction: column; gap: 8px;";
    let isCurvesOpen = false;
    curvesHeader.onclick = () => {
        isCurvesOpen = !isCurvesOpen;
        curvesBody.style.display = isCurvesOpen ? "flex" : "none";
        document.getElementById("curve_chev").style.transform = isCurvesOpen ? "rotate(-180deg)" : "rotate(0deg)";
        if (isCurvesOpen) revealSidebarSection(curvesWrapper);
    };

    const curveTopRow = document.createElement("div");
    curveTopRow.style.cssText = "display: flex; gap: 6px; align-items: center;";

    curvesFingerBtn = document.createElement("button");
    curvesFingerBtn.innerHTML = svgFinger;
    curvesFingerBtn.title = "Drag in image to modify curves";
    curvesFingerBtn.style.cssText = "background: #222; color: #aaa; border: 1px solid #444; border-radius: 4px; padding: 4px; cursor: pointer; transition: 0.2s;";
    curvesFingerBtn.onclick = () => {
        curvesFingerActive = !curvesFingerActive;
        curvesFingerBtn.style.background = curvesFingerActive ? "rgb(246, 103, 68)" : "#222";
        curvesFingerBtn.style.color = curvesFingerActive ? "#fff" : "#aaa";
        if (curvesFingerActive && hslFingerActive) {
            hslFingerActive = false;
            fingerBtn.style.background = "#222";
            fingerBtn.style.color = "#aaa";
        }
    };

    const curveChannelSelect = document.createElement("select");
    curveChannelSelect.style.cssText = "flex: 1; background: #111; color: #fff; border: 1px solid #444; padding: 4px; border-radius: 4px; font-size: 11px;";
    [
        { v: "rgb", t: "RGB" },
        { v: "r", t: "Red" },
        { v: "g", t: "Green" },
        { v: "b", t: "Blue" }
    ].forEach((optData) => {
        const opt = document.createElement("option");
        opt.value = optData.v;
        opt.textContent = optData.t;
        curveChannelSelect.appendChild(opt);
    });

    const resetCurveBtn = document.createElement("button");
    resetCurveBtn.innerHTML = svgResetCR;
    resetCurveBtn.title = "Reset Curve Channel";
    resetCurveBtn.style.cssText = "background: none; border: none; color: #aaa; cursor: pointer; padding: 2px 4px;";

    curveTopRow.append(curvesFingerBtn, curveChannelSelect, resetCurveBtn);
    curvesBody.appendChild(curveTopRow);

    const curvesCanvas = document.createElement("canvas");
    curvesCanvas.width = 256;
    curvesCanvas.height = 256;
    curvesCanvas.style.cssText = "width: min(100%, 280px); aspect-ratio: 1 / 1; height: auto; align-self: center; background: #0f0f13; border: 1px solid #2e2e33; border-radius: 4px; cursor: crosshair; image-rendering: auto; box-sizing: border-box;";
    curvesBody.appendChild(curvesCanvas);

    const curveHint = document.createElement("div");
    curveHint.textContent = "Click: add point, drag: move, right click: remove point, double click: reset channel.";
    curveHint.style.cssText = "color: #888; font-size: 10px; line-height: 1.3;";
    curvesBody.appendChild(curveHint);

    curvesWrapper.append(curvesHeader, curvesBody);
    sidebarContent.appendChild(curvesWrapper);

    const curvesCtx = curvesCanvas.getContext("2d");
    let activeCurvePointIdx = -1;
    let isCurveDragging = false;

    const getChannelColor = (ch) => {
        if (ch === "r") return "#ff6a6a";
        if (ch === "g") return "#67d967";
        if (ch === "b") return "#6ea6ff";
        return "#e5e5e5";
    };
    const getActiveCurvePoints = () => normalizeCurvePoints(curvesState[curvesState.activeChannel]);
    const setActiveCurvePoints = (points) => { curvesState[curvesState.activeChannel] = normalizeCurvePoints(points); };

    const canvasPosToCurve = (evt) => {
        const rect = curvesCanvas.getBoundingClientRect();
        const x = ((evt.clientX - rect.left) / rect.width) * 255;
        const y = (1 - (evt.clientY - rect.top) / rect.height) * 255;
        return {
            x: Math.max(0, Math.min(255, x)),
            y: Math.max(0, Math.min(255, y))
        };
    };
    const curveToCanvasPos = (pt) => {
        return {
            x: (pt.x / 255) * curvesCanvas.width,
            y: (1 - pt.y / 255) * curvesCanvas.height
        };
    };

    const findCurvePointIdx = (x, y, radius = 10) => {
        const points = getActiveCurvePoints();
        for (let i = 0; i < points.length; i++) {
            const pos = curveToCanvasPos(points[i]);
            const dx = x - pos.x;
            const dy = y - pos.y;
            if (Math.sqrt(dx * dx + dy * dy) <= radius) return i;
        }
        return -1;
    };

    const drawCurvesUI = () => {
        const w = curvesCanvas.width;
        const h = curvesCanvas.height;
        const points = getActiveCurvePoints();
        curvesCtx.clearRect(0, 0, w, h);

        curvesCtx.fillStyle = "#0f0f13";
        curvesCtx.fillRect(0, 0, w, h);

        curvesCtx.strokeStyle = "#27272d";
        curvesCtx.lineWidth = 1;
        for (let i = 1; i <= 7; i++) {
            const x = (w / 8) * i;
            const y = (h / 8) * i;
            curvesCtx.beginPath();
            curvesCtx.moveTo(x, 0);
            curvesCtx.lineTo(x, h);
            curvesCtx.stroke();
            curvesCtx.beginPath();
            curvesCtx.moveTo(0, y);
            curvesCtx.lineTo(w, y);
            curvesCtx.stroke();
        }

        curvesCtx.strokeStyle = "#51515e";
        curvesCtx.setLineDash([4, 4]);
        curvesCtx.beginPath();
        curvesCtx.moveTo(0, h);
        curvesCtx.lineTo(w, 0);
        curvesCtx.stroke();
        curvesCtx.setLineDash([]);

        curvesCtx.strokeStyle = getChannelColor(curvesState.activeChannel);
        curvesCtx.lineWidth = 2;
        curvesCtx.beginPath();
        points.forEach((pt, idx) => {
            const p = curveToCanvasPos(pt);
            if (idx === 0) curvesCtx.moveTo(p.x, p.y);
            else curvesCtx.lineTo(p.x, p.y);
        });
        curvesCtx.stroke();

        points.forEach((pt, idx) => {
            const p = curveToCanvasPos(pt);
            curvesCtx.fillStyle = idx === activeCurvePointIdx ? "#fff" : getChannelColor(curvesState.activeChannel);
            curvesCtx.strokeStyle = "#111";
            curvesCtx.lineWidth = 1.5;
            curvesCtx.beginPath();
            curvesCtx.arc(p.x, p.y, idx === activeCurvePointIdx ? 5 : 4, 0, Math.PI * 2);
            curvesCtx.fill();
            curvesCtx.stroke();
        });
    };

    const updateCurvesUI = () => {
        curvesState = ensureCurveState(curvesState);
        if (layers && layers[selectedLayerIndex]) {
            layers[selectedLayerIndex].curvesState = curvesState;
        }
        curveChannelSelect.value = curvesState.activeChannel;
        drawCurvesUI();
    };

    curveChannelSelect.onchange = (e) => {
        curvesState.activeChannel = e.target.value;
        updateCurvesUI();
    };

    resetCurveBtn.onclick = () => {
        curvesState[curvesState.activeChannel] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
        updateCurvesUI();
        pushCrHistory();
        scheduleRender();
    };

    curvesCanvas.oncontextmenu = (e) => {
        e.preventDefault();
        const rect = curvesCanvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * curvesCanvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * curvesCanvas.height;
        const points = getActiveCurvePoints();
        const idx = findCurvePointIdx(x, y, 11);
        if (idx > 0 && idx < points.length - 1) {
            points.splice(idx, 1);
            setActiveCurvePoints(points);
            updateCurvesUI();
            pushCrHistory();
            scheduleRender();
        }
    };

    curvesCanvas.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const rect = curvesCanvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * curvesCanvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * curvesCanvas.height;
        const points = getActiveCurvePoints();
        const hit = findCurvePointIdx(x, y, 10);
        if (hit >= 0) {
            activeCurvePointIdx = hit;
            isCurveDragging = true;
            drawCurvesUI();
            return;
        }

        const curvePt = canvasPosToCurve(e);
        points.push({ x: curvePt.x, y: curvePt.y });
        points.sort((a, b) => a.x - b.x);
        setActiveCurvePoints(points);
        activeCurvePointIdx = points.findIndex((p) => Math.abs(p.x - curvePt.x) < 0.01 && Math.abs(p.y - curvePt.y) < 0.01);
        isCurveDragging = true;
        updateCurvesUI();
        scheduleRender();
    }, { signal: abortCtrl.signal });

    curvesCanvas.addEventListener("mousemove", (e) => {
        if (!isCurveDragging || activeCurvePointIdx < 0) return;
        const points = getActiveCurvePoints();
        if (activeCurvePointIdx >= points.length) return;
        const curvePt = canvasPosToCurve(e);

        if (activeCurvePointIdx === 0) {
            points[0].x = 0;
            points[0].y = curvePt.y;
        } else if (activeCurvePointIdx === points.length - 1) {
            points[activeCurvePointIdx].x = 255;
            points[activeCurvePointIdx].y = curvePt.y;
        } else {
            const prevX = points[activeCurvePointIdx - 1].x + 0.2;
            const nextX = points[activeCurvePointIdx + 1].x - 0.2;
            points[activeCurvePointIdx].x = Math.max(prevX, Math.min(nextX, curvePt.x));
            points[activeCurvePointIdx].y = curvePt.y;
        }

        setActiveCurvePoints(points);
        drawCurvesUI();
        scheduleRender();
    }, { signal: abortCtrl.signal });

    curvesCanvas.addEventListener("dblclick", (e) => {
        e.preventDefault();
        curvesState[curvesState.activeChannel] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
        activeCurvePointIdx = -1;
        updateCurvesUI();
        pushCrHistory();
        scheduleRender();
    }, { signal: abortCtrl.signal });

    const stopCurveDrag = () => {
        if (isCurveDragging) {
            isCurveDragging = false;
            activeCurvePointIdx = -1;
            pushCrHistory();
            updateCurvesUI();
        }
    };
    window.addEventListener("mouseup", stopCurveDrag, { signal: abortCtrl.signal });

    // --- END CURVES PANEL ---

    resetCrBtn.onclick = () => {
        const dState = JSON.parse(JSON.stringify(defaultCrState));
        for (const key in dState) {
            state[key] = dState[key];
        }
        layers[selectedLayerIndex].hslState = {
            colorize: false, activeChannel: 'master', 
            master: { h: 0, s: 0, l: 0 }, reds: { h: 0, s: 0, l: 0, center: 0, width: 60 },
            yellows: { h: 0, s: 0, l: 0, center: 60, width: 60 }, greens: { h: 0, s: 0, l: 0, center: 120, width: 60 },
            cyans: { h: 0, s: 0, l: 0, center: 180, width: 60 }, blues: { h: 0, s: 0, l: 0, center: 240, width: 60 },
            magentas: { h: 0, s: 0, l: 0, center: 300, width: 60 }
        };
        layers[selectedLayerIndex].curvesState = createDefaultCurveState();
        hslState = layers[selectedLayerIndex].hslState;
        curvesState = layers[selectedLayerIndex].curvesState;
        renderLayersList();
        hslFingerActive = false;
        fingerBtn.style.background = "#222";
        fingerBtn.style.color = "#aaa";
        curvesFingerActive = false;
        curvesFingerBtn.style.background = "#222";
        curvesFingerBtn.style.color = "#aaa";
        updateHslUI();
        updateCurvesUI();
        updateRightPanelUI();
        pushCrHistory();
        scheduleRender();
    };

    const actionsWrapper = document.createElement("div");
    actionsWrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px; padding: 12px 18px 18px 18px; width: 100%; box-sizing: border-box; background: #151515; border-top: 1px solid #333; flex-shrink: 0;";

    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    cancelBtn.style.cssText = "width: 100%; padding: 10px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s; font-weight: bold;";
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = "#444"; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = "#333"; };
    
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display: flex; gap: 8px; width: 100%;";

    const saveDiskBtn = document.createElement("button");
    saveDiskBtn.innerText = "Save to Disk";
    saveDiskBtn.style.cssText = "flex: 1; padding: 10px; background: #2a2a2f; color: #fff; border: none; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 11px; font-weight: bold;";
    saveDiskBtn.onmouseenter = () => { saveDiskBtn.style.background = "#333a45"; };
    saveDiskBtn.onmouseleave = () => { saveDiskBtn.style.background = "#2a2a2f"; };

    const bakeLayers = (hqW, hqH, parentFilterStr, scaleRatio) => {
        const mainCvs = document.createElement("canvas");
        mainCvs.width = hqW; mainCvs.height = hqH;
        const mainCtx = mainCvs.getContext("2d", { willReadFrequently: true });
        
        // Create base image source canvas (with parent filter)
        const baseCvs = document.createElement("canvas");
        baseCvs.width = hqW; baseCvs.height = hqH;
        const baseCtx = baseCvs.getContext("2d");
        baseCtx.filter = parentFilterStr || "none";
        baseCtx.drawImage(origImgObj, 0, 0, hqW, hqH);
        baseCtx.filter = "none";
        const baseData = baseCtx.getImageData(0, 0, hqW, hqH).data;

        // In filter mode, draw base image initially
        if (layersMode === "filter") {
            mainCtx.drawImage(baseCvs, 0, 0);
        }
        
        // Offscreen layer canvas
        const layerCvs = document.createElement("canvas");
        layerCvs.width = hqW; layerCvs.height = hqH;
        const layerCtx = layerCvs.getContext("2d", { willReadFrequently: true });
        
        let firstVisible = true;
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!layer.visible) continue;
            
            layerCtx.clearRect(0, 0, hqW, hqH);
            
            let inputData;
            if (layersMode === "filter") {
                inputData = mainCtx.getImageData(0, 0, hqW, hqH).data;
            } else {
                inputData = baseData;
            }
            
            const imgData = new ImageData(hqW, hqH);
            processPixels(inputData, imgData.data, hqW, hqH, layer.state, layer.hslState, layer.curvesState);
            layerCtx.putImageData(imgData, 0, 0);
            applySpatialStages(layerCtx, hqW, hqH, layer.state, scaleRatio);
            
            mainCtx.globalAlpha = layer.opacity / 100;
            if (firstVisible && layersMode === "image") {
                mainCtx.globalCompositeOperation = "source-over";
                firstVisible = false;
            } else {
                mainCtx.globalCompositeOperation = layer.blendMode || "source-over";
            }
            mainCtx.drawImage(layerCvs, 0, 0);
        }
        mainCtx.globalAlpha = 1.0;
        mainCtx.globalCompositeOperation = "source-over";
        
        return mainCvs;
    };

    saveDiskBtn.onclick = () => {
        saveDiskBtn.innerText = "Processing...";
        setTimeout(() => {
            const hqW = origImgObj.naturalWidth;
            const hqH = origImgObj.naturalHeight;
            
            let parentFilterStr = "";
            if (node.inputs) {
                const inImageLink = node.inputs.find(inp => inp.name === "in_image");
                const isWired = inImageLink && inImageLink.link !== null && app.graph && app.graph.links && 
                                app.graph.links[inImageLink.link] && 
                                app.graph.links[inImageLink.link].target_id === node.id && 
                                node.inputs[app.graph.links[inImageLink.link].target_slot] === inImageLink;
                if (isWired) {
                    const linkInfo = app.graph.links[inImageLink.link];
                    if (linkInfo) {
                        const originNode = app.graph.getNodeById(linkInfo.origin_id);
                        if (originNode && originNode.comfyClass === "TrixLoadImageAIO" && originNode.imgTagRef) {
                            parentFilterStr = originNode.imgTagRef.style.filter || "";
                            if (parentFilterStr === "none") parentFilterStr = "";
                        }
                    }
                }
            }

            const scaleRatio = hqW / pW; 
            const bakedCvs = bakeLayers(hqW, hqH, parentFilterStr, scaleRatio);

            bakedCvs.toBlob(async (blob) => {
                if (!blob) { console.error("Failed to create blob for saving"); return; }
                const filename = `trix_camera_raw_HQ_${Date.now()}.png`;
                
                if (window.showSaveFilePicker) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: filename,
                            types: [{ description: 'Image Files (*.png;*.jpg;*.jpeg;*.webp)', accept: {'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp']} }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        saveDiskBtn.innerText = "Save to Disk";
                        return;
                    } catch (err) {
                        saveDiskBtn.innerText = "Save to Disk";
                        if (err.name === 'AbortError') return;
                        console.error("Save file picker failed:", err);
                    }
                }
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 60000); 
                saveDiskBtn.innerText = "Save to Disk";
            }, "image/png");
        }, 50);
    };

    const saveSettingsBtn = document.createElement("button");
    saveSettingsBtn.innerText = "Save Settings";
    saveSettingsBtn.style.cssText = "flex: 1; padding: 10px; background: #2a2a2f; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s;";
    saveSettingsBtn.onmouseenter = () => { saveSettingsBtn.style.background = "#333a45"; };
    saveSettingsBtn.onmouseleave = () => { saveSettingsBtn.style.background = "#2a2a2f"; };

    const saveToNodeBtn = document.createElement("button");
    saveToNodeBtn.innerText = "Save to Node";
    saveToNodeBtn.style.cssText = "flex: 1; padding: 10px; background: #33789a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: 0.2s; font-size: 11px;";
    saveToNodeBtn.onmouseenter = () => { saveToNodeBtn.style.background = "#3f8eb4"; };
    saveToNodeBtn.onmouseleave = () => { saveToNodeBtn.style.background = "#33789a"; };

    const closeEditor = () => {
        abortCtrl.abort();
        const existingModal = document.getElementById("trix-camera-raw-presets-modal");
        if (existingModal) {
            existingModal.remove();
        }
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
    };

    cancelBtn.onclick = closeEditor;
    
    saveSettingsBtn.onclick = () => {
        for (const key in state) {
            const w = getW(key);
            if (w) w.value = state[key];
        }
        const crE = getW("cr_enable");
        if (crE) crE.value = true;
        if (node._checkboxCREnable) node._checkboxCREnable.checked = true;
        
        const wHslData = getW("hsl_data");
        const wHslActive = getW("hsl_active");
        if (wHslData) wHslData.value = JSON.stringify(hslState);
        
        let hasHsl = hslState.colorize || ['reds','yellows','greens','cyans','blues','magentas','master'].some(ch => hslState[ch].h !== 0 || hslState[ch].s !== 0 || hslState[ch].l !== 0);
        if (wHslActive) wHslActive.value = hasHsl;
        const wCurveData = getW("curve_data");
        const wCurveActive = getW("curve_active");
        if (wCurveData) wCurveData.value = JSON.stringify(ensureCurveState(curvesState));
        if (wCurveActive) wCurveActive.value = curveHasAdjustments(curvesState);

        if (!node.properties) node.properties = {};
        node.properties.trix_layers = JSON.stringify(layers);
        node.properties.trix_layers_mode = layersMode;

        if (node.syncHTMLRef) node.syncHTMLRef();
        if (node.updateUIRef) node.updateUIRef();
        if (app.graph) app.graph.setDirtyCanvas(true, true);
        closeEditor();
    };

    saveToNodeBtn.onclick = () => {
        saveToNodeBtn.disabled = true;
        saveToNodeBtn.innerText = "Saving...";
        
        setTimeout(() => {
            const imgWidget = node.widgets ? node.widgets.find(w => w && (w.name === "image" || w.name === "image_path")) : null;
            let nextVersion = (node._trix_image_version || 0) + 1;
            if (imgWidget && imgWidget.value) {
                const match = imgWidget.value.match(/_(\d+)\.[a-zA-Z0-9]+$/);
                if (match) {
                    const val = parseInt(match[1], 10);
                    if (!isNaN(val)) {
                        nextVersion = Math.max(val + 1, nextVersion);
                    }
                }
            }
            const filename = trixCropFilename(node.id, nextVersion);
            const hqW = origImgObj.naturalWidth;
            const hqH = origImgObj.naturalHeight;
            
            let parentFilterStr = "";
            if (node.inputs) {
                const inImageLink = node.inputs.find(inp => inp.name === "in_image");
                const isWired = inImageLink && inImageLink.link !== null && app.graph && app.graph.links && 
                                app.graph.links[inImageLink.link] && 
                                app.graph.links[inImageLink.link].target_id === node.id && 
                                node.inputs[app.graph.links[inImageLink.link].target_slot] === inImageLink;
                if (isWired) {
                    const linkInfo = app.graph.links[inImageLink.link];
                    if (linkInfo) {
                        const originNode = app.graph.getNodeById(linkInfo.origin_id);
                        if (originNode && originNode.comfyClass === "TrixLoadImageAIO" && originNode.imgTagRef) {
                            parentFilterStr = originNode.imgTagRef.style.filter || "";
                            if (parentFilterStr === "none") parentFilterStr = "";
                        }
                    }
                }
            }

            const scaleRatio = hqW / pW;
            const bakedCvs = bakeLayers(hqW, hqH, parentFilterStr, scaleRatio);
            
            // Create the mask canvas (grayscale)
            const mCvs = document.createElement("canvas");
            mCvs.width = hqW;
            mCvs.height = hqH;
            const mCtx = mCvs.getContext("2d");
            mCtx.fillStyle = "black";
            mCtx.fillRect(0, 0, hqW, hqH);
            
            if (savedMaskCanvas) {
                mCtx.drawImage(savedMaskCanvas, 0, 0, hqW, hqH);
            }

            bakedCvs.toBlob((imgBlob) => {
                if (!imgBlob) {
                    console.error("Failed to create image blob");
                    saveToNodeBtn.disabled = false;
                    saveToNodeBtn.innerText = "Save to Node";
                    return;
                }
                mCvs.toBlob(async (maskBlob) => {
                    if (!maskBlob) {
                        console.error("Failed to create mask blob");
                        saveToNodeBtn.disabled = false;
                        saveToNodeBtn.innerText = "Save to Node";
                        return;
                    }
                    try {
                        const imgFile = new File([imgBlob], filename, { type: "image/png" });
                        const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
                        const body = new FormData();
                        body.append("image", imgFile, filename);
                        body.append("mask", maskFile, "mask.png");
                        body.append("filename", filename);
                        body.append("type", "input");
                        const isAio = node && (node.comfyClass === "TrixLoadImageAIO" || node.type === "TrixLoadImageAIO");
                        body.append("subfolder", isAio ? TRIX_AIO_SUBFOLDER : "");
                        body.append("overwrite", "true");
                        const saveEveryStep = typeof app !== "undefined" && app.ui && app.ui.settings && app.ui.settings.getSettingValue("Trix AIO Tools.Save Steps.SaveEveryStep", false);
                        const saveEveryStepPath = typeof app !== "undefined" && app.ui && app.ui.settings && app.ui.settings.getSettingValue("Trix AIO Tools.Save Steps.SaveEveryStepPath", "input/aio_input");
                        body.append("save_every_step", saveEveryStep ? "true" : "false");
                        body.append("save_every_step_path", saveEveryStepPath);

                        const uploadResp = await fetch("/trix/save_image_with_mask", { method: "POST", body: body });
                        if (uploadResp.status === 200) {
                            const uploadData = await uploadResp.json();
                            const fullPath = uploadData.subfolder ? `${uploadData.subfolder}/${uploadData.name}` : uploadData.name;
                            
                            node._trix_image_version = nextVersion;
                            const imgWidget = node.widgets ? node.widgets.find(w => w && (w.name === "image" || w.name === "image_path")) : null;
                            if (imgWidget) {
                                node._isChangingImage = true;
                                if (imgWidget.options && Array.isArray(imgWidget.options.values) && !imgWidget.options.values.includes(fullPath)) {
                                    imgWidget.options.values.unshift(fullPath);
                                }
                                imgWidget.value = fullPath;
                                if (imgWidget.callback) imgWidget.callback(fullPath);
                            }

                            // Reset all Camera Raw settings on the node since they are now baked into the image
                            for (const key in state) {
                                const w = getW(key);
                                if (w) {
                                    if (key === "cr_pixel_algo") {
                                        w.value = "kmeans";
                                    } else if (key === "cr_sketch_color") {
                                        w.value = "gray";
                                    } else {
                                        w.value = 0;
                                    }
                                }
                            }
                            
                            const crE = getW("cr_enable");
                            if (crE) crE.value = false;
                            if (node._checkboxCREnable) node._checkboxCREnable.checked = false;
                            
                            const wHslData = getW("hsl_data");
                            const wHslActive = getW("hsl_active");
                            if (wHslData) wHslData.value = "{}";
                            if (wHslActive) wHslActive.value = false;
                            
                            const wCurveData = getW("curve_data");
                            const wCurveActive = getW("curve_active");
                            if (wCurveData) wCurveData.value = "{}";
                            if (wCurveActive) wCurveActive.value = false;

                            if (!node.properties) node.properties = {};
                            node.properties.trix_layers = null;
                            node.properties.trix_layers_mode = null;

                            const modeWidget = getW("mode");
                            if (modeWidget) modeWidget.value = "Filter";
                            node._showCameraRawMenu = false; 

                            if (node.syncHTMLRef) node.syncHTMLRef();
                            if (node.updateUIRef) node.updateUIRef();
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                            closeEditor();

                            setTimeout(() => {
                                if (app.graph) {
                                    app.graph._nodes.forEach(n => {
                                        if (typeof n.pullLivePreviewRef === "function") {
                                            n.pullLivePreviewRef();
                                        }
                                    });
                                }
                            }, 150);
                        } else {
                            throw new Error(`Upload failed: ${uploadResp.status}`);
                        }
                    } catch (e) {
                        console.error("Save to Node upload failed", e);
                        alert("Failed to save image to node: " + e);
                        saveToNodeBtn.disabled = false;
                        saveToNodeBtn.innerText = "Save to Node";
                    }
                }, "image/png");
            }, "image/png");
        }, 50);
    };

    actionsWrapper.append(cancelBtn, btnRow);
    btnRow.append(saveDiskBtn, saveToNodeBtn);
    sidebar.appendChild(actionsWrapper);
    mainArea.append(toolbar, workspace);
    overlay.append(layersPanel, mainArea, sidebar);
    document.body.appendChild(overlay);

    const isPotato = app.ui.settings.getSettingValue("Trix AIO Tools. Potato PC Mode.Enabled", false);
    if (isPotato) {
        overlay.classList.add("trix-potato-pc");
    }

    const initCanvas = () => {
        const MAX_PREVIEW_SIZE = useFullRes ? Infinity : (isPotato ? 512 : 1200); 
        pW = origImgObj.naturalWidth;
        pH = origImgObj.naturalHeight;
        if (pW > MAX_PREVIEW_SIZE || pH > MAX_PREVIEW_SIZE) {
            const ratio = Math.min(MAX_PREVIEW_SIZE / pW, MAX_PREVIEW_SIZE / pH);
            pW = Math.round(pW * ratio);
            pH = Math.round(pH * ratio);
        }

        const baseCvs = document.createElement("canvas");
        baseCvs.width = pW; baseCvs.height = pH;
        const bCtx = baseCvs.getContext("2d", { willReadFrequently: true });
        
        let parentFilterStr = "";
        if (node.inputs) {
            const inImageLink = node.inputs.find(inp => inp.name === "in_image");
            const isWired = inImageLink && inImageLink.link !== null && app.graph && app.graph.links && 
                            app.graph.links[inImageLink.link] && 
                            app.graph.links[inImageLink.link].target_id === node.id && 
                            node.inputs[app.graph.links[inImageLink.link].target_slot] === inImageLink;
            if (isWired) {
                const linkInfo = app.graph.links[inImageLink.link];
                if (linkInfo) {
                    const originNode = app.graph.getNodeById(linkInfo.origin_id);
                    if (originNode && originNode.comfyClass === "TrixLoadImageAIO" && originNode.imgTagRef) {
                        parentFilterStr = originNode.imgTagRef.style.filter || "";
                        if (parentFilterStr === "none") parentFilterStr = "";
                    }
                }
            }
        }

        bCtx.filter = parentFilterStr || "none";
        bCtx.drawImage(origImgObj, 0, 0, pW, pH);
        bCtx.filter = "none";

        baseImgData = bCtx.getImageData(0, 0, pW, pH).data;
        
        canvas.width = pW; canvas.height = pH;
        
        updateHslUI();
        updateCurvesUI();
        renderLayersList();

        setTimeout(() => {
            centerImage();
            scheduleRender();
        }, 50);
    };

    let layerCanvas = null;
    let layerCtx = null;
    const getLayerCanvas = (w, h) => {
        if (!layerCanvas) {
            layerCanvas = document.createElement("canvas");
            layerCtx = layerCanvas.getContext("2d", { willReadFrequently: true });
        }
        if (layerCanvas.width !== w || layerCanvas.height !== h) {
            layerCanvas.width = w;
            layerCanvas.height = h;
        }
        return { canvas: layerCanvas, ctx: layerCtx };
    };

    const renderPixels = (renderOriginal = false, fastMode = false) => {
        if (!baseImgData) return;

        if (renderOriginal) {
            const imgData = new ImageData(new Uint8ClampedArray(baseImgData), pW, pH);
            ctx.putImageData(imgData, 0, 0);
            drawWorkspace();
            return;
        }

        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.clearRect(0, 0, pW, pH);

        // In filter mode, start by drawing the base image initially
        if (layersMode === "filter") {
            const imgData = new ImageData(new Uint8ClampedArray(baseImgData), pW, pH);
            ctx.putImageData(imgData, 0, 0);
        }

        let firstVisible = true;
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (!layer.visible) continue;

            const { canvas: lCvs, ctx: lCtx } = getLayerCanvas(pW, pH);
            lCtx.clearRect(0, 0, pW, pH);

            let inputData;
            if (layersMode === "filter") {
                inputData = ctx.getImageData(0, 0, pW, pH).data;
            } else {
                inputData = baseImgData;
            }

            const imgData = new ImageData(pW, pH);
            processPixels(inputData, imgData.data, pW, pH, layer.state, layer.hslState, layer.curvesState);
            lCtx.putImageData(imgData, 0, 0);
            applySpatialStages(lCtx, pW, pH, layer.state, 1);

            ctx.globalAlpha = layer.opacity / 100;
            if (firstVisible && layersMode === "image") {
                ctx.globalCompositeOperation = "source-over";
                firstVisible = false;
            } else {
                ctx.globalCompositeOperation = layer.blendMode || "source-over";
            }
            ctx.drawImage(lCvs, 0, 0);
        }
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = "source-over";

        drawWorkspace();
    };

    function scheduleRender() {
        if (renderPending) return;
        renderPending = true;
        requestAnimationFrame(() => {
            renderPending = false;
            renderPixels(false, false);
        });
    }

    let isDrawingRAF = false;
    const requestDrawWorkspace = () => {
        if (!isDrawingRAF) {
            isDrawingRAF = true;
            requestAnimationFrame(() => {
                drawWorkspace();
                isDrawingRAF = false;
            });
        }
    };

    const onWheel = (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = workspace.getBoundingClientRect();
        const mx = e.clientX - rect.left; 
        const my = e.clientY - rect.top;
        const oldZoom = camera.zoom;
        camera.zoom *= zoomDelta;
        camera.zoom = Math.max(0.05, Math.min(camera.zoom, 10));
        camera.x = mx - (mx - camera.x) * (camera.zoom / oldZoom);
        camera.y = my - (my - camera.y) * (camera.zoom / oldZoom);
        requestDrawWorkspace();
    };
    workspace.addEventListener("wheel", onWheel, { signal: abortCtrl.signal });

    workspace.addEventListener("mousedown", (e) => {
        if (curvesFingerActive && (e.button === 0 || e.button === 2)) {
            e.preventDefault();
            e.stopPropagation();
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);
            
            if (x >= 0 && x < pW && y >= 0 && y < pH) {
                const pIdx = (y * pW + x) * 4;
                const r = baseImgData[pIdx];
                const g = baseImgData[pIdx+1];
                const b = baseImgData[pIdx+2];
                
                let sampleVal = 0;
                const channel = curvesState.activeChannel;
                if (channel === "r") {
                    sampleVal = r;
                } else if (channel === "g") {
                    sampleVal = g;
                } else if (channel === "b") {
                    sampleVal = b;
                } else { // rgb
                    sampleVal = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                }
                sampleVal = Math.max(0, Math.min(255, sampleVal));

                const points = getActiveCurvePoints();
                let pointIdx = points.findIndex(pt => Math.abs(pt.x - sampleVal) <= 6);
                if (pointIdx === -1) {
                    const lut = buildCurveLut(points);
                    const currentY = lut[sampleVal];
                    points.push({ x: sampleVal, y: currentY });
                    points.sort((a, b) => a.x - b.x);
                    setActiveCurvePoints(points);
                    pointIdx = points.findIndex(pt => pt.x === sampleVal);
                }
                
                curvesFingerPointIdx = pointIdx;
                curvesFingerStartValY = points[pointIdx].y;
                dragStartTargetY = e.clientY;
                curvesDragging = true;
            }
            return;
        }

        if (hslFingerActive && e.button === 0) {
            hslDragging = true;
            dragStartTargetX = e.clientX;
            
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = Math.floor((e.clientX - rect.left) * scaleX);
            const y = Math.floor((e.clientY - rect.top) * scaleY);
            
            if (x >= 0 && x < pW && y >= 0 && y < pH) {
                // Average 5x5 neighborhood to cancel high-frequency single-pixel noise
                let sumR = 0, sumG = 0, sumB = 0, count = 0;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < pW && ny >= 0 && ny < pH) {
                            const pIdx = (ny * pW + nx) * 4;
                            sumR += baseImgData[pIdx];
                            sumG += baseImgData[pIdx+1];
                            sumB += baseImgData[pIdx+2];
                            count++;
                        }
                    }
                }
                const avgR = sumR / count;
                const avgG = sumG / count;
                const avgB = sumB / count;
                const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
                
                let minDiff = 360;
                let closestCh = 'master';
                if (!hslState.colorize) {
                    // Smart safety guard: if selected area is neutral/gray (saturation < 8%),
                    // fall back to Master channel instead of targeting arbitrary noisy hue sectors.
                    if (s < 0.08) {
                        closestCh = 'master';
                    } else {
                        const channels = ['reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas'];
                        for (let ch of channels) {
                            let center = hslState[ch].center;
                            let diff = Math.abs(h - center);
                            if (diff > 180) diff = 360 - diff;
                            if (diff < minDiff) { minDiff = diff; closestCh = ch; }
                        }
                    }
                    hslState.activeChannel = closestCh;
                    updateHslUI();
                }
            }
            dragStartSat = hslState[hslState.activeChannel].s;
            return;
        }

        if (e.button === 0 || e.button === 1 || e.button === 2) {
            isPanning = true; startMx = e.clientX; startMy = e.clientY;
        }
    }, { signal: abortCtrl.signal });

    workspace.addEventListener("mousemove", (e) => {
        if (curvesDragging && curvesFingerPointIdx >= 0) {
            let dy = e.clientY - dragStartTargetY;
            let newY = curvesFingerStartValY - Math.round(dy / 1.5);
            newY = Math.max(0, Math.min(255, newY));
            
            const points = getActiveCurvePoints();
            if (curvesFingerPointIdx < points.length) {
                points[curvesFingerPointIdx].y = newY;
                setActiveCurvePoints(points);
                updateCurvesUI();
                scheduleRender();
            }
            return;
        }

        if (hslDragging) {
            let dx = e.clientX - dragStartTargetX;
            let newSat = dragStartSat + Math.round(dx / 2);
            newSat = Math.max(-100, Math.min(100, newSat));
            hslState[hslState.activeChannel].s = newSat;
            updateHslUI();
            scheduleRender();
            return;
        }

        if (isPanning) {
            camera.x += e.clientX - startMx; camera.y += e.clientY - startMy;
            startMx = e.clientX; startMy = e.clientY;
            requestDrawWorkspace();
        }
    }, { signal: abortCtrl.signal });

    const onMouseUp = () => { 
        isPanning = false; 
        if (hslDragging) {
            hslDragging = false;
            pushCrHistory();
        }
        if (curvesDragging) {
            curvesDragging = false;
            curvesFingerPointIdx = -1;
            pushCrHistory();
        }
    };
    const onResize = () => {
        const currentW = workspace.clientWidth || 0;
        const currentH = workspace.clientHeight || 0;
        if (lastWorkspaceW && lastWorkspaceH) {
            const dw = currentW - lastWorkspaceW;
            const dh = currentH - lastWorkspaceH;
            camera.x += dw / 2;
            camera.y += dh / 2;
        }
        lastWorkspaceW = currentW;
        lastWorkspaceH = currentH;
        drawWorkspace();
    };
    
    window.addEventListener("mouseup", onMouseUp, { signal: abortCtrl.signal });
    window.addEventListener("resize", onResize, { signal: abortCtrl.signal });

    const onKeyDown = (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            closeEditor();
        }
    };
    window.addEventListener("keydown", onKeyDown, { signal: abortCtrl.signal });

        setTimeout(() => {
            if (origImgObj.complete) { initCanvas(); } 
            else { origImgObj.onload = initCanvas; }
        }, 10);
    } catch (err) {
        alert("Error opening Live Camera Raw: " + err + "\nStack: " + err.stack);
        console.error(err);
    }
}

export function processPixels(srcData, targetData, w, h, crState, hState, cState) {
    const offset = crState.cr_offset || 0;
    const exp = crState.cr_exp || 0;
    const cont = crState.cr_cont || 0;
    const high = crState.cr_high || 0;
    const shad = crState.cr_shad || 0;
    const white = crState.cr_white || 0;
    const black = crState.cr_black || 0;
    const temp = crState.cr_temp || 0;
    const tint = crState.cr_tint || 0;
    const vibrance = crState.cr_vibrance !== undefined && crState.cr_vibrance !== null ? crState.cr_vibrance : (crState.cr_colorfulness || 0);
    const sat = crState.cr_sat || 0;
    const dehz = crState.cr_dehz || 0;
    const grain = crState.cr_grain || 0;
    const vignette = crState.cr_vignette || 0;
    // New filter state reads
    const cfDensity = (crState.cr_cf_density || 0) / 255;
    const cfHue = crState.cr_cf_hue || 0;
    const cfPreserve = (crState.cr_cf_preserve !== undefined && crState.cr_cf_preserve !== null ? crState.cr_cf_preserve : 50) / 100;
    const hasCf = cfDensity > 0;
    const lvlCh = crState.cr_lvl_channel || 'rgb';
    const lvlInBlack = (crState.cr_lvl_in_black || 0) / 255;
    const lvlInWhite = (crState.cr_lvl_in_white !== undefined && crState.cr_lvl_in_white !== null ? crState.cr_lvl_in_white : 255) / 255;
    const lvlGamma = crState.cr_lvl_gamma !== undefined && crState.cr_lvl_gamma !== null ? crState.cr_lvl_gamma : 1.0;
    const lvlOutBlack = (crState.cr_lvl_out_black || 0) / 255;
    const lvlOutWhite = (crState.cr_lvl_out_white !== undefined && crState.cr_lvl_out_white !== null ? crState.cr_lvl_out_white : 255) / 255;
    const hasLevels = lvlInBlack !== 0 || lvlInWhite !== 1 || lvlGamma !== 1.0 || lvlOutBlack !== 0 || lvlOutWhite !== 1;
    const cbShadR = (crState.cr_cb_shad_r || 0) / 100;
    const cbShadG = (crState.cr_cb_shad_g || 0) / 100;
    const cbShadB = (crState.cr_cb_shad_b || 0) / 100;
    const cbMidR = (crState.cr_cb_mid_r || 0) / 100;
    const cbMidG = (crState.cr_cb_mid_g || 0) / 100;
    const cbMidB = (crState.cr_cb_mid_b || 0) / 100;
    const cbHighR = (crState.cr_cb_high_r || 0) / 100;
    const cbHighG = (crState.cr_cb_high_g || 0) / 100;
    const cbHighB = (crState.cr_cb_high_b || 0) / 100;
    const hasCb = cbShadR||cbShadG||cbShadB||cbMidR||cbMidG||cbMidB||cbHighR||cbHighG||cbHighB;
    const postEnable = !!crState.cr_post_enable;
    const postLevels = crState.cr_post_levels !== undefined ? crState.cr_post_levels : 4;
    const postMode = String(crState.cr_post_mode || 'RGB').toLowerCase();
    const postDitherMode = String(crState.cr_post_dither_mode || 'None').toLowerCase();
    const postDither = (crState.cr_post_dither || 0) / 100;
    const hasPostPixel = postEnable && postLevels >= 2 && !postDitherMode.includes('floyd') && !postDitherMode.includes('atkinson');

    const lvlRange = Math.max(0.00001, lvlInWhite - lvlInBlack);
    const lvlGammaInv = lvlGamma !== 1.0 ? 1.0 / lvlGamma : 1.0;
    const lvlOutRange = lvlOutWhite - lvlOutBlack;
    const applyLevelsFloat = (v) => {
        let t = (v - lvlInBlack) / lvlRange;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        if (lvlGamma !== 1.0) t = Math.pow(t, lvlGammaInv);
        return lvlOutBlack + t * lvlOutRange;
    };
    // Precompute color filter hue -> RGB tint
    let cfTintR = 1, cfTintG = 1, cfTintB = 1;
    if (hasCf) {
        const h6 = cfHue / 60, ii = Math.floor(h6), f = h6 - ii;
        const p = 0, q = 1 - f, t = f;
        switch (((ii % 6) + 6) % 6) {
            case 0: cfTintR=1; cfTintG=t; cfTintB=p; break; case 1: cfTintR=q; cfTintG=1; cfTintB=p; break;
            case 2: cfTintR=p; cfTintG=1; cfTintB=t; break; case 3: cfTintR=p; cfTintG=q; cfTintB=1; break;
            case 4: cfTintR=t; cfTintG=p; cfTintB=1; break; default: cfTintR=1; cfTintG=p; cfTintB=q;
        }
    }
    // Posterize Bayer matrix (simple 4x4 for per-pixel dither)
    const CR_BAYER4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];

    const hasHsl = hState.colorize || ['master', 'reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas'].some(ch => {
        const conf = hState[ch] || {};
        return conf.h !== 0 || conf.s !== 0 || conf.l !== 0;
    });
    const activeHslChannels = [];
    if (hasHsl && !hState.colorize) {
        const channels = ['reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas'];
        for (let ch of channels) {
            const conf = hState[ch] || { h: 0, s: 0, l: 0, center: 0, width: 60 };
            if (conf.h !== 0 || conf.s !== 0 || conf.l !== 0) {
                activeHslChannels.push({
                    center: Number.isFinite(conf.center) ? conf.center : 0,
                    width: Number.isFinite(conf.width) ? conf.width : 60,
                    h: conf.h,
                    s: conf.s,
                    l: conf.l
                });
            }
        }
    }
    const curveState = ensureCurveState(cState);
    const hasCurve = curveHasAdjustments(curveState);
    const curveRgbLut = hasCurve ? buildCurveLut(curveState.rgb) : null;
    const curveRLut = hasCurve ? buildCurveLut(curveState.r) : null;
    const curveGLut = hasCurve ? buildCurveLut(curveState.g) : null;
    const curveBLut = hasCurve ? buildCurveLut(curveState.b) : null;

    const getHueWeight = (hh, center, width) => {
        let diff = Math.abs(hh - center);
        if (diff > 180) diff = 360 - diff;
        const half = Math.max(5, width / 2);
        const falloff = Math.max(30, half * 1.0); // Broadened and softened falloff
        if (diff <= half) return 1;
        if (diff <= half + falloff) {
            const t = (diff - half) / falloff;
            return 0.5 * (1 + Math.cos(Math.PI * t));
        }
        return 0;
    };

    const smoothstep = (edge0, edge1, x) => {
        const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
        return t * t * (3.0 - 2.0 * t);
    };

    for (let i = 0; i < srcData.length; i += 4) {
        let r = srcData[i] / 255.0;
        let g = srcData[i+1] / 255.0;
        let b = srcData[i+2] / 255.0;

        // Temperature & Tint: Luminance-preserving color balance
        // Instead of multiplying channels (which clips highlights and creates fake saturation),
        // we shift the color deviation from the luminance axis.
        if (temp !== 0 || tint !== 0) {
            const lum = r * 0.299 + g * 0.587 + b * 0.114;
            // Color deviations from gray
            let dr = r - lum;
            let dg = g - lum;
            let db = b - lum;

            if (temp !== 0) {
                const t = temp / 100.0;
                // Warm: push red deviation up, blue down. Cool: opposite.
                dr += t * 0.05;
                db -= t * 0.05;
            }
            if (tint !== 0) {
                const t = tint / 100.0;
                // Positive tint: push magenta (reduce green, add red+blue)
                dg -= t * 0.04;
                dr += t * 0.02;
                db += t * 0.02;
            }

            r = lum + dr;
            g = lum + dg;
            b = lum + db;
        }

        r = Math.max(0, Math.min(1, r));
        g = Math.max(0, Math.min(1, g));
        b = Math.max(0, Math.min(1, b));

        let luma = r * 0.299 + g * 0.587 + b * 0.114;

        if (offset !== 0) {
            r += offset / 100.0;
            g += offset / 100.0;
            b += offset / 100.0;
        }

        if (exp !== 0) {
            const mult = Math.pow(2.0, exp / 100.0);
            r *= mult; g *= mult; b *= mult;
            luma *= mult;
        }

        if (shad !== 0) {
            const shad_v = shad / 100.0;
            const shad_mask = 1.0 - smoothstep(0.0, 0.65, luma);
            if (shad_v > 0) {
                r += (1.0 - r) * shad_mask * shad_v * 0.75;
                g += (1.0 - g) * shad_mask * shad_v * 0.75;
                b += (1.0 - b) * shad_mask * shad_v * 0.75;
            } else {
                r += r * shad_mask * shad_v * 0.75;
                g += g * shad_mask * shad_v * 0.75;
                b += b * shad_mask * shad_v * 0.75;
            }
        }

        if (high !== 0) {
            const high_v = high / 100.0;
            const high_mask = smoothstep(0.3, 1.0, luma);
            const boost = high_mask * high_v * 0.8;
            let luma_new;
            if (high_v > 0) {
                luma_new = luma + (1.0 - luma) * boost;
            } else {
                luma_new = luma + luma * boost;
            }
            const ratio = luma_new / Math.max(1e-5, luma);
            r *= ratio; g *= ratio; b *= ratio;
            luma = luma_new;
        }

        if (white !== 0) {
            const white_v = white / 100.0;
            const white_mask = smoothstep(0.45, 1.0, luma);
            const boost = white_mask * white_v * 1.2;
            let luma_new;
            if (white_v > 0) {
                luma_new = luma + (1.0 - luma) * boost;
            } else {
                luma_new = luma + luma * boost;
            }
            const ratio = luma_new / Math.max(1e-5, luma);
            r *= ratio; g *= ratio; b *= ratio;
            luma = luma_new;
        }

        if (black !== 0) {
            const black_v = black / 100.0;
            const black_mask = 1.0 - smoothstep(0.0, 0.35, luma);
            if (black_v > 0) {
                r += (1.0 - r) * black_mask * black_v * 0.8;
                g += (1.0 - g) * black_mask * black_v * 0.8;
                b += (1.0 - b) * black_mask * black_v * 0.8;
            } else {
                r += r * black_mask * black_v * 0.8;
                g += g * black_mask * black_v * 0.8;
                b += b * black_mask * black_v * 0.8;
            }
        }

                if (cont !== 0) {
            const f = 1.0 + cont / 100.0;
            r = (r - 0.5) * f + 0.5;
            g = (g - 0.5) * f + 0.5;
            b = (b - 0.5) * f + 0.5;
        }

        // Clamp after basic adjustments to keep [0, 1] range before HSL conversions
        r = Math.max(0, Math.min(1, r));
        g = Math.max(0, Math.min(1, g));
        b = Math.max(0, Math.min(1, b));

        if (sat !== 0) {
            // Chroma-based saturation: scale deviation from luminance
            // This avoids HSL's broken denominator for high-lightness pixels
            const luma_s = r * 0.299 + g * 0.587 + b * 0.114;
            const sat_val = sat / 100.0;
            let factor;
            if (sat_val > 0) {
                factor = 1.0 + sat_val * 1.5;
            } else {
                factor = 1.0 + sat_val; // linear desaturation
            }
            r = luma_s + (r - luma_s) * factor;
            g = luma_s + (g - luma_s) * factor;
            b = luma_s + (b - luma_s) * factor;
            // Clamp after saturation
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
        }

        if (vibrance !== 0) {
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
            const luma_c = r * 0.299 + g * 0.587 + b * 0.114;
            const max_c = Math.max(r, g, b);
            const min_c = Math.min(r, g, b);
            const sat_mask = Math.max(0, Math.min(1, 1.0 - (max_c - min_c)));
            const adj = (vibrance / 100.0) * sat_mask;
            r = r + (r - luma_c) * adj;
            g = g + (g - luma_c) * adj;
            b = b + (b - luma_c) * adj;
            // Clamp after vibrance
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
        }

        if (dehz !== 0) {
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
            const dehz_v = dehz / 150.0;
            const luma_d = r * 0.299 + g * 0.587 + b * 0.114;
            const max_c = Math.max(r, g, b);
            const min_c = Math.min(r, g, b);
            const haze = Math.max(0.0, Math.min(1.0, 1.0 - (max_c - min_c) * 2.0));
            const mid = 1.0 - Math.max(0.0, Math.min(1.0, Math.abs(luma_d - 0.5) * 2.0));
            const weight = Math.max(0.0, Math.min(1.0, 0.35 + 0.65 * haze * mid));

            if (dehz_v > 0) {
                const contrast = 1.0 + dehz_v * 0.9 * weight;
                r = (r - 0.5) * contrast + 0.5;
                g = (g - 0.5) * contrast + 0.5;
                b = (b - 0.5) * contrast + 0.5;
                const neutral = (r + g + b) / 3.0;
                const sat_boost = dehz_v * 0.18 * weight;
                r += (r - neutral) * sat_boost;
                g += (g - neutral) * sat_boost;
                b += (b - neutral) * sat_boost;
            } else {
                const soften = (-dehz_v) * 0.45 * weight;
                r = (r - 0.5) * (1.0 - soften) + 0.5;
                g = (g - 0.5) * (1.0 - soften) + 0.5;
                b = (b - 0.5) * (1.0 - soften) + 0.5;
            }
            // Clamp after dehaze
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
        }

        if (vignette > 0) {
            const px = (i / 4) % w;
            const py = Math.floor((i / 4) / w);
            const cx = w / 2;
            const cy = h / 2;
            const radius = Math.sqrt((px - cx)**2 + (py - cy)**2);
            const max_radius = Math.sqrt(cx**2 + cy**2);
            const vig_mask = Math.max(0, Math.min(1, 1.0 - (radius / max_radius - 0.3) * (vignette / 50.0)));
            r *= vig_mask; g *= vig_mask; b *= vig_mask;
        }

        if (grain > 0) {
            const noise = (Math.random() - 0.5) * 2.0 * (grain / 200.0);
            r += noise; g += noise; b += noise;
        }

        r = Math.max(0, Math.min(1, r));
        g = Math.max(0, Math.min(1, g));
        b = Math.max(0, Math.min(1, b));

        if (hasHsl) {
            let [hh, ss, ll] = rgbToHslFloat(r, g, b);
            
            if (hState.colorize) {
                hh = hState.master.h;
                if (hh < 0) hh += 360;
                ss = Math.max(0, Math.min(1, 0.5 + (hState.master.s / 100)));
                ll = applyLightnessLikePhotoshop(ll, hState.master.l / 100);
                [r, g, b] = hslToRgb(hh, ss, ll);
                r /= 255; g /= 255; b /= 255;
            } else {
                // Accumulate hue shift and lightness shift in HSL space
                let totalHShift = hState.master.h;
                let totalLShift = hState.master.l / 100;
                // Accumulate saturation as a chroma multiplier (not HSL saturation)
                let totalChromaMult = 1.0 + (hState.master.s / 100) * 1.2;

                const numActive = activeHslChannels.length;
                for (let idx = 0; idx < numActive; idx++) {
                    const chInfo = activeHslChannels[idx];
                    let weight = getHueWeight(hh, chInfo.center, chInfo.width);
                    if (weight > 0) {
                        totalHShift += chInfo.h * weight;
                        totalChromaMult += (chInfo.s / 100) * 1.2 * weight;
                        totalLShift += (chInfo.l / 100) * weight;
                    }
                }

                // Apply hue shift in HSL
                let newH = (hh + totalHShift) % 360;
                if (newH < 0) newH += 360;

                // Convert back with original saturation (only hue changed here)
                [r, g, b] = hslToRgb(newH, ss, ll);
                r /= 255; g /= 255; b /= 255;

                // Apply saturation as chroma scaling (safe for near-white pixels)
                if (totalChromaMult !== 1.0) {
                    const lum_sat = r * 0.299 + g * 0.587 + b * 0.114;
                    const chromaMult = Math.max(0, totalChromaMult);
                    r = lum_sat + (r - lum_sat) * chromaMult;
                    g = lum_sat + (g - lum_sat) * chromaMult;
                    b = lum_sat + (b - lum_sat) * chromaMult;
                }

                // Apply lightness as smooth linear-RGB blend (Photoshop-style):
                // - positive shift → blend toward white (r=1, g=1, b=1)
                // - negative shift → blend toward black (r=0, g=0, b=0)
                // This avoids HSL re-quantization pixelation entirely.
                if (Math.abs(totalLShift) > 0.0001) {
                    const ls = Math.max(-1, Math.min(1, totalLShift));
                    if (ls > 0) {
                        r = r + (1 - r) * ls;
                        g = g + (1 - g) * ls;
                        b = b + (1 - b) * ls;
                    } else {
                        const abs_ls = -ls;
                        r = r - r * abs_ls;
                        g = g - g * abs_ls;
                        b = b - b * abs_ls;
                    }
                }
            }

            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));
        }

        if (hasCurve) {
            const applyLutFloat = (val, lut) => {
                const f = val * 255;
                const i0 = Math.floor(f);
                const i1 = Math.min(255, i0 + 1);
                const frac = f - i0;
                return (lut[i0] * (1 - frac) + lut[i1] * frac) / 255;
            };

            r = applyLutFloat(r, curveRgbLut);
            g = applyLutFloat(g, curveRgbLut);
            b = applyLutFloat(b, curveRgbLut);

            r = applyLutFloat(r, curveRLut);
            g = applyLutFloat(g, curveGLut);
            b = applyLutFloat(b, curveBLut);
        }

        // --- Color Balance ---
        if (hasCb) {
            const lum_cb = r * 0.299 + g * 0.587 + b * 0.114;
            const shadowW = Math.max(0, 1 - lum_cb * 2);
            const highlightW = Math.max(0, lum_cb * 2 - 1);
            const midW = Math.max(0, 1.0 - 2.0 * Math.abs(lum_cb - 0.5));
            r = Math.max(0, Math.min(1, r + cbShadR * shadowW + cbMidR * midW + cbHighR * highlightW));
            g = Math.max(0, Math.min(1, g + cbShadG * shadowW + cbMidG * midW + cbHighG * highlightW));
            b = Math.max(0, Math.min(1, b + cbShadB * shadowW + cbMidB * midW + cbHighB * highlightW));
        }

        // --- Color Filter ---
        if (hasCf) {
            const lum_cf = r * 0.299 + g * 0.587 + b * 0.114;
            let hlightMask = 1.0;
            if (cfPreserve > 0) hlightMask = 1.0 - Math.max(0, (lum_cf - (1 - cfPreserve)) / cfPreserve);
            const blend = cfDensity * hlightMask;
            r = Math.max(0, Math.min(1, r * (1 - blend) + cfTintR * blend));
            g = Math.max(0, Math.min(1, g * (1 - blend) + cfTintG * blend));
            b = Math.max(0, Math.min(1, b * (1 - blend) + cfTintB * blend));
        }

        // --- Levels (Float-optimized) ---
        if (hasLevels) {
            if (lvlCh === 'rgb') {
                r = applyLevelsFloat(r);
                g = applyLevelsFloat(g);
                b = applyLevelsFloat(b);
            } else if (lvlCh === 'r') {
                r = applyLevelsFloat(r);
            } else if (lvlCh === 'g') {
                g = applyLevelsFloat(g);
            } else if (lvlCh === 'b') {
                b = applyLevelsFloat(b);
            }
        }

        // --- Posterize (Pixel-by-pixel modes: None, Bayer, Random) ---
        if (hasPostPixel) {
            const step = postLevels - 1;
            const px = (i / 4) % w, py = Math.floor((i / 4) / w);
            let bVal = 0;
            if (postDitherMode === 'bayer' && postDither > 0) {
                bVal = (CR_BAYER4[py & 3][px & 3] / 16 - 0.5) * postDither / step;
            } else if (postDitherMode === 'random' && postDither > 0) {
                const seed = (Math.abs((px | 0) * 12.9898 + (py | 0) * 78.233)) % 1;
                bVal = (seed - 0.5) * postDither / step;
            }
            const quantize = (v) => Math.max(0, Math.min(1, Math.round((v + bVal) * step) / step));
            if (postMode === 'luminance') {
                const lum_p = r * 0.299 + g * 0.587 + b * 0.114;
                const lumQ = quantize(lum_p);
                const ratio = lum_p > 1e-4 ? lumQ / (lum_p + 1e-8) : 1;
                r = Math.max(0, Math.min(1, r * ratio));
                g = Math.max(0, Math.min(1, g * ratio));
                b = Math.max(0, Math.min(1, b * ratio));
            } else {
                r = quantize(r); g = quantize(g); b = quantize(b);
            }
        }

        targetData[i] = r * 255;
        targetData[i+1] = g * 255;
        targetData[i+2] = b * 255;
        targetData[i+3] = srcData[i+3];
    }
}

let cachedBlurCanvas = null;
let cachedBlurCtx = null;

export function getBlurCtx(w, h) {
    if (w > 1600 || h > 1600) {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        return { canvas: c, ctx: c.getContext("2d") };
    }
    if (!cachedBlurCanvas) {
        cachedBlurCanvas = document.createElement("canvas");
        cachedBlurCtx = cachedBlurCanvas.getContext("2d");
    }
    if (cachedBlurCanvas.width !== w || cachedBlurCanvas.height !== h) {
        cachedBlurCanvas.width = w;
        cachedBlurCanvas.height = h;
    }
    return { canvas: cachedBlurCanvas, ctx: cachedBlurCtx };
}

export function applyDetailBlend(targetCtx, w, h, radius, amount, midtoneOnly = false) {
    if (!amount) return;
    const base = targetCtx.getImageData(0, 0, w, h);
    const baseData = base.data;

    const { canvas: blurCanvas, ctx: blurCtx } = getBlurCtx(w, h);
    blurCtx.filter = `blur(${Math.max(0.1, radius)}px)`;
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.drawImage(targetCtx.canvas, 0, 0);
    const blurData = blurCtx.getImageData(0, 0, w, h).data;

    const len = baseData.length;
    for (let i = 0; i < len; i += 4) {
        const r0 = baseData[i] / 255.0;
        const g0 = baseData[i + 1] / 255.0;
        const b0 = baseData[i + 2] / 255.0;
        
        let mask = 1.0;
        if (midtoneOnly) {
            const l = r0 * 0.2126 + g0 * 0.7152 + b0 * 0.0722;
            mask = 1.0 - Math.max(0, Math.min(1, Math.abs(l - 0.5) * 2.0));
            mask = Math.pow(mask, 1.25);
        }

        const br = blurData[i] / 255.0;
        const bg = blurData[i+1] / 255.0;
        const bb = blurData[i+2] / 255.0;

        let nr, ng, nb;
        if (amount < 0) {
            const blend_factor = Math.min(0.8, -amount) * mask;
            nr = r0 + (br - r0) * blend_factor;
            ng = g0 + (bg - g0) * blend_factor;
            nb = b0 + (bb - b0) * blend_factor;
        } else {
            const blend_factor = amount * mask;
            nr = r0 + (r0 - br) * blend_factor;
            ng = g0 + (g0 - bg) * blend_factor;
            nb = b0 + (b0 - bb) * blend_factor;
        }

        baseData[i] = Math.max(0, Math.min(255, Math.round(nr * 255)));
        baseData[i + 1] = Math.max(0, Math.min(255, Math.round(ng * 255)));
        baseData[i + 2] = Math.max(0, Math.min(255, Math.round(nb * 255)));
    }

    targetCtx.putImageData(base, 0, 0);
}

export function applyClarity(targetCtx, w, h, amount, scale = 1) {
    if (!amount) return;
    const base = targetCtx.getImageData(0, 0, w, h);
    const baseData = base.data;

    const { canvas: blurCanvas, ctx: blurCtx } = getBlurCtx(w, h);
    blurCtx.filter = `blur(${Math.max(0.1, 20.0 * scale)}px)`;
    blurCtx.clearRect(0, 0, w, h);
    blurCtx.drawImage(targetCtx.canvas, 0, 0);
    const blurData = blurCtx.getImageData(0, 0, w, h).data;

    const len = baseData.length;
    const factor = amount / 200.0;

    for (let i = 0; i < len; i += 4) {
        const r = baseData[i] / 255.0;
        const g = baseData[i+1] / 255.0;
        const b = baseData[i+2] / 255.0;

        const br = blurData[i] / 255.0;
        const bg = blurData[i+1] / 255.0;
        const bb = blurData[i+2] / 255.0;

        const luma = r * 0.299 + g * 0.587 + b * 0.114;
        const weight = 1.0 - Math.pow(Math.abs(luma - 0.5) * 2.0, 2.0);

        let nr, ng, nb;
        if (factor > 0) {
            const term = factor * weight * 0.8;
            nr = r + (r - br) * term;
            ng = g + (g - bg) * term;
            nb = b + (b - bb) * term;
        } else {
            const term = (-factor) * weight * 0.8;
            nr = r + (br - r) * term;
            ng = g + (bg - g) * term;
            nb = b + (bb - b) * term;
        }

        baseData[i] = Math.max(0, Math.min(255, Math.round(nr * 255)));
        baseData[i+1] = Math.max(0, Math.min(255, Math.round(ng * 255)));
        baseData[i+2] = Math.max(0, Math.min(255, Math.round(nb * 255)));
    }

    targetCtx.putImageData(base, 0, 0);
}

export function applyBilateralFilter(targetCtx, w, h, d, sigmaColor, sigmaSpace) {
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imgData.data);
    const dst = imgData.data;
    const half = Math.floor(d / 2);

    const spaceWeights = new Float32Array(d * d);
    for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
            const dist2 = dx * dx + dy * dy;
            spaceWeights[(dy + half) * d + (dx + half)] = Math.exp(-dist2 / (2 * sigmaSpace * sigmaSpace));
        }
    }

    const twoSigmaColor2 = 2 * sigmaColor * sigmaColor;
    
    // Precompute color weights for all possible squared color differences in [0, 195075]
    const maxColorDist = 3 * 255 * 255;
    const colorWeights = new Float32Array(maxColorDist + 1);
    for (let i = 0; i <= maxColorDist; i++) {
        colorWeights[i] = Math.exp(-i / twoSigmaColor2);
    }

    for (let y = 0; y < h; y++) {
        const y_w = y * w;
        for (let x = 0; x < w; x++) {
            const idx = (y_w + x) * 4;
            const r = src[idx];
            const g = src[idx + 1];
            const b = src[idx + 2];

            let sumR = 0, sumG = 0, sumB = 0, sumW = 0;

            for (let dy = -half; dy <= half; dy++) {
                const ny = Math.max(0, Math.min(h - 1, y + dy));
                const ny_w = ny * w;
                for (let dx = -half; dx <= half; dx++) {
                    const nx = Math.max(0, Math.min(w - 1, x + dx));
                    const nidx = (ny_w + nx) * 4;
                    const nr = src[nidx];
                    const ng = src[nidx + 1];
                    const nb = src[nidx + 2];

                    const dr = r - nr;
                    const dg = g - ng;
                    const db = b - nb;
                    const distColor2 = dr * dr + dg * dg + db * db;

                    const wSpace = spaceWeights[(dy + half) * d + (dx + half)];
                    const wColor = colorWeights[distColor2];
                    const weight = wSpace * wColor;

                    sumR += nr * weight;
                    sumG += ng * weight;
                    sumB += nb * weight;
                    sumW += weight;
                }
            }

            if (sumW > 0) {
                dst[idx] = sumR / sumW;
                dst[idx + 1] = sumG / sumW;
                dst[idx + 2] = sumB / sumW;
            }
        }
    }
    targetCtx.putImageData(imgData, 0, 0);
}

export function applyErosion(targetCtx, w, h, level) {
    if (level <= 0 || level > 9) return;
    const imgData = targetCtx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imgData.data);
    const dst = imgData.data;

    let radius = 1;
    let isCross = false;
    if (level === 1) { radius = 1; isCross = true; }
    else if (level === 2) { radius = 1; isCross = false; }
    else if (level === 3) { radius = 2; isCross = true; }
    else if (level === 4) { radius = 2; isCross = false; }
    else if (level === 5) { radius = 3; isCross = false; }
    else if (level === 6) { radius = 4; isCross = false; }
    else if (level === 7) { radius = 5; isCross = false; }
    else if (level === 8) { radius = 6; isCross = false; }
    else if (level === 9) { radius = 7; isCross = false; }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            let minR = 255, minG = 255, minB = 255;

            for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= h) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= w) continue;
                    
                    if (isCross) {
                        if (Math.abs(dx) + Math.abs(dy) > radius) continue;
                    }

                    const nidx = (ny * w + nx) * 4;
                    if (src[nidx] < minR) minR = src[nidx];
                    if (src[nidx+1] < minG) minG = src[nidx+1];
                    if (src[nidx+2] < minB) minB = src[nidx+2];
                }
            }

            dst[idx] = minR;
            dst[idx+1] = minG;
            dst[idx+2] = minB;
        }
    }
    targetCtx.putImageData(imgData, 0, 0);
}

export function generateFixedPalette(k_colors) {
    const steps = Math.max(2, Math.floor(Math.cbrt(k_colors)));
    const palette = [];
    for (let r = 0; r < steps; r++) {
        const vr = r / (steps - 1);
        for (let g = 0; g < steps; g++) {
            const vg = g / (steps - 1);
            for (let b = 0; b < steps; b++) {
                const vb = b / (steps - 1);
                palette.push([vr, vg, vb]);
            }
        }
    }
    if (palette.length < 2) {
        return [[0,0,0], [1,1,1]];
    }
    return palette;
}

export function kMeansClustering(pixels, k, maxIterations = 20) {
    const n = pixels.length;
    if (n <= k) return { centroids: pixels, labels: new Int32Array(pixels.keys()) };

    let centroids = [];
    const step = Math.floor(n / k) || 1;
    for (let i = 0; i < k; i++) {
        centroids.push([...pixels[Math.min(n - 1, i * step)]]);
    }

    let labels = new Int32Array(n);
    let changed = true;
    let iter = 0;

    while (changed && iter < maxIterations) {
        changed = false;
        iter++;

        for (let i = 0; i < n; i++) {
            const p = pixels[i];
            let minDist = Infinity;
            let bestLabel = 0;
            for (let j = 0; j < k; j++) {
                const c = centroids[j];
                const dr = p[0] - c[0];
                const dg = p[1] - c[1];
                const db = p[2] - c[2];
                const dist2 = dr*dr + dg*dg + db*db;
                if (dist2 < minDist) {
                    minDist = dist2;
                    bestLabel = j;
                }
            }
            if (labels[i] !== bestLabel) {
                labels[i] = bestLabel;
                changed = true;
            }
        }

        if (!changed) break;

        const newCentroids = Array.from({ length: k }, () => [0, 0, 0]);
        const counts = new Int32Array(k);

        for (let i = 0; i < n; i++) {
            const l = labels[i];
            const p = pixels[i];
            newCentroids[l][0] += p[0];
            newCentroids[l][1] += p[1];
            newCentroids[l][2] += p[2];
            counts[l]++;
        }

        for (let j = 0; j < k; j++) {
            if (counts[j] > 0) {
                centroids[j][0] = newCentroids[j][0] / counts[j];
                centroids[j][1] = newCentroids[j][1] / counts[j];
                centroids[j][2] = newCentroids[j][2] / counts[j];
            } else {
                centroids[j] = [...pixels[Math.floor(Math.random() * n)]];
            }
        }
    }

    return { centroids, labels };
}

export function applyFloydSteinbergDithering(img_float, w_d, h_d, palette) {
    for (let y = 0; y < h_d; y++) {
        for (let x = 0; x < w_d; x++) {
            const idx = (y * w_d + x) * 3;
            const oldR = img_float[idx];
            const oldG = img_float[idx + 1];
            const oldB = img_float[idx + 2];

            let minDist = Infinity;
            let bestIdx = 0;
            for (let j = 0; j < palette.length; j++) {
                const c = palette[j];
                const dr = oldR - c[0];
                const dg = oldG - c[1];
                const db = oldB - c[2];
                const dist2 = dr*dr + dg*dg + db*db;
                if (dist2 < minDist) {
                    minDist = dist2;
                    bestIdx = j;
                }
            }

            const newV = palette[bestIdx];
            img_float[idx] = newV[0];
            img_float[idx + 1] = newV[1];
            img_float[idx + 2] = newV[2];

            const errR = oldR - newV[0];
            const errG = oldG - newV[1];
            const errB = oldB - newV[2];

            if (x < w_d - 1) {
                const nidx = (y * w_d + (x + 1)) * 3;
                img_float[nidx] += errR * 7.0 / 16.0;
                img_float[nidx + 1] += errG * 7.0 / 16.0;
                img_float[nidx + 2] += errB * 7.0 / 16.0;
            }
            if (y < h_d - 1) {
                const nidxDown = ((y + 1) * w_d + x) * 3;
                img_float[nidxDown] += errR * 5.0 / 16.0;
                img_float[nidxDown + 1] += errG * 5.0 / 16.0;
                img_float[nidxDown + 2] += errB * 5.0 / 16.0;

                if (x > 0) {
                    const nidxDL = ((y + 1) * w_d + (x - 1)) * 3;
                    img_float[nidxDL] += errR * 3.0 / 16.0;
                    img_float[nidxDL + 1] += errG * 3.0 / 16.0;
                    img_float[nidxDL + 2] += errB * 3.0 / 16.0;
                }

                if (x < w_d - 1) {
                    const nidxDR = ((y + 1) * w_d + (x + 1)) * 3;
                    img_float[nidxDR] += errR * 1.0 / 16.0;
                    img_float[nidxDR + 1] += errG * 1.0 / 16.0;
                    img_float[nidxDR + 2] += errB * 1.0 / 16.0;
                }
            }
        }
    }
}

export function applyPixelize(targetCtx, w, h, dot_size, colors, outline, smoothing, algo) {
    if (outline > 0) {
        applyErosion(targetCtx, w, h, outline);
    }

    const d_w = Math.max(1, Math.floor(w / dot_size));
    const d_h = Math.max(1, Math.floor(h / dot_size));

    const cvsDown = document.createElement("canvas");
    cvsDown.width = d_w;
    cvsDown.height = d_h;
    const ctxDown = cvsDown.getContext("2d");
    ctxDown.imageSmoothingEnabled = false;
    ctxDown.drawImage(targetCtx.canvas, 0, 0, w, h, 0, 0, d_w, d_h);

    if (smoothing > 0) {
        let d = Math.max(3, Math.round(15 / dot_size));
        if (d % 2 === 0) d += 1;
        d = Math.min(15, d);
        const sigmaSpace = Math.max(1.5, 20.0 / dot_size);
        applyBilateralFilter(ctxDown, d_w, d_h, d, smoothing * 20, sigmaSpace);
    }

    const downImgData = ctxDown.getImageData(0, 0, d_w, d_h);
    const data = downImgData.data;

    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
        pixels.push([data[i]/255.0, data[i+1]/255.0, data[i+2]/255.0]);
    }

    if (algo.includes("kmeans")) {
        const { centroids, labels } = kMeansClustering(pixels, colors);
        
        if (algo.includes("dithering")) {
            const img_float = new Float32Array(pixels.length * 3);
            for (let i = 0; i < pixels.length; i++) {
                img_float[i*3] = pixels[i][0];
                img_float[i*3+1] = pixels[i][1];
                img_float[i*3+2] = pixels[i][2];
            }
            applyFloydSteinbergDithering(img_float, d_w, d_h, centroids);
            for (let i = 0; i < pixels.length; i++) {
                data[i*4] = Math.max(0, Math.min(255, Math.round(img_float[i*3]*255)));
                data[i*4+1] = Math.max(0, Math.min(255, Math.round(img_float[i*3+1]*255)));
                data[i*4+2] = Math.max(0, Math.min(255, Math.round(img_float[i*3+2]*255)));
            }
        } else {
            for (let i = 0; i < pixels.length; i++) {
                const c = centroids[labels[i]];
                data[i*4] = Math.max(0, Math.min(255, Math.round(c[0]*255)));
                data[i*4+1] = Math.max(0, Math.min(255, Math.round(c[1]*255)));
                data[i*4+2] = Math.max(0, Math.min(255, Math.round(c[2]*255)));
            }
        }
    } else if (algo === "dithering") {
        const palette = generateFixedPalette(colors);
        const img_float = new Float32Array(pixels.length * 3);
        for (let i = 0; i < pixels.length; i++) {
            img_float[i*3] = pixels[i][0];
            img_float[i*3+1] = pixels[i][1];
            img_float[i*3+2] = pixels[i][2];
        }
        applyFloydSteinbergDithering(img_float, d_w, d_h, palette);
        for (let i = 0; i < pixels.length; i++) {
            data[i*4] = Math.max(0, Math.min(255, Math.round(img_float[i*3]*255)));
            data[i*4+1] = Math.max(0, Math.min(255, Math.round(img_float[i*3+1]*255)));
            data[i*4+2] = Math.max(0, Math.min(255, Math.round(img_float[i*3+2]*255)));
        }
    }

    ctxDown.putImageData(downImgData, 0, 0);

    targetCtx.clearRect(0, 0, w, h);
    const prevSmoothing = targetCtx.imageSmoothingEnabled;
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.drawImage(cvsDown, 0, 0, d_w, d_h, 0, 0, w, h);
    targetCtx.imageSmoothingEnabled = prevSmoothing;
}

function applySketchXDoG(targetCtx, w, h, kernel_size, s1, s2, epsilon, phi, gamma, color_mode) {
    const baseImgData = targetCtx.getImageData(0, 0, w, h);
    
    const cvs1 = document.createElement("canvas");
    cvs1.width = w; cvs1.height = h;
    const ctx1 = cvs1.getContext("2d");
    
    const cvs2 = document.createElement("canvas");
    cvs2.width = w; cvs2.height = h;
    const ctx2 = cvs2.getContext("2d");
    
    if (color_mode === 'gray') {
        const grayImgData = ctx1.createImageData(w, h);
        const src = baseImgData.data;
        const dst = grayImgData.data;
        for (let i = 0; i < src.length; i += 4) {
            const val = Math.round(0.299 * src[i] + 0.587 * src[i+1] + 0.114 * src[i+2]);
            dst[i] = val;
            dst[i+1] = val;
            dst[i+2] = val;
            dst[i+3] = src[i+3];
        }
        ctx1.putImageData(grayImgData, 0, 0);
        ctx2.putImageData(grayImgData, 0, 0);
    } else {
        ctx1.putImageData(baseImgData, 0, 0);
        ctx2.putImageData(baseImgData, 0, 0);
    }
    
    const cvsBlur1 = document.createElement("canvas");
    cvsBlur1.width = w; cvsBlur1.height = h;
    const ctxBlur1 = cvsBlur1.getContext("2d");
    ctxBlur1.filter = `blur(${s1}px)`;
    ctxBlur1.drawImage(cvs1, 0, 0);
    const g1Data = ctxBlur1.getImageData(0, 0, w, h).data;
    
    const cvsBlur2 = document.createElement("canvas");
    cvsBlur2.width = w; cvsBlur2.height = h;
    const ctxBlur2 = cvsBlur2.getContext("2d");
    ctxBlur2.filter = `blur(${s2}px)`;
    ctxBlur2.drawImage(cvs2, 0, 0);
    const g2Data = ctxBlur2.getImageData(0, 0, w, h).data;
    
    const outImgData = targetCtx.createImageData(w, h);
    const dst = outImgData.data;
    
    const gamma_fixed = parseFloat(gamma) - 0.001;
    const phi_fixed = parseFloat(phi) - 0.001;
    const eps_fixed = parseFloat(epsilon) - 0.001;
    
    const dog = new Float32Array(w * h * 3);
    let dog_max = 0;
    
    const len = w * h * 4;
    for (let i = 0, j = 0; i < len; i += 4, j += 3) {
        const dogR = g1Data[i]/255.0 - gamma_fixed * (g2Data[i]/255.0);
        const dogG = g1Data[i+1]/255.0 - gamma_fixed * (g2Data[i+1]/255.0);
        const dogB = g1Data[i+2]/255.0 - gamma_fixed * (g2Data[i+2]/255.0);
        
        dog[j] = dogR;
        dog[j+1] = dogG;
        dog[j+2] = dogB;
        
        const m = Math.max(dogR, dogG, dogB);
        if (m > dog_max) dog_max = m;
    }
    
    for (let i = 0, j = 0; i < len; i += 4, j += 3) {
        let dogR = dog[j];
        let dogG = dog[j+1];
        let dogB = dog[j+2];
        
        if (dog_max > 0) {
            dogR /= dog_max;
            dogG /= dog_max;
            dogB /= dog_max;
        }
        
        let eR = 1.0 + Math.tanh(phi_fixed * (dogR - eps_fixed));
        let eG = 1.0 + Math.tanh(phi_fixed * (dogG - eps_fixed));
        let eB = 1.0 + Math.tanh(phi_fixed * (dogB - eps_fixed));
        
        if (eR >= 1.0) eR = 1.0;
        if (eG >= 1.0) eG = 1.0;
        if (eB >= 1.0) eB = 1.0;
        
        dst[i] = Math.max(0, Math.min(255, Math.round(eR * 255)));
        dst[i+1] = Math.max(0, Math.min(255, Math.round(eG * 255)));
        dst[i+2] = Math.max(0, Math.min(255, Math.round(eB * 255)));
        dst[i+3] = baseImgData.data[i+3];
    }
    
    targetCtx.putImageData(outImgData, 0, 0);
}

export function applySpatialStages(targetCtx, w, h, crState, scale = 1) {
    const texAmount = (crState.cr_tex || 0) / 140.0;
    const clarAmount = crState.cr_clar || 0;
    const sharpAmount = (crState.cr_sharp || 0) / 110.0;
    
    if (texAmount !== 0) applyDetailBlend(targetCtx, w, h, 0.9 * scale, texAmount, false);
    if (clarAmount !== 0) applyClarity(targetCtx, w, h, clarAmount, scale);
    if (sharpAmount > 0) applyDetailBlend(targetCtx, w, h, 1.6 * scale, sharpAmount, false);

    const denoise = crState.cr_denoise || 0;
    if (denoise > 0) {
        applyBilateralFilter(targetCtx, w, h, 9, (denoise / 150.0) * 35.0 + 5.0, 3.0 + denoise / 50.0);
    }

    const blur = crState.cr_blur || 0;
    if (blur > 0) {
        const { canvas: tempCvs, ctx: tCtx } = getBlurCtx(w, h);
        tCtx.filter = `blur(${(blur / 10.0) * scale}px)`;
        tCtx.clearRect(0, 0, w, h);
        tCtx.drawImage(targetCtx.canvas, 0, 0);
        targetCtx.clearRect(0, 0, w, h);
        targetCtx.drawImage(tempCvs, 0, 0);
        tCtx.filter = "none";
    }

    const surface_blur = crState.cr_surface_blur || 0;
    if (surface_blur > 0) {
        const r = Math.max(1, Math.min(8, Math.round(surface_blur / 25.0)));
        const d = r * 2 + 1;
        applyBilateralFilter(targetCtx, w, h, d, (surface_blur / 200.0) * 90.0 + 10.0, d * 2.0);
    }

    const sketch_kernel_size = crState.cr_sketch_kernel_size || 0;
    if (sketch_kernel_size > 0) {
        const sketch_sigma = crState.cr_sketch_sigma !== undefined && crState.cr_sketch_sigma !== null ? crState.cr_sketch_sigma : 1.4;
        const k_sigma = crState.cr_sketch_k_sigma !== undefined && crState.cr_sketch_k_sigma !== null ? crState.cr_sketch_k_sigma : 1.6;
        const epsilon = crState.cr_sketch_epsilon !== undefined && crState.cr_sketch_epsilon !== null ? crState.cr_sketch_epsilon : -0.03;
        const phi = crState.cr_sketch_phi !== undefined && crState.cr_sketch_phi !== null ? crState.cr_sketch_phi : 10.0;
        const gamma = crState.cr_sketch_gamma !== undefined && crState.cr_sketch_gamma !== null ? crState.cr_sketch_gamma : 1.0;
        const color_mode = crState.cr_sketch_color || 'gray';
        
        const k1 = sketch_kernel_size | 1;
        const k2 = Math.round(sketch_kernel_size * k_sigma) | 1;
        const s1 = Math.min(sketch_sigma, 0.3 * ((k1 - 1) * 0.5 - 1) + 0.8) * scale;
        const s2 = Math.min(sketch_sigma * k_sigma, 0.3 * ((k2 - 1) * 0.5 - 1) + 0.8) * scale;
        
        applySketchXDoG(targetCtx, w, h, sketch_kernel_size, s1, s2, epsilon, phi, gamma, color_mode);
    }

    const pixel_dot_size = crState.cr_pixel_dot_size || 0;
    if (pixel_dot_size > 1) {
        const colors = crState.cr_pixel_colors !== undefined && crState.cr_pixel_colors !== null ? crState.cr_pixel_colors : 128;
        const outline = crState.cr_pixel_outline || 0;
        const smoothing = crState.cr_pixel_smoothing || 0;
        const algo = crState.cr_pixel_algo || 'kmeans';
        applyPixelize(targetCtx, w, h, Math.max(2, Math.round(pixel_dot_size * scale)), colors, outline, smoothing, algo);
    }

    // --- Advanced Blur ---
    const crBlurRadius = crState.cr_blur_radius || 0;
    if (crBlurRadius > 0) {
        crApplyBlurFilter(targetCtx, w, h, crState.cr_blur_mode, crBlurRadius * scale);
    }

    // --- Halftone ---
    const htSize = crState.cr_ht_size || 0;
    if (htSize > 1) {
        crApplyHalftone(targetCtx, w, h, {
            size: Math.max(2, Math.round(htSize * scale)),
            angle: crState.cr_ht_angle || 0,
            contrast: crState.cr_ht_contrast || 0,
            brightness: crState.cr_ht_brightness || 0,
            dither: crState.cr_ht_dither || 0,
            inverse: !!crState.cr_ht_inverse,
            shape: crState.cr_ht_shape || 'Dot'
        });
    }

    // --- Sharpen USM ---
    const usmAmount = crState.cr_usm_amount || 0;
    if (usmAmount > 0) {
        crApplySharpenUSM(targetCtx, w, h, usmAmount, (crState.cr_usm_radius || 1) * scale, crState.cr_usm_threshold || 0);
    }

    // --- Laplacian Sharpen ---
    const lapAmount = crState.cr_lap_amount || 0;
    if (lapAmount > 0) {
        crApplyLaplacianSharpen(targetCtx, w, h, lapAmount, crState.cr_lap_kernel);
    }

    // --- Posterize (Error Diffusion) ---
    const postLevels = crState.cr_post_levels !== undefined && crState.cr_post_levels !== null ? crState.cr_post_levels : 4;
    const postDitherMode = String(crState.cr_post_dither_mode || 'None').toLowerCase();
    if (crState.cr_post_enable && postLevels >= 2 && (postDitherMode.includes('floyd') || postDitherMode.includes('atkinson'))) {
        crApplyPosterizeErrorDiffuse(targetCtx, w, h, postLevels, crState.cr_post_mode, postDitherMode);
    }
}

