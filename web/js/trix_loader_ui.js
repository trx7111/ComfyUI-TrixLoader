import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js"; 
import { openTrixCameraRawEditor } from './trix_camera_raw.js';
import { openTrixCropEditor } from './trix_crop_editor.js';
import { openTrixMaskEditor } from './trix_mask_editor.js';
import { openTrixCamrawBox } from './camraw_box.js';
import { openTrixMaskBox } from './mask_box.js';
import { openTrixCropBox } from './crop_box.js';

function recolorCanvas(canvas, newColor) {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext("2d");
    const tempCvs = document.createElement("canvas");
    tempCvs.width = canvas.width;
    tempCvs.height = canvas.height;
    const tempCtx = tempCvs.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0);
    tempCtx.globalCompositeOperation = "source-in";
    tempCtx.fillStyle = newColor;
    tempCtx.fillRect(0, 0, tempCvs.width, tempCvs.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCvs, 0, 0);
}

const allTrixNodes = [];
const generateTrixUUID = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const isUUIDInUse = (uuid, excludeNode) => {
    if (!uuid) return false;
    if (typeof allTrixNodes === "undefined") return false;
    return allTrixNodes.some(n => {
        if (n === excludeNode) return false;
        const uWgt = n.widgets ? n.widgets.find(w => w.name === "trix_uuid") : null;
        return uWgt && uWgt.value === uuid;
    });
};

const startTrixVisibilityLoop = () => {
    const checkVisibility = () => {
        try {
            if (typeof app !== "undefined" && app.graph && typeof allTrixNodes !== "undefined") {
                for (const node of allTrixNodes) {
                    if (!node || !node.wrapperRef) continue;
                    const activeNodeInGraph = app.graph.getNodeById(node.id);
                    const isActive = (activeNodeInGraph === node);
                    
                    const shouldBeVisible = isActive && !node.flags.collapsed;
                    const parent = node.wrapperRef.parentNode;
                    
                    if (shouldBeVisible) {
                        if (node.wrapperRef.style.display === "none") {
                            node.wrapperRef.style.display = "";
                        }
                        if (parent && parent.style && parent.style.display === "none") {
                            parent.style.display = "";
                        }
                        if (parent && parent.style && parent.style.pointerEvents === "none") {
                            parent.style.pointerEvents = "auto";
                        }
                    } else {
                        if (node.wrapperRef.style.display !== "none") {
                            node.wrapperRef.style.display = "none";
                        }
                        if (parent && parent.style && parent.style.display !== "none") {
                            parent.style.display = "none";
                        }
                        if (parent && parent.style && parent.style.pointerEvents !== "none") {
                            parent.style.pointerEvents = "none";
                        }
                    }
                }
            }
        } catch (err) {
            console.error("TrixLoader visibility check error:", err);
        }
        requestAnimationFrame(checkVisibility);
    };
    requestAnimationFrame(checkVisibility);
};
startTrixVisibilityLoop();

const trixIsInputWired = (node, inputName = "in_image") => {
    if (!node || !node.inputs) return false;
    const inp = node.inputs.find(slot => slot && slot.name === inputName);
    if (!inp || inp.link === null || inp.link === undefined) return false;
    if (typeof app === "undefined" || !app.graph || !app.graph.links) return false;
    const linkInfo = app.graph.links[inp.link];
    return !!(linkInfo && linkInfo.target_id === node.id && node.inputs[linkInfo.target_slot] === inp);
};

api.addEventListener("executed", (event) => {
    const { node, output } = event.detail;
    if (!node || !output) return;
    const n = typeof app !== "undefined" && app.graph ? app.graph.getNodeById(node) : null;
    if (!n || n.comfyClass !== "TrixLoadImageAIO") return;
    const localUuid = n.widgets ? n.widgets.find(w => w.name === "trix_uuid")?.value : null;
    if (localUuid && output.trix_uuid !== localUuid) {
        event.stopImmediatePropagation();
        event.preventDefault();
    }
}, true);

api.addEventListener("trix-update-preview", (event) => {
    const { id, images, trix_uuid } = event.detail;
    let node = null;
    if (trix_uuid && typeof allTrixNodes !== "undefined") {
        node = allTrixNodes.find(n => {
            const uWgt = n.widgets ? n.widgets.find(w => w.name === "trix_uuid") : null;
            return uWgt && uWgt.value === trix_uuid;
        });
    }
    if (!node) {
        node = app.graph.getNodeById(id);
    }
    if (node && node.onExecuted) {
        node.onExecuted({ images, trix_uuid });
    }
});

const svgCopy = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const svgPaste = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><rect x="5.5" y="5" width="13" height="16" rx="3" ry="3"></rect><path d="M9 5V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1"></path></svg>`;
const svgUpload = `<svg viewBox="0 0 24 24" width="11.2" height="11.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M12 3v12"></path><path d="m7 8 5-5 5 5"></path><path d="M5 21h14"></path><path d="M5 17v4"></path><path d="M19 17v4"></path></svg>`;
const svgChevronLeft = `<svg viewBox="0 0 12 12" width="9" height="9" fill="currentColor" aria-hidden="true" style="display: block;"><path d="M8.2 1.1 3.1 6l5.1 4.9V1.1Z"></path></svg>`;
const svgChevronRight = `<svg viewBox="0 0 12 12" width="9" height="9" fill="currentColor" aria-hidden="true" style="display: block;"><path d="M3.8 1.1 8.9 6l-5.1 4.9V1.1Z"></path></svg>`;
const svgChevronDown = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;


let TRIX_BG = "#303540";
let TRIX_MASK_TOOLBAR_BG = "#303540";
let TRIX_MASK_TOOLBAR_ICON_BG = "#2e333d";
let TRIX_NODE_BORDER_WIDTH = 1;
let TRIX_PANEL = "#252529";
let TRIX_PANEL_SOFT = "rgba(32, 32, 36, 0.92)";
let TRIX_CONTROL = "#2e2e33";
let TRIX_CONTROL_HOVER = "#393941";
let TRIX_BORDER = "#424248";
let TRIX_NODE_OUTLINE = "#303540";
let TRIX_NODE_RADIUS = 8;
let TRIX_HEADER_OFFSET_Y = -5; // Custom image picker vertical offset. Change by 1-3px if old native lines peek through.
let TRIX_TEXT = "#e7e7ea";
let TRIX_ICON_COLOR = "#cccccc";
let TRIX_MUTED = "#a9a9b0";
let TRIX_ACCENT = "#33789a";
let TRIX_ACCENT_HOVER = "#3f8eb4";
let TRIX_ACTIVE = "rgb(246, 103, 68)";
let TRIX_ACTIVE_HOVER = "rgb(255, 115, 80)";
const TRIX_IMAGE_TOOLBAR_GAP = 8; // Gap under the toolbar before the image; raise/lower by 1px if Mask touches the preview.
const TRIX_DISPLAY_TITLE = "🌊Load Image AIO";
const TRIX_AIO_SUBFOLDER = "aio_input";

const adjustColorBrightness = (col, percent) => {
    if (!col || typeof col !== "string") return col;
    let hex = col.trim();
    if (hex.startsWith("rgb")) {
        try {
            const match = hex.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
            if (match) {
                let R = parseInt(match[1], 10);
                let G = parseInt(match[2], 10);
                let B = parseInt(match[3], 10);
                R = Math.max(0, Math.min(255, Math.round(R * (100 + percent) / 100)));
                G = Math.max(0, Math.min(255, Math.round(G * (100 + percent) / 100)));
                B = Math.max(0, Math.min(255, Math.round(B * (100 + percent) / 100)));
                return `rgb(${R}, ${G}, ${B})`;
            }
        } catch (e) {}
        return col;
    }
    if (!hex.startsWith("#")) {
        hex = "#" + hex;
    }
    if (hex.length !== 7) return col;
    try {
        let R = parseInt(hex.substring(1, 3), 16);
        let G = parseInt(hex.substring(3, 5), 16);
        let B = parseInt(hex.substring(5, 7), 16);

        R = Math.max(0, Math.min(255, Math.round(R * (100 + percent) / 100)));
        G = Math.max(0, Math.min(255, Math.round(G * (100 + percent) / 100)));
        B = Math.max(0, Math.min(255, Math.round(B * (100 + percent) / 100)));

        const rHex = R.toString(16).padStart(2, '0');
        const gHex = G.toString(16).padStart(2, '0');
        const bHex = B.toString(16).padStart(2, '0');

        return `#${rHex}${gHex}${bHex}`;
    } catch(e) {
        return col;
    }
};

const applyTrixNodeChrome = (node) => {
    node.boxcolor = "rgba(0,0,0,0)";
};

const refreshTrixOutputs = (node) => {
    if (!node || !node.outputs) return;
    
    // Ensure node has exactly 3 outputs
    while (node.outputs.length < 3) {
        node.addOutput("↓ original_input", "IMAGE");
    }
    while (node.outputs.length > 3) {
        node.removeOutput(node.outputs.length - 1);
    }
    
    // Enforce correct types/names for indices 0 and 1
    if (node.outputs[0]) {
        node.outputs[0].name = "IMAGE";
        node.outputs[0].type = "IMAGE";
    }
    if (node.outputs[1]) {
        node.outputs[1].name = "MASK";
        node.outputs[1].type = "MASK";
    }
    
    // Check if in_image input is connected
    const isWired = trixIsInputWired(node);
    
    if (node.outputs[2]) {
        if (isWired) {
            // Disconnect slot 2 output if there is any active link
            if (node.outputs[2].links && node.outputs[2].links.length > 0) {
                node.disconnectOutput(2);
            }
            node.outputs[2].type = "DISABLED";
            node.outputs[2].label = "↓ original_input (blocked)";
            node.outputs[2].name = "↓ original_input";
        } else {
            node.outputs[2].type = "IMAGE";
            node.outputs[2].label = "↓ original_input";
            node.outputs[2].name = "↓ original_input";
        }
    }
};

const hideWidget = (w) => {
    if (!w) return;
    w.type = "hidden";
    w.computeSize = () => [0, -4];
    w.draw = () => {};
};

const trixSafeId = (value) => String(value ?? "node").replace(/[^a-zA-Z0-9_-]+/g, "_") || "node";
const trixSafeStem = (name, fallback = "image") => {
    const raw = String(name || fallback).split(/[\\/]/).pop().replace(/\.[^.]*$/, "");
    const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
    return safe || fallback;
};
const trixImageExt = (name = "", mime = "") => {
    const match = String(name || "").toLowerCase().match(/\.(png|jpe?g|webp|bmp|gif|tiff?|avif)$/);
    if (match) return match[0] === ".jpeg" ? ".jpg" : match[0];
    const byMime = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/bmp": ".bmp",
        "image/gif": ".gif",
        "image/tiff": ".tiff",
        "image/avif": ".avif",
    };
    return byMime[String(mime || "").toLowerCase()] || ".png";
};
const trixAioFilename = (kind, nodeId, originalName = "", mime = "") => {
    const id = trixSafeId(nodeId);
    const ext = trixImageExt(originalName, mime);
    if (kind === "paste") return `pasted_${id}${ext}`;
    if (kind === "crop") return `aio_crop_${id}.png`;
    const stem = trixSafeStem(originalName, "image");
    return `aio_upload_${id}_${stem}${ext}`;
};
const trixAppendAioUploadFields = (body, filename = "") => {
    body.append("type", "input");
    if (filename && filename.startsWith("pasted_")) {
        body.append("subfolder", "");
    } else {
        body.append("subfolder", TRIX_AIO_SUBFOLDER);
    }
    body.append("overwrite", "true");
};
const trixAioFullPath = (data) => data?.subfolder ? `${data.subfolder}/${data.name}` : data?.name;
const trixDefaultUploadFullPath = (data) => data?.subfolder ? `${data.subfolder}/${data.name}` : data?.name;

const drawRoundedNodeStroke = (ctx, x, y, w, h, radius) => {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.stroke();
};

const getMaskHistoryLimit = (canvas) => {
    const pixels = Math.max(0, (canvas?.width || 0) * (canvas?.height || 0));
    if (pixels > 24000000) return 5;
    if (pixels > 12000000) return 8;
    return 15;
};

let settingCopyImage = { value: true };
let settingPasteImage = { value: true };
let settingCopyMask = { value: true };
let settingPasteMask = { value: true };
let settingToolboxAdvMask = { value: true };
let settingToolboxAdvCrop = { value: true };
let settingToolboxAdvCamraw = { value: true };
let settingContextMenuAdvMask = { value: true };
let settingContextMenuAdvCrop = { value: true };
let settingContextMenuAdvCamraw = { value: true };

let settingNodeBg = { value: "#202024" };
let settingNodeBorder = { value: "#303540" };
let settingButtonDefault = { value: "#33789a" };
let settingButtonActive = { value: "#f66744" };

const trixPreloadAndExecute = (node, callback) => {
    let srcImg = null;
    if (node.image && node.image.complete && node.image.naturalWidth > 0) {
        srcImg = node.image;
    } else if (node.imgs && node.imgs.length > 0) {
        const firstImg = node.imgs[0];
        if (firstImg && firstImg.complete && firstImg.naturalWidth > 0) {
            srcImg = firstImg;
        }
    } else if (node.imgTagRef && node.imgTagRef.complete && node.imgTagRef.naturalWidth > 0) {
        srcImg = node.imgTagRef;
    }

    const imgWidget = node.widgets?.find(w => w && (w.name === "image" || w.name === "image_path"));

    const execute = (img) => {
        const maskCanvas = trixExtractMaskFromImage(img);
        callback(node, img, maskCanvas);
    };

    if (srcImg && srcImg.complete && srcImg.naturalWidth > 0) {
        execute(srcImg);
    } else if (imgWidget && imgWidget.value) {
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.onload = () => execute(tempImg);
        tempImg.onerror = () => alert("Failed to load node image for editing.");
        
        let type = "input";
        if (imgWidget.options && imgWidget.options.type) {
            type = imgWidget.options.type;
        }
        tempImg.src = `/view?filename=${encodeURIComponent(imgWidget.value)}&type=${type}&t=${Date.now()}`;
    } else {
        alert("No image found on this node to edit.");
    }
};

const trixExtractMaskFromImage = (srcImg) => {
    if (!srcImg || !srcImg.naturalWidth) return null;
    const w = srcImg.naturalWidth;
    const h = srcImg.naturalHeight;

    const cvs = document.createElement("canvas");
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext("2d");
    ctx.drawImage(srcImg, 0, 0);

    try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        let hasAlpha = false;

        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 255) {
                hasAlpha = true;
                break;
            }
        }

        if (!hasAlpha) return null;

        const maskCvs = document.createElement("canvas");
        maskCvs.width = w;
        maskCvs.height = h;
        const maskCtx = maskCvs.getContext("2d");
        const maskData = maskCtx.createImageData(w, h);

        for (let i = 0; i < data.length; i += 4) {
            const maskVal = 255 - data[i + 3];
            maskData.data[i] = maskVal;
            maskData.data[i + 1] = maskVal;
            maskData.data[i + 2] = maskVal;
            maskData.data[i + 3] = 255;
        }
        maskCtx.putImageData(maskData, 0, 0);
        return maskCvs;
    } catch (e) {
        console.error("Failed to extract mask from image:", e);
        return null;
    }
};

const wrapNodeGetExtraMenuOptions = (nodeType) => {
    if (!nodeType) return;
    if (nodeType.class) {
        nodeType = nodeType.class;
    }
    if (!nodeType || !nodeType.prototype) return;
    if (nodeType.prototype.__trix_menu_wrapped) return;
    nodeType.prototype.__trix_menu_wrapped = true;
    
    const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(canvas, options) {
        if (origGetExtraMenuOptions) {
            origGetExtraMenuOptions.apply(this, arguments);
        }
        
        // Skip for TrixLoadImageAIO because it has its own custom menu logic
        if (this.type === "TrixLoadImageAIO") {
            return;
        }
        
        // Skip if we already added Trix options to this menu (avoid duplicates)
        if (options && options.__trix_added) {
            return;
        }
        if (options) {
            options.__trix_added = true;
        }
        
        let srcImg = null;
        if (this.image && this.image.complete && this.image.naturalWidth > 0) {
            srcImg = this.image;
        } else if (this.imgs && this.imgs.length > 0) {
            const firstImg = this.imgs[0];
            if (firstImg && firstImg.complete && firstImg.naturalWidth > 0) {
                srcImg = firstImg;
            }
        } else if (this.imgTagRef && this.imgTagRef.complete && this.imgTagRef.naturalWidth > 0) {
            srcImg = this.imgTagRef;
        }
        
        const imgWidget = this.widgets?.find(w => w.name === "image" || w.name === "image_path");
        const showCopyImage = settingCopyImage.value;
        const showCopyMask = settingCopyMask.value;
        const showPasteImage = settingPasteImage.value;
        const showPasteMask = settingPasteMask.value;

        if (srcImg || (imgWidget && imgWidget.value)) {
            if (showCopyImage || showCopyMask) {
                options.push(null); // separator
                
                // Copy Image
                if (showCopyImage) {
                    options.push({
                        content: "⿻ Copy Image",
                        callback: () => {
                            const doCopy = (imgElement) => {
                                try {
                                    const tCanvas = document.createElement("canvas");
                                    tCanvas.width = imgElement.naturalWidth || imgElement.width;
                                    tCanvas.height = imgElement.naturalHeight || imgElement.height;
                                    const tCtx = tCanvas.getContext("2d");
                                    tCtx.drawImage(imgElement, 0, 0);
                                    tCanvas.toBlob(async (blob) => {
                                        if (blob) {
                                            await navigator.clipboard.write([
                                                new ClipboardItem({ "image/png": blob })
                                            ]);
                                        }
                                    }, "image/png");
                                } catch (err) {
                                    console.error("Copy Image Error:", err);
                                    alert("Failed to copy image: " + err);
                                }
                            };
                            
                            if (srcImg) {
                                doCopy(srcImg);
                            } else if (imgWidget && imgWidget.value) {
                                const tempImg = new Image();
                                tempImg.crossOrigin = "anonymous";
                                tempImg.onload = () => doCopy(tempImg);
                                tempImg.onerror = () => alert("Failed to load image for copying.");
                                tempImg.src = `/view?filename=${encodeURIComponent(imgWidget.value)}&type=input`;
                            }
                        }
                    });
                }
                
                // Copy Mask
                if (showCopyMask) {
                    options.push({
                        content: "⚇ Copy Mask",
                        callback: () => {
                            const doCopyMask = (imgElement) => {
                                try {
                                    const tCanvas = document.createElement("canvas");
                                    tCanvas.width = imgElement.naturalWidth || imgElement.width;
                                    tCanvas.height = imgElement.naturalHeight || imgElement.height;
                                    const tCtx = tCanvas.getContext("2d");
                                    tCtx.drawImage(imgElement, 0, 0);
                                    
                                    const imgData = tCtx.getImageData(0, 0, tCanvas.width, tCanvas.height);
                                    const data = imgData.data;
                                    
                                    let hasAlpha = false;
                                    for (let i = 0; i < data.length; i += 4) {
                                        if (data[i + 3] < 255) {
                                            hasAlpha = true;
                                            break;
                                        }
                                    }
                                    
                                    for (let i = 0; i < data.length; i += 4) {
                                        const maskVal = hasAlpha ? (255 - data[i + 3]) : Math.max(data[i], data[i + 1], data[i + 2]);
                                        data[i] = maskVal;     // R
                                        data[i + 1] = maskVal; // G
                                        data[i + 2] = maskVal; // B
                                        data[i + 3] = 255;     // A
                                    }
                                    
                                    tCtx.putImageData(imgData, 0, 0);
                                    tCanvas.toBlob(async (blob) => {
                                        if (blob) {
                                            await navigator.clipboard.write([
                                                new ClipboardItem({ "image/png": blob })
                                            ]);
                                        }
                                    }, "image/png");
                                } catch (err) {
                                    console.error("Copy Mask Error:", err);
                                    alert("Failed to copy mask: " + err);
                                }
                            };
                            
                            if (srcImg) {
                                doCopyMask(srcImg);
                            } else if (imgWidget && imgWidget.value) {
                                const tempImg = new Image();
                                tempImg.crossOrigin = "anonymous";
                                tempImg.onload = () => doCopyMask(tempImg);
                                tempImg.onerror = () => alert("Failed to load image for copying mask.");
                                tempImg.src = `/view?filename=${encodeURIComponent(imgWidget.value)}&type=input`;
                            }
                        }
                    });
                }
            }
        }
        
        if (imgWidget) {
            // Paste Image
            if (showPasteImage) {
                options.push({
                    content: "⧉ Paste Image",
                    callback: async () => {
                        try {
                            const items = await navigator.clipboard.read();
                            for (let item of items) {
                                if (item.types.some(t => t.startsWith('image/'))) {
                                    const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
                                    let ext = ".png";
                                    if (blob.type === "image/jpeg") ext = ".jpg";
                                    else if (blob.type === "image/webp") ext = ".webp";
                                    
                                    const filename = `pasted_${this.id}_${Date.now()}${ext}`;
                                    const newFile = new File([blob], filename, { type: blob.type || "image/png" });
                                    
                                    const body = new FormData();
                                    body.append("image", newFile, filename);
                                    body.append("type", "input");
                                    body.append("overwrite", "true");
                                    
                                    const resp = await fetch("/upload/image", { method: "POST", body: body });
                                    if (resp.status === 200) {
                                        const data = await resp.json();
                                        const finalName = data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
                                        imgWidget.value = finalName;
                                        if (imgWidget.callback) {
                                            imgWidget.callback(finalName);
                                        }
                                        this.setDirtyCanvas?.(true, true);
                                    }
                                    break;
                                }
                            }
                        } catch (err) {
                            alert("Failed to paste image: " + err);
                        }
                    }
                });
            }
            
            // Paste Mask
            if (showPasteMask) {
                options.push({
                    content: "⚉ Paste Mask",
                    callback: async () => {
                        if (!imgWidget.value) {
                            alert("No base image in this node to apply a mask onto.");
                            return;
                        }
                        try {
                            const items = await navigator.clipboard.read();
                            let maskBlob = null;
                            for (let item of items) {
                                if (item.types.some(t => t.startsWith('image/'))) {
                                    maskBlob = await item.getType(item.types.find(t => t.startsWith('image/')));
                                    break;
                                }
                            }
                            
                            if (!maskBlob) {
                                alert("Clipboard does not contain an image/mask.");
                                return;
                            }
                            
                            const applyMaskToImage = (baseImgElement) => {
                                const maskImg = new Image();
                                maskImg.onload = () => {
                                    const tCanvas = document.createElement("canvas");
                                    tCanvas.width = baseImgElement.naturalWidth || baseImgElement.width;
                                    tCanvas.height = baseImgElement.naturalHeight || baseImgElement.height;
                                    const tCtx = tCanvas.getContext("2d");
                                    tCtx.drawImage(maskImg, 0, 0, tCanvas.width, tCanvas.height);
                                    
                                    const maskData = tCtx.getImageData(0, 0, tCanvas.width, tCanvas.height);
                                    for (let i = 0; i < maskData.data.length; i += 4) {
                                        const mr = maskData.data[i];
                                        const mg = maskData.data[i + 1];
                                        const mb = maskData.data[i + 2];
                                        const ma = maskData.data[i + 3];
                                        const maskVal = Math.round(Math.max(mr, mg, mb) * (ma / 255));
                                        maskData.data[i + 3] = 255 - maskVal;
                                    }
                                    tCtx.putImageData(maskData, 0, 0);
                                    
                                    tCanvas.toBlob(async (newBlob) => {
                                        if (newBlob) {
                                            let baseFilename = imgWidget.value;
                                            let subfolder = "";
                                            const parts = baseFilename.split("/");
                                            if (parts.length > 1) {
                                                baseFilename = parts.pop();
                                                subfolder = parts.join("/");
                                            }
                                            
                                            const original_ref = {
                                                filename: baseFilename,
                                                subfolder: subfolder,
                                                type: "input"
                                            };
                                            
                                            const filename = `masked_${this.id}_${Date.now()}.png`;
                                            const newFile = new File([newBlob], filename, { type: "image/png" });
                                            const body = new FormData();
                                            body.append("image", newFile, filename);
                                            body.append("type", "input");
                                            body.append("original_ref", JSON.stringify(original_ref));
                                            body.append("overwrite", "true");
                                            
                                            const resp = await fetch("/upload/mask", { method: "POST", body: body });
                                            if (resp.status === 200) {
                                                const data = await resp.json();
                                                const finalName = data.subfolder ? `${data.subfolder}/${data.name}` : data.name;
                                                imgWidget.value = finalName;
                                                if (imgWidget.callback) {
                                                    imgWidget.callback(finalName);
                                                }
                                                this.setDirtyCanvas?.(true, true);
                                            }
                                        }
                                    }, "image/png");
                                };
                                maskImg.src = URL.createObjectURL(maskBlob);
                            };
                            
                            if (srcImg) {
                                applyMaskToImage(srcImg);
                            } else {
                                const baseImg = new Image();
                                baseImg.crossOrigin = "anonymous";
                                baseImg.onload = () => applyMaskToImage(baseImg);
                                baseImg.onerror = () => alert("Failed to load base image from node.");
                                baseImg.src = `/view?filename=${encodeURIComponent(imgWidget.value)}&type=input`;
                            }
                        } catch (err) {
                            alert("Failed to paste mask: " + err);
                        }
                    }
                });
            }

            const showAdvMask = settingContextMenuAdvMask.value;
            const showAdvCamraw = settingContextMenuAdvCamraw.value;
            const showAdvCrop = settingContextMenuAdvCrop.value;
            
            if (showAdvMask || showAdvCamraw || showAdvCrop) {
                options.push(null); // separator
                
                if (showAdvMask) {
                    options.push({
                        content: "✦ Trix Mask Editor",
                        callback: () => {
                            trixPreloadAndExecute(this, openTrixMaskBox);
                        }
                    });
                }
                if (showAdvCamraw) {
                    options.push({
                        content: "◩ Trix Camera Raw",
                        callback: () => {
                            trixPreloadAndExecute(this, openTrixCamrawBox);
                        }
                    });
                }
                if (showAdvCrop) {
                    options.push({
                        content: "⛶ Trix Crop/Pad/Outpaint",
                        callback: () => {
                            trixPreloadAndExecute(this, openTrixCropBox);
                        }
                    });
                }
            }
        }
    };
};

app.registerExtension({
    name: "Trix.LoadImageAIO",
    async setup(app) {
        let syncPreviewColors = null;
        const style = document.createElement("style");
        style.innerText = `
            .trix-potato-pc, .trix-potato-pc * {
                transition: none !important;
                animation: none !important;
            }
        `;
        document.head.appendChild(style);


        app.ui.settings.addSetting({
            id: "Trix AIO Tools. Potato PC Mode.Enabled",
            name: "🥔 Potato PC Mode (Low resolution & fast loading)",
            defaultValue: false,
            type: "boolean"
        });

        settingCopyImage = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.CopyImage",
            name: "🌊 Context Menu: Copy Image",
            defaultValue: true,
            type: "boolean"
        });
        settingPasteImage = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.PasteImage",
            name: "🌊 Context Menu: Paste Image",
            defaultValue: true,
            type: "boolean"
        });
        settingCopyMask = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.CopyMask",
            name: "🌊 Context Menu: Copy Mask",
            defaultValue: true,
            type: "boolean"
        });
        settingPasteMask = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.PasteMask",
            name: "🌊 Context Menu: Paste Mask",
            defaultValue: true,
            type: "boolean"
        });
        settingContextMenuAdvMask = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.AdvMask",
            name: "🌊 Context Menu: trx adv. mask editor",
            defaultValue: true,
            type: "boolean"
        });
        settingContextMenuAdvCamraw = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.AdvCamraw",
            name: "🌊 Context Menu: trx adv. camera raw",
            defaultValue: true,
            type: "boolean"
        });
        settingContextMenuAdvCrop = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Context Menu Show/Hide.AdvCrop",
            name: "🌊 Context Menu: trx adv. crop/pad/outpaint",
            defaultValue: true,
            type: "boolean"
        });

        settingToolboxAdvMask = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Toolbox.AdvMask",
            name: "🌊 trx adv. mask editor",
            defaultValue: true,
            type: "boolean"
        });
        settingToolboxAdvCamraw = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Toolbox.AdvCamraw",
            name: "🌊 trx adv. camera raw",
            defaultValue: true,
            type: "boolean"
        });
        settingToolboxAdvCrop = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Toolbox.AdvCrop",
            name: "🌊 trx adv. crop/pad/outpaint",
            defaultValue: true,
            type: "boolean"
        });

        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Toolbox.Order",
            name: "🌊 Toolbox Order (Drag to rearrange)",
            defaultValue: "trix.camraw_box,trix.mask_box,trix.crop_box",
            type: "text"
        });

        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Toolbox.Shift",
            name: "🌊 Toolbox Position Shift (Shift tools left/right)",
            defaultValue: 0,
            type: "number"
        });

        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Save Steps.SaveEveryStep",
            name: "💾 Save every editing step",
            defaultValue: false,
            type: "boolean"
        });

        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Save Steps.SaveEveryStepPath",
            name: "💾 Save step path",
            defaultValue: "input/aio_input",
            type: "text"
        });

        const setupVisualOrderEditor = (input) => {
            if (input.nextSibling && input.nextSibling.classList && input.nextSibling.classList.contains("trix-visual-order")) {
                return;
            }
            input.style.setProperty("display", "none", "important");
            
            const container = document.createElement("div");
            container.className = "trix-visual-order";
            container.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                background: #111;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 6px 12px;
                margin-top: 4px;
                user-select: none;
                width: fit-content;
            `;
            
            const toolDetails = {
                "trix.mask_box": { icon: "✦", label: "Mask Ed." },
                "trix.camraw_box": { icon: "◩", label: "CamRaw" },
                "trix.crop_box": { icon: "⛶", label: "Crop Ed." }
            };
            
            const renderOrder = () => {
                container.innerHTML = "";
                const orderStr = input.value || "trix.camraw_box,trix.mask_box,trix.crop_box";
                const items = orderStr.split(",").filter(Boolean);
                
                items.forEach((itemId, index) => {
                    const detail = toolDetails[itemId];
                    if (!detail) return;
                    
                    const itemEl = document.createElement("div");
                    itemEl.draggable = true;
                    itemEl.dataset.id = itemId;
                    itemEl.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 10px;
                        background: #202024;
                        border: 1px solid #444;
                        border-radius: 4px;
                        cursor: grab;
                        font-size: 11px;
                        font-weight: bold;
                        color: #eee;
                        transition: background 0.2s, border-color 0.2s;
                    `;
                    
                    const iconEl = document.createElement("span");
                    iconEl.innerText = detail.icon;
                    iconEl.style.color = "#00bfff";
                    iconEl.style.fontSize = "13px";
                    
                    const labelEl = document.createElement("span");
                    labelEl.innerText = detail.label;
                    
                    itemEl.append(iconEl, labelEl);
                    
                    itemEl.ondragstart = (e) => {
                        e.dataTransfer.setData("text/plain", index);
                        itemEl.style.opacity = "0.5";
                        itemEl.style.borderColor = "#00bfff";
                    };
                    itemEl.ondragend = () => {
                        itemEl.style.opacity = "1";
                        itemEl.style.borderColor = "#444";
                        renderOrder();
                    };
                    itemEl.ondragover = (e) => {
                        e.preventDefault();
                        itemEl.style.background = "#333a45";
                    };
                    itemEl.ondragleave = () => {
                        itemEl.style.background = "#202024";
                    };
                    itemEl.ondrop = (e) => {
                        e.preventDefault();
                        const srcIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
                        if (isNaN(srcIndex) || srcIndex === index) return;
                        
                        const newItems = [...items];
                        const [removed] = newItems.splice(srcIndex, 1);
                        newItems.splice(index, 0, removed);
                        
                        const newValue = newItems.join(",");
                        input.value = newValue;
                        
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                        
                        renderOrder();
                    };
                    
                    container.appendChild(itemEl);
                });
            };
            
            renderOrder();
            input.parentNode.appendChild(container);
        };

        const setupVisualShiftSlider = (input) => {
            if (input.nextSibling && input.nextSibling.classList && input.nextSibling.classList.contains("trix-visual-shift-wrapper")) {
                return;
            }
            input.style.setProperty("display", "none", "important");
            
            const wrapper = document.createElement("div");
            wrapper.className = "trix-visual-shift-wrapper";
            wrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-top: 4px;
                max-width: 520px;
            `;
            
            const sliderRow = document.createElement("div");
            sliderRow.style.cssText = `
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "0";
            slider.max = "9";
            slider.value = input.value || "0";
            slider.style.cssText = `
                flex: 1;
                cursor: pointer;
                accent-color: #00bfff;
            `;
            
            const labelVal = document.createElement("span");
            labelVal.style.cssText = `
                font-size: 11px;
                font-weight: bold;
                color: #00bfff;
                width: 140px;
                text-align: right;
            `;
            
            const positionLabels = [
                "0: Left (Before Trash)",
                "1: After Trash",
                "2: After Divider 1",
                "3: After Info",
                "4: After Color",
                "5: After Sliders",
                "6: After Mask settings",
                "7: After Divider 2",
                "8: After Undo",
                "9: Right (Before More)"
            ];
            
            const updateLabel = (val) => {
                labelVal.innerText = positionLabels[val] || `Position ${val}`;
            };
            
            slider.oninput = () => {
                const val = parseInt(slider.value, 10);
                updateLabel(val);
                input.value = val;
                input.dispatchEvent(new Event("change", { bubbles: true }));
                input.dispatchEvent(new Event("input", { bubbles: true }));
            };
            
            updateLabel(parseInt(slider.value, 10));
            sliderRow.append(slider, labelVal);
            wrapper.appendChild(sliderRow);
            input.parentNode.appendChild(wrapper);
        };

        const settingsObserver = new MutationObserver(() => {
            const orderInput = document.querySelector('input[id*="Trix AIO Tools.Toolbox.Order"]');
            if (orderInput && !orderInput.dataset.trixInitialized) {
                orderInput.dataset.trixInitialized = "true";
                setupVisualOrderEditor(orderInput);
            }
            
            const shiftInput = document.querySelector('input[id*="Trix AIO Tools.Toolbox.Shift"]');
            if (shiftInput && !shiftInput.dataset.trixInitialized) {
                shiftInput.dataset.trixInitialized = "true";
                setupVisualShiftSlider(shiftInput);
            }
        });
        settingsObserver.observe(document.body, { childList: true, subtree: true });

        const updateColorSettings = () => {
            TRIX_BG = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .NodeBg", "#303540") || "#303540";
            TRIX_NODE_OUTLINE = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .NodeBorder", "#303540") || "#303540";
            TRIX_ACCENT = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .ButtonDefault", "#33789a") || "#33789a";
            TRIX_ACTIVE = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .ButtonActive", "#dd7055") || "#dd7055";
            TRIX_TEXT = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .TextColor", "#e7e7ea") || "#e7e7ea";
            TRIX_ICON_COLOR = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .IconColor", "#cccccc") || "#cccccc";
            TRIX_MASK_TOOLBAR_BG = TRIX_BG;
            TRIX_MASK_TOOLBAR_ICON_BG = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .MaskToolbarIconBg", "#2e333d") || "#2e333d";
            const borderVal = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .NodeBorderWidth", 1);
            TRIX_NODE_BORDER_WIDTH = (borderVal !== undefined && borderVal !== null) ? Number(borderVal) : 1;
            if (isNaN(TRIX_NODE_BORDER_WIDTH)) TRIX_NODE_BORDER_WIDTH = 1;

            // Derive hover, soft panel, control backgrounds, and border colors
            TRIX_ACCENT_HOVER = adjustColorBrightness(TRIX_ACCENT, 20);
            TRIX_ACTIVE_HOVER = adjustColorBrightness(TRIX_ACTIVE, 10);
            TRIX_PANEL = TRIX_BG;
            TRIX_PANEL_SOFT = TRIX_BG;
            TRIX_CONTROL = adjustColorBrightness(TRIX_BG, 10);
            TRIX_CONTROL_HOVER = adjustColorBrightness(TRIX_BG, 20);
            TRIX_BORDER = adjustColorBrightness(TRIX_BG, 30);

            // Update CSS variables for DOM rendering
            const root = document.documentElement;
            root.style.setProperty("--trix-bg", TRIX_BG);
            root.style.setProperty("--trix-panel-soft", TRIX_PANEL_SOFT);
            root.style.setProperty("--trix-control", TRIX_CONTROL);
            root.style.setProperty("--trix-border", TRIX_BORDER);
            root.style.setProperty("--trix-border-width", `${TRIX_NODE_BORDER_WIDTH}px`);
            root.style.setProperty("--trix-accent", TRIX_ACCENT);
            root.style.setProperty("--trix-active", TRIX_ACTIVE);
            root.style.setProperty("--trix-text", TRIX_TEXT);
            root.style.setProperty("--trix-mask-toolbar-bg", TRIX_MASK_TOOLBAR_BG);
            root.style.setProperty("--trix-mask-toolbar-icon-bg", TRIX_MASK_TOOLBAR_ICON_BG);
            root.style.setProperty("--trix-icon", TRIX_ICON_COLOR);
            root.style.setProperty("--trix-accent-hover", TRIX_ACCENT_HOVER);
            root.style.setProperty("--trix-active-hover", TRIX_ACTIVE_HOVER);
            root.style.setProperty("--trix-control-hover", TRIX_CONTROL_HOVER);

            if (typeof syncPreviewColors === "function") {
                syncPreviewColors();
            }

            // Redraw graph and update any active nodes
            if (app.graph) {
                app.graph._nodes.forEach(node => {
                    if (node.type === "TrixLoadImageAIO" || node.comfyClass === "TrixLoadImageAIO") {
                        if (node.updateUIRef) {
                            node.updateUIRef(true);
                        }
                    }
                });
                app.graph.setDirtyCanvas(true, true);
            }
        };

        settingNodeBg = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .NodeBg",
            name: "🎨 Customization Node Colors: Node Background (Hex)",
            defaultValue: "#303540",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });
        settingNodeBorder = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .NodeBorder",
            name: "🎨 Customization Node Colors: Node Border (Hex)",
            defaultValue: "#303540",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });
        settingButtonDefault = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .ButtonDefault",
            name: "🎨 Customization Node Colors: Default Buttons (Hex)",
            defaultValue: "#33789a",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });
        settingButtonActive = app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .ButtonActive",
            name: "🎨 Customization Node Colors: Enabled Settings (Hex)",
            defaultValue: "#dd7055",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });
        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .TextColor",
            name: "🎨 Customization Node Colors: Text Color (Hex)",
            defaultValue: "#e7e7ea",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });
        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .IconColor",
            name: "🎨 Customization Node Colors: Icon Color (Hex)",
            defaultValue: "#cccccc",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });

        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .MaskToolbarIconBg",
            name: "🎨 Customization Node Colors: Mask Toolbar Button Background (Hex)",
            defaultValue: "#2e333d",
            type: "text",
            onChange(val) {
                updateColorSettings();
            }
        });
        app.ui.settings.addSetting({
            id: "Trix AIO Tools.Trix Loader node color .NodeBorderWidth",
            name: "🎨 Customization Node Colors: Node Border Width (px)",
            defaultValue: 1,
            type: "number",
            onChange(val) {
                updateColorSettings();
            }
        });

        // Initialize colors immediately
        updateColorSettings();

        const wrapAll = () => {
            if (window.LiteGraph) {
                if (LiteGraph.LGraphNode) {
                    wrapNodeGetExtraMenuOptions(LiteGraph.LGraphNode);
                }
                const regTypes = LiteGraph.registered_node_types;
                if (regTypes) {
                    for (const name in regTypes) {
                        const registryInfo = regTypes[name];
                        if (registryInfo) {
                            if (registryInfo.class) {
                                wrapNodeGetExtraMenuOptions(registryInfo.class);
                            } else {
                                wrapNodeGetExtraMenuOptions(registryInfo);
                            }
                        }
                    }
                }
                const lgNodes = LiteGraph.Nodes;
                if (lgNodes) {
                    for (const name in lgNodes) {
                        const nodeClass = lgNodes[name];
                        if (nodeClass) {
                            wrapNodeGetExtraMenuOptions(nodeClass);
                        }
                    }
                }
            }
        };
        wrapAll();
        setTimeout(wrapAll, 1000);
        setTimeout(wrapAll, 3000);

        // Enhance Color Settings UI with a Palette Picker and Reset Button
        const TRIX_COLOR_DEFAULTS = {
            "Trix AIO Tools.Trix Loader node color .NodeBg": "#303540",
            "Trix AIO Tools.Trix Loader node color .NodeBorder": "#303540",
            "Trix AIO Tools.Trix Loader node color .ButtonDefault": "#33789a",
            "Trix AIO Tools.Trix Loader node color .ButtonActive": "#dd7055",
            "Trix AIO Tools.Trix Loader node color .TextColor": "#e7e7ea",
            "Trix AIO Tools.Trix Loader node color .IconColor": "#cccccc",
            "Trix AIO Tools.Trix Loader node color .MaskToolbarIconBg": "#2e333d",
            "Trix AIO Tools.Trix Loader node color .NodeBorderWidth": 1
        };

        const findSettingRowContainer = (el) => {
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
                if (parent.tagName === "TR") return parent;
                if (parent.classList.contains("comfy-setting-row") || 
                    parent.classList.contains("comfy-settings-row") ||
                    parent.classList.contains("setting-row")) {
                    return parent;
                }
                const input = parent.querySelector("input[type='text'], input[type='number'], input, select");
                if (input && parent.tagName !== "TABLE" && parent.tagName !== "TBODY" && parent.tagName !== "FORM" && 
                    !parent.classList.contains("comfy-settings-table") && !parent.classList.contains("comfy-table")) {
                    return parent;
                }
                parent = parent.parentElement;
            }
            return el.closest("tr") || el.parentElement;
        };

        const enhanceColorSettingsUI = () => {
            const settingIds = Object.keys(TRIX_COLOR_DEFAULTS);
            const rows = [];
            let firstRow = null;

            const settingNames = {
                "Trix AIO Tools.Trix Loader node color .NodeBg": "🎨 Customization Node Colors: Node Background (Hex)",
                "Trix AIO Tools.Trix Loader node color .NodeBorder": "🎨 Customization Node Colors: Node Border (Hex)",
                "Trix AIO Tools.Trix Loader node color .ButtonDefault": "🎨 Customization Node Colors: Default Buttons (Hex)",
                "Trix AIO Tools.Trix Loader node color .ButtonActive": "🎨 Customization Node Colors: Enabled Settings (Hex)",
                "Trix AIO Tools.Trix Loader node color .TextColor": "🎨 Customization Node Colors: Text Color (Hex)",
                "Trix AIO Tools.Trix Loader node color .IconColor": "🎨 Customization Node Colors: Icon Color (Hex)",
                "Trix AIO Tools.Trix Loader node color .MaskToolbarIconBg": "🎨 Customization Node Colors: Mask Toolbar Button Background (Hex)",
                "Trix AIO Tools.Trix Loader node color .NodeBorderWidth": "🎨 Customization Node Colors: Node Border Width (px)"
            };

            const cleanText = (txt) => txt ? txt.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

            settingIds.forEach(id => {
                const displayName = settingNames[id];
                let inputEl = null;
                let rowEl = null;

                // 1. Search by exact display name label matching
                if (displayName) {
                    const targetClean = cleanText(displayName);
                    const labels = document.querySelectorAll("label, td, span, th, div.comfy-setting-name");
                    for (let el of labels) {
                        if (el.textContent && cleanText(el.textContent) === targetClean) {
                            const container = findSettingRowContainer(el);
                            if (container) {
                                const input = container.querySelector("input[type='text'], input[type='number'], input, select");
                                if (input) {
                                    inputEl = input;
                                    rowEl = container;
                                    break;
                                }
                            }
                        }
                    }
                }

                // 2. Fallback to direct ID/name matching
                if (!inputEl) {
                    inputEl = document.getElementById(id);
                    if (!inputEl) {
                        const inputs = document.getElementsByTagName("input");
                        for (let input of inputs) {
                            if (input.name === id || input.id === id || input.id.endsWith(id)) {
                                inputEl = input;
                                break;
                            }
                        }
                    }
                    if (inputEl) {
                        rowEl = findSettingRowContainer(inputEl);
                    }
                }

                if (inputEl && rowEl) {
                    rows.push({ id, rowEl, inputEl });
                    if (!firstRow) firstRow = rowEl;

                    if (!inputEl.dataset.trixEnhanced) {
                        inputEl.dataset.trixEnhanced = "true";
                        
                        const defColor = TRIX_COLOR_DEFAULTS[id];
                        const parent = inputEl.parentElement;
                        const container = document.createElement("div");
                        container.className = "trix-setting-color-container";
                        container.style.cssText = "display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box;";
                        
                        parent.insertBefore(container, inputEl);
                        container.appendChild(inputEl);
                        
                        inputEl.style.flex = "1";
                        inputEl.style.minWidth = "60px";

                        const colorPicker = document.createElement("input");
                        colorPicker.type = "color";
                        colorPicker.value = /^#[0-9A-Fa-f]{6}$/.test(inputEl.value) ? inputEl.value : (defColor && typeof defColor === 'string' && defColor.startsWith('#') ? defColor : "#ffffff");
                        colorPicker.style.cssText = "width: 28px; height: 24px; padding: 0; border: 1px solid #444; border-radius: 4px; background: transparent; cursor: pointer; box-sizing: border-box; flex-shrink: 0;";
                        
                        const resetBtn = document.createElement("button");
                        resetBtn.type = "button";
                        resetBtn.innerHTML = "↺";
                        resetBtn.title = `Reset to default (${defColor})`;
                        resetBtn.style.cssText = "width: 24px; height: 24px; padding: 0; border: 1px solid #444; border-radius: 4px; background: #2a2a2f; color: #ccc; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; line-height: 1; transition: 0.15s; box-sizing: border-box; flex-shrink: 0;";
                        
                        resetBtn.onmouseenter = () => { resetBtn.style.background = "#3a3a3f"; resetBtn.style.color = "#fff"; };
                        resetBtn.onmouseleave = () => { resetBtn.style.background = "#2a2a2f"; resetBtn.style.color = "#ccc"; };

                        const syncInputToPicker = () => {
                            let val = inputEl.value;
                            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                colorPicker.value = val;
                            }
                        };
                        inputEl.addEventListener("input", syncInputToPicker);
                        inputEl.addEventListener("change", syncInputToPicker);

                        const syncPickerToInput = (e) => {
                            inputEl.value = e.target.value;
                            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                            inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                        };
                        colorPicker.addEventListener("input", syncPickerToInput);
                        colorPicker.addEventListener("change", syncPickerToInput);

                        resetBtn.onclick = (e) => {
                            e.preventDefault();
                            inputEl.value = defColor;
                            if (colorPicker.type === "color") {
                                colorPicker.value = defColor;
                            }
                            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                            inputEl.dispatchEvent(new Event("change", { bubbles: true }));
                        };

                        if (inputEl.type !== "number") {
                            container.appendChild(colorPicker);
                        }
                        container.appendChild(resetBtn);
                    }
                }
            });

            if (rows.length > 0 && firstRow && firstRow.parentElement) {
                const parentTable = firstRow.parentElement;
                
                // Hide all original rows completely (both labels and inputs)
                rows.forEach(r => {
                    r.rowEl.style.setProperty("display", "none", "important");
                });

                let previewRow = parentTable.querySelector(".trix-node-color-preview-row");
                if (previewRow) {
                    if (typeof syncPreviewColors === "function") {
                        syncPreviewColors();
                    }
                    return;
                }

                if (!document.getElementById("trix-color-preview-styles")) {
                    const style = document.createElement("style");
                    style.id = "trix-color-preview-styles";
                    style.innerHTML = `
                        .trix-prev-item {
                            transition: all 0.15s ease-in-out !important;
                        }
                        .trix-prev-item:hover {
                            outline: 1.5px solid rgba(255, 255, 255, 0.35) !important;
                            outline-offset: 1px !important;
                            filter: brightness(1.15) !important;
                        }
                        .trix-interactive-preview-card:hover {
                            box-shadow: 0 6px 20px rgba(0,0,0,0.6) !important;
                            outline: 1.5px solid rgba(255, 255, 255, 0.35) !important;
                            outline-offset: 1px !important;
                        }
                        .trix-color-control-row:hover {
                            background: rgba(255,255,255,0.08) !important;
                            border-color: rgba(255,255,255,0.15) !important;
                        }
                        .trix-theme-editor * {
                            box-sizing: border-box;
                        }
                    `;
                    document.head.appendChild(style);
                }

                previewRow = document.createElement("tr");
                previewRow.className = "trix-node-color-preview-row";
                
                const td = document.createElement("td");
                td.colSpan = 2;
                td.style.cssText = "padding: 15px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center;";
                
                const themeEditor = document.createElement("div");
                themeEditor.className = "trix-theme-editor";
                themeEditor.style.cssText = `display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; align-items: center; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 15px; width: 100%; max-width: 550px; margin: 0 auto; box-sizing: border-box;`;

                const previewCard = document.createElement("div");
                previewCard.className = "trix-interactive-preview-card";
                previewCard.style.cssText = `
                    width: 180px; padding: 8px; border-radius: 8px; background: var(--trix-bg);
                    border: var(--trix-border-width, 1px) solid var(--trix-border);
                    font-family: sans-serif; color: var(--trix-text); box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                    position: relative; user-select: none; text-align: left; flex-shrink: 0; cursor: pointer;
                    transition: border-color 0.15s ease, background-color 0.15s ease, border-width 0.1s ease;
                `;
                
                const triggerPicker = (id) => {
                    const rowInfo = rows.find(r => r.id === id);
                    if (rowInfo && rowInfo.rowEl) {
                        const picker = rowInfo.rowEl.querySelector("input[type='color']") || rowInfo.rowEl.querySelector("input[type='number']");
                        if (picker) picker.click();
                    }
                };

                previewCard.innerHTML = `
                    <div class="trix-prev-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="font-size: 9px; font-weight: bold; display: flex; align-items: center; gap: 3px; color: var(--trix-text);">
                            <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--trix-icon);"></span>
                            <span>Load Image AIO</span>
                        </div>
                    </div>
                    <div class="trix-prev-item trix-prev-imagebox" style="height: 70px; background: rgba(0,0,0,0.2); border: 1px dashed var(--trix-border); border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; color: var(--trix-icon); font-size: 8px;">
                        <span>Image Area</span>
                    </div>
                    <div class="trix-prev-item trix-prev-upload" style="height: 16px; background: var(--trix-accent); color: var(--trix-text); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; margin-bottom: 6px;">Upload Image</div>
                    <div style="display: flex; gap: 3px; margin-bottom: 6px;">
                        <div class="trix-prev-item trix-prev-tab-active" style="flex: 1; height: 14px; background: var(--trix-active); color: var(--trix-text); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold;">MASK</div>
                        <div class="trix-prev-item trix-prev-tab-default" style="flex: 1; height: 14px; background: var(--trix-accent); color: var(--trix-text); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold;">FILTER</div>
                    </div>
                    <div class="trix-prev-toolbar" style="height: 22px; background: var(--trix-bg); border: 1px solid var(--trix-border); border-radius: 4px; display: flex; align-items: center; padding: 0 4px; gap: 3px;">
                        <div style="flex: 1; height: 3px; background: rgba(255,255,255,0.2); border-radius: 1px; position: relative; margin: 0 4px;">
                            <div style="position: absolute; left: 30%; top: -2px; width: 6px; height: 6px; border-radius: 50%; background: var(--trix-accent);"></div>
                        </div>
                        <div class="trix-prev-item trix-prev-icon-bg" style="width: 14px; height: 14px; background: var(--trix-mask-toolbar-icon-bg); border: 1px solid var(--trix-border); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: var(--trix-icon); transition: background-color 0.15s ease;">👁</div>
                        <div class="trix-prev-item trix-prev-icon-bg" style="width: 14px; height: 14px; background: var(--trix-mask-toolbar-icon-bg); border: 1px solid var(--trix-border); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: var(--trix-icon); transition: background-color 0.15s ease;">⎌</div>
                    </div>
                `;

                previewCard.addEventListener("click", (e) => {
                    const target = e.target;
                    if (target.closest(".trix-prev-icon-bg")) {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .MaskToolbarIconBg");
                        e.stopPropagation();
                        return;
                    }
                    if (target.closest(".trix-prev-imagebox")) {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .NodeBg");
                        e.stopPropagation();
                        return;
                    }
                    if (target.closest(".trix-prev-upload") || target.closest(".trix-prev-tab-default")) {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .ButtonDefault");
                        e.stopPropagation();
                        return;
                    }
                    if (target.closest(".trix-prev-tab-active")) {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .ButtonActive");
                        e.stopPropagation();
                        return;
                    }
                    if (target.closest(".trix-prev-header")) {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .TextColor");
                        e.stopPropagation();
                        return;
                    }
                    
                    const rect = previewCard.getBoundingClientRect();
                    const pad = Math.max(10, TRIX_NODE_BORDER_WIDTH + 4);
                    if (e.clientX - rect.left < pad || rect.right - e.clientX < pad || e.clientY - rect.top < pad || rect.bottom - e.clientY < pad) {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .NodeBorder");
                    } else {
                        triggerPicker("Trix AIO Tools.Trix Loader node color .NodeBg");
                    }
                    e.stopPropagation();
                });

                const controlsList = document.createElement("div");
                controlsList.className = "trix-color-controls-list";
                controlsList.style.cssText = "display: flex; flex-direction: column; gap: 6px; min-width: 240px; flex: 1; text-align: left;";

                const displayNames = {
                    "Trix AIO Tools.Trix Loader node color .NodeBg": "Node Background",
                    "Trix AIO Tools.Trix Loader node color .NodeBorder": "Node Border",
                    "Trix AIO Tools.Trix Loader node color .ButtonDefault": "Default Buttons",
                    "Trix AIO Tools.Trix Loader node color .ButtonActive": "Active Setting Tab",
                    "Trix AIO Tools.Trix Loader node color .TextColor": "Text Color",
                    "Trix AIO Tools.Trix Loader node color .IconColor": "Icon Color",
                    "Trix AIO Tools.Trix Loader node color .MaskToolbarIconBg": "Toolbar Button Background"
                };

                settingIds.forEach(id => {
                    if (id === "Trix AIO Tools.Trix Loader node color .NodeBorderWidth") return;
                    const labelName = displayNames[id];
                    if (!labelName) return; // Ignore deleted settings
                    
                    const currentVal = app.ui.settings.getSettingValue(id, TRIX_COLOR_DEFAULTS[id]) || TRIX_COLOR_DEFAULTS[id];
                    
                    const row = document.createElement("div");
                    row.className = "trix-color-control-row";
                    row.dataset.settingId = id;
                    row.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 4px 8px; cursor: pointer;";
                    row.innerHTML = `<div style="display: flex; align-items: center; gap: 6px; pointer-events: none;"><span class="trix-color-indicator" style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${currentVal};"></span><span style="color: #eee; font-weight: bold; font-size: 11px;">${labelName}</span></div><span class="trix-color-code-badge" style="font-family: monospace; font-size: 10px; background: #111; border: 1px solid #444; border-radius: 3px; padding: 1px 4px; color: #ccc;">${currentVal.toUpperCase()}</span>`;
                    row.addEventListener("click", () => triggerPicker(id));
                    controlsList.appendChild(row);
                });

                const borderSliderContainer = document.createElement("div");
                borderSliderContainer.style.cssText = "display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; padding: 6px 8px; margin-top: 4px;";
                const initialWidth = app.ui.settings.getSettingValue("Trix AIO Tools.Trix Loader node color .NodeBorderWidth", 1);
                borderSliderContainer.innerHTML = `<div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #eee; font-weight: bold;"><span>Node Border Width</span><span class="trix-border-width-val" style="font-family: monospace; font-size: 10px; background: #111; border: 1px solid #444; border-radius: 3px; padding: 1px 4px; color: #ccc;">${initialWidth}</span></div><input type="range" min="0" max="5" value="${initialWidth}" style="width: 100%; cursor: pointer;">`;
                const rangeInput = borderSliderContainer.querySelector("input");
                rangeInput.addEventListener("input", (e) => {
                    const val = Number(e.target.value);
                    borderSliderContainer.querySelector(".trix-border-width-val").innerText = String(val);
                    app.ui.settings.setSettingValue("Trix AIO Tools.Trix Loader node color .NodeBorderWidth", val);
                    const rowInfo = rows.find(r => r.id === "Trix AIO Tools.Trix Loader node color .NodeBorderWidth");
                    if (rowInfo && rowInfo.inputEl) {
                        rowInfo.inputEl.value = val;
                    }
                });
                controlsList.appendChild(borderSliderContainer);

                const resetAllBtn = document.createElement("button");
                resetAllBtn.innerText = "↺ Reset All Colors";
                resetAllBtn.style.cssText = "margin-top: 8px; padding: 4px 10px; border: 1px solid #444; border-radius: 4px; background: #2a2a2f; color: #ccc; font-size: 10.5px; font-weight: bold; cursor: pointer;";
                resetAllBtn.onclick = () => {
                    rows.forEach(r => {
                        const rowEl = r.rowEl;
                        const reset = rowEl.querySelector("button");
                        if (reset) reset.click();
                    });
                };
                controlsList.appendChild(resetAllBtn);

                themeEditor.appendChild(previewCard);
                themeEditor.appendChild(controlsList);
                td.appendChild(themeEditor);
                previewRow.appendChild(td);
                parentTable.insertBefore(previewRow, firstRow);

                syncPreviewColors = () => {
                    rows.forEach(r => {
                        if (r.id === "Trix AIO Tools.Trix Loader node color .NodeBorderWidth") {
                            rangeInput.value = r.inputEl.value;
                            borderSliderContainer.querySelector(".trix-border-width-val").innerText = String(r.inputEl.value);
                            return;
                        }
                        const val = r.inputEl.value;
                        const row = controlsList.querySelector(`[data-setting-id="${r.id}"]`);
                        if (row) {
                            row.querySelector(".trix-color-indicator").style.backgroundColor = val;
                            row.querySelector(".trix-color-code-badge").innerText = val.toUpperCase();
                        }
                    });
                };
                rows.forEach(r => r.rowEl.style.setProperty("display", "none", "important"));
            }
        };

        let enhanceTimeout = null;
        const observer = new MutationObserver((mutations) => {
            if (mutations.some(m => m.addedNodes.length)) {
                if (enhanceTimeout) clearTimeout(enhanceTimeout);
                enhanceTimeout = setTimeout(enhanceColorSettingsUI, 50);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        wrapNodeGetExtraMenuOptions(nodeType);
        if (nodeData.name === "TrixLoadImageAIO") {
            Object.defineProperty(nodeType.prototype, "imgs", {
                get() { return null; },
                set(val) { /* do nothing */ },
                configurable: true
            });
            Object.defineProperty(nodeType.prototype, "image", {
                get() { return null; },
                set(val) { /* do nothing */ },
                configurable: true
            });

            nodeType.prototype.getTooltip = function() {
                return `🪬 TrixLoader — All-in-one loader, mask editor, and RAW color corrector.

Inputs & Outputs:
• IMAGE — Processed image with color corrections and cropping applied.
• MASK — Hand-drawn or AI-generated mask.
• original_input — Untouched original input image (useful for comparison).

Control Tabs on the Node:
1. ❂ COLOR GRADING [Filter] — Toggle RAW filters, adjust exposure, saturation, curves, and effects. Double-click the tab or click "Live Camera Raw" to open the fullscreen editor.
2. ✎ MASKING [Mask] — Settings for drawing masks directly on the node (brush size, hardness). Double-click the tab to open the fullscreen Trix Mask Editor.
3. 回 RESIZING & CROPPING [Resize] — Control resolution, proportions (stretch, resize, crop, pad) and outpaint feathering. Double-click the tab to open the fullscreen Crop Editor.

💡 Tips:
• File Drag & Drop: Drag an image directly onto the node canvas or click "Choose file to upload".
• Node Context Menu: Right-click the node to Copy/Paste Images and Masks directly.
• Auto-Saving: All configurations are stored inside your ComfyUI workflow JSON file.`;
            };

            const onConfigureOriginal = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(info) {
                this._isConfiguring = true; 
                this._isFirstLoad = false; 
                this._lastImageName = null;
                this._currentLiveUrl = null;
                if (this.imgTagRef) {
                    this.imgTagRef.src = "";
                }
                if (onConfigureOriginal) onConfigureOriginal.apply(this, arguments);
                applyTrixNodeChrome(this);
                refreshTrixOutputs(this);
                if (info.size) {
                    this.size = [info.size[0], info.size[1]];
                    this._loadedSize = [...info.size];
                }
                
                const uWgt = this.widgets ? this.widgets.find(w => w.name === "trix_uuid") : null;
                if (uWgt) {
                    if (!uWgt.value || isUUIDInUse(uWgt.value, this)) {
                        uWgt.value = generateTrixUUID();
                    }
                }

                if (this.syncHTMLRef) this.syncHTMLRef();
                if (this.updateUIRef) this.updateUIRef(true);

                const inImageInput = this.inputs ? this.inputs.find(slot => slot && slot.name === "in_image") : null;
                const willBeWired = inImageInput && inImageInput.link !== null && inImageInput.link !== undefined;
                if (willBeWired) {
                    const delayPull = () => {
                        if (this.pullLivePreviewRef) this.pullLivePreviewRef();
                    };
                    setTimeout(delayPull, 100);
                    setTimeout(delayPull, 300);
                    setTimeout(delayPull, 600);
                    setTimeout(delayPull, 1000);
                    setTimeout(delayPull, 2000);
                }

                setTimeout(() => {
                    this._isConfiguring = false;
                }, 1500); 
            };

            const onCloneOriginal = nodeType.prototype.clone;
            nodeType.prototype.clone = function() {
                const cloned = onCloneOriginal ? onCloneOriginal.apply(this, arguments) : LiteGraph.LGraphNode.prototype.clone.call(this);
                cloned._loadedSize = [...this.size];
                cloned._isFirstLoad = false; 
                const uWgt = cloned.widgets ? cloned.widgets.find(w => w.name === "trix_uuid") : null;
                if (uWgt) {
                    uWgt.value = generateTrixUUID();
                }
                return cloned;
            };

            const origAddWidget = nodeType.prototype.addWidget || LiteGraph.LGraphNode.prototype.addWidget;
            nodeType.prototype.addWidget = function(type, name, val, cb, extra) {
                const w = origAddWidget.apply(this, arguments);
                if (w && typeof name === "string") {
                    const normalizedName = name.toLowerCase();
                    const normalizedType = String(type || w.type || "").toLowerCase();
                    if (
                        normalizedName === "choose file to upload" ||
                        (normalizedName.includes("choose") && normalizedName.includes("upload")) ||
                        ((normalizedName === "upload" || normalizedName === "image_upload") && normalizedType === "button")
                    ) {
                        hideWidget(w);
                        if (this.widgets) {
                            const idx = this.widgets.indexOf(w);
                            if (idx !== -1) this.widgets.splice(idx, 1);
                        }
                        return w;
                    }
                    const hideNames = ["trix_uuid", "mask_data", "crop_data", "cr_enable", "hsl_active", "hsl_data", "curve_active", "curve_data", "width", "height", "pad_left", "pad_top", "pad_right", "pad_bottom", "upscale_method", "keep_proportion", "scale_by", "condition", "feathering", "divisible_by", "enable_resize", "crop_position", "pad_color", "fill_color"];
                    if (hideNames.includes(name) || name.startsWith("cr_") || name.startsWith("hsl_") || name.startsWith("curve_")) {
                        hideWidget(w);
                    }
                }
                return w;
            };

            const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(canvas, options) {
                if (origGetExtraMenuOptions) {
                    origGetExtraMenuOptions.apply(this, arguments);
                }
                
                const showCopyImage = settingCopyImage.value;
                const showPasteImage = settingPasteImage.value;
                const showCopyMask = settingCopyMask.value;
                const showPasteMask = settingPasteMask.value;

                if (showCopyImage || showPasteImage) {
                    options.push(null);
                    if (showCopyImage && this.imgTagRef && this.imgTagRef.complete && this.imgTagRef.naturalWidth > 0) {
                        options.push({
                            content: "🗐 Copy Image",
                            callback: () => {
                                try {
                                    const tCanvas = document.createElement("canvas");
                                    tCanvas.width = this.imgTagRef.naturalWidth;
                                    tCanvas.height = this.imgTagRef.naturalHeight;
                                    const tCtx = tCanvas.getContext("2d");
                                    tCtx.drawImage(this.imgTagRef, 0, 0);
                                    tCanvas.toBlob(async (blob) => {
                                        if (blob) {
                                            await navigator.clipboard.write([
                                                new ClipboardItem({ "image/png": blob })
                                            ]);
                                        }
                                    }, "image/png");
                                } catch (err) {
                                    console.error("TrixLoader Copy Image Error:", err);
                                    alert("Failed to copy image.");
                                }
                            }
                        });
                    }
                    if (showPasteImage) {
                        options.push({
                            content: "⎘ Paste Image",
                            callback: async () => {
                                try {
                                    const items = await navigator.clipboard.read();
                                    for (let item of items) {
                                        if (item.types.some(t => t.startsWith('image/'))) {
                                            const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
                                            const localUuid = this.widgets ? this.widgets.find(w => w.name === "trix_uuid")?.value : null;
                                            const filename = trixAioFilename("paste", localUuid || this.id, "", blob.type);
                                            const newFile = new File([blob], filename, { type: blob.type || "image/png" }); 
                                            const body = new FormData(); body.append("image", newFile, filename); trixAppendAioUploadFields(body, filename);
                                            const resp = await fetch("/upload/image", { method: "POST", body: body }); 
                                            if (resp.status === 200) { 
                                                const data = await resp.json(); 
                                                const finalName = trixAioFullPath(data);
                                                const imgWidget = this.widgets.find(w => w.name === "image");
                                                if (imgWidget) { imgWidget.value = finalName; if (imgWidget.callback) imgWidget.callback(finalName); } 
                                            }
                                            break;
                                        }
                                    }
                                } catch (err) {
                                    alert("Failed to paste image: " + err);
                                }
                            }
                        });
                    }
                }

                if (showCopyMask || showPasteMask) {
                    options.push(null);
                    if (showCopyMask) {
                        options.push({
                            content: "⚇ Copy Mask",
                            callback: () => {
                                if (!this.maskCanvasRef) return;
                                try {
                                    this.maskCanvasRef.toBlob(async (blob) => {
                                        if (blob) {
                                            await navigator.clipboard.write([
                                                new ClipboardItem({ "image/png": blob })
                                            ]);
                                        }
                                    }, "image/png");
                                } catch (err) {
                                    console.error("TrixLoader Copy Mask Error:", err);
                                }
                            }
                        });
                    }
                    if (showPasteMask) {
                        options.push({
                            content: "⚉ Paste Mask",
                            callback: async () => {
                                if (!this.maskCanvasRef) return;
                                try {
                                    const items = await navigator.clipboard.read();
                                    for (let item of items) {
                                        if (item.types.some(t => t.startsWith('image/'))) {
                                            const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
                                            const img = new Image();
                                            img.onload = () => {
                                                const tempCanvas = document.createElement("canvas");
                                                tempCanvas.width = this.maskCanvasRef.width;
                                                tempCanvas.height = this.maskCanvasRef.height;
                                                const tempCtx = tempCanvas.getContext("2d");
                                                tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                                                
                                                const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                                                const data = imgData.data;
                                                
                                                let hasAlpha = false;
                                                for (let i = 0; i < data.length; i += 4) {
                                                    if (data[i + 3] < 255) {
                                                        hasAlpha = true;
                                                        break;
                                                    }
                                                }
                                                
                                                for (let i = 0; i < data.length; i += 4) {
                                                    const r = data[i];
                                                    const g = data[i + 1];
                                                    const b = data[i + 2];
                                                    const a = data[i + 3];
                                                    
                                                    let maskVal = 0;
                                                    if (hasAlpha) {
                                                        maskVal = a;
                                                    } else {
                                                        maskVal = Math.max(r, g, b);
                                                    }
                                                    
                                                    data[i] = 255;
                                                    data[i + 1] = 0;
                                                    data[i + 2] = 0;
                                                    data[i + 3] = maskVal;
                                                }
                                                
                                                const mctx = this.maskCanvasRef.getContext("2d");
                                                mctx.clearRect(0, 0, this.maskCanvasRef.width, this.maskCanvasRef.height);
                                                const newImgData = mctx.createImageData(tempCanvas.width, tempCanvas.height);
                                                newImgData.data.set(data);
                                                mctx.putImageData(newImgData, 0, 0);
                                                
                                                if (this.saveHistoryRef) this.saveHistoryRef();
                                                if (app.graph) app.graph.setDirtyCanvas(true, true);
                                            };
                                            img.src = URL.createObjectURL(blob);
                                            break;
                                        }
                                    }
                                } catch (err) {
                                    alert("Failed to paste mask: " + err);
                                }
                            }
                        });
                    }
                }
            };

            const doFloodFillWorker = (mctx, startX, startY, fillR, fillG, fillB, fillA, tolerance) => {
                return new Promise((resolve) => {
                    const w = mctx.canvas.width; const h = mctx.canvas.height;
                    startX = Math.floor(startX); startY = Math.floor(startY);
                    
                    if (startX < 0 || startX >= w || startY < 0 || startY >= h) { resolve(); return; }
                    
                    const imgData = mctx.getImageData(0, 0, w, h);
                    
                    const workerCode = `
                        self.onmessage = function(e) {
                            const { imgData, startX, startY, fillR, fillG, fillB, fillA, tolerance, w, h } = e.data;
                            const pixels = imgData.data;
                            const startIdx = (startY * w + startX) * 4;
                            const sr = pixels[startIdx]; const sg = pixels[startIdx + 1]; const sb = pixels[startIdx + 2]; const sa = pixels[startIdx + 3];
                            
                            if (Math.abs(sr - fillR) <= tolerance && Math.abs(sg - fillG) <= tolerance && Math.abs(sb - fillB) <= tolerance && Math.abs(sa - fillA) <= tolerance) {
                                self.postMessage(imgData); return;
                            }
                            
                            const saWeight = sa / 255.0; const psr = sr * saWeight; const psg = sg * saWeight; const psb = sb * saWeight;
                            const stack = [startX, startY]; const filledMap = new Uint8Array(w * h);
                            
                            const match = (idx) => {
                                const r = pixels[idx], g = pixels[idx+1], b = pixels[idx+2], a = pixels[idx+3];
                                const aWeight = a / 255.0;
                                return (Math.abs((r * aWeight) - psr) <= tolerance && Math.abs((g * aWeight) - psg) <= tolerance && Math.abs((b * aWeight) - psb) <= tolerance && Math.abs(a - sa) <= tolerance);
                            };
                            
                            while (stack.length > 0) {
                                const y = stack.pop(); const x = stack.pop();
                                let lx = x; while (lx >= 0 && match((y * w + lx) * 4)) lx--; lx++;
                                let rx = x; while (rx < w && match((y * w + rx) * 4)) rx++; rx--;
                                
                                let spanUp = false; let spanDown = false;
                                for (let i = lx; i <= rx; i++) {
                                    const pixelIdx = y * w + i; const dataIdx = pixelIdx * 4;
                                    pixels[dataIdx] = fillR; pixels[dataIdx+1] = fillG; pixels[dataIdx+2] = fillB; pixels[dataIdx+3] = fillA; filledMap[pixelIdx] = 1; 
                                    
                                    if (y > 0) { if (match(((y - 1) * w + i) * 4)) { if (!spanUp) { stack.push(i, y - 1); spanUp = true; } } else { spanUp = false; } }
                                    if (y < h - 1) { if (match(((y + 1) * w + i) * 4)) { if (!spanDown) { stack.push(i, y + 1); spanDown = true; } } else { spanDown = false; } }
                                }
                            }
                            
                            const expandRadius = 2; 
                            if (expandRadius > 0) {
                                for (let y = 0; y < h; y++) {
                                    for (let x = 0; x < w; x++) {
                                        if (filledMap[y * w + x] === 1) {
                                            let isBorder = (x > 0 && filledMap[y * w + (x - 1)] === 0) || (x < w - 1 && filledMap[y * w + (x + 1)] === 0) || (y > 0 && filledMap[(y - 1) * w + x] === 0) || (y < h - 1 && filledMap[(y + 1) * w + x] === 0);
                                            if (isBorder) {
                                                for (let dy = -expandRadius; dy <= expandRadius; dy++) {
                                                    for (let dx = -expandRadius; dx <= expandRadius; dx++) {
                                                        if (dx * dx + dy * dy <= expandRadius * expandRadius) {
                                                            const nx = x + dx; const ny = y + dy;
                                                            if (nx >= 0 && nx < w && ny >= 0 && ny < h && filledMap[ny * w + nx] === 0) {
                                                                const nidx = (ny * w + nx) * 4;
                                                                pixels[nidx] = fillR; pixels[nidx+1] = fillG; pixels[nidx+2] = fillB; pixels[nidx+3] = fillA;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            self.postMessage(imgData);
                        };
                    `;
                    const blob = new Blob([workerCode], { type: 'application/javascript' });
                    const worker = new Worker(URL.createObjectURL(blob));
                    
                    worker.onmessage = function(e) {
                        mctx.putImageData(e.data, 0, 0);
                        worker.terminate();
                        resolve();
                    };
                    worker.postMessage({ imgData, startX, startY, fillR, fillG, fillB, fillA, tolerance, w, h });
                });
            };

            nodeType.prototype.getLayoutMetrics = function() {
                if (!this.imgTagRef || !this.imgTagRef.naturalWidth) return null;

                let nativeHeight = 36;
                if (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) {
                    nativeHeight = LiteGraph.NODE_TITLE_HEIGHT + 6;
                }
                
                const uiWidget = this.widgets ? this.widgets.find(w => w && w.name === "trix_ui_v2") : null;
                if (uiWidget && uiWidget.last_y !== undefined && uiWidget.last_y > 0) {
                    nativeHeight = uiWidget.last_y;
                } else if (this.widgets) {
                    for (let wgt of this.widgets) {
                        if (wgt && wgt.name === "trix_ui_v2") break;
                        if (wgt && wgt.type !== "hidden") {
                            nativeHeight += (wgt.computeSize ? wgt.computeSize()[1] : (typeof LiteGraph !== "undefined" ? LiteGraph.NODE_WIDGET_HEIGHT : 20)) + 4;
                        }
                    }
                }

                const headerH = this.headerContainerRef ? Math.max(50, this.headerContainerRef.offsetHeight || 0) : 88; 
                const headerMarginTop = TRIX_HEADER_OFFSET_Y;
                const padX = 6;
                const padTop = 4;
                const padBottom = 4;
                const gap = TRIX_IMAGE_TOOLBAR_GAP;

                const availableW = this.size[0] - (padX * 2);
                const availableH = this.size[1] - nativeHeight - padTop - headerMarginTop - headerH - gap - padBottom;

                if (availableW <= 0 || availableH <= 0) return null;

                const aspect = this.imgTagRef.naturalHeight / this.imgTagRef.naturalWidth;
                let w = availableW;
                let h = w * aspect;

                if (h > availableH) {
                    h = availableH;
                    w = h / aspect;
                }

                const centerX = (availableW - w) / 2;
                const centerY = (availableH - h) / 2;

                const graphX = padX + centerX;
                const graphY = nativeHeight + padTop + headerMarginTop + headerH + gap + centerY;

                const CALIBRATE_X = 3; 
                const CALIBRATE_Y = -2; 

                const localX = centerX + CALIBRATE_X;
                const localY = centerY + CALIBRATE_Y;

                return {
                    graphX, graphY,
                    localX, localY,
                    availableW, availableH,
                    w, h,
                    scale: w / this.imgTagRef.naturalWidth
                };
            };

            nodeType.prototype.getImageRect = function() {
                const m = this.getLayoutMetrics();
                return m ? { x: m.graphX, y: m.graphY, w: m.w, h: m.h, scale: m.scale } : null;
            };

            nodeType.prototype.drawTrixPreview = function(ctx, coverNodeBody = false) {
                const modeWidget = this.widgets ? this.widgets.find(w => w && w.name === "mode") : null;
                const mode = modeWidget ? modeWidget.value : "Preview";
                if (mode === "Resize" && !this.isFullscreen) return;
                if (mode === "Filter") return; 

                if (this.imgTagRef && this.imgTagRef.naturalWidth > 0 && !this.isPreviewHidden && !this.isFullscreen) {
                    const rect = this.getImageRect();
                    if (!rect) return;
                    
                    ctx.save();

                    if (coverNodeBody) {
                        const fillX = 1;
                        const fillY = Math.max(0, Math.floor(rect.y) - 2);
                        const fillW = Math.max(1, this.size[0] - 2);
                        const fillH = Math.max(1, this.size[1] - fillY - 1);
                        const r = Math.max(0, Math.min(TRIX_NODE_RADIUS, fillW / 2, fillH / 2));

                        ctx.fillStyle = TRIX_BG;
                        ctx.beginPath();
                        ctx.moveTo(fillX, fillY);
                        ctx.lineTo(fillX + fillW, fillY);
                        ctx.lineTo(fillX + fillW, fillY + fillH - r);
                        ctx.quadraticCurveTo(fillX + fillW, fillY + fillH, fillX + fillW - r, fillY + fillH);
                        ctx.lineTo(fillX + r, fillY + fillH);
                        ctx.quadraticCurveTo(fillX, fillY + fillH, fillX, fillY + fillH - r);
                        ctx.lineTo(fillX, fillY);
                        ctx.closePath();
                        ctx.fill();
                    }
                    
                    ctx.drawImage(this.imgTagRef, rect.x, rect.y, rect.w, rect.h);
                    
                    if (this.maskCanvasRef && !this._isMaskHidden) {
                        ctx.shadowColor = "transparent"; 
                        ctx.globalAlpha = this._visualOpacityStandard !== undefined ? this._visualOpacityStandard : 0.8;
                        ctx.drawImage(this.maskCanvasRef, rect.x, rect.y, rect.w, rect.h);
                    }
                    ctx.restore();
                }
            };

            nodeType.prototype.onDrawBackground = function(ctx) {
                this.boxcolor = "rgba(0,0,0,0)";
                if (this.flags.collapsed) return;
                // Draw the body background starting at y = 0 to cover the header color in the slot area
                const nodeRadius = (typeof LiteGraph !== "undefined" && Number.isFinite(LiteGraph.ROUND_RADIUS)) ? LiteGraph.ROUND_RADIUS : TRIX_NODE_RADIUS;
                ctx.save();
                ctx.fillStyle = TRIX_BG;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.size[0], 0);
                ctx.lineTo(this.size[0], this.size[1] - nodeRadius);
                ctx.quadraticCurveTo(this.size[0], this.size[1], this.size[0] - nodeRadius, this.size[1]);
                ctx.lineTo(nodeRadius, this.size[1]);
                ctx.quadraticCurveTo(0, this.size[1], 0, this.size[1] - nodeRadius);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                if (this.pullLivePreviewRef) this.pullLivePreviewRef();
            };

            nodeType.prototype.onNodeCreated = function() {
                const node = this;
                if (typeof allTrixNodes !== "undefined") {
                    allTrixNodes.push(node);
                }
                node.properties = node.properties || {};
                
                const initUUID = () => {
                    const uWgt = node.widgets ? node.widgets.find(w => w.name === "trix_uuid") : null;
                    if (uWgt) {
                        if (!uWgt.value || isUUIDInUse(uWgt.value, node)) {
                            uWgt.value = generateTrixUUID();
                        }
                    }
                };
                initUUID();
                setTimeout(initUUID, 100);

                if (!node.title || node.title.toLowerCase().includes("load image aio")) {
                    node.title = TRIX_DISPLAY_TITLE;
                }
                
                node.size = [300, 350]; 
                applyTrixNodeChrome(node);
                node._isFirstLoad = true;
                
                node.maskColor = "#ff0000"; node.brushSize = 100; node.resizable = true;
                node.brushHardness = 1.0; 
                node.isEraser = false; node.history = []; node.historyIndex = -1; node.isPreviewHidden = false; node.isFullscreen = false; 
                node._isMaskHidden = false; node._isToolbarHidden = false; node._lastImageName = null; node._lastMode = "Preview"; node._isChangingImage = false;
                node._fsZoom = 1.0; node._fsPanX = 0; node._fsPanY = 0;
                node._lastClickPos = null; node._dragStartX = 0; node._dragStartY = 0; node._shiftLockAxis = null; node._wasShiftDrawing = false; 
                node._isConfiguring = false;
                node._showCameraRawMenu = false; 
                node._originalImageForCrop = null;
                
                node._currentLiveUrl = null; 
                node._loadingImageUrl = null; 

                node._onVisChange = () => {
                    if (typeof app !== "undefined" && app.graph && app.graph.getNodeById(node.id) !== node) {
                        return;
                    }
                    if (document.visibilityState === 'visible') {
                        if (node.syncMaskToCanvas) node.syncMaskToCanvas();
                        if (node.updateUIRef) node.updateUIRef();
                    }
                };
                document.addEventListener("visibilitychange", node._onVisChange);

                node.syncMaskToCanvas = function() {
                    if (!this.maskCanvasRef || this.maskCanvasRef.width === 0) return Promise.resolve(false);
                    
                    const wgt = this.widgets ? this.widgets.find(w => w.name === "mask_data") : null;
                    if (!wgt || !wgt.value) return Promise.resolve(false);

                    let maskSrc = "";
                    if (wgt.value.startsWith("{")) {
                        try {
                            const parsed = JSON.parse(wgt.value);
                            maskSrc = parsed.mask || "";
                        } catch (e) {
                            console.error("Failed to parse mask JSON in syncMaskToCanvas", e);
                            maskSrc = wgt.value;
                        }
                    } else {
                        maskSrc = wgt.value;
                    }

                    if (!maskSrc || !maskSrc.startsWith("data:image")) return Promise.resolve(false);

                    return new Promise((resolve) => {
                        const mctx = this.maskCanvasRef.getContext("2d");
                        const img = new Image();
                        img.onload = () => {
                            mctx.globalCompositeOperation = "source-over";
                            mctx.clearRect(0, 0, this.maskCanvasRef.width, this.maskCanvasRef.height);
                            mctx.drawImage(img, 0, 0, this.maskCanvasRef.width, this.maskCanvasRef.height);
                            if (this.isEraser) mctx.globalCompositeOperation = "destination-out";
                            
                            if (this.history.length === 0) {
                                this.history.push(wgt.value);
                                this.historyIndex = 0;
                            }
                            
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                            resolve(true);
                        };
                        img.onerror = () => resolve(false);
                        img.src = maskSrc;
                    });
                };

                node.saveHistoryRef = function() {
                    if (!this.maskCanvasRef) return;
                    this.maskCanvasRef.toBlob((blob) => {
                        if (!blob) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const data = reader.result;
                            if (this.historyIndex < this.history.length - 1) {
                                this.history = this.history.slice(0, this.historyIndex + 1); 
                            }
                            this.history.push(data); 
                            const historyLimit = getMaskHistoryLimit(this.maskCanvasRef);
                            while (this.history.length > historyLimit) this.history.shift(); 
                            this.historyIndex = this.history.length - 1; 
                            
                            if (this.widgets) {
                                const mData = this.widgets.find(w => w.name === "mask_data");
                                if (mData) mData.value = data;
                            }
                        };
                        reader.readAsDataURL(blob);
                    });
                };


                node.pullLivePreviewRef = () => {
                    if (typeof app !== "undefined" && app.graph && app.graph.getNodeById(node.id) !== node) {
                        return;
                    }
                    if (!trixIsInputWired(node)) {
                        node._currentLiveUrl = null;
                        return;
                    }

                    const inImageLink = node.inputs.find(inp => inp && inp.name === "in_image");
                    const linkInfo = app.graph.links[inImageLink.link];
                    if (!linkInfo) return;

                    const originNode = app.graph.getNodeById(linkInfo.origin_id);
                    if (!originNode) return;

                    let imageUrl = null;

                    if (originNode.comfyClass === "TrixLoadImageAIO" && originNode.imgTagRef && originNode.imgTagRef.src) {
                        imageUrl = originNode.imgTagRef.src;
                    } else if (originNode.widgets) {
                        const imgWgt = originNode.widgets.find(w => w.name === "image");
                        if (imgWgt && imgWgt.value && typeof imgWgt.value === 'string') {
                            let filename = imgWgt.value;
                            let subfolder = "";
                            if (filename.includes("/")) {
                                const parts = filename.split("/");
                                filename = parts.pop();
                                subfolder = parts.join("/");
                            }
                            imageUrl = `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}`;
                        }
                    }
                    
                    if (!imageUrl) {
                        if (originNode.imgs && originNode.imgs.length > 0 && originNode.imgs[0].src) {
                            imageUrl = originNode.imgs[0].src;
                        } else if (originNode.images && originNode.images.length > 0) {
                            const img_info = originNode.images[0];
                            imageUrl = `/view?filename=${encodeURIComponent(img_info.filename)}&type=${img_info.type}&subfolder=${encodeURIComponent(img_info.subfolder || "")}`;
                        }
                    }

                    if (!imageUrl) {
                        const uWgt = node.widgets ? node.widgets.find(w => w.name === "trix_uuid") : null;
                        const localUuid = uWgt ? uWgt.value : null;
                        const safeId = localUuid ? String(localUuid).replace(/[^a-zA-Z0-9_-]+/g, "_") : String(node.id).replace(/[^a-zA-Z0-9_-]+/g, "_");
                        imageUrl = `/view?filename=aio_wired_${safeId}.png&type=input&subfolder=aio_input`;
                    }

                    if (imageUrl) {
                        const stripT = (str) => str ? str.replace(/([&?])t=\d+/, '').replace(/&$/, '').replace(/\?$/, '') : null;
                        const cleanNew = stripT(imageUrl);

                        if (node._currentLiveUrl !== imageUrl) {
                            node._currentLiveUrl = imageUrl; 
                            if (node.imgTagRef) {
                                const sep = cleanNew.includes('?') ? '&' : '?';
                                const tsMatch = imageUrl.match(/[&?]t=(\d+)/);
                                const ts = tsMatch ? tsMatch[1] : String(Date.now());
                                
                                const originalOnload = node.imgTagRef.onload;
                                const originalOnerror = node.imgTagRef.onerror;
                                
                                const restoreHandlers = () => {
                                    node.imgTagRef.onload = originalOnload;
                                    node.imgTagRef.onerror = originalOnerror;
                                };

                                node.imgTagRef.onload = (e) => {
                                    if (originalOnload) originalOnload(e);
                                    
                                    node.maskCanvasRef.width = node.imgTagRef.naturalWidth;
                                    node.maskCanvasRef.height = node.imgTagRef.naturalHeight;
                                    node.alignCanvasRef();
                                    node.syncMaskToCanvas();
                                    
                                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                                    restoreHandlers();
                                };

                                node.imgTagRef.onerror = (e) => {
                                    const imgWidget = node.widgets ? node.widgets.find(w => w.name === "image") : null;
                                    if (imgWidget && imgWidget.value) {
                                        let filename = imgWidget.value; let subfolder = ""; if (filename.includes("/")) { const parts = filename.split("/"); filename = parts.pop(); subfolder = parts.join("/"); }
                                        const fallbackUrl = `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}&t=${Date.now()}`;
                                        if (node.imgTagRef.src !== fallbackUrl) {
                                            node.imgTagRef.onerror = originalOnerror;
                                            node.imgTagRef.src = fallbackUrl;
                                            return;
                                        }
                                    }
                                    restoreHandlers();
                                };

                                node._loadingImageUrl = null;
                                node.imgTagRef.src = cleanNew + sep + 't=' + ts;
                            }
                        }
                    }
                };
                
                node._syncHTMLWithWidgets = [];

                setTimeout(() => {
                    refreshTrixOutputs(node);
                    if (app.graph) {
                        app.graph.setDirtyCanvas(true, true);
                    }
                }, 500);

                node.tempHistoryImg = new Image();

                node.tempHistoryImg.onload = () => {
                    const mctx = node.maskCanvasRef.getContext("2d");
                    mctx.globalCompositeOperation = "source-over";
                    mctx.clearRect(0, 0, node.maskCanvasRef.width, node.maskCanvasRef.height); 
                    mctx.drawImage(node.tempHistoryImg, 0, 0, node.maskCanvasRef.width, node.maskCanvasRef.height);
                    if (node.isEraser) mctx.globalCompositeOperation = "destination-out";
                    
                    if (node.alignCanvasRef) node.alignCanvasRef();
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                };

                const findW = (name) => node.widgets ? node.widgets.find(w => w && w.name === name) : undefined;
                
                const widgets = {
                    get mode() { return findW("mode"); },
                    get mask_data() { return findW("mask_data"); },
                    get crop_data() { return findW("crop_data"); },
                    get image() { return findW("image"); },
                    get enable_resize() { return findW("enable_resize"); },
                    get cr_enable() { return findW("cr_enable"); },
                    get crop_position() { return findW("crop_position"); },
                    get resize() { return node.widgets ? node.widgets.filter(w => w && ["width", "height", "pad_left", "pad_top", "pad_right", "pad_bottom", "upscale_method", "keep_proportion", "scale_by", "condition", "feathering", "divisible_by", "enable_resize", "crop_position"].includes(w.name)) : []; }
                };

                const removeNativeUploadWidget = () => {
                    if (!node.widgets) return;
                    for (let i = node.widgets.length - 1; i >= 0; i--) {
                        const widget = node.widgets[i];
                        const widgetName = String(widget?.name || "").toLowerCase();
                        const widgetType = String(widget?.type || "").toLowerCase();
                        if (
                            widgetName === "choose file to upload" ||
                            (widgetName.includes("choose") && widgetName.includes("upload")) ||
                            ((widgetName === "upload" || widgetName === "image_upload") && widgetType === "button")
                        ) {
                            node.widgets.splice(i, 1);
                        }
                    }
                };
                removeNativeUploadWidget();

                const gcd = (a, b) => {
                    a = Math.abs(Math.round(a));
                    b = Math.abs(Math.round(b));
                    while (b) {
                        const t = b;
                        b = a % b;
                        a = t;
                    }
                    return a || 1;
                };

                const cleanRatioNumber = (value) => {
                    const rounded = Number(value).toFixed(2);
                    return rounded.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
                };

                const formatAspect = (w, h) => {
                    if (!w || !h) return "[?]";
                    w = Math.round(w);
                    h = Math.round(h);

                    // 1. Exact standard monitor resolutions mapping
                    if (w === 3440 && h === 1440) return "[21:9]";
                    if (w === 1440 && h === 3440) return "[9:21]";
                    if (w === 2560 && h === 1080) return "[21:9]";
                    if (w === 1080 && h === 2560) return "[9:21]";
                    if (w === 5120 && h === 2160) return "[21:9]";
                    if (w === 2160 && h === 5120) return "[9:21]";
                    if (w === 3840 && h === 1600) return "[21:9]";
                    if (w === 1600 && h === 3840) return "[9:21]";
                    
                    if (w === 5120 && h === 1440) return "[32:9]";
                    if (w === 1440 && h === 5120) return "[9:32]";
                    if (w === 3840 && h === 1080) return "[32:9]";
                    if (w === 1080 && h === 3840) return "[9:32]";

                    // 2. Exact mathematically simple standard ratios
                    const divisor = gcd(w, h);
                    const rw = w / divisor;
                    const rh = h / divisor;
                    const standards = ["1:1", "16:9", "9:16", "16:10", "10:16", "4:3", "3:4", "3:2", "2:3", "5:4", "4:5"];
                    const ratioStr = `${rw}:${rh}`;
                    if (standards.includes(ratioStr)) {
                        return `[${ratioStr}]`;
                    }

                    // 3. Fallback for custom cropped aspect ratios
                    if (w === h) return "[1:1]";
                    if (w < h) {
                        return `[~1:${cleanRatioNumber(h / w)}]`;
                    }
                    return `[~${cleanRatioNumber(w / h)}:1]`;
                };

                node.updateResLabelTextRef = () => {
                    if (!node.resLabelRef) return;
                    if (!node.imgTagRef || !node.imgTagRef.naturalWidth) {
                        node.resLabelRef.innerText = "";
                        return;
                    }
                    const cw = node.imgTagRef.naturalWidth;
                    const ch = node.imgTagRef.naturalHeight;
                    const mode = widgets.mode ? widgets.mode.value : "Preview";
                    
                    if (mode === "Preview") {
                        node.resLabelRef.innerText = `${cw} x ${ch}`;
                        node.resLabelRef.style.cssText = "position: absolute; left: 0; right: 0; top: 0; bottom: 0; margin: auto; height: max-content; width: max-content; font-size: 10px; color: #d8d8dc; font-family: monospace; user-select: none; pointer-events: none; z-index: 5; text-align: center;";
                    } else if (mode === "Resize") {
                        const enableWgt = findW("enable_resize");
                        const isEnabled = enableWgt && enableWgt.value;
                        let nw = cw, nh = ch;
                        if (isEnabled) {
                            const kpWgt = findW("keep_proportion");
                            const kp = kpWgt ? kpWgt.value : "resize";
                            const conditionWgt = findW("condition");
                            const condition = conditionWgt ? conditionWgt.value : "always";
                            const divWgt = findW("divisible_by");
                            const divisible_by = divWgt ? parseInt(divWgt.value) : 8;

                            if (kp === "pad_for_outpainting") {
                                const pl = findW("pad_left") ? parseInt(findW("pad_left").value) : 0;
                                const pt = findW("pad_top") ? parseInt(findW("pad_top").value) : 0;
                                let pr = findW("pad_right") ? parseInt(findW("pad_right").value) : 0;
                                let pb = findW("pad_bottom") ? parseInt(findW("pad_bottom").value) : 0;
                                
                                nw = cw + pl + pr;
                                nh = ch + pt + pb;

                                if (divisible_by > 1) {
                                    const rem_w = nw % divisible_by;
                                    if (rem_w !== 0) {
                                        pr += divisible_by - rem_w;
                                        nw += divisible_by - rem_w;
                                    }
                                    const rem_h = nh % divisible_by;
                                    if (rem_h !== 0) {
                                        pb += divisible_by - rem_h;
                                        nh += divisible_by - rem_h;
                                    }
                                }
                            } else {
                                const wWgt = findW("width");
                                const hWgt = findW("height");
                                let target_w = wWgt ? parseInt(wWgt.value) : cw;
                                let target_h = hWgt ? parseInt(hWgt.value) : ch;
                                
                                let new_w = target_w;
                                let new_h = target_h;

                                if (kp === "scale_by") {
                                    const scaleWgt = findW("scale_by");
                                    let scale = scaleWgt ? parseFloat(scaleWgt.value) : 1;
                                    if (!Number.isFinite(scale)) scale = 1;
                                    scale = Math.max(0.01, Math.min(64, scale));
                                    target_w = Math.max(1, Math.round(cw * scale));
                                    target_h = Math.max(1, Math.round(ch * scale));
                                    new_w = target_w;
                                    new_h = target_h;
                                } else if (kp === "resize" || kp === "pad" || kp === "pad_edge_pixel") {
                                    const ratio = Math.min(target_w / cw, target_h / ch);
                                    new_w = Math.max(1, Math.round(cw * ratio));
                                    new_h = Math.max(1, Math.round(ch * ratio));
                                } else if (kp === "crop") {
                                    const ratio = Math.max(target_w / cw, target_h / ch);
                                    new_w = Math.max(1, Math.round(cw * ratio));
                                    new_h = Math.max(1, Math.round(ch * ratio));
                                }

                                let do_resize = true;
                                if (kp !== "scale_by") {
                                    if (condition === "downscale if bigger" && cw <= new_w && ch <= new_h) do_resize = false;
                                    else if (condition === "upscale if smaller" && cw >= new_w && ch >= new_h) do_resize = false;
                                    else if (condition === "if bigger area" && (cw * ch) <= (new_w * new_h)) do_resize = false;
                                    else if (condition === "if smaller area" && (cw * ch) >= (new_w * new_h)) do_resize = false;
                                }

                                if (do_resize) {
                                    if (kp === "stretch" || kp === "resize" || kp === "scale_by") {
                                        nw = new_w; nh = new_h;
                                    } else {
                                        nw = target_w; nh = target_h;
                                    }
                                } else {
                                    nw = cw; nh = ch;
                                }

                                if (divisible_by > 1 && (nw % divisible_by !== 0 || nh % divisible_by !== 0)) {
                                    const x = Math.floor((nw % divisible_by) / 2);
                                    const y = Math.floor((nh % divisible_by) / 2);
                                    const x2 = nw - ((nw % divisible_by) - x);
                                    const y2 = nh - ((nh % divisible_by) - y);
                                    nw = x2 - x;
                                    nh = y2 - y;
                                }
                            }
                            node.resLabelRef.innerHTML = `${formatAspect(cw, ch)}&nbsp; ${cw} x ${ch} &rarr; ${nw} x ${nh} &nbsp;${formatAspect(nw, nh)}`;
                        } else {
                            node.resLabelRef.innerHTML = `${formatAspect(cw, ch)}&nbsp; ${cw} x ${ch} &rarr; ${cw} x ${ch} &nbsp;${formatAspect(cw, ch)}`;
                        }
                        node.resLabelRef.style.cssText = "position: absolute; left: 0; right: 0; top: 0; bottom: 0; margin: auto; height: max-content; width: max-content; font-size: 10px; color: #f0f0f2; font-family: monospace; user-select: none; pointer-events: none; z-index: 5; padding: 0 6px; display: flex; align-items: center; justify-content: center; text-align: center;";
                    } else {
                        node.resLabelRef.innerText = "";
                        node.resLabelRef.style.display = "none";
                    }
                };

                node.syncHTMLRef = () => {
                    if (!node.widgets) return;
                    const getW = (name) => node.widgets.find(w => w && w.name === name);
                    
                    const wEnableResize = getW("enable_resize");
                    if (wEnableResize && node._checkboxEnableResize) {
                        node._checkboxEnableResize.checked = !!wEnableResize.value;
                        node._trackEnableResize.style.backgroundColor = wEnableResize.value ? TRIX_ACTIVE : "#111";
                        node._circleEnableResize.style.transform = wEnableResize.value ? "translateX(16px)" : "translateX(0)";
                    }

                    const wCREnable = getW("cr_enable");
                    if (wCREnable && node._checkboxCREnable) {
                        node._checkboxCREnable.checked = !!wCREnable.value;
                        node._trackCREnable.style.backgroundColor = wCREnable.value ? TRIX_ACTIVE : "#111";
                        node._circleCREnable.style.transform = wCREnable.value ? "translateX(16px)" : "translateX(0)";
                    }

                    const syncInput = (name, htmlInput, htmlSlider) => {
                        const w = getW(name);
                        if (w && w.value !== undefined) {
                            if (htmlInput) htmlInput.value = w.value;
                            if (htmlSlider) htmlSlider.value = w.value;
                        }
                    };
                    
                    syncInput("width", node._inputWidth, node._sliderWidth);
                    syncInput("height", node._inputHeight, node._sliderHeight);
                    syncInput("pad_left", node._inputPadLeft, node._sliderPadLeft);
                    syncInput("pad_top", node._inputPadTop, node._sliderPadTop);
                    syncInput("pad_right", node._inputPadRight, node._sliderPadRight);
                    syncInput("pad_bottom", node._inputPadBottom, node._sliderPadBottom);
                    syncInput("feathering", node._inputFeathering, node._sliderFeathering);
                    syncInput("divisible_by", node._inputDivisibleBy, node._sliderDivisibleBy);

                    const syncSelect = (name, htmlSelect) => {
                        const w = getW(name);
                        if (w && w.value !== undefined && htmlSelect) {
                            htmlSelect.value = String(w.value);
                        }
                    };

                    syncSelect("upscale_method", node._selectUpscaleMethod);
                    syncSelect("keep_proportion", node._selectKeepProportion);
                    syncSelect("condition", node._selectCondition);

                    node._syncHTMLWithWidgets.forEach(fn => fn());
                };

                const wrapper = document.createElement("div"); node.wrapperRef = wrapper; 
                wrapper.style.cssText = `position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; background: transparent; box-sizing: border-box; padding: 4px 0px; gap: 4px; pointer-events: auto; user-select: none; -webkit-user-select: none; overflow: hidden;`;
                wrapper.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                const applyNodeDomSideOutline = () => {
                    wrapper.style.border = "none";
                    wrapper.style.outline = "none";
                    wrapper.style.boxShadow = "none";
                };
                applyNodeDomSideOutline();

                const setDropActive = (active) => {
                    if (node._trixDropActive === active) return;
                    node._trixDropActive = active;
                    applyNodeDomSideOutline();
                    if (filePanel) filePanel.style.boxShadow = "none";
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                };

                const blockInFullscreen = (e) => { if (node.isFullscreen) { e.stopPropagation(); if (e.type === "contextmenu") e.preventDefault(); } };
                const blockedEvents = ["pointerup", "pointermove", "mousedown", "mouseup", "mousemove", "click", "dblclick", "contextmenu"];
                blockedEvents.forEach(evt => wrapper.addEventListener(evt, blockInFullscreen, { passive: false }));

                wrapper.addEventListener("wheel", (e) => {
                    if (node.isFullscreen) {
                        e.preventDefault(); e.stopPropagation();
                        const oldZoom = node._fsZoom; let zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; 
                        node._fsZoom = Math.max(1.0, Math.min(node._fsZoom * zoomFactor, 20.0));
                        zoomFactor = node._fsZoom / oldZoom; 
                        if (zoomFactor !== 1.0) {
                            const rect = maskCanvas.getBoundingClientRect();
                            node._fsPanX -= (e.clientX - rect.left) * (zoomFactor - 1); node._fsPanY -= (e.clientY - rect.top) * (zoomFactor - 1);
                            if (node._fsZoom === 1.0) { node._fsPanX = 0; node._fsPanY = 0; }
                            applyZoomPan();
                        }
                        return;
                    } 
                    
                    const rp = e.target.closest(".trix-resize-panel");
                    if (rp) {
                        const isScrollable = rp.scrollHeight > rp.clientHeight;
                        if (isScrollable) {
                            const atTop = rp.scrollTop <= 0 && e.deltaY < 0;
                            const atBottom = Math.ceil(rp.scrollTop + rp.clientHeight) >= rp.scrollHeight && e.deltaY > 0;
                            if (!atTop && !atBottom) {
                                e.stopPropagation(); 
                                return; 
                            }
                        }
                    }

                    if (app.canvas) app.canvas.processMouseWheel(e);
                    e.preventDefault(); 
                    e.stopPropagation();
                }, { passive: false });

                let isCustomNodeDragging = false;
                let customDragStartNodePos = [0, 0];
                let customDragStartMousePos = [0, 0];

                wrapper.addEventListener("pointerdown", (e) => {
                    if (node.isFullscreen) return;

                    const targetTag = e.target.tagName.toUpperCase();
                    const isInteractive = ["BUTTON", "INPUT", "SELECT", "OPTION", "LABEL"].includes(targetTag) || e.target.closest("button") || e.target.closest("label") || e.target.closest(".trix-custom-dropdown") || e.target.id === "colorPick";
                    const isScrollbar = e.target.clientWidth > 0 && (e.offsetX >= e.target.clientWidth || e.offsetY >= e.target.clientHeight);

                    if (isInteractive || isScrollbar) return; 

                    const mode = widgets.mode ? widgets.mode.value : "Preview";

                    if (mode === "Mask" && (e.target === maskCanvas || e.target === imgTag)) {
                        return; 
                    }

                    if ((mode === "Preview" || mode === "Filter" || mode === "Resize") && e.button === 0 && !e.altKey && !e.ctrlKey && !e.shiftKey) {
                        isCustomNodeDragging = true;
                        customDragStartNodePos = [...node.pos];
                        customDragStartMousePos = [e.clientX, e.clientY];

                        if (app.canvas && !node.isSelected) {
                            app.canvas.selectNode(node);
                        }

                        try { wrapper.setPointerCapture(e.pointerId); } catch (err) {}
                        e.preventDefault();
                        e.stopPropagation();
                    } else {
                        if (targetTag !== "CANVAS" && app.canvas) {
                            app.canvas.processMouseDown(e);
                        }
                    }
                });

                wrapper.addEventListener("pointermove", (e) => {
                    if (isCustomNodeDragging) {
                        const zoom = app.canvas.ds ? app.canvas.ds.scale : 1;
                        const dx = (e.clientX - customDragStartMousePos[0]) / zoom;
                        const dy = (e.clientY - customDragStartMousePos[1]) / zoom;

                        node.pos[0] = customDragStartNodePos[0] + dx;
                        node.pos[1] = customDragStartNodePos[1] + dy;

                        if (node.requestDirtyCanvas) node.requestDirtyCanvas();
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });

                wrapper.addEventListener("pointerup", (e) => {
                    if (isCustomNodeDragging) {
                        isCustomNodeDragging = false;
                        try { wrapper.releasePointerCapture(e.pointerId); } catch (err) {}
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                        e.preventDefault();
                        e.stopPropagation();
                    }
                });

                let _trixPickerCSSInjected = false;
                const injectTrixImagePickerCSS = () => {
                    if (_trixPickerCSSInjected) return;
                    _trixPickerCSSInjected = true;
                    const css = `
                    .trix-li-popup {
                        background: #18181c;
                        border: 1px solid #383842;
                        border-radius: 8px;
                        box-shadow: 0 8px 28px rgba(0,0,0,0.65);
                        font-size: 11px;
                        font-family: var(--comfy-font-family, ui-sans-serif, system-ui, sans-serif);
                        color: #ccc;
                        overflow: hidden;
                        box-sizing: border-box;
                    }
                    .trix-li-pop-search {
                        display: flex;
                        align-items: center;
                        gap: 7px;
                        padding: 7px 9px;
                        background: #121215;
                        border-bottom: 1px solid #2a2a32;
                    }
                    .trix-li-pop-mag {
                        width: 12px;
                        height: 12px;
                        flex: none;
                        border: 1.6px solid #777;
                        border-radius: 50%;
                        position: relative;
                    }
                    .trix-li-pop-mag::after {
                        content: "";
                        position: absolute;
                        width: 5px;
                        height: 1.6px;
                        background: #777;
                        transform: rotate(45deg);
                        right: -3px;
                        bottom: 0;
                    }
                    .trix-li-pop-search input {
                        flex: 1;
                        min-width: 0;
                        background: transparent;
                        border: none;
                        outline: none;
                        color: #eee;
                        font-size: 11px;
                        font-family: inherit;
                    }
                    .trix-li-pop-search input::placeholder { color: #777; }
                    .trix-li-pop-sizetoggle {
                        flex: none;
                        display: flex;
                        border: 1px solid #383842;
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    .trix-li-pop-sizetoggle span {
                        padding: 2px 7px;
                        font-size: 10px;
                        color: #aaa;
                        cursor: pointer;
                        user-select: none;
                        line-height: 1.4;
                    }
                    .trix-li-pop-sizetoggle span.on {
                        background: var(--trix-accent, #235a7a);
                        color: #fff;
                    }
                    .trix-li-pop-sizetoggle span:not(.on):hover { color: #ddd; }
                    .trix-li-bsplit {
                        display: flex;
                        max-height: 330px;
                    }
                    .trix-li-bfolders {
                        width: 110px;
                        flex: none;
                        border-right: 1px solid #2a2a32;
                        background: #121215;
                        overflow-y: auto;
                    }
                    .trix-li-bfolder {
                        padding: 7px 9px;
                        font-size: 10.5px;
                        color: #aaa;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        gap: 4px;
                        align-items: center;
                        user-select: none;
                    }
                    .trix-li-bfolder:hover { background: #222228; }
                    .trix-li-bfolder.on {
                        background: rgba(35, 90, 122, 0.35);
                        color: #4db8ff;
                        border-left: 3px solid #235a7a;
                        padding-left: 6px;
                        font-weight: 600;
                    }
                    .trix-li-bfolder.all {
                        border-bottom: 1px solid #2a2a32;
                        color: #ddd;
                    }
                    .trix-li-bfolder.all.on { color: #4db8ff; }
                    .trix-li-bfolder-n { color: #777; font-size: 9px; flex: none; }
                    .trix-li-bfolder > span:first-child {
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        min-width: 0;
                    }
                    .trix-li-bpane {
                        flex: 1;
                        min-width: 0;
                        overflow-y: auto;
                        max-height: 330px;
                    }
                    .trix-li-pop-sec {
                        padding: 5px 10px 4px;
                        font-size: 9px;
                        color: #888;
                        text-transform: uppercase;
                        letter-spacing: .5px;
                        background: #121215;
                        border-bottom: 1px solid #2a2a32;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        position: sticky;
                        top: 0;
                        z-index: 1;
                    }
                    .trix-li-pop-sec-c { margin-left: auto; color: #777; }
                    .trix-li-imgrow {
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 5px 10px;
                        cursor: pointer;
                        user-select: none;
                    }
                    .trix-li-imgrow:hover { background: #23232a; }
                    .trix-li-imgrow.cur { background: rgba(35, 90, 122, 0.3); }
                    .trix-li-imgrow.cur .trix-li-imgrow-lbl { color: #4db8ff; font-weight: 600; }
                    .trix-li-imgrow-lbl {
                        flex: 1;
                        min-width: 0;
                        font-size: 11px;
                        color: #ccc;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .trix-li-pop-thumb {
                        position: relative;
                        flex: none;
                        border-radius: 4px;
                        overflow: hidden;
                        background: linear-gradient(135deg, #2c3038, #18181c);
                    }
                    .trix-li-pop-thumb img {
                        position: absolute;
                        inset: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }
                    .trix-li-pop-glyph {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        color: rgba(255,255,255,.3);
                    }
                    .trix-li-bsplit.thumb-sm .trix-li-pop-thumb { width: 32px; height: 32px; }
                    .trix-li-bsplit.thumb-lg .trix-li-pop-thumb { width: 48px; height: 48px; }
                    .trix-li-pop-empty { padding: 12px; color: #777; text-align: center; font-style: italic; }
                    .trix-li-pop-foot {
                        padding: 6px 10px;
                        font-size: 9.5px;
                        color: #777;
                        background: #121215;
                        border-top: 1px solid #2a2a32;
                        text-align: center;
                    }
                    `;
                    const style = document.createElement("style");
                    style.id = "trix-image-picker-css";
                    style.textContent = css;
                    document.head.appendChild(style);
                };

                const trixSplitFilenameSubfolder = (full) => {
                    if (!full) return { subfolder: "", filename: "" };
                    const parts = String(full).replace(/\\/g, "/").split("/");
                    const filename = parts.pop() || "";
                    const subfolder = parts.join("/");
                    return { subfolder, filename };
                };

                const trixGroupValuesByFolder = (values) => {
                    const map = new Map();
                    for (const v of values) {
                        const { subfolder, filename } = trixSplitFilenameSubfolder(v);
                        if (!map.has(subfolder)) map.set(subfolder, []);
                        map.get(subfolder).push({ full: v, name: filename });
                    }
                    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
                    const folders = [...map.keys()].sort((a, b) => {
                        if (a === "" && b !== "") return -1;
                        if (a !== "" && b === "") return 1;
                        return a.localeCompare(b);
                    });
                    return folders.map((folder) => ({ folder, files: map.get(folder) }));
                };

                const trixThumbURL = (full) => {
                    const { subfolder, filename } = trixSplitFilenameSubfolder(full);
                    return `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}`;
                };

                const getTrixThumbSize = () => {
                    try {
                        const v = localStorage.getItem("TrixLoader.ImagePicker.ThumbSize");
                        return v === "Small" ? "Small" : "Large";
                    } catch (_e) { return "Large"; }
                };

                const setTrixThumbSize = (v) => {
                    try {
                        localStorage.setItem("TrixLoader.ImagePicker.ThumbSize", v);
                    } catch (_e) { /* ignore */ }
                };

                const openTrixImageDropdown = (node, anchorEl, onPick) => {
                    injectTrixImagePickerCSS();
                    const imageWidget = widgets.image;
                    const values = imageChoices();

                    const existing = document.querySelector(".trix-li-popup");
                    if (existing) {
                        if (typeof existing._trixClose === "function") existing._trixClose();
                        else existing.remove();
                    }

                    const popup = document.createElement("div");
                    popup.className = "trix-li-popup";
                    const rect = anchorEl.getBoundingClientRect();
                    const width = Math.max(rect.width, 360);
                    Object.assign(popup.style, {
                        position: "fixed",
                        zIndex: 99999,
                        left: `${rect.left}px`,
                        top: `${rect.bottom + 2}px`,
                        width: `${width}px`,
                    });

                    function closePopup() {
                        popup.remove();
                        document.removeEventListener("mousedown", onDocDown, true);
                        document.removeEventListener("pointerdown", onDocDown, true);
                        document.removeEventListener("wheel", onWheel, true);
                        document.removeEventListener("keydown", onKey, true);
                    }
                    const onDocDown = (e) => { if (!popup.contains(e.target)) closePopup(); };
                    const onWheel = (e) => { if (!popup.contains(e.target)) closePopup(); };
                    const onKey = (e) => { if (e.key === "Escape") closePopup(); };
                    popup._trixClose = closePopup;

                    if (values.length === 0) {
                        const empty = document.createElement("div");
                        empty.className = "trix-li-pop-empty";
                        empty.textContent = "(no images uploaded yet)";
                        popup.appendChild(empty);
                        document.body.appendChild(popup);
                        setTimeout(() => {
                            document.addEventListener("mousedown", onDocDown, true);
                            document.addEventListener("pointerdown", onDocDown, true);
                            document.addEventListener("wheel", onWheel, true);
                            document.addEventListener("keydown", onKey, true);
                        }, 0);
                        return;
                    }

                    const groups = trixGroupValuesByFolder(values);
                    const curVal = imageWidget ? imageWidget.value : "";
                    const hasSubfolders = groups.some((g) => g.folder !== "");

                    let activeFolder = "__all";
                    let query = "";
                    let thumbSize = getTrixThumbSize();
                    let scrollTarget = null;

                    const searchRow = document.createElement("div");
                    searchRow.className = "trix-li-pop-search";
                    const mag = document.createElement("span");
                    mag.className = "trix-li-pop-mag";
                    const input = document.createElement("input");
                    input.type = "text";
                    input.placeholder = "Filter images…";
                    const sizeToggle = document.createElement("div");
                    sizeToggle.className = "trix-li-pop-sizetoggle";
                    const segS = document.createElement("span"); segS.textContent = "S"; segS.title = "Small thumbnails";
                    const segL = document.createElement("span"); segL.textContent = "L"; segL.title = "Large thumbnails";
                    sizeToggle.append(segS, segL);
                    searchRow.append(mag, input, sizeToggle);
                    popup.appendChild(searchRow);

                    const body = document.createElement("div");
                    body.className = "trix-li-bsplit";
                    const sidebar = document.createElement("div");
                    sidebar.className = "trix-li-bfolders";
                    const pane = document.createElement("div");
                    pane.className = "trix-li-bpane";
                    if (hasSubfolders) body.append(sidebar, pane);
                    else body.append(pane);
                    popup.appendChild(body);

                    const footer = document.createElement("div");
                    footer.className = "trix-li-pop-foot";
                    popup.appendChild(footer);

                    const makeRow = (entry) => {
                        const row = document.createElement("div");
                        row.className = "trix-li-imgrow" + (entry.full === curVal ? " cur" : "");
                        const th = document.createElement("span");
                        th.className = "trix-li-pop-thumb";
                        const glyph = document.createElement("span");
                        glyph.className = "trix-li-pop-glyph";
                        glyph.textContent = "▣";
                        const img = document.createElement("img");
                        img.loading = "lazy";
                        img.onerror = () => { img.style.display = "none"; };
                        img.src = trixThumbURL(entry.full);
                        th.append(glyph, img);
                        const lbl = document.createElement("span");
                        lbl.className = "trix-li-imgrow-lbl";
                        lbl.textContent = entry.name;
                        lbl.title = entry.full;
                        row.append(th, lbl);
                        if (entry.full === curVal) scrollTarget = row;
                        row.addEventListener("click", (e) => {
                            e.stopPropagation();
                            closePopup();
                            if (onPick) onPick(entry.full);
                        });
                        return row;
                    };

                    const makeSec = (label, count) => {
                        const s = document.createElement("div");
                        s.className = "trix-li-pop-sec";
                        s.textContent = label;
                        const c = document.createElement("span");
                        c.className = "trix-li-pop-sec-c";
                        c.textContent = String(count);
                        s.appendChild(c);
                        return s;
                    };

                    const folderLabel = (key) => (key === "" ? "root" : key);
                    const scrollCurrentIntoView = () => {
                        if (!scrollTarget) return;
                        const t = scrollTarget;
                        queueMicrotask(() => { try { t.scrollIntoView({ block: "nearest" }); } catch (_e) {} });
                    };

                    const renderSidebar = () => {
                        if (!hasSubfolders) return;
                        sidebar.replaceChildren();
                        const entries = [["__all", "All", values.length]];
                        for (const g of groups) entries.push([g.folder, folderLabel(g.folder), g.files.length]);
                        for (const [key, label, count] of entries) {
                            const f = document.createElement("div");
                            f.className = "trix-li-bfolder"
                                + (key === "__all" ? " all" : "")
                                + (key === activeFolder && !query.trim() ? " on" : "");
                            const t = document.createElement("span");
                            t.textContent = label;
                            const n = document.createElement("span");
                            n.className = "trix-li-bfolder-n";
                            n.textContent = String(count);
                            f.append(t, n);
                            f.addEventListener("click", (e) => {
                                e.stopPropagation();
                                activeFolder = key;
                                input.value = "";
                                query = "";
                                renderSidebar();
                                renderPane();
                            });
                            sidebar.appendChild(f);
                        }
                    };

                    const renderPane = () => {
                        pane.replaceChildren();
                        scrollTarget = null;
                        const q = query.trim().toLowerCase();

                        if (q) {
                            let matches = 0;
                            for (const g of groups) {
                                const hit = g.files.filter((f) => f.name.toLowerCase().includes(q));
                                if (hit.length === 0) continue;
                                matches += hit.length;
                                pane.appendChild(makeSec(folderLabel(g.folder), hit.length));
                                for (const entry of hit) pane.appendChild(makeRow(entry));
                            }
                            if (matches === 0) {
                                const none = document.createElement("div");
                                none.className = "trix-li-pop-empty";
                                none.textContent = "(no matches)";
                                pane.appendChild(none);
                            }
                            footer.textContent = `${matches} match${matches === 1 ? "" : "es"}`;
                            return;
                        }

                        if (!hasSubfolders) {
                            for (const g of groups) for (const entry of g.files) pane.appendChild(makeRow(entry));
                            footer.textContent = `${values.length} image${values.length === 1 ? "" : "s"}`;
                            scrollCurrentIntoView();
                            return;
                        }

                        if (activeFolder === "__all") {
                            for (const g of groups) {
                                pane.appendChild(makeSec(folderLabel(g.folder), g.files.length));
                                for (const entry of g.files) pane.appendChild(makeRow(entry));
                            }
                            footer.textContent = `${values.length} image${values.length === 1 ? "" : "s"} · all`;
                        } else {
                            const g = groups.find((x) => x.folder === activeFolder);
                            const files = g ? g.files : [];
                            for (const entry of files) pane.appendChild(makeRow(entry));
                            footer.textContent = `${files.length} image${files.length === 1 ? "" : "s"} · ${folderLabel(activeFolder)}`;
                        }
                        scrollCurrentIntoView();
                    };

                    const applyThumbSize = () => {
                        body.classList.toggle("thumb-sm", thumbSize === "Small");
                        body.classList.toggle("thumb-lg", thumbSize !== "Small");
                        segS.classList.toggle("on", thumbSize === "Small");
                        segL.classList.toggle("on", thumbSize !== "Small");
                    };

                    input.addEventListener("input", () => { query = input.value; renderSidebar(); renderPane(); });
                    input.addEventListener("click", (e) => e.stopPropagation());
                    input.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            pane.querySelector(".trix-li-imgrow")?.click();
                        }
                        e.stopImmediatePropagation();
                    });
                    segS.addEventListener("click", (e) => {
                        e.stopPropagation();
                        thumbSize = "Small"; setTrixThumbSize(thumbSize); applyThumbSize();
                    });
                    segL.addEventListener("click", (e) => {
                        e.stopPropagation();
                        thumbSize = "Large"; setTrixThumbSize(thumbSize); applyThumbSize();
                    });

                    applyThumbSize();
                    renderSidebar();
                    renderPane();

                    document.body.appendChild(popup);

                    const pr = popup.getBoundingClientRect();
                    let left = rect.left;
                    if (left + pr.width > window.innerWidth - 4) left = Math.max(4, window.innerWidth - pr.width - 4);
                    popup.style.left = `${left}px`;
                    if (pr.bottom > window.innerHeight - 4) {
                        const above = rect.top - pr.height - 2;
                        popup.style.top = `${above >= 4 ? above : Math.max(4, window.innerHeight - pr.height - 4)}px`;
                    }

                    queueMicrotask(() => { try { input.focus(); } catch (_e) {} });

                    setTimeout(() => {
                        document.addEventListener("mousedown", onDocDown, true);
                        document.addEventListener("pointerdown", onDocDown, true);
                        document.addEventListener("wheel", onWheel, true);
                        document.addEventListener("keydown", onKey, true);
                    }, 0);
                };

                const headerContainer = document.createElement("div");
                headerContainer.style.cssText = `display: flex; flex-direction: column; width: 100%; pointer-events: auto; z-index: 10; margin-top: ${TRIX_HEADER_OFFSET_Y}px; box-sizing: border-box; background: var(--trix-bg);`;
                node.headerContainerRef = headerContainer;

                const imageChoices = () => {
                    const w = widgets.image;
                    const values = [];
                    if (w && w.options && Array.isArray(w.options.values)) {
                        values.push(...w.options.values);
                    }
                    if (w && w.value && !values.includes(w.value)) values.unshift(w.value);
                    return values;
                };

                const setImageWidgetValue = (value, markChanging = true) => {
                    if (!value || !widgets.image) return;
                    if (markChanging && node.maskCanvasRef && node.maskCanvasRef.width > 0 && widgets.mask_data) {
                        widgets.mask_data.value = node.maskCanvasRef.toDataURL();
                    }
                    if (markChanging) node._isChangingImage = true;
                    widgets.image.value = value;
                    if (widgets.image.options && Array.isArray(widgets.image.options.values) && !widgets.image.options.values.includes(value)) {
                        widgets.image.options.values.unshift(value);
                    }
                    if (widgets.image.callback) widgets.image.callback(value);
                    if (node.refreshImagePickerRef) node.refreshImagePickerRef();
                };

                const uploadImageFile = async (file) => {
                    if (!file || !file.type || !file.type.startsWith("image/")) return false;
                    const body = new FormData();
                    body.append("image", file, file.name || `image${trixImageExt("", file.type)}`);
                    body.append("type", "input");
                    try {
                        if (node._uploadBtnRef) {
                            node._uploadBtnRef.disabled = true;
                            node._uploadBtnRef.style.opacity = "0.5";
                            const span = node._uploadBtnRef.querySelector("span");
                            if (span) span.textContent = "Uploading...";
                        }
                        const resp = await fetch("/upload/image", { method: "POST", body });
                        if (resp.status !== 200) throw new Error(`Upload failed: ${resp.status}`);
                        const data = await resp.json();
                        const finalName = trixDefaultUploadFullPath(data);
                        setImageWidgetValue(finalName);
                        return true;
                    } catch (err) {
                        console.error("TrixLoader Upload Error:", err);
                        alert("Failed to upload image: " + err);
                        return false;
                    } finally {
                        if (node._uploadBtnRef) {
                            node._uploadBtnRef.disabled = false;
                            node._uploadBtnRef.style.opacity = "1";
                            const span = node._uploadBtnRef.querySelector("span");
                            if (span) span.textContent = "Upload Image";
                        }
                    }
                };
                node.uploadImageFileRef = uploadImageFile;

                const filePanel = document.createElement("div");
                filePanel.className = "trix-file-panel";
                filePanel.style.cssText = `display: flex; flex-direction: column; gap: 0px; width: 100%; background: var(--trix-bg); padding: 4px 6px; box-sizing: border-box; border-radius: 6px 6px 0 0; border-bottom: 1px solid var(--trix-control); position: relative; isolation: isolate;`;

                const filePanelTopShield = document.createElement("div");
                filePanelTopShield.className = "trix-file-panel-top-shield";
                filePanelTopShield.style.cssText = `position: absolute; left: 0; right: 0; top: -4px; height: 4px; background: var(--trix-bg); border-radius: 6px 6px 0 0; pointer-events: none; z-index: 0;`;

                const filePanelRow = document.createElement("div");
                filePanelRow.style.cssText = "display: grid; grid-template-columns: 24px 24px minmax(0, 1fr) 24px; gap: 4px; align-items: center; width: 100%; position: relative; z-index: 1;";

                const headerToolBtnStyle = `height: 22px; width: 24px; border: 1px solid var(--trix-border); border-radius: 5px; background: var(--trix-control); color: var(--trix-text); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1; font-size: 13.5px; transition: 0.15s; user-select: none;`;

                const copyImageHeaderBtn = document.createElement("button");
                copyImageHeaderBtn.textContent = "🗐";
                copyImageHeaderBtn.title = "Copy Image";
                copyImageHeaderBtn.style.cssText = headerToolBtnStyle;
                copyImageHeaderBtn.onmouseenter = () => { copyImageHeaderBtn.style.background = "var(--trix-control-hover)"; copyImageHeaderBtn.style.borderColor = "var(--trix-accent)"; };
                copyImageHeaderBtn.onmouseleave = () => { copyImageHeaderBtn.style.background = "var(--trix-control)"; copyImageHeaderBtn.style.borderColor = "var(--trix-border)"; };
                copyImageHeaderBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    let srcImg = null;
                    if (node.image && node.image.complete && node.image.naturalWidth > 0) srcImg = node.image;
                    else if (node.imgs && node.imgs[0] && node.imgs[0].complete && node.imgs[0].naturalWidth > 0) srcImg = node.imgs[0];
                    else if (node.imgTagRef && node.imgTagRef.complete && node.imgTagRef.naturalWidth > 0) srcImg = node.imgTagRef;
                    
                    const doCopy = (imgElement) => {
                        try {
                            const tCanvas = document.createElement("canvas");
                            tCanvas.width = imgElement.naturalWidth || imgElement.width;
                            tCanvas.height = imgElement.naturalHeight || imgElement.height;
                            const tCtx = tCanvas.getContext("2d");
                            tCtx.drawImage(imgElement, 0, 0);
                            tCanvas.toBlob(async (blob) => {
                                if (blob) {
                                    await navigator.clipboard.write([
                                        new ClipboardItem({ "image/png": blob })
                                    ]);
                                }
                            }, "image/png");
                        } catch (err) {
                            console.error("TrixLoader Copy Image Error:", err);
                            alert("Failed to copy image: " + err);
                        }
                    };
                    
                    if (srcImg) {
                        doCopy(srcImg);
                    } else if (widgets.image && widgets.image.value) {
                        const tempImg = new Image();
                        tempImg.crossOrigin = "anonymous";
                        tempImg.onload = () => doCopy(tempImg);
                        tempImg.onerror = () => alert("Failed to load image for copying.");
                        tempImg.src = `/view?filename=${encodeURIComponent(widgets.image.value)}&type=input`;
                    } else {
                        alert("No image available to copy.");
                    }
                };

                const pasteImageHeaderBtn = document.createElement("button");
                pasteImageHeaderBtn.innerHTML = svgPaste;
                pasteImageHeaderBtn.title = "Paste Image";
                pasteImageHeaderBtn.style.cssText = headerToolBtnStyle;
                pasteImageHeaderBtn.onmouseenter = () => { pasteImageHeaderBtn.style.background = "var(--trix-control-hover)"; pasteImageHeaderBtn.style.borderColor = "var(--trix-accent)"; };
                pasteImageHeaderBtn.onmouseleave = () => { pasteImageHeaderBtn.style.background = "var(--trix-control)"; pasteImageHeaderBtn.style.borderColor = "var(--trix-border)"; };
                pasteImageHeaderBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const items = await navigator.clipboard.read();
                        for (let item of items) {
                            if (item.types.some(t => t.startsWith('image/'))) {
                                const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
                                let ext = ".png";
                                if (blob.type === "image/jpeg") ext = ".jpg";
                                else if (blob.type === "image/webp") ext = ".webp";
                                
                                const filename = `pasted_${node.id}_${Date.now()}${ext}`;
                                const newFile = new File([blob], filename, { type: blob.type || "image/png" });
                                
                                const body = new FormData();
                                body.append("image", newFile, filename);
                                body.append("type", "input");
                                body.append("overwrite", "true");
                                
                                const resp = await fetch("/upload/image", { method: "POST", body });
                                if (resp.status === 200) {
                                    const data = await resp.json();
                                    const finalName = trixDefaultUploadFullPath(data);
                                    setImageWidgetValue(finalName);
                                } else {
                                    alert(`Failed to upload pasted image: ${resp.status}`);
                                }
                                return;
                            }
                        }
                        alert("Clipboard does not contain an image.");
                    } catch (err) {
                        console.error("TrixLoader Paste Image Error:", err);
                        alert("Failed to paste image: " + err);
                    }
                };

                const segmentPicker = document.createElement("div");
                segmentPicker.className = "trix-segment-picker";
                segmentPicker.style.cssText = "display: flex; align-items: center; width: 100%; min-width: 0; height: 22px; border: 1px solid var(--trix-border); border-radius: 5px; background: var(--trix-control); overflow: hidden; box-sizing: border-box; transition: 0.15s;";

                const segmentBtnStyle = "height: 100%; width: 22px; border: none; background: transparent; color: var(--trix-icon); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1; flex-shrink: 0; transition: 0.15s; user-select: none;";

                const prevImageBtn = document.createElement("button");
                prevImageBtn.innerHTML = svgChevronLeft;
                prevImageBtn.title = "Previous image";
                prevImageBtn.style.cssText = segmentBtnStyle + " border-right: 1px solid var(--trix-border);";
                prevImageBtn.onmouseenter = () => { prevImageBtn.style.background = "var(--trix-control-hover)"; prevImageBtn.style.color = "var(--trix-text)"; };
                prevImageBtn.onmouseleave = () => { prevImageBtn.style.background = "transparent"; prevImageBtn.style.color = "var(--trix-icon)"; };

                const nextImageBtn = document.createElement("button");
                nextImageBtn.innerHTML = svgChevronRight;
                nextImageBtn.title = "Next image";
                nextImageBtn.style.cssText = segmentBtnStyle + " border-left: 1px solid var(--trix-border);";
                nextImageBtn.onmouseenter = () => { nextImageBtn.style.background = "var(--trix-control-hover)"; nextImageBtn.style.color = "var(--trix-text)"; };
                nextImageBtn.onmouseleave = () => { nextImageBtn.style.background = "transparent"; nextImageBtn.style.color = "var(--trix-icon)"; };

                const dropdownBtn = document.createElement("div");
                dropdownBtn.className = "trix-custom-dropdown";
                dropdownBtn.title = "Click to select image";
                dropdownBtn.style.cssText = `height: 100%; flex: 1; min-width: 0; background: transparent; color: var(--trix-text); padding: 0 8px; font-size: 11px; font-family: var(--comfy-font-family, sans-serif); outline: none; cursor: pointer; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; user-select: none; transition: 0.15s; position: relative; z-index: 5;`;

                const dropdownName = document.createElement("span");
                dropdownName.style.cssText = "overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; pointer-events: none;";

                const dropdownCounter = document.createElement("span");
                dropdownCounter.style.cssText = "color: var(--trix-icon); font-size: 9.5px; margin-left: 6px; flex-shrink: 0; pointer-events: none;";

                dropdownBtn.append(dropdownName, dropdownCounter);

                dropdownBtn.onmouseenter = () => { dropdownBtn.style.background = "var(--trix-control-hover)"; };
                dropdownBtn.onmouseleave = () => { dropdownBtn.style.background = "transparent"; };

                const triggerImageDropdown = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    openTrixImageDropdown(node, dropdownBtn, (pickedVal) => setImageWidgetValue(pickedVal));
                };

                dropdownBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); };
                dropdownBtn.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); };
                dropdownBtn.onclick = triggerImageDropdown;

                segmentPicker.append(prevImageBtn, dropdownBtn, nextImageBtn);

                const uploadBtn = document.createElement("button");
                uploadBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M12 3v12"></path><path d="m7 8 5-5 5 5"></path><path d="M5 21h14"></path><path d="M5 17v4"></path><path d="M19 17v4"></path></svg>`;
                uploadBtn.title = "Upload Image";
                uploadBtn.style.cssText = `height: 22px; width: 24px; background: var(--trix-accent); color: #ffffff; border: none; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; box-shadow: none; transition: 0.15s ease; user-select: none;`;
                uploadBtn.onmouseenter = () => { uploadBtn.style.background = "var(--trix-accent-hover)"; };
                uploadBtn.onmouseleave = () => { uploadBtn.style.background = "var(--trix-accent)"; };
                node._uploadBtnRef = uploadBtn;

                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = "image/*";
                fileInput.style.display = "none";

                const refreshImagePicker = () => {
                    const current = widgets.image ? widgets.image.value : "";
                    const values = imageChoices();
                    const { filename } = trixSplitFilenameSubfolder(current);
                    dropdownName.textContent = filename || current || "No image selected";
                    dropdownName.title = current;
                    const idx = values.indexOf(current);
                    dropdownCounter.textContent = values.length > 0 ? `${idx >= 0 ? idx + 1 : 1}/${values.length} ▾` : "▾";
                };
                node.refreshImagePickerRef = refreshImagePicker;

                const stepImage = (dir) => {
                    const values = imageChoices();
                    if (!values.length || !widgets.image) return;
                    const currentIdx = Math.max(0, values.indexOf(widgets.image.value));
                    const nextIdx = (currentIdx + dir + values.length) % values.length;
                    setImageWidgetValue(values[nextIdx]);
                };

                prevImageBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); stepImage(-1); };
                nextImageBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); stepImage(1); };
                uploadBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); };
                fileInput.onchange = async () => {
                    const file = fileInput.files && fileInput.files[0];
                    if (file) await uploadImageFile(file);
                    fileInput.value = "";
                };

                filePanelRow.append(copyImageHeaderBtn, pasteImageHeaderBtn, segmentPicker, uploadBtn, fileInput);
                filePanel.append(filePanelTopShield, filePanelRow);
                headerContainer.appendChild(filePanel);
                refreshImagePicker();

                const hasImageDrag = (event) => {
                    const dt = event.dataTransfer;
                    if (!dt) return false;
                    if (dt.items && Array.from(dt.items).some((item) => item.kind === "file" && (!item.type || item.type.startsWith("image/")))) return true;
                    if (dt.types && Array.from(dt.types).includes("Files")) return true;
                    return false;
                };

                const getImageDropFile = (event) => {
                    const dt = event.dataTransfer;
                    const files = dt && dt.files ? Array.from(dt.files) : [];
                    const fileFromList = files.find((file) => file && file.type && file.type.startsWith("image/"));
                    if (fileFromList) return fileFromList;
                    const items = dt && dt.items ? Array.from(dt.items) : [];
                    for (const item of items) {
                        if (item.kind !== "file") continue;
                        const file = item.getAsFile ? item.getAsFile() : null;
                        if (file && file.type && file.type.startsWith("image/")) return file;
                    }
                    return null;
                };

                const getEventCanvasPos = (event) => {
                    if (app.canvas && typeof app.canvas.convertEventToCanvasOffset === "function") {
                        return app.canvas.convertEventToCanvasOffset(event);
                    }

                    const canvasEl = app.canvas && app.canvas.canvas;
                    const rect = canvasEl && canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : null;
                    const ds = app.canvas && app.canvas.ds;
                    const scale = ds && ds.scale ? ds.scale : 1;
                    const offset = ds && ds.offset ? ds.offset : [0, 0];
                    if (!rect) return null;
                    return [
                        (event.clientX - rect.left) / scale - offset[0],
                        (event.clientY - rect.top) / scale - offset[1]
                    ];
                };

                const isEventOverThisNode = (event) => {
                    const wrapperRect = wrapper.getBoundingClientRect();
                    if (
                        event.clientX >= wrapperRect.left &&
                        event.clientX <= wrapperRect.right &&
                        event.clientY >= wrapperRect.top &&
                        event.clientY <= wrapperRect.bottom
                    ) {
                        return true;
                    }

                    const graphPos = getEventCanvasPos(event);
                    if (!graphPos || !node.pos || !node.size) return false;
                    const titleHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;
                    const pad = 8;
                    return (
                        graphPos[0] >= node.pos[0] - pad &&
                        graphPos[0] <= node.pos[0] + node.size[0] + pad &&
                        graphPos[1] >= node.pos[1] - titleHeight - pad &&
                        graphPos[1] <= node.pos[1] + node.size[1] + pad
                    );
                };

                ["dragenter", "dragover"].forEach((evtName) => {
                    wrapper.addEventListener(evtName, (e) => {
                        if (!hasImageDrag(e)) return;
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
                        setDropActive(true);
                    }, { passive: false });
                });

                wrapper.addEventListener("dragleave", (e) => {
                    if (!wrapper.contains(e.relatedTarget)) setDropActive(false);
                });

                wrapper.addEventListener("drop", async (e) => {
                    const file = getImageDropFile(e);
                    if (!file) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setDropActive(false);
                    await uploadImageFile(file);
                }, { passive: false });

                const documentDragOverHandler = (e) => {
                    if (!hasImageDrag(e) || !isEventOverThisNode(e)) {
                        if (node._trixDropActive) setDropActive(false);
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
                    setDropActive(true);
                };

                const documentDropHandler = async (e) => {
                    if (!isEventOverThisNode(e)) {
                        if (node._trixDropActive) setDropActive(false);
                        return;
                    }
                    const file = getImageDropFile(e);
                    if (!file) {
                        setDropActive(false);
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    setDropActive(false);
                    await uploadImageFile(file);
                };

                document.addEventListener("dragover", documentDragOverHandler, { capture: true, passive: false });
                document.addEventListener("drop", documentDropHandler, { capture: true, passive: false });

                node.onDropFile = (file) => {
                    if (!file || !file.type || !file.type.startsWith("image/")) return false;
                    setDropActive(false);
                    uploadImageFile(file);
                    return true;
                };

                const tabs = document.createElement("div");
                tabs.style.cssText = `display: flex; gap: 4px; width: 100%; height: 22px; background: var(--trix-panel-soft); border-radius: 0; padding: 2px 6px; box-sizing: border-box; align-items: center;`;
                const btnRef = {};
                
                let clickTimer = null; 
                
                ["Preview", "Mask", "Filter", "Resize"].forEach(m => {
                    const btn = document.createElement("button");
                    if (m === "Preview") {
                        btn.innerText = "☘";
                        btn.title = "Preview Mode";
                        btn.style.cssText = "flex: 0 0 18px; width: 18px; margin: 0; cursor: pointer; background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid transparent; border-radius: 4px; font-size: 11px; font-weight: 500; transition: 0.15s ease-in-out; display: flex; align-items: center; justify-content: center; text-align: center; white-space: nowrap; overflow: hidden; height: 100%; box-sizing: border-box; text-shadow: 0 1px 1px rgba(0,0,0,0.5);";
                    } else {
                        btn.innerText = m.toUpperCase();
                        btn.style.cssText = "flex: 1; margin: 0; cursor: pointer; background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid transparent; border-radius: 4px; font-size: 10px; font-weight: 500; transition: 0.15s ease-in-out; display: flex; align-items: center; justify-content: center; text-align: center; white-space: nowrap; overflow: hidden; height: 100%; box-sizing: border-box; text-shadow: 0 1px 1px rgba(0,0,0,0.5);";
                    }
                    
                    btn.onmouseenter = () => { 
                        const isEnableResize = (widgets.enable_resize && widgets.enable_resize.value);
                        const isCrEnabled = (widgets.cr_enable && widgets.cr_enable.value);
                        if(widgets.mode && widgets.mode.value !== m) {
                            if (m === "Resize" && isEnableResize) {
                                btn.style.background = "var(--trix-active-hover)";
                            } else if (m === "Filter" && isCrEnabled) {
                                btn.style.background = "var(--trix-active-hover)";
                            } else {
                                btn.style.background = "rgba(255, 255, 255, 0.4)";
                            }
                        }
                    };
                    btn.onmouseleave = () => { 
                        const isEnableResize = (widgets.enable_resize && widgets.enable_resize.value);
                        const isCrEnabled = (widgets.cr_enable && widgets.cr_enable.value);
                        if(widgets.mode && widgets.mode.value !== m) {
                            if (m === "Resize" && isEnableResize) {
                                btn.style.background = "var(--trix-active)";
                            } else if (m === "Filter" && isCrEnabled) {
                                btn.style.background = "var(--trix-active)";
                            } else {
                                btn.style.background = "rgba(255, 255, 255, 0.2)";
                            }
                        }
                    };

                    btn.onclick = (e) => { 
                        e.preventDefault(); e.stopPropagation();
                        const currentMode = widgets.mode ? widgets.mode.value : "Main";
                        if (currentMode !== m) { 
                            if (widgets.mode) widgets.mode.value = m; 
                            if (!node.isFullscreen) node.isPreviewHidden = false; 
                            node._isToolbarHidden = false; 
                            updateUI(); 
                        } else {
                            if (m === "Mask") {
                                if (clickTimer) clearTimeout(clickTimer);
                                clickTimer = setTimeout(() => {
                                    node._isToolbarHidden = !node._isToolbarHidden;
                                    updateUI();
                                    clickTimer = null;
                                }, 220); 
                            }
                        }
                    };
                    
                    btn.ondblclick = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
                        
                        if (widgets.mode && widgets.mode.value === m) {
                            if (m === "Mask") {
                                openTrixMaskEditor(node);
                            } else if (m === "Filter") {
                                openTrixCameraRawEditor(node);
                            } else if (m === "Resize") {
                                const isWired = trixIsInputWired(node);
                                if (isWired) {
                                    alert("Please disconnect the in_image cable (incoming image) to use the manual canvas editor.");
                                    return;
                                }
                                openTrixCropEditor(node, widgets.crop_data);
                            }
                        }
                    };
                    tabs.appendChild(btn); btnRef[m] = btn;
                });

                const toolBar = document.createElement("div");
                const TOOLBAR_HEIGHT_FILTER_MASK = 26;
                const TOOLBAR_HEIGHT_RESIZE = 26;
                const TOOLBAR_BG_DARK = TRIX_PANEL_SOFT;
                const TOOLBAR_BG_LIGHT = TRIX_PANEL_SOFT;
                toolBar.style.cssText = `display: grid; grid-template-columns: minmax(30px, 1fr) auto auto auto auto auto auto auto; gap: 4px; align-items: center; background: var(--trix-mask-toolbar-bg); padding: 1px 6px 2px 6px; border: none; border-radius: 0; width: 100%; min-height: 26px; height: auto; box-sizing: border-box; overflow: hidden; position: relative;`;

                
                const slidersContainer = document.createElement("div");
                slidersContainer.style.cssText = "display: flex; flex-direction: column; width: 100%; justify-content: center; gap: 2px; padding: 0; min-width: 0; overflow: hidden;";

                const createSliderRow = (min, max, val, title, isHardness=false) => {
                    const wrap = document.createElement("div");
                    wrap.style.cssText = "display: flex; align-items: center; gap: 4px; width: 100%; overflow: hidden;";
                    
                    const slider = document.createElement("input"); 
                    slider.type = "range"; slider.min = min; slider.max = max; slider.value = val; 
                    slider.style.cssText = `flex: 1; cursor: pointer; min-width: 10px; width: 100%; margin: 0; accent-color: var(--trix-accent);`; slider.title = title;
                    
                    const num = document.createElement("input");
                    num.type = "number"; num.min = min; num.max = max; num.value = val;
                    num.style.cssText = "width: 38px; background: rgba(0,0,0,0.5); border: 1px solid var(--trix-border); color: var(--trix-text); font-size: 10px; border-radius: 3px; text-align: center; display: none; box-sizing: border-box; flex-shrink: 0;";
                    
                    slider.addEventListener("mousedown", (e) => e.stopPropagation()); 
                    slider.addEventListener("pointerdown", (e) => e.stopPropagation());
                    num.addEventListener("mousedown", (e) => e.stopPropagation()); 
                    num.addEventListener("pointerdown", (e) => e.stopPropagation());

                    wrap.append(slider, num);
                    return {wrap, slider, num};
                };

                const brushRow = createSliderRow(1, 250, 100, "Brush Size");
                const slider = brushRow.slider;
                node._sizeNum = brushRow.num;
                
                const hardnessRow = createSliderRow(0, 100, 100, "Brush Hardness", true);
                const hardnessSlider = hardnessRow.slider;
                node._hardnessNum = hardnessRow.num;
                hardnessRow.wrap.style.display = "none"; 

                slider.oninput = (e) => { node.brushSize = e.target.value; node._sizeNum.value = e.target.value; updateCursorSize(); };
                node._sizeNum.oninput = (e) => { let v = Math.max(1, Math.min(250, e.target.value||100)); node.brushSize = v; slider.value = v; updateCursorSize(); };

                hardnessSlider.oninput = (e) => { node.brushHardness = e.target.value / 100; node._hardnessNum.value = e.target.value; updateCursorSize(); };
                node._hardnessNum.oninput = (e) => { let v = Math.max(0, Math.min(100, e.target.value||100)); node.brushHardness = v / 100; hardnessSlider.value = v; updateCursorSize(); };

                slidersContainer.append(brushRow.wrap, hardnessRow.wrap);

                const colorPick = document.createElement("div"); colorPick.id = "colorPick";
                const colors = ["#FF0000", "#00FF00", "#FFFFFF", "#000000"];
                if (node._colorIdx === undefined) {
                    if (node.maskColor) {
                        const idx = colors.indexOf(node.maskColor.toUpperCase());
                        node._colorIdx = idx !== -1 ? idx : 0;
                    } else {
                        node._colorIdx = 0;
                    }
                }
                node.maskColor = colors[node._colorIdx];
                colorPick.style.cssText = `width: 18px; height: 18px; border: 2px solid #555; border-radius: 50%; background-color: ${node.maskColor}; cursor: pointer; flex-shrink: 0; box-sizing: border-box;`;
                colorPick.onclick = () => { 
                    node._colorIdx = (node._colorIdx + 1) % colors.length; 
                    node.maskColor = colors[node._colorIdx]; 
                    colorPick.style.backgroundColor = node.maskColor; 
                    if (node.maskCanvasRef) {
                        recolorCanvas(node.maskCanvasRef, node.maskColor);
                    }
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                };
                node.updateColorPickBgRef = () => {
                    if (node._colorIdx !== undefined) {
                        node.maskColor = colors[node._colorIdx];
                        colorPick.style.backgroundColor = node.maskColor;
                        if (node.maskCanvasRef) {
                            recolorCanvas(node.maskCanvasRef, node.maskColor);
                        }
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                    }
                };

                if (node._visualOpacityStandard === undefined) {
                    node._visualOpacityStandard = 0.8;
                }

                colorPick.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const existing = document.getElementById("trix-visual-opacity-popup");
                    if (existing) existing.remove();

                    const popup = document.createElement("div");
                    popup.id = "trix-visual-opacity-popup";
                    popup.style.cssText = `
                        position: fixed;
                        background: var(--trix-panel-soft);
                        border: 1px solid var(--trix-border);
                        border-radius: 6px;
                        padding: 8px 10px;
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        z-index: 10000;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                        width: 160px;
                        box-sizing: border-box;
                    `;

                    const rect = colorPick.getBoundingClientRect();
                    popup.style.left = `${rect.left}px`;
                    popup.style.top = `${rect.bottom + 5}px`;

                    const title = document.createElement("div");
                    title.innerText = "Mask Alpha";
                    title.style.cssText = "color: var(--trix-icon); font-size: 10px; font-weight: bold; font-family: sans-serif; user-select: none;";

                    const row = document.createElement("div");
                    row.style.cssText = "display: flex; align-items: center; gap: 6px; width: 100%;";

                    const slider = document.createElement("input");
                    slider.type = "range";
                    slider.min = "0";
                    slider.max = "100";
                    slider.value = Math.round(node._visualOpacityStandard * 100);
                    slider.style.cssText = `flex: 1; cursor: pointer; min-width: 10px; width: 100%; margin: 0; accent-color: var(--trix-accent);`;

                    const valLabel = document.createElement("div");
                    valLabel.innerText = `${Math.round(node._visualOpacityStandard * 100)}%`;
                    valLabel.style.cssText = "color: var(--trix-text); font-size: 10px; font-family: monospace; width: 28px; text-align: right; user-select: none;";

                    const updateOpacity = (val) => {
                        node._visualOpacityStandard = val / 100;
                        valLabel.innerText = `${val}%`;
                        if (node.isFullscreen && node.maskCanvasRef) {
                            node.maskCanvasRef.style.opacity = node._isMaskHidden ? "0" : String(node._visualOpacityStandard);
                        }
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                    };

                    slider.oninput = (ev) => {
                        updateOpacity(ev.target.value);
                    };

                    slider.addEventListener("mousedown", (ev) => ev.stopPropagation());
                    slider.addEventListener("pointerdown", (ev) => ev.stopPropagation());

                    row.append(slider, valLabel);
                    popup.append(title, row);
                    document.body.appendChild(popup);

                    const closePopup = (ev) => {
                        if (!popup.contains(ev.target)) {
                            popup.remove();
                            document.removeEventListener("pointerdown", closePopup, { capture: true });
                        }
                    };
                    setTimeout(() => {
                        document.addEventListener("pointerdown", closePopup, { capture: true });
                    }, 50);
                };

                const ICON_SIZE = "16.5px"; 
                const iconStyle = `width:${ICON_SIZE}; height:${ICON_SIZE}; position:absolute; pointer-events:none;`;

                const createBtn = (iconSvg, hint) => {
                    const b = document.createElement("button"); b.innerHTML = iconSvg; b.title = hint;
                    b.style.cssText = "position: relative; overflow: visible; background: var(--trix-mask-toolbar-icon-bg); color: var(--trix-icon); border: 1px solid var(--trix-border); border-radius: 4px; width: 18px; height: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none; transition: 0.1s; flex-shrink: 0;";
                    b.onmouseenter = () => { b.style.background = "rgba(58, 58, 64, 0.8)"; }; b.onmouseleave = () => { b.style.background = "var(--trix-mask-toolbar-icon-bg)"; }; return b;
                };

                const svgEyeMask = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
                const svgUndoMask = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>`;
                const svgRedoMask = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg>`;
                const svgEraserMask = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"></path><line x1="17" y1="14" x2="10" y2="7"></line></svg>`;
                const svgClearMask = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="${iconStyle}"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
                const svgResetCR = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3 8a9 9 0 1 0 2.64-4.64L3 6"></path></svg>`;

                const toggleMaskBtn = createBtn(svgEyeMask, "Hold to hide mask");
                toggleMaskBtn.onpointerdown = (e) => { node._isMaskHidden = true; if (node.isFullscreen) maskCanvas.style.opacity = "0"; if (app.graph) app.graph.setDirtyCanvas(true, true); };
                const restoreMask = () => { if (!node._isMaskHidden) return; node._isMaskHidden = false; if (node.isFullscreen) maskCanvas.style.opacity = String(node._visualOpacityStandard !== undefined ? node._visualOpacityStandard : 0.8); if (app.graph) app.graph.setDirtyCanvas(true, true); };
                toggleMaskBtn.onpointerup = restoreMask; toggleMaskBtn.onpointerleave = restoreMask;

                const undoBtn = createBtn(svgUndoMask, "Undo"); 
                const redoBtn = createBtn(svgRedoMask, "Redo"); 
                const eraserBtn = createBtn(svgEraserMask, "Eraser"); 
                const clearBtn = createBtn(svgClearMask, "Clear");

                eraserBtn.onmouseenter = () => { eraserBtn.style.background = node.isEraser ? "var(--trix-accent-hover)" : "rgba(58, 58, 64, 0.8)"; }; 
                eraserBtn.onmouseleave = () => { eraserBtn.style.background = node.isEraser ? "var(--trix-accent)" : "var(--trix-mask-toolbar-icon-bg)"; };
                eraserBtn.onclick = () => { node.isEraser = !node.isEraser; eraserBtn.style.background = node.isEraser ? "var(--trix-accent)" : "var(--trix-mask-toolbar-icon-bg)"; eraserBtn.style.color = node.isEraser ? "#fff" : "var(--trix-icon)"; };

                const svgWandMask = `<svg viewBox="0 0 24 24" fill="currentColor" style="${iconStyle}"><path d="M12 2 C12 8.5 8.5 12 2 12 C8.5 12 12 15.5 12 22 C12 15.5 15.5 12 22 12 C15.5 12 12 8.5 12 2 Z"></path></svg>`;
                const aiBtn = createBtn(svgWandMask, "Open Advanced Mask Editor");
                aiBtn.style.borderColor = "var(--trix-accent)";
                aiBtn.onclick = () => { openTrixMaskEditor(node); };

                toolBar.append(slidersContainer, colorPick, toggleMaskBtn, undoBtn, redoBtn, eraserBtn, clearBtn, aiBtn);
                headerContainer.append(tabs, toolBar);

                const getW = (name) => node.widgets ? node.widgets.find(w => w && w.name === name) : undefined;
                
                const resizePanel = document.createElement("div");
                resizePanel.className = "trix-resize-panel";
                resizePanel.style.cssText = `display: none; flex-direction: column; width: 100%; height: 100%; padding: 4px 8px; box-sizing: border-box; overflow-y: auto; overflow-x: hidden; pointer-events: auto; background: var(--trix-panel-soft); min-height: 0; border-radius: 0 0 6px 6px;`;

                if (!document.getElementById("trix-clean-inputs")) {
                    const style = document.createElement("style");
                    style.id = "trix-clean-inputs";
                    style.innerHTML = `
                        input.trix-num::-webkit-inner-spin-button, input.trix-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } 
                        input.trix-num { -moz-appearance: textfield; }
                        .trix-resize-panel::-webkit-scrollbar { width: 6px; }
                        .trix-resize-panel::-webkit-scrollbar-track { background: transparent; }
                        .trix-resize-panel::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                        .trix-resize-panel::-webkit-scrollbar-thumb:hover { background: #666; }
                        .trix-cr-panel::-webkit-scrollbar { width: 6px; }
                        .trix-cr-panel::-webkit-scrollbar-track { background: transparent; }
                        .trix-cr-panel::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                        .trix-cr-panel::-webkit-scrollbar-thumb:hover { background: #666; }

                        /* Dynamic Node Colors customization overrides */
                        .trix-file-panel { background: var(--trix-bg) !important; border-bottom: 1px solid var(--trix-control) !important; }
                        .trix-file-panel-top-shield { background: var(--trix-bg) !important; }
                        .trix-resize-panel { background: var(--trix-panel-soft) !important; }
                        .trix-control-row { background: var(--trix-control) !important; border: 1px solid var(--trix-border) !important; }
                    `;
                    document.head.appendChild(style);
                }

                const createToggleRow = (label, wgtName) => {
                    const wgt = getW(wgtName);
                    const row = document.createElement("div");
                    row.className = "trix-control-row";
                    row.style.cssText = `display: flex; flex-direction: row; align-items: center; justify-content: space-between; background: var(--trix-control); padding: 4px 8px; margin-bottom: 4px; border-radius: 4px; border: 1px solid var(--trix-border); box-shadow: inset 0 1px 2px rgba(0,0,0,0.32); flex-shrink: 0; min-height: 26px;`;

                    const title = document.createElement("span");
                    title.innerText = label;
                    title.style.cssText = "color: var(--trix-text); font-family: var(--comfy-font-family, sans-serif); font-size: 11px; font-weight: 500; text-shadow: 1px 1px 1px #000;";

                    if (wgtName === "enable_resize" || wgtName === "cr_enable") {
                        title.style.fontWeight = "bold";
                    }

                    const switchContainer = document.createElement("label");
                    switchContainer.style.cssText = "position: relative; display: inline-block; width: 34px; height: 18px; margin: 0; cursor: pointer;";

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.style.cssText = "opacity: 0; width: 0; height: 0; position: absolute;";
                    checkbox.checked = wgt ? !!wgt.value : false;

                    const track = document.createElement("span");
                    track.style.cssText = "position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: " + (checkbox.checked ? "var(--trix-active)" : "#111") + "; transition: .2s; border-radius: 18px; border: 1px solid var(--trix-border); box-sizing: border-box;";

                    const circle = document.createElement("span");
                    circle.style.cssText = "position: absolute; content: ''; height: 12px; width: 12px; left: 2px; top: 2px; background-color: white; transition: .2s; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.5);" + (checkbox.checked ? " transform: translateX(16px);" : "");

                    track.appendChild(circle);
                    switchContainer.append(checkbox, track);

                    switchContainer.addEventListener("mousedown", (e) => e.stopPropagation());
                    switchContainer.addEventListener("pointerdown", (e) => e.stopPropagation());

                    checkbox.onchange = (e) => {
                        const val = e.target.checked;
                        if (wgt) wgt.value = val;
                        track.style.backgroundColor = val ? "var(--trix-active)" : "#111";
                        circle.style.transform = val ? "translateX(16px)" : "translateX(0)";
                        
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                        if (node.updateUIRef) node.updateUIRef(); 
                        if (wgtName !== "cr_enable" && node.updateDynamicVisibilityRef) node.updateDynamicVisibilityRef();
                    };

                    node._syncHTMLWithWidgets.push(() => {
                        if (wgt && wgt.value !== undefined) {
                            checkbox.checked = !!wgt.value;
                            track.style.backgroundColor = checkbox.checked ? "var(--trix-active)" : "#111";
                            circle.style.transform = checkbox.checked ? "translateX(16px)" : "translateX(0)";
                        }
                    });

                    if (wgtName === "enable_resize") {
                        node._checkboxEnableResize = checkbox;
                        node._trackEnableResize = track;
                        node._circleEnableResize = circle;
                    }
                    if (wgtName === "cr_enable") {
                        node._checkboxCREnable = checkbox;
                        node._trackCREnable = track;
                        node._circleCREnable = circle;
                    }

                    row.append(title, switchContainer);
                    return row;
                };

                const createInputRow = (label, wgtName, type, optionsOrMinMax) => {
                    const wgt = getW(wgtName); 
                    const row = document.createElement("div");
                    row.className = "trix-control-row";
                    row.style.cssText = `display: flex; flex-direction: row; align-items: center; background: var(--trix-control); padding: 4px 8px; margin-bottom: 4px; border-radius: 4px; border: 1px solid var(--trix-border); box-shadow: inset 0 1px 2px rgba(0,0,0,0.32); flex-shrink: 0; min-height: 26px;`;
                    
                    const title = document.createElement("span");
                    title.innerText = label;
                    title.style.cssText = "color: var(--trix-text); font-family: var(--comfy-font-family, sans-serif); font-size: 11px; font-weight: 500; text-shadow: 1px 1px 1px #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 85px;";
                    
                    row.append(title);

                    if (type === "select") {
                        const inputEl = document.createElement("select");
                        optionsOrMinMax.forEach(o => {
                            const opt = document.createElement("option");
                            opt.value = o; opt.innerText = o === "scale_by" ? "scale by" : o;
                            inputEl.appendChild(opt);
                        });
                        if (wgt && wgt.value !== undefined) inputEl.value = String(wgt.value);
                        inputEl.onchange = () => {
                            if (wgt) wgt.value = (typeof wgt.value === 'number') ? parseInt(inputEl.value) : inputEl.value;
                            if(app.graph) app.graph.setDirtyCanvas(true, true);
                            if(node.updateDynamicVisibilityRef) node.updateDynamicVisibilityRef();
                            if(node.updateResLabelTextRef) node.updateResLabelTextRef();
                        };
                        inputEl.style.cssText = "background: #000; color: var(--trix-text); border: 1px solid var(--trix-border); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-family: var(--comfy-font-family, monospace); outline: none; flex: 1; min-width: 0; box-sizing: border-box; cursor: pointer;";
                        
                        node._syncHTMLWithWidgets.push(() => {
                            if (wgt && wgt.value !== undefined) {
                                inputEl.value = String(wgt.value);
                            }
                        });

                        if (wgtName === "upscale_method") node._selectUpscaleMethod = inputEl;
                        if (wgtName === "keep_proportion") node._selectKeepProportion = inputEl;
                        if (wgtName === "condition") node._selectCondition = inputEl;

                        row.append(inputEl);
                    } else {
                        const minVal = optionsOrMinMax[0]; 
                        const maxVal = optionsOrMinMax[1];
                        const defVal = optionsOrMinMax.length > 2 ? optionsOrMinMax[2] : minVal;
                        
                        let startVal = (wgt && wgt.value !== undefined && wgt.value !== null) ? parseInt(wgt.value) : defVal;
                        if(isNaN(startVal)) startVal = defVal;
                        
                        const sliderEl = document.createElement("input");
                        sliderEl.type = "range";
                        sliderEl.min = minVal;
                        sliderEl.max = maxVal;
                        sliderEl.value = startVal;
                        sliderEl.style.cssText = `flex: 1; margin: 0 6px; min-width: 15px; cursor: pointer; accent-color: var(--trix-accent);`;
                        
                        const inputEl = document.createElement("input");
                        inputEl.type = "number";
                        inputEl.min = minVal; 
                        inputEl.max = maxVal;
                        inputEl.value = startVal;
                        inputEl.className = "trix-num";
                        inputEl.style.cssText = "background: #000; color: var(--trix-text); border: 1px solid var(--trix-border); padding: 2px 4px; border-radius: 4px; font-size: 11px; font-family: var(--comfy-font-family, monospace); outline: none; width: 42px; box-sizing: border-box; cursor: pointer; text-align: right; flex-shrink: 0;";
                        
                        sliderEl.addEventListener("mousedown", (e) => e.stopPropagation());
                        sliderEl.addEventListener("pointerdown", (e) => e.stopPropagation());
                        inputEl.addEventListener("pointerdown", (e) => e.stopPropagation());
                        
                        const updateVals = (val) => {
                            let parsed = parseInt(val);
                            if(isNaN(parsed)) parsed = minVal;
                            parsed = Math.max(minVal, Math.min(maxVal, parsed));
                            inputEl.value = parsed;
                            sliderEl.value = parsed;
                            if (wgt) wgt.value = parsed;
                            if(app.graph) app.graph.setDirtyCanvas(true, true);
                            if(node.updateResLabelTextRef) node.updateResLabelTextRef();
                        };

                        inputEl.onchange = (e) => updateVals(e.target.value);
                        sliderEl.oninput = (e) => updateVals(e.target.value);

                        inputEl.oncontextmenu = (e) => e.preventDefault();
                        inputEl.onmousedown = (e) => {
                            e.stopPropagation();
                            if (e.button === 0 || e.button === 2) {
                                const startY = e.clientY;
                                const startVal = (wgt && wgt.value !== undefined && wgt.value !== null) ? parseInt(wgt.value) : defVal;
                                let hasMoved = false;

                                const onMouseMove = (ev) => {
                                    const dy = ev.clientY - startY;
                                    if (!hasMoved && Math.abs(dy) > 3) {
                                        hasMoved = true;
                                        document.body.style.userSelect = "none";
                                        document.body.style.cursor = "ns-resize";
                                    }
                                    if (hasMoved) {
                                        const step = 4;
                                        let newVal = startVal - Math.round(dy / 2) * step;
                                        newVal = Math.max(minVal, Math.min(maxVal, newVal));
                                        updateVals(newVal);
                                    }
                                };

                                const onMouseUp = (ev) => {
                                    document.removeEventListener("mousemove", onMouseMove);
                                    document.removeEventListener("mouseup", onMouseUp);
                                    if (hasMoved) {
                                        document.body.style.userSelect = "";
                                        document.body.style.cursor = "";
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        inputEl.blur();
                                    }
                                };

                                document.addEventListener("mousemove", onMouseMove);
                                document.addEventListener("mouseup", onMouseUp);
                            }
                        };
                        
                        const doReset = () => updateVals(defVal);
                        sliderEl.ondblclick = doReset;
                        title.ondblclick = doReset;
                        title.style.cursor = "pointer";

                        node._syncHTMLWithWidgets.push(() => {
                            if (wgt && wgt.value !== undefined && wgt.value !== null) {
                                let parsed = parseInt(wgt.value);
                                if (!isNaN(parsed)) {
                                    inputEl.value = parsed;
                                    sliderEl.value = parsed;
                                }
                            }
                        });

                        if (wgtName === "width") { node._inputWidth = inputEl; node._sliderWidth = sliderEl; }
                        if (wgtName === "height") { node._inputHeight = inputEl; node._sliderHeight = sliderEl; }
                        if (wgtName === "pad_left") { node._inputPadLeft = inputEl; node._sliderPadLeft = sliderEl; }
                        if (wgtName === "pad_top") { node._inputPadTop = inputEl; node._sliderPadTop = sliderEl; }
                        if (wgtName === "pad_right") { node._inputPadRight = inputEl; node._sliderPadRight = sliderEl; }
                        if (wgtName === "pad_bottom") { node._inputPadBottom = inputEl; node._sliderPadBottom = sliderEl; }
                        if (wgtName === "feathering") { node._inputFeathering = inputEl; node._sliderFeathering = sliderEl; }
                        if (wgtName === "divisible_by") { node._inputDivisibleBy = inputEl; node._sliderDivisibleBy = sliderEl; }

                        row.append(sliderEl, inputEl);
                    }
                    
                    return row;
                };

                const createScaleByRow = () => {
                    const wgt = getW("scale_by");
                    const row = document.createElement("div");
                    row.style.cssText = `display: none; flex-direction: column; gap: 6px; background: var(--trix-control); padding: 7px 8px; margin-bottom: 4px; border-radius: 4px; border: 1px solid var(--trix-border); box-shadow: inset 0 1px 2px rgba(0,0,0,0.32); flex-shrink: 0;`;

                    const presetRow = document.createElement("div");
                    presetRow.style.cssText = "display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px;";

                    const customInput = document.createElement("input");
                    customInput.type = "number";
                    customInput.min = "0.01";
                    customInput.max = "64";
                    customInput.step = "0.01";
                    customInput.className = "trix-num";
                    customInput.style.cssText = `height: 24px; background: var(--trix-bg); color: var(--trix-text); border: 1px solid var(--trix-border); padding: 2px 8px; border-radius: 5px; font-size: 11px; font-family: var(--comfy-font-family, monospace); outline: none; width: 100%; box-sizing: border-box; cursor: pointer; text-align: center;`;

                    const normalizeScale = (val) => {
                        let parsed = parseFloat(val);
                        if (!Number.isFinite(parsed)) parsed = 1;
                        parsed = Math.max(0.01, Math.min(64, parsed));
                        return Math.round(parsed * 100) / 100;
                    };

                    const formatScale = (val) => {
                        const normalized = normalizeScale(val);
                        return Number.isInteger(normalized) ? String(normalized) : String(normalized).replace(/0+$/, "").replace(/\.$/, "");
                    };

                    const buttons = [];
                    const setScale = (value, silent = false) => {
                        const normalized = normalizeScale(value);
                        if (wgt) wgt.value = normalized;
                        customInput.value = formatScale(normalized);
                        buttons.forEach((btn) => {
                            const active = Math.abs(parseFloat(btn.dataset.scale) - normalized) < 0.001;
                            btn.style.background = active ? "var(--trix-accent)" : "var(--trix-bg)";
                            btn.style.color = active ? "#fff" : "var(--trix-text)";
                            btn.style.borderColor = active ? "var(--trix-accent)" : "var(--trix-border)";
                        });
                        if (!silent && app.graph) app.graph.setDirtyCanvas(true, true);
                        if (!silent && node.updateResLabelTextRef) node.updateResLabelTextRef();
                    };

                    [0.25, 0.5, 2, 4].forEach((scale) => {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.dataset.scale = String(scale);
                        btn.textContent = `${scale}x`;
                        btn.style.cssText = `height: 24px; background: var(--trix-bg); color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: 700; transition: 0.15s;`;
                        btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); setScale(scale); };
                        buttons.push(btn);
                        presetRow.appendChild(btn);
                    });

                    customInput.onchange = (e) => setScale(e.target.value);
                    customInput.oninput = (e) => {
                        const val = parseFloat(e.target.value);
                        if (Number.isFinite(val)) {
                            const clamped = Math.max(0.01, Math.min(64, val));
                            if (wgt) wgt.value = clamped;
                            if (node.updateResLabelTextRef) node.updateResLabelTextRef();
                        }
                    };
                    customInput.addEventListener("mousedown", (e) => e.stopPropagation());
                    customInput.addEventListener("pointerdown", (e) => e.stopPropagation());

                    node._syncHTMLWithWidgets.push(() => {
                        if (wgt && wgt.value !== undefined && wgt.value !== null) {
                            setScale(wgt.value, true);
                        } else {
                            setScale(1, true);
                        }
                    });

                    setScale(wgt && wgt.value !== undefined ? wgt.value : 1, true);
                    row.append(presetRow, customInput);
                    return row;
                };

                const createCropPositionRow = () => {
                    const wgt = getW("crop_position");
                    const row = document.createElement("div");
                    row.style.cssText = `display: none; flex-direction: column; margin-bottom: 4px; position: relative;`;

                    const btn = document.createElement("button");
                    const svgChevron = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: auto;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                    
                    const formatVal = (val) => {
                        if (val === undefined || val === null) return "Center";
                        const strVal = String(val);
                        if (strVal === "center") return "Center";
                        return strVal.replace("-", " ");
                    };
                    
                    btn.innerHTML = `<span style="font-size: 11px; font-weight: 500;">Crop Position: ${formatVal(wgt ? wgt.value : "center")}</span>${svgChevron}`;
                    btn.style.cssText = `background: var(--trix-control); color: var(--trix-icon); border: 1px solid var(--trix-border); border-radius: 4px; padding: 4px 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; transition: 0.2s; box-sizing: border-box; min-height: 26px;`;
                    
                    btn.onmouseenter = () => { btn.style.background = "var(--trix-control-hover)"; btn.style.color = "var(--trix-text)"; };
                    btn.onmouseleave = () => { btn.style.background = "var(--trix-control)"; btn.style.color = "var(--trix-icon)"; };

                    const dropdown = document.createElement("div");
                    dropdown.style.cssText = `
                        position: fixed; z-index: 10000000;
                        background: var(--trix-bg); border: 1px solid var(--trix-border); border-radius: 6px; 
                        display: none; grid-template-columns: repeat(3, 1fr); gap: 6px; padding: 8px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.5); box-sizing: border-box;
                        width: 120px; aspect-ratio: 1;
                    `;
                    document.body.appendChild(dropdown);
                    node.cropPositionDropdown = dropdown;

                    dropdown.oncontextmenu = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    };
                    dropdown.addEventListener("click", (e) => e.stopPropagation());
                    dropdown.addEventListener("mousedown", (e) => e.stopPropagation());
                    dropdown.addEventListener("pointerdown", (e) => e.stopPropagation());

                    // Only 5 clickable options, corners are placeholders
                    const options = [
                        { placeholder: true },
                        { label: "Top", id: "top" },
                        { placeholder: true },
                        { label: "Left", id: "left" },
                        { label: "Center", id: "center", displayLabel: "Center" },
                        { label: "Right", id: "right" },
                        { placeholder: true },
                        { label: "Bottom", id: "bottom" },
                        { placeholder: true }
                    ];

                    const gridButtons = [];

                    const updateHighlight = (activeId) => {
                        gridButtons.forEach(b => {
                            const isAct = b.getAttribute("data-id") === activeId;
                            b.setAttribute("data-active", isAct ? "true" : "false");
                            b.style.background = isAct ? "var(--trix-accent)" : "var(--trix-control)";
                        });
                    };

                    options.forEach(opt => {
                        if (opt.placeholder) {
                            const placeholder = document.createElement("div");
                            placeholder.style.cssText = "visibility: hidden; aspect-ratio: 1; width: 100%;";
                            dropdown.appendChild(placeholder);
                            return;
                        }

                        const item = document.createElement("button");
                        item.title = opt.displayLabel || opt.label;
                        item.setAttribute("data-id", opt.id);
                        item.style.cssText = "background: var(--trix-control); border: 1px solid var(--trix-border); border-radius: 4px; cursor: pointer; transition: 0.15s; aspect-ratio: 1; width: 100%; box-sizing: border-box; padding: 0;";
                        gridButtons.push(item);

                        item.onmouseenter = () => {
                            const isActive = item.getAttribute("data-active") === "true";
                            if (!isActive) {
                                item.style.background = "var(--trix-control-hover)";
                            }
                        };
                        item.onmouseleave = () => {
                            const isActive = item.getAttribute("data-active") === "true";
                            if (isActive) {
                                item.style.background = "var(--trix-accent)";
                            } else {
                                item.style.background = "var(--trix-control)";
                            }
                        };

                        item.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const val = opt.id;
                            if (wgt) {
                                wgt.value = val;
                            }
                            btn.querySelector("span").innerText = `Crop Position: ${opt.displayLabel || opt.label}`;
                            dropdown.style.display = "none";
                            
                            const panel = row.closest(".trix-resize-panel");
                            if (panel) {
                                panel.style.overflow = "auto";
                            }

                            updateHighlight(val);
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                        };
                        dropdown.appendChild(item);
                    });

                    const updateDropdownPosition = () => {
                        const rect = btn.getBoundingClientRect();
                        dropdown.style.left = `${Math.max(0, Math.min(window.innerWidth - 130, rect.left + rect.width / 2 - 60))}px`;
                        dropdown.style.top = `${Math.max(0, Math.min(window.innerHeight - 130, rect.bottom + 4))}px`;
                    };

                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const show = dropdown.style.display === "grid";
                        if (!show) {
                            updateDropdownPosition();
                            dropdown.style.display = "grid";
                        } else {
                            dropdown.style.display = "none";
                        }
                        
                        const panel = row.closest(".trix-resize-panel");
                        if (panel) {
                            panel.style.overflow = show ? "auto" : "visible";
                        }

                        if (!show && wgt) {
                            updateHighlight(wgt.value);
                        }
                    };

                    document.addEventListener("click", () => {
                        dropdown.style.display = "none";
                        const panel = row.closest(".trix-resize-panel");
                        if (panel) {
                            panel.style.overflow = "auto";
                        }
                    });

                    node._syncHTMLWithWidgets.push(() => {
                        if (wgt && wgt.value !== undefined) {
                            btn.querySelector("span").innerText = `Crop Position: ${formatVal(wgt.value)}`;
                            updateHighlight(wgt.value);
                        }
                    });

                    if (wgt) {
                        updateHighlight(wgt.value);
                    }

                    row.append(btn);
                    return row;
                };

                const openCustomColorPicker = (initialColor, onApply) => {
                    const popup = document.createElement("div");
                    popup.style.cssText = `
                        position: fixed; z-index: 100000; background: #1a1a1f; 
                        border: 1px solid #444; border-radius: 8px; padding: 12px; 
                        display: flex; flex-direction: column; align-items: center; gap: 10px; width: 220px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.8); font-family: sans-serif;
                    `;

                    const rect = colorBtn.getBoundingClientRect();
                    popup.style.left = `${Math.min(window.innerWidth - 240, rect.left)}px`;
                    popup.style.top = `${Math.min(window.innerHeight - 340, rect.bottom + 5)}px`;

                    const title = document.createElement("div");
                    title.innerText = "Pad color";
                    title.style.cssText = "color: #fff; font-size: 11px; font-weight: bold; user-select: none;";
                    popup.appendChild(title);

                    const hexToRgb = (hex) => {
                        hex = hex.replace("#", "");
                        if (hex.length === 3) {
                            hex = hex.split("").map(x => x + x).join("");
                        }
                        const num = parseInt(hex, 16);
                        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
                    };

                    const rgbToHex = (r, g, b) => {
                        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                    };

                    const rgbToHsv = (r, g, b) => {
                        r /= 255; g /= 255; b /= 255;
                        const max = Math.max(r, g, b), min = Math.min(r, g, b);
                        let h, s, v = max;
                        const d = max - min;
                        s = max === 0 ? 0 : d / max;
                        if (max === min) {
                            h = 0;
                        } else {
                            switch (max) {
                                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                                case g: h = (b - r) / d + 2; break;
                                case b: h = (r - g) / d + 4; break;
                            }
                            h /= 6;
                        }
                        return { h: h * 360, s: s * 100, v: v * 100 };
                    };

                    const hsvToRgb = (h, s, v) => {
                        s /= 100; v /= 100;
                        let r, g, b;
                        const i = Math.floor(h / 60);
                        const f = h / 60 - i;
                        const p = v * (1 - s);
                        const q = v * (1 - f * s);
                        const t = v * (1 - (1 - f) * s);
                        switch (i % 6) {
                            case 0: r = v; g = t; b = p; break;
                            case 1: r = q; g = v; b = p; break;
                            case 2: r = p; g = v; b = t; break;
                            case 3: r = p; g = q; b = v; break;
                            case 4: r = t; g = p; b = v; break;
                            case 5: r = v; g = p; b = q; break;
                        }
                        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
                    };

                    let curHex = initialColor;
                    let { r, g, b } = hexToRgb(curHex);
                    let { h: curH, s: curS, v: curV } = rgbToHsv(r, g, b);

                    const swatchesContainer = document.createElement("div");
                    swatchesContainer.style.cssText = "display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; width: 100%;";

                    const swatchColors = [
                        "#ffffff", "#e0e0e0", "#c0c0c0", "#a0a0a0", "#808080", "#707070", "#505050", "#303030", "#202020", "#151515", "#0a0a0a", "#000000",
                        "#ff3b30", "#ff9500", "#ffcc00", "#4cd964", "#5ac8fa", "#007aff", "#5856d6", "#af52de", "#ff2d55", "#ff5e3a", "#ff954f", "#ffdb4c",
                        "#8e8e93", "#63da38", "#1badf8", "#005ecb", "#3f2b96", "#8a2be2", "#a0522d", "#d2b48c", "#cd853f", "#bc8f8f", "#8b4513", "#5c4033"
                    ];

                    swatchColors.forEach(color => {
                        const swatch = document.createElement("div");
                        swatch.style.cssText = `background: ${color}; border-radius: 3px; aspect-ratio: 1; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);`;
                        swatch.onclick = () => {
                            updateSelectedColor(color);
                        };
                        swatchesContainer.appendChild(swatch);
                    });
                    popup.appendChild(swatchesContainer);

                    const pickerContainer = document.createElement("div");
                    pickerContainer.style.cssText = "display: flex; gap: 10px; width: 100%; height: 130px; box-sizing: border-box;";

                    const svCanvas = document.createElement("canvas");
                    svCanvas.width = 160;
                    svCanvas.height = 130;
                    svCanvas.style.cssText = "border-radius: 4px; border: 1px solid var(--trix-border); cursor: crosshair; flex: 1; min-width: 0;";
                    pickerContainer.appendChild(svCanvas);

                    const hueCanvas = document.createElement("canvas");
                    hueCanvas.width = 18;
                    hueCanvas.height = 130;
                    hueCanvas.style.cssText = "border-radius: 4px; border: 1px solid var(--trix-border); cursor: ns-resize; flex-shrink: 0;";
                    pickerContainer.appendChild(hueCanvas);

                    popup.appendChild(pickerContainer);

                    const textInput = document.createElement("input");
                    textInput.type = "text";
                    textInput.value = curHex;
                    textInput.style.cssText = "background: var(--trix-control); color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 4px; padding: 4px 8px; font-family: monospace; font-size: 11px; outline: none; width: 100%; box-sizing: border-box; text-align: center;";
                    textInput.onchange = (e) => {
                        let val = e.target.value;
                        if (!val.startsWith("#")) val = "#" + val;
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                            updateSelectedColor(val);
                        }
                    };
                    popup.appendChild(textInput);

                    const btnRow = document.createElement("div");
                    btnRow.style.cssText = "display: flex; gap: 6px; width: 100%; margin-top: 4px;";

                    const applyBtn = document.createElement("button");
                    applyBtn.type = "button";
                    applyBtn.innerText = "Apply";
                    applyBtn.style.cssText = `background: var(--trix-accent); color: var(--trix-text); border: none; border-radius: 4px; padding: 6px; font-size: 11px; font-weight: bold; cursor: pointer; flex: 1; transition: 0.15s;`;
                    applyBtn.onmouseenter = () => { applyBtn.style.background = "var(--trix-accent-hover)"; };
                    applyBtn.onmouseleave = () => { applyBtn.style.background = "var(--trix-accent)"; };
                    applyBtn.onclick = (e) => {
                        e.preventDefault();
                        onApply(curHex);
                        popup.remove();
                    };

                    const cancelBtn = document.createElement("button");
                    cancelBtn.type = "button";
                    cancelBtn.innerText = "Cancel";
                    cancelBtn.style.cssText = "background: var(--trix-control); color: var(--trix-icon); border: 1px solid var(--trix-border); border-radius: 4px; padding: 6px; font-size: 11px; cursor: pointer; flex: 1; transition: 0.15s;";
                    cancelBtn.onmouseenter = () => { cancelBtn.style.background = "var(--trix-control-hover)"; cancelBtn.style.color = "var(--trix-text)"; };
                    cancelBtn.onmouseleave = () => { cancelBtn.style.background = "var(--trix-control)"; cancelBtn.style.color = "var(--trix-icon)"; };
                    cancelBtn.onclick = (e) => {
                        e.preventDefault();
                        popup.remove();
                    };

                    btnRow.append(cancelBtn, applyBtn);
                    popup.appendChild(btnRow);

                    popup.addEventListener("mousedown", (ev) => ev.stopPropagation());
                    popup.addEventListener("pointerdown", (ev) => ev.stopPropagation());

                    const drawHue = () => {
                        const hctx = hueCanvas.getContext("2d");
                        const w = hueCanvas.width;
                        const h = hueCanvas.height;
                        hctx.clearRect(0, 0, w, h);

                        const grad = hctx.createLinearGradient(0, 0, 0, h);
                        grad.addColorStop(0, "red");
                        grad.addColorStop(0.17, "yellow");
                        grad.addColorStop(0.33, "green");
                        grad.addColorStop(0.5, "cyan");
                        grad.addColorStop(0.67, "blue");
                        grad.addColorStop(0.83, "magenta");
                        grad.addColorStop(1, "red");

                        hctx.fillStyle = grad;
                        hctx.fillRect(0, 0, w, h);

                        const indicatorY = (curH / 360) * h;
                        hctx.strokeStyle = "#fff";
                        hctx.lineWidth = 2;
                        hctx.beginPath();
                        hctx.moveTo(0, indicatorY);
                        hctx.lineTo(w, indicatorY);
                        hctx.stroke();

                        hctx.strokeStyle = "#000";
                        hctx.lineWidth = 1;
                        hctx.stroke();
                    };

                    const drawSV = () => {
                        const sctx = svCanvas.getContext("2d");
                        const w = svCanvas.width;
                        const h = svCanvas.height;
                        sctx.clearRect(0, 0, w, h);

                        const baseRgb = hsvToRgb(curH, 100, 100);
                        sctx.fillStyle = `rgb(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b})`;
                        sctx.fillRect(0, 0, w, h);

                        const gradW = sctx.createLinearGradient(0, 0, w, 0);
                        gradW.addColorStop(0, "#fff");
                        gradW.addColorStop(1, "rgba(255,255,255,0)");
                        sctx.fillStyle = gradW;
                        sctx.fillRect(0, 0, w, h);

                        const gradB = sctx.createLinearGradient(0, 0, 0, h);
                        gradB.addColorStop(0, "rgba(0,0,0,0)");
                        gradB.addColorStop(1, "#000");
                        sctx.fillStyle = gradB;
                        sctx.fillRect(0, 0, w, h);

                        const curX = (curS / 100) * w;
                        const curY = ((100 - curV) / 100) * h;

                        sctx.strokeStyle = "#fff";
                        sctx.lineWidth = 2;
                        sctx.beginPath();
                        sctx.arc(curX, curY, 4, 0, Math.PI * 2);
                        sctx.stroke();

                        sctx.strokeStyle = "#000";
                        sctx.lineWidth = 1;
                        sctx.stroke();
                    };

                    const updateSelectedColor = (hex) => {
                        curHex = hex;
                        textInput.value = hex;
                        const rgb = hexToRgb(hex);
                        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
                        curH = hsv.h;
                        curS = hsv.s;
                        curV = hsv.v;
                        drawHue();
                        drawSV();
                    };

                    let draggingHue = false;
                    const handleHueMove = (e) => {
                        const bounds = hueCanvas.getBoundingClientRect();
                        let y = e.clientY - bounds.top;
                        y = Math.max(0, Math.min(bounds.height, y));
                        curH = (y / bounds.height) * 360;
                        
                        const rgb = hsvToRgb(curH, curS, curV);
                        curHex = rgbToHex(rgb.r, rgb.g, rgb.b);
                        textInput.value = curHex;

                        drawHue();
                        drawSV();
                    };

                    hueCanvas.onmousedown = (e) => {
                        draggingHue = true;
                        handleHueMove(e);
                        
                        const onMouseMove = (ev) => {
                            if (draggingHue) handleHueMove(ev);
                        };
                        const onMouseUp = () => {
                            draggingHue = false;
                            document.removeEventListener("mousemove", onMouseMove);
                            document.removeEventListener("mouseup", onMouseUp);
                        };
                        document.addEventListener("mousemove", onMouseMove);
                        document.addEventListener("mouseup", onMouseUp);
                    };

                    let draggingSV = false;
                    const handleSVMove = (e) => {
                        const bounds = svCanvas.getBoundingClientRect();
                        let x = e.clientX - bounds.left;
                        let y = e.clientY - bounds.top;
                        x = Math.max(0, Math.min(bounds.width, x));
                        y = Math.max(0, Math.min(bounds.height, y));

                        curS = (x / bounds.width) * 100;
                        curV = 100 - (y / bounds.height) * 100;

                        const rgb = hsvToRgb(curH, curS, curV);
                        curHex = rgbToHex(rgb.r, rgb.g, rgb.b);
                        textInput.value = curHex;

                        drawSV();
                    };

                    svCanvas.onmousedown = (e) => {
                        draggingSV = true;
                        handleSVMove(e);
                        
                        const onMouseMove = (ev) => {
                            if (draggingSV) handleSVMove(ev);
                        };
                        const onMouseUp = () => {
                            draggingSV = false;
                            document.removeEventListener("mousemove", onMouseMove);
                            document.removeEventListener("mouseup", onMouseUp);
                        };
                        document.addEventListener("mousemove", onMouseMove);
                        document.addEventListener("mouseup", onMouseUp);
                    };

                    drawHue();
                    drawSV();

                    document.body.appendChild(popup);

                    const checkOutsideClick = (e) => {
                        if (!popup.contains(e.target) && !colorBtn.contains(e.target)) {
                            popup.remove();
                            document.removeEventListener("pointerdown", checkOutsideClick, { capture: true });
                        }
                    };
                    setTimeout(() => {
                        document.addEventListener("pointerdown", checkOutsideClick, { capture: true });
                    }, 50);
                };

                const createCustomPadRow = () => {
                    const row = document.createElement("div");
                    row.style.cssText = `display: none; flex-direction: column; background: ${TRIX_CONTROL}; padding: 8px; margin-bottom: 4px; border-radius: 4px; border: 1px solid ${TRIX_BORDER}; box-shadow: inset 0 1px 2px rgba(0,0,0,0.32); flex-shrink: 0;`;

                    const grid = document.createElement("div");
                    grid.style.cssText = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; box-sizing: border-box; align-items: center;";

                    const wgtL = getW("pad_left");
                    const wgtT = getW("pad_top");
                    const wgtR = getW("pad_right");
                    const wgtB = getW("pad_bottom");

                    const createPadCell = (wgt, sideLetter) => {
                        const cell = document.createElement("div");
                        cell.style.cssText = "position: relative; width: 100%; display: flex; align-items: center;";

                        const letter = document.createElement("span");
                        letter.innerText = sideLetter;
                        letter.style.cssText = "position: absolute; left: 8px; color: var(--trix-icon); font-weight: bold; font-family: monospace; font-size: 11px; user-select: none; pointer-events: none;";

                        const input = document.createElement("input");
                        input.type = "number";
                        input.value = wgt ? wgt.value : 0;
                        input.style.cssText = "background: #000; color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 4px; width: 100%; height: 26px; box-sizing: border-box; text-align: center; font-family: monospace; font-size: 11px; outline: none; padding-left: 16px; padding-right: 4px;";
                        input.className = "trix-num";

                        input.onchange = (e) => {
                            let val = parseInt(e.target.value) || 0;
                            val = Math.max(0, Math.min(16384, val));
                            input.value = val;
                            if (wgt) wgt.value = val;
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                            if (node.updateResLabelTextRef) node.updateResLabelTextRef();
                        };

                        input.oncontextmenu = (e) => e.preventDefault();
                        input.onmousedown = (e) => {
                            if (e.button === 0 || e.button === 2) {
                                const startY = e.clientY;
                                const startVal = wgt ? (parseInt(wgt.value) || 0) : 0;
                                let hasMoved = false;

                                const onMouseMove = (ev) => {
                                    const dy = ev.clientY - startY;
                                    if (!hasMoved && Math.abs(dy) > 3) {
                                        hasMoved = true;
                                        document.body.style.userSelect = "none";
                                        document.body.style.cursor = "ns-resize";
                                    }
                                    if (hasMoved) {
                                        const step = 4;
                                        let newVal = startVal - Math.round(dy / 2) * step;
                                        newVal = Math.max(0, Math.min(16384, newVal));
                                        input.value = newVal;
                                        if (wgt) wgt.value = newVal;
                                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                                        if (node.updateResLabelTextRef) node.updateResLabelTextRef();
                                    }
                                };

                                const onMouseUp = (ev) => {
                                    document.removeEventListener("mousemove", onMouseMove);
                                    document.removeEventListener("mouseup", onMouseUp);
                                    if (hasMoved) {
                                        document.body.style.userSelect = "";
                                        document.body.style.cursor = "";
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        input.blur();
                                    }
                                };

                                document.addEventListener("mousemove", onMouseMove);
                                document.addEventListener("mouseup", onMouseUp);
                            }
                        };

                        cell.append(letter, input);

                        node._syncHTMLWithWidgets.push(() => {
                            if (wgt && wgt.value !== undefined) {
                                input.value = wgt.value;
                            }
                        });

                        return { cell, input };
                    };

                    const cellT = createPadCell(wgtT, "T");
                    const cellL = createPadCell(wgtL, "L");
                    const cellR = createPadCell(wgtR, "R");
                    const cellB = createPadCell(wgtB, "B");

                    const createCorner = () => {
                        const div = document.createElement("div");
                        div.style.cssText = "visibility: hidden;";
                        return div;
                    };

                    const centerCell = document.createElement("div");
                    centerCell.style.cssText = "display: flex; gap: 8px; justify-content: center; align-items: center; width: 100%; height: 100%;";

                    const resetBtn = document.createElement("button");
                    resetBtn.type = "button";
                    resetBtn.title = "Reset Padding";
                    resetBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>`;
                    resetBtn.style.cssText = "background: var(--trix-control); color: var(--trix-icon); border: 1px solid var(--trix-border); border-radius: 4px; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; box-sizing: border-box; transition: 0.2s;";
                    resetBtn.onmouseenter = () => { resetBtn.style.background = "var(--trix-control-hover)"; resetBtn.style.color = "var(--trix-text)"; };
                    resetBtn.onmouseleave = () => { resetBtn.style.background = "var(--trix-control)"; resetBtn.style.color = "var(--trix-icon)"; };

                    resetBtn.onclick = (e) => {
                        e.preventDefault();
                        [cellT, cellL, cellR, cellB].forEach(c => {
                            c.input.value = 0;
                            c.input.onchange({ target: { value: 0 } });
                        });
                    };

                    window.colorBtn = document.createElement("button");
                    colorBtn.type = "button";
                    colorBtn.title = "Pad Color";
                    colorBtn.style.cssText = "border-radius: 4px; border: 1px solid var(--trix-border); cursor: pointer; aspect-ratio: 1; width: 24px; height: 24px; box-sizing: border-box; padding: 0; transition: transform 0.1s;";
                    colorBtn.onmouseenter = () => { colorBtn.style.transform = "scale(1.1)"; };
                    colorBtn.onmouseleave = () => { colorBtn.style.transform = "scale(1.0)"; };

                    const updateColorBtnBackground = () => {
                        const cropDataWgt = getW("crop_data");
                        let cdata = {};
                        if (cropDataWgt && cropDataWgt.value) {
                            try { cdata = JSON.parse(cropDataWgt.value); } catch(e) {}
                        }
                        const col = cdata.pad_color;
                        if (col) {
                            colorBtn.style.background = col;
                        } else {
                            colorBtn.style.background = "linear-gradient(135deg, red, yellow, green, cyan, blue, magenta)";
                        }
                    };

                    updateColorBtnBackground();

                    node._syncHTMLWithWidgets.push(() => {
                        updateColorBtnBackground();
                    });

                    colorBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const cropDataWgt = getW("crop_data");
                        let cdata = {};
                        if (cropDataWgt && cropDataWgt.value) {
                            try { cdata = JSON.parse(cropDataWgt.value); } catch(ev) {}
                        }
                        const currentColor = cdata.pad_color || "#808080";
                        
                        openCustomColorPicker(currentColor, (selectedColor) => {
                            cdata.pad_color = selectedColor;
                            if (cropDataWgt) {
                                cropDataWgt.value = JSON.stringify(cdata);
                            }
                            updateColorBtnBackground();
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                        });
                    };

                    centerCell.append(resetBtn, colorBtn);

                    grid.append(
                        createCorner(), cellT.cell, createCorner(),
                        cellL.cell, centerCell, cellR.cell,
                        createCorner(), cellB.cell, createCorner()
                    );

                    row.appendChild(grid);
                    return row;
                };

                const customPadRow = createCustomPadRow();

                const enableResizeRow = createToggleRow("Enable Settings", "enable_resize");
                
                const openCPOBtn = document.createElement("button");
                openCPOBtn.innerText = "Open CPO Editor";
                openCPOBtn.style.cssText = `background: var(--trix-accent); color: var(--trix-text); border: none; border-radius: 4px; padding: 6px; margin-bottom: 6px; margin-top: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s; width: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.3);`;
                openCPOBtn.onmouseenter = () => { openCPOBtn.style.background = "var(--trix-accent-hover)"; };
                openCPOBtn.onmouseleave = () => { openCPOBtn.style.background = "var(--trix-accent)"; };
                openCPOBtn.onclick = () => {
                    const isWired = trixIsInputWired(node);
                    if (isWired) {
                        alert("Please disconnect the in_image cable (incoming image) to use the manual canvas editor.");
                        return;
                    }
                    openTrixCropEditor(node, widgets.crop_data);
                };

                const widthRow = createInputRow("Width", "width", "number", [16, 16384, 1024]);
                const heightRow = createInputRow("Height", "height", "number", [16, 16384, 1024]);
                
                const padLeftRow = createInputRow("Pad Left", "pad_left", "number", [0, 16384, 0]);
                const padTopRow = createInputRow("Pad Top", "pad_top", "number", [0, 16384, 0]);
                const padRightRow = createInputRow("Pad Right", "pad_right", "number", [0, 16384, 0]);
                const padBottomRow = createInputRow("Pad Bottom", "pad_bottom", "number", [0, 16384, 0]);

                const upscaleMethodRow = createInputRow("Upscale Method", "upscale_method", "select", ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"]);
                const kpRow = createInputRow("Options", "keep_proportion", "select", ["stretch", "resize", "scale_by", "pad", "pad_edge_pixel", "crop", "pad_for_outpainting"]);
                const cropPositionRow = createCropPositionRow();
                const scaleByRow = createScaleByRow();
                const conditionRow = createInputRow("Condition", "condition", "select", ["always", "downscale if bigger", "upscale if smaller", "if bigger area", "if smaller area"]);
                const featherRow = createInputRow("Feathering", "feathering", "number", [0, 250, 0]);
                const divisibleByRow = createInputRow("Divisible By", "divisible_by", "number", [1, 256, 8]);

                resizePanel.append(
                    enableResizeRow,
                    openCPOBtn,
                    kpRow,
                    cropPositionRow,
                    customPadRow,
                    scaleByRow,
                    widthRow, heightRow, 
                    padLeftRow, padTopRow, padRightRow, padBottomRow, 
                    upscaleMethodRow, conditionRow, featherRow, divisibleByRow
                );

                node.updateDynamicVisibilityRef = () => {
                    const kpWgt = getW("keep_proportion");
                    const kpValue = kpWgt ? kpWgt.value : "resize";
                    const isPadOut = kpValue === "pad_for_outpainting";
                    const isScaleBy = kpValue === "scale_by";
                    const isCrop = kpValue === "crop";

                    const padDisplay = isPadOut ? "flex" : "none";
                    const normalDisplay = (!isPadOut && !isScaleBy) ? "flex" : "none";
                    const scaleDisplay = isScaleBy ? "flex" : "none";
                    const cropPosDisplay = isCrop ? "flex" : "none";
                    
                    if (widthRow) widthRow.style.display = normalDisplay;
                    if (heightRow) heightRow.style.display = normalDisplay;
                    if (scaleByRow) scaleByRow.style.display = scaleDisplay;
                    if (cropPositionRow) cropPositionRow.style.display = cropPosDisplay;
                    if (customPadRow) customPadRow.style.display = padDisplay;
                    
                    if (padLeftRow) padLeftRow.style.display = "none";
                    if (padTopRow) padTopRow.style.display = "none";
                    if (padRightRow) padRightRow.style.display = "none";
                    if (padBottomRow) padBottomRow.style.display = "none";
                    
                    if (conditionRow) conditionRow.style.display = normalDisplay;
                    if (featherRow) featherRow.style.display = padDisplay;

                    if (upscaleMethodRow) upscaleMethodRow.style.display = "flex";
                    if (kpRow) kpRow.style.display = "flex";
                    if (divisibleByRow) divisibleByRow.style.display = "flex";
                };
                
                node.updateDynamicVisibilityRef();

                // ==========================================
                // CAMERA RAW PANEL BUILD (IN MAIN TAB)
                // ==========================================
                const cameraRawPanel = document.createElement("div");
                cameraRawPanel.className = "trix-resize-panel";
                cameraRawPanel.style.cssText = `display: none; flex-direction: column; width: 100%; height: 100%; padding: 4px 8px; box-sizing: border-box; overflow-y: auto; overflow-x: hidden; pointer-events: auto; background: var(--trix-panel-soft); min-height: 0;`;

                const crEnableRow = createToggleRow("Enable Settings", "cr_enable");

                // --- Reset All button (same row as Enable Settings) ---
                const crResetBtn = document.createElement("button");
                crResetBtn.innerText = "↺ Reset All";
                crResetBtn.title = "Reset all filter parameters to defaults";
                crResetBtn.style.cssText = `background: #3a1a1a; color: #e88; border: 1px solid #5a2a2a; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 10px; font-weight: bold; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; margin-left: 6px;`;
                crResetBtn.onmouseenter = () => { crResetBtn.style.background = "#5a2020"; crResetBtn.style.color = "#ffaaaa"; };
                crResetBtn.onmouseleave = () => { crResetBtn.style.background = "#3a1a1a"; crResetBtn.style.color = "#e88"; };
                crResetBtn.addEventListener("mousedown", (e) => e.stopPropagation());
                crResetBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
                crResetBtn.onclick = () => {
                    // Default values for all CR state parameters (mirror of defaultCrState in trix_camera_raw.js)
                    const crDefaults = {
                        cr_offset: 0, cr_exp: 0, cr_cont: 0, cr_high: 0, cr_shad: 0, cr_white: 0, cr_black: 0,
                        cr_temp: 0, cr_tint: 0, cr_vibrance: 0, cr_colorfulness: 0, cr_sat: 0,
                        cr_tex: 0, cr_clar: 0, cr_dehz: 0, cr_sharp: 0, cr_denoise: 0,
                        cr_blur: 0, cr_surface_blur: 0, cr_grain: 0, cr_vignette: 0,
                        cr_sketch_kernel_size: 0, cr_sketch_sigma: 1.4, cr_sketch_k_sigma: 1.6,
                        cr_sketch_epsilon: -0.03, cr_sketch_phi: 10.0, cr_sketch_gamma: 1.0, cr_sketch_color: 'gray',
                        cr_pixel_colors: 128, cr_pixel_dot_size: 0, cr_pixel_outline: 0, cr_pixel_smoothing: 0, cr_pixel_algo: 'kmeans',
                        cr_blur_radius: 0, cr_blur_mode: 'Gaussian',
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
                    // Reset all CR widgets
                    for (const [key, val] of Object.entries(crDefaults)) {
                        const w = getW(key);
                        if (w) w.value = val;
                    }
                    // Reset HSL — write full default state (matching defaultHslState in trix_camera_raw.js)
                    const defaultHsl = {
                        colorize: false, activeChannel: 'master',
                        master:   { h: 0, s: 0, l: 0 },
                        reds:     { h: 0, s: 0, l: 0, center: 0,   width: 60 },
                        yellows:  { h: 0, s: 0, l: 0, center: 60,  width: 60 },
                        greens:   { h: 0, s: 0, l: 0, center: 120, width: 60 },
                        cyans:    { h: 0, s: 0, l: 0, center: 180, width: 60 },
                        blues:    { h: 0, s: 0, l: 0, center: 240, width: 60 },
                        magentas: { h: 0, s: 0, l: 0, center: 300, width: 60 }
                    };
                    const wHslData = getW("hsl_data");
                    if (wHslData) wHslData.value = JSON.stringify(defaultHsl);
                    const wHslActive = getW("hsl_active");
                    if (wHslActive) wHslActive.value = false;
                    // Reset Curves — write full default state (matching defaultCurvesState in trix_camera_raw.js)
                    const defaultCurves = {
                        activeChannel: 'rgb',
                        rgb: [{x:0,y:0},{x:255,y:255}],
                        r:   [{x:0,y:0},{x:255,y:255}],
                        g:   [{x:0,y:0},{x:255,y:255}],
                        b:   [{x:0,y:0},{x:255,y:255}]
                    };
                    const wCurveData = getW("curve_data");
                    if (wCurveData) wCurveData.value = JSON.stringify(defaultCurves);
                    const wCurveActive = getW("curve_active");
                    if (wCurveActive) wCurveActive.value = false;
                    // Reset node cached layer properties (so Live Camera Raw opens fresh)
                    if (node.properties) {
                        delete node.properties.trix_layers;
                        delete node.properties.trix_layers_mode;
                    }
                    // Sync all UI elements: sliders, wheels, triangles, toggles
                    if (node.syncHTMLRef) node.syncHTMLRef();
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                };
                crEnableRow.appendChild(crResetBtn);
                cameraRawPanel.appendChild(crEnableRow);

                const openCRBtn = document.createElement("button");
                openCRBtn.innerText = "Open Live Camera Raw";
                openCRBtn.style.cssText = `background: var(--trix-accent); color: var(--trix-text); border: none; border-radius: 4px; padding: 6px; margin-bottom: 6px; margin-top: 4px; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s; width: 100%; box-shadow: 0 1px 2px rgba(0,0,0,0.3);`;
                openCRBtn.onmouseenter = () => { openCRBtn.style.background = "var(--trix-accent-hover)"; };
                openCRBtn.onmouseleave = () => { openCRBtn.style.background = "var(--trix-accent)"; };
                openCRBtn.onclick = () => {
                    openTrixCameraRawEditor(node);
                };
                cameraRawPanel.appendChild(openCRBtn);



                let _aioColorWheelCanvas = null;
                const getAioColorWheelCanvas = () => {
                    if (_aioColorWheelCanvas) return _aioColorWheelCanvas;
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
                            const sat = dist / rmax;
                            const hp = hue / 60;
                            const cVal = sat;
                            const xVal = cVal * (1 - Math.abs((hp % 2) - 1));
                            let r1=0, g1=0, b1=0;
                            if (hp>=0 && hp<1) { r1=cVal; g1=xVal; }
                            else if (hp>=1 && hp<2) { r1=xVal; g1=cVal; }
                            else if (hp>=2 && hp<3) { g1=cVal; b1=xVal; }
                            else if (hp>=3 && hp<4) { g1=xVal; b1=cVal; }
                            else if (hp>=4 && hp<5) { r1=xVal; b1=cVal; }
                            else { r1=cVal; b1=xVal; }
                            const m = 0;
                            img.data[idx] = Math.round((r1+m)*255);
                            img.data[idx+1] = Math.round((g1+m)*255);
                            img.data[idx+2] = Math.round((b1+m)*255);
                            img.data[idx+3] = 255;
                        }
                    }
                    cx.putImageData(img, 0, 0);
                    _aioColorWheelCanvas = c;
                    return c;
                };

                let _aioCbDiscCanvas = null;
                const getAioCbDiscCanvas = () => {
                    if (_aioCbDiscCanvas) return _aioCbDiscCanvas;
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
                            const sat = dist / rmax;
                            const hp = hue / 60;
                            const cVal = sat;
                            const xVal = cVal * (1 - Math.abs((hp % 2) - 1));
                            let r1=0, g1=0, b1=0;
                            if (hp>=0 && hp<1) { r1=cVal; g1=xVal; }
                            else if (hp>=1 && hp<2) { r1=xVal; g1=cVal; }
                            else if (hp>=2 && hp<3) { g1=cVal; b1=xVal; }
                            else if (hp>=3 && hp<4) { g1=xVal; b1=cVal; }
                            else if (hp>=4 && hp<5) { r1=xVal; b1=cVal; }
                            else { r1=cVal; b1=xVal; }
                            const m = 1 - cVal;
                            img.data[idx] = Math.round((r1+m)*255);
                            img.data[idx+1] = Math.round((g1+m)*255);
                            img.data[idx+2] = Math.round((b1+m)*255);
                            img.data[idx+3] = 255;
                        }
                    }
                    cx.putImageData(img, 0, 0);
                    _aioCbDiscCanvas = c;
                    return c;
                };

                const getAioBaseImgData = () => {
                    if (!node.imgTagRef || !node.imgTagRef.naturalWidth) return null;
                    const c = document.createElement("canvas");
                    c.width = 64; c.height = 64;
                    const cx = c.getContext("2d");
                    cx.drawImage(node.imgTagRef, 0, 0, 64, 64);
                    try {
                        return cx.getImageData(0, 0, 64, 64).data;
                    } catch(e) {
                        return null;
                    }
                };

                const drawCfWheelRefs = [];
                const drawLevelsBarRefs = [];
                const drawCbWheelsRefs = [];
                const drawHtDialRefs = [];

                const drawAioHtDial = (htAngleCanvas) => {
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
                    const angDeg = parseFloat(getW('cr_ht_angle')?.value ?? 15);
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

                const aioHtPickAngle = (e, htAngleCanvas) => {
                    const rect = htAngleCanvas.getBoundingClientRect();
                    const scaleX = htAngleCanvas.width / rect.width;
                    const scaleY = htAngleCanvas.height / rect.height;
                    const mouseX = (e.clientX - rect.left) * scaleX;
                    const mouseY = (e.clientY - rect.top) * scaleY;
                    const dx = mouseX - 150;
                    const dy = mouseY - 43;
                    if (dx === 0 && dy === 0) return;
                    let angDeg = Math.atan2(dy, dx) * 180 / Math.PI;
                    angDeg = Math.round(angDeg);
                    const wAngle = getW('cr_ht_angle');
                    if (wAngle) wAngle.value = angDeg;

                    drawHtDialRefs.forEach(ref => ref());
                    updateGroupActiveColors();
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                };

                const drawAioCfWheel = (cfWheel) => {
                    const wCtx = cfWheel.getContext('2d');
                    const src = getAioColorWheelCanvas();
                    wCtx.clearRect(0, 0, 150, 150);
                    wCtx.drawImage(src, 0, 0, 150, 150);
                    
                    const density = parseFloat(getW('cr_cf_density')?.value || 0);
                    const hue = parseFloat(getW('cr_cf_hue')?.value || 0);
                    const ang = ((hue - 90 + 360) % 360) * Math.PI / 180;
                    const r = (density / 255) * 73;
                    const cx = 75 + Math.cos(ang) * r;
                    const cy = 75 + Math.sin(ang) * r;
                    
                    wCtx.lineWidth = 2.5; wCtx.strokeStyle = '#000';
                    wCtx.beginPath(); wCtx.arc(cx, cy, 4.5, 0, Math.PI * 2); wCtx.stroke();
                    wCtx.lineWidth = 1.5; wCtx.strokeStyle = '#fff';
                    wCtx.beginPath(); wCtx.arc(cx, cy, 4.5, 0, Math.PI * 2); wCtx.stroke();
                };

                const aioCfPickFromWheel = (e, cfWheel) => {
                    const rect = cfWheel.getBoundingClientRect();
                    const mx = ((e.clientX - rect.left) / rect.width) * cfWheel.width - 75;
                    const my = ((e.clientY - rect.top) / rect.height) * cfWheel.height - 75;
                    const dist = Math.sqrt(mx * mx + my * my);
                    
                    let hue = 0;
                    let density = 0;
                    if (dist > 0.1) {
                        const ang = Math.atan2(my, mx);
                        hue = Math.round((ang * 180 / Math.PI + 90 + 360) % 360);
                        density = Math.min(255, Math.round((dist / 73) * 255));
                    }
                    
                    const wHue = getW('cr_cf_hue');
                    const wDens = getW('cr_cf_density');
                    if (wHue) wHue.value = hue;
                    if (wDens) wDens.value = density;
                    
                    drawAioCfWheel(cfWheel);
                    updateGroupActiveColors();
                    if(app.graph) app.graph.setDirtyCanvas(true, true);
                };

                const drawAioLevelsBar = (lvlCanvas) => {
                    const lCtx = lvlCanvas.getContext("2d");
                    lCtx.clearRect(0, 0, 276, 120);
                    
                    lCtx.fillStyle = '#1a1a1a';
                    lCtx.fillRect(10, 5, 256, 60);
                    lCtx.strokeStyle = 'rgba(255,255,255,0.12)';
                    lCtx.strokeRect(10, 5, 256, 60);
                    
                    const channel = getW('cr_lvl_channel')?.value || 'rgb';
                    const hist = new Uint32Array(256);
                    const baseImgData = getAioBaseImgData();
                    if (baseImgData) {
                        const len = baseImgData.length;
                        const chIdx = channel === 'r' ? 0 : (channel === 'g' ? 1 : (channel === 'b' ? 2 : -1));
                        if (chIdx >= 0) {
                            for (let i = 0; i < len; i += 4) {
                                hist[baseImgData[i + chIdx]]++;
                            }
                        } else {
                            for (let i = 0; i < len; i += 4) {
                                const lum = Math.round(baseImgData[i] * 0.299 + baseImgData[i + 1] * 0.587 + baseImgData[i + 2] * 0.114);
                                hist[lum]++;
                            }
                        }
                    }
                    
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
                            const h = (hist[i] / maxV) * 55;
                            if (h > 0) {
                                lCtx.fillRect(10 + i, 65 - h, 1, h);
                            }
                        }
                    }
                    
                    // Normalize values to canvas coordinates (matching getLvlHandlePositions in trix_camera_raw.js)
                    const inB  = parseFloat(getW('cr_lvl_in_black')?.value ?? 0);
                    const inW  = parseFloat(getW('cr_lvl_in_white')?.value ?? 255);
                    const gamma = parseFloat(getW('cr_lvl_gamma')?.value ?? 1.0);
                    const outB = parseFloat(getW('cr_lvl_out_black')?.value ?? 0);
                    const outW = parseFloat(getW('cr_lvl_out_white')?.value ?? 255);

                    // Pixel X for each handle — same formula as camera raw
                    const bx  = 10 + (inB  / 255) * 256;
                    const wx  = 10 + (inW  / 255) * 256;
                    // Gamma: gRel = 0.5 - log10(gamma)/2  (matches camera raw dragLvlHandle inverse)
                    const gRel = 0.5 - Math.log10(Math.max(0.01, Math.min(99.99, gamma))) / 2;
                    const gx  = bx + Math.max(0, Math.min(1, gRel)) * (wx - bx);
                    const obx = 10 + (outB / 255) * 256;
                    const owx = 10 + (outW / 255) * 256;

                    // Input gradient bar
                    const gradIn = lCtx.createLinearGradient(10, 70, 266, 70);
                    gradIn.addColorStop(0, '#000'); gradIn.addColorStop(1, '#fff');
                    lCtx.fillStyle = gradIn;
                    lCtx.fillRect(10, 70, 256, 8);

                    // Input handles (triangle pointing down, tip at top)
                    const drawHandle = (ctx, x, y, fill, stroke) => {
                        ctx.beginPath();
                        ctx.moveTo(x, y - 6);
                        ctx.lineTo(x - 5, y + 4);
                        ctx.lineTo(x + 5, y + 4);
                        ctx.closePath();
                        ctx.fillStyle = fill; ctx.fill();
                        ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke();
                    };
                    drawHandle(lCtx, bx, 84, '#000', '#fff');
                    drawHandle(lCtx, gx, 84, '#808080', '#fff');
                    drawHandle(lCtx, wx, 84, '#fff', '#000');

                    // Output gradient bar
                    const gradOut = lCtx.createLinearGradient(10, 92, 266, 92);
                    gradOut.addColorStop(0, '#000'); gradOut.addColorStop(1, '#fff');
                    lCtx.fillStyle = gradOut;
                    lCtx.fillRect(10, 92, 256, 8);

                    drawHandle(lCtx, obx, 106, '#000', '#fff');
                    drawHandle(lCtx, owx, 106, '#fff', '#000');
                };

                const aioHitTestLvlHandle = (mx, my, inB, inW, gamma, outB, outW) => {
                    // All positions in canvas pixel coordinates (same formula as drawAioLevelsBar)
                    const bx  = 10 + (inB  / 255) * 256;
                    const wx  = 10 + (inW  / 255) * 256;
                    const gRel = 0.5 - Math.log10(Math.max(0.01, Math.min(99.99, gamma))) / 2;
                    const gx  = bx + Math.max(0, Math.min(1, gRel)) * (wx - bx);
                    const obx = 10 + (outB / 255) * 256;
                    const owx = 10 + (outW / 255) * 256;
                    
                    if (my >= 68 && my <= 92) {
                        const dB = Math.abs(mx - bx);
                        const dG = Math.abs(mx - gx);
                        const dW = Math.abs(mx - wx);
                        const minD = Math.min(dB, dG, dW);
                        if (minD <= 8) {
                            if (minD === dB) return 'in_black';
                            if (minD === dW) return 'in_white';
                            return 'gamma';
                        }
                    }
                    if (my >= 96 && my <= 116) {
                        if (Math.abs(mx - obx) <= 8) return 'out_black';
                        if (Math.abs(mx - owx) <= 8) return 'out_white';
                    }
                    return null;
                };

                let aioActiveLvlHandle = null;
                const aioDragLvlHandle = (mx, lvlCanvas) => {
                    if (!aioActiveLvlHandle) return;
                    // Convert canvas pixel X to value 0-255 (inverse of 10 + (val/255)*256)
                    const xNorm = Math.max(0, Math.min(1, (mx - 10) / 256));
                    const val   = Math.round(xNorm * 255);
                    
                    const inB = parseFloat(getW('cr_lvl_in_black')?.value ?? 0);
                    const inW = parseFloat(getW('cr_lvl_in_white')?.value ?? 255);
                    
                    if (aioActiveLvlHandle === 'in_black') {
                        const newVal = Math.min(inW - 1, Math.max(0, val));
                        getW('cr_lvl_in_black').value = newVal;
                    } else if (aioActiveLvlHandle === 'in_white') {
                        const newVal = Math.max(inB + 1, Math.min(255, val));
                        getW('cr_lvl_in_white').value = newVal;
                    } else if (aioActiveLvlHandle === 'out_black') {
                        const outW = parseFloat(getW('cr_lvl_out_white')?.value ?? 255);
                        const newVal = Math.min(outW - 1, Math.max(0, val));
                        getW('cr_lvl_out_black').value = newVal;
                    } else if (aioActiveLvlHandle === 'out_white') {
                        const outB = parseFloat(getW('cr_lvl_out_black')?.value ?? 0);
                        const newVal = Math.max(outB + 1, Math.min(255, val));
                        getW('cr_lvl_out_white').value = newVal;
                    } else if (aioActiveLvlHandle === 'gamma') {
                        // Map xNorm (pixel fraction) back to gamma via inverse of gRel formula
                        // gRel = 0.5 - log10(gamma)/2  =>  gamma = 10^((0.5 - gRel) * 2)
                        const curInB = 10 + (inB / 255) * 256;
                        const curInW = 10 + (inW / 255) * 256;
                        const range  = Math.max(1, curInW - curInB);
                        const gRel   = Math.max(0, Math.min(1, (mx - curInB) / range));
                        const newGamma = Math.pow(10, (0.5 - gRel) * 2);
                        getW('cr_lvl_gamma').value = Math.max(0.1, Math.min(10.0, parseFloat(newGamma.toFixed(2))));
                    }
                    
                    drawAioLevelsBar(lvlCanvas);
                    updateGroupActiveColors();
                    if(app.graph) app.graph.setDirtyCanvas(true, true);
                };

                const aioCbShiftsToPos = (r, g, b) => {
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
                };

                const drawAioCbWheels = (cbCanvas) => {
                    const ctx = cbCanvas.getContext("2d");
                    ctx.clearRect(0, 0, cbCanvas.width, cbCanvas.height);
                    
                    const disc = getAioCbDiscCanvas();
                    const rMax = 38;
                    const cy = 65;
                    const centers = [50, 150, 250];
                    const labels = ["Shadows", "Midtones", "Highlights"];
                    const prefixes = ["shad", "mid", "high"];
                    
                    for (let i = 0; i < 3; i++) {
                        const cx = centers[i];
                        ctx.fillStyle = '#cfcfcf';
                        ctx.font = 'bold 10px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(labels[i], cx, 18);
                        
                        ctx.drawImage(disc, cx - rMax, cy - rMax, rMax * 2, rMax * 2);
                        
                        const r = parseFloat(getW(`cr_cb_${prefixes[i]}_r`)?.value || 0);
                        const g = parseFloat(getW(`cr_cb_${prefixes[i]}_g`)?.value || 0);
                        const b = parseFloat(getW(`cr_cb_${prefixes[i]}_b`)?.value || 0);
                        
                        const pos = aioCbShiftsToPos(r, g, b);
                        const ang = pos.hue * Math.PI * 2;
                        const rr = pos.distance * rMax;
                        const hx = cx + Math.sin(ang) * rr;
                        const hy = cy - Math.cos(ang) * rr;
                        
                        ctx.lineWidth = 2.5; ctx.strokeStyle = '#000';
                        ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.stroke();
                        ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff';
                        ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.stroke();
                    }
                };

                let aioCbDraggingIdx = -1;

                // Compute canvas-local coords from any mouse/pointer event
                const getCbCanvasXY = (e, cbCanvas) => {
                    const rect = cbCanvas.getBoundingClientRect();
                    const scaleX = cbCanvas.width  / rect.width;
                    const scaleY = cbCanvas.height / rect.height;
                    return {
                        mx: (e.clientX - rect.left) * scaleX,
                        my: (e.clientY - rect.top)  * scaleY
                    };
                };

                // Compute the current dot position (canvas coords) for a given wheel index
                const getCbDotPos = (idx) => {
                    const prefixes = ["shad", "mid", "high"];
                    const centers  = [50, 150, 250];
                    const cy = 65; const rMax = 38;
                    const r = parseFloat(getW(`cr_cb_${prefixes[idx]}_r`)?.value || 0);
                    const g = parseFloat(getW(`cr_cb_${prefixes[idx]}_g`)?.value || 0);
                    const b = parseFloat(getW(`cr_cb_${prefixes[idx]}_b`)?.value || 0);
                    const pos = aioCbShiftsToPos(r, g, b);
                    const ang = pos.hue * Math.PI * 2;
                    const rr = pos.distance * rMax;
                    return { hx: centers[idx] + Math.sin(ang) * rr, hy: cy - Math.cos(ang) * rr };
                };

                const aioCbApplyPos = (rawMx, rawMy, idx, cbCanvas) => {
                    const centers  = [50, 150, 250];
                    const prefixes = ["shad", "mid", "high"];
                    const cy = 65; const rMax = 38;
                    const cx   = centers[idx];
                    const dx0  = rawMx - cx;
                    const dy0  = rawMy - cy;
                    const dist = Math.min(rMax, Math.sqrt(dx0*dx0 + dy0*dy0));
                    const distance = rMax > 0 ? dist / rMax : 0;

                    let hue = Math.atan2(dx0, -dy0) / (Math.PI * 2);
                    if (hue < 0) hue += 1;
                    const h6 = hue * 6;
                    const ii = Math.floor(h6);
                    const f  = h6 - ii;
                    const p = 0;
                    const q = 1 - f;
                    const t = f;
                    let r, g, b;
                    switch (((ii % 6) + 6) % 6) {
                        case 0: r=1;   g=t;   b=p;   break;
                        case 1: r=q;   g=1;   b=p;   break;
                        case 2: r=p;   g=1;   b=t;   break;
                        case 3: r=p;   g=q;   b=1;   break;
                        case 4: r=t;   g=p;   b=1;   break;
                        default: r=1;  g=p;   b=q;   break;
                    }
                    const rVal = Math.max(-100, Math.min(100, Math.round((r-0.5)*2*100*distance)));
                    const gVal = Math.max(-100, Math.min(100, Math.round((g-0.5)*2*100*distance)));
                    const bVal = Math.max(-100, Math.min(100, Math.round((b-0.5)*2*100*distance)));

                    const wR = getW(`cr_cb_${prefixes[idx]}_r`);
                    const wG = getW(`cr_cb_${prefixes[idx]}_g`);
                    const wB = getW(`cr_cb_${prefixes[idx]}_b`);
                    if (wR) wR.value = rVal;
                    if (wG) wG.value = gVal;
                    if (wB) wB.value = bVal;

                    drawAioCbWheels(cbCanvas);
                    updateGroupActiveColors();
                    if(app.graph) app.graph.setDirtyCanvas(true, true);
                };

                const aioCbOnDown = (e, cbCanvas) => {
                    const { mx, my } = getCbCanvasXY(e, cbCanvas);
                    const centers = [50, 150, 250];
                    const cy = 65; const rMax = 38;
                    // Find which wheel was clicked
                    for (let i = 0; i < 3; i++) {
                        const dx = mx - centers[i], dy = my - cy;
                        if (dx*dx + dy*dy <= (rMax+6)*(rMax+6)) {
                            aioCbDraggingIdx = i;
                            aioCbApplyPos(mx, my, i, cbCanvas);
                            break;
                        }
                    }
                };

                const aioCbPickFromCanvas = (e, cbCanvas) => {
                    if (aioCbDraggingIdx === -1) return;
                    const { mx, my } = getCbCanvasXY(e, cbCanvas);
                    aioCbApplyPos(mx, my, aioCbDraggingIdx, cbCanvas);
                };

                const createUI_AccordionPanel = (titleText, defaultOpen = false) => {
                    const wrapper = document.createElement("div");
                    wrapper.style.cssText = "border: 1px solid var(--trix-border); border-radius: 4px; background: rgba(0,0,0,0.15); overflow: visible; margin-bottom: 6px; flex-shrink: 0; width: 100%; box-sizing: border-box;";

                    const header = document.createElement("div");
                    header.style.cssText = "padding: 6px 10px; background: #2a2a2f; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--trix-text); font-size: 11px; font-weight: bold; user-select: none; border-radius: 3px; transition: background 0.2s;";
                    header.addEventListener("mousedown", (e) => e.stopPropagation());
                    header.addEventListener("pointerdown", (e) => e.stopPropagation());
                    
                    const chev = document.createElement("span");
                    chev.innerHTML = svgChevronDown;
                    chev.style.transition = "transform 0.2s";
                    chev.style.display = "flex";
                    chev.style.alignItems = "center";
                    
                    header.innerHTML = `<span>${titleText}</span>`;
                    header.appendChild(chev);
                    
                    const body = document.createElement("div");
                    body.style.cssText = `padding: 6px; display: ${defaultOpen ? 'flex' : 'none'}; flex-direction: column; gap: 4px; overflow: visible; width: 100%; box-sizing: border-box;`;
                    
                    if (defaultOpen) {
                        chev.style.transform = "rotate(-180deg)";
                    }
                    
                    let isOpen = defaultOpen;
                    header.onclick = () => {
                        isOpen = !isOpen;
                        body.style.display = isOpen ? "flex" : "none";
                        chev.style.transform = isOpen ? "rotate(-180deg)" : "rotate(0deg)";
                    };
                    
                    wrapper.append(header, body);
                    cameraRawPanel.appendChild(wrapper);
                    return { wrapper, body, header };
                };

                const groupTrackers = [];
                const curvesHasData = (cState) => {
                    if (!cState) return false;
                    const channels = ['rgb', 'r', 'g', 'b'];
                    return channels.some(ch => {
                        const pts = cState[ch];
                        if (!pts || pts.length <= 2) {
                            if (pts && pts.length === 2) {
                                // Check if it's the default straight line
                                return !(pts[0].x === 0 && pts[0].y === 0 && pts[1].x === 255 && pts[1].y === 255);
                            }
                            return pts && pts.length > 2;
                        }
                        return true;
                    });
                };
                const hslHasData = (hState) => {
                    if (!hState || typeof hState !== 'object') return false;
                    if (hState.colorize) return true;
                    const channels = ['master','reds','yellows','greens','cyans','blues','magentas'];
                    return channels.some(ch => {
                        const hs = hState[ch];
                        if (!hs) return false;
                        return ((hs.h || 0) !== 0 || (hs.s || 0) !== 0 || (hs.l || 0) !== 0);
                    });
                };
                const updateGroupActiveColors = () => {
                    groupTrackers.forEach(g => {
                        if (g.isHsl) {
                            // Check actual hsl_data widget for real changes
                            let isHslChanged = false;
                            const wHslData = getW("hsl_data");
                            if (wHslData && wHslData.value) {
                                try { isHslChanged = hslHasData(JSON.parse(wHslData.value)); } catch(e) {}
                            }
                            // Also check the hsl_active flag
                            const wHslActive = getW("hsl_active");
                            if (wHslActive && wHslActive.value) isHslChanged = true;
                            g.header.style.background = isHslChanged ? "#235a7a" : "#2a2a2f";
                            return;
                        }
                        if (g.isCurve) {
                            // Check actual curve_data widget for real changes
                            let isCurveChanged = false;
                            const wCurveData = getW("curve_data");
                            if (wCurveData && wCurveData.value) {
                                try { isCurveChanged = curvesHasData(JSON.parse(wCurveData.value)); } catch(e) {}
                            }
                            // Also check the curve_active flag
                            const wCurveActive = getW("curve_active");
                            if (wCurveActive && wCurveActive.value) isCurveChanged = true;
                            g.header.style.background = isCurveChanged ? "#235a7a" : "#2a2a2f";
                            return;
                        }
                        let isChanged = false;
                        if (g.items) {
                            for (const conf of g.items) {
                                const wgt = getW(conf.id);
                                if (wgt && wgt.value !== undefined && wgt.value !== null) {
                                    let wVal = wgt.value;
                                    let defVal = conf.default !== undefined ? conf.default : 0;
                                    if (typeof defVal === 'number') {
                                        if (Math.abs(parseFloat(wVal) - parseFloat(defVal)) > 0.001) {
                                            isChanged = true;
                                            break;
                                        }
                                    } else {
                                        if (String(wVal) !== String(defVal)) {
                                            isChanged = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        g.header.style.background = isChanged ? "#235a7a" : "#2a2a2f";
                    });
                };

                const rawGroups = [
                    {
                        title: "Light",
                        defaultOpen: true,
                        items: [
                            {id: 'cr_offset', label: 'Offset', min:-100, max:100, default:0},
                            {id: 'cr_exp', label: 'Exposure', min:-200, max:200, default:0},
                            {id: 'cr_cont', label: 'Contrast', min:-150, max:150, default:0},
                            {id: 'cr_high', label: 'Highlights', min:-150, max:150, default:0},
                            {id: 'cr_shad', label: 'Shadows', min:-150, max:150, default:0},
                            {id: 'cr_white', label: 'Whites', min:-150, max:150, default:0},
                            {id: 'cr_black', label: 'Blacks', min:-150, max:150, default:0}
                        ]
                    },
                    {
                        title: "Color",
                        defaultOpen: true,
                        items: [
                            {id: 'cr_temp', label: 'Temperature', min:-150, max:150, default:0},
                            {id: 'cr_tint', label: 'Tint', min:-150, max:150, default:0},
                            {id: 'cr_vibrance', label: 'Vibrance', min:-150, max:150, default:0},
                            {id: 'cr_sat', label: 'Saturation', min:-100, max:100, default:0}
                        ]
                    },
                    {
                        title: "Detail",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_tex', label: 'Texture', min:-200, max:200, default:0},
                            {id: 'cr_clar', label: 'Clarity', min:-200, max:200, default:0},
                            {id: 'cr_dehz', label: 'Dehaze', min:-150, max:150, default:0},
                            {id: 'cr_sharp', label: 'Sharpen', min:0, max:150, default:0},
                            {id: 'cr_denoise', label: 'Noise Reduction', min:0, max:150, default:0}
                        ]
                    },
                    {
                        title: "Curves",
                        defaultOpen: false,
                        isCurve: true
                    },
                    {
                        title: "Hue/Saturation",
                        defaultOpen: false,
                        isHsl: true
                    },
                    {
                        title: "Color Balance",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_cb_shad_r', label: 'Shadow R', min:-100, max:100, default:0},
                            {id: 'cr_cb_shad_g', label: 'Shadow G', min:-100, max:100, default:0},
                            {id: 'cr_cb_shad_b', label: 'Shadow B', min:-100, max:100, default:0},
                            {id: 'cr_cb_mid_r', label: 'Midtone R', min:-100, max:100, default:0},
                            {id: 'cr_cb_mid_g', label: 'Midtone G', min:-100, max:100, default:0},
                            {id: 'cr_cb_mid_b', label: 'Midtone B', min:-100, max:100, default:0},
                            {id: 'cr_cb_high_r', label: 'Highlight R', min:-100, max:100, default:0},
                            {id: 'cr_cb_high_g', label: 'Highlight G', min:-100, max:100, default:0},
                            {id: 'cr_cb_high_b', label: 'Highlight B', min:-100, max:100, default:0}
                        ],
                        hasCanvas: 'color_balance'
                    },
                    {
                        title: "Color Filter",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_cf_hue', label: 'Hue', min:0, max:360, default:0},
                            {id: 'cr_cf_density', label: 'Density', min:0, max:255, default:0},
                            {id: 'cr_cf_preserve', label: 'Preserve Highl.', min:0, max:100, default:50}
                        ],
                        hasCanvas: 'color_filter'
                    },
                    {
                        title: "Levels",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_lvl_channel', label: 'Channel', type: 'combo', options: ['rgb', 'r', 'g', 'b'], default: 'rgb'},
                            {id: 'cr_lvl_in_black', label: 'In Black', min:0, max:254, default:0},
                            {id: 'cr_lvl_in_white', label: 'In White', min:1, max:255, default:255},
                            {id: 'cr_lvl_gamma', label: 'Gamma', min:0.1, max:10.0, step:0.01, default:1.0},
                            {id: 'cr_lvl_out_black', label: 'Out Black', min:0, max:254, default:0},
                            {id: 'cr_lvl_out_white', label: 'Out White', min:1, max:255, default:255}
                        ],
                        hasCanvas: 'levels'
                    },
                    {
                        title: "Blur",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_blur_radius', label: 'Radius', min:0, max:50, default:0},
                            {id: 'cr_blur_mode', label: 'Mode', type: 'combo', options: ['Gaussian', 'Average', 'Edge Average', 'Surface Blur'], default: 'Gaussian'}
                        ]
                    },
                    {
                        title: "Halftone",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_ht_size', label: 'Size', min:0, max:50, default:0},
                            {id: 'cr_ht_angle', label: 'Angle', min:-180, max:180, default:15},
                            {id: 'cr_ht_contrast', label: 'Contrast', min:-100, max:100, default:0},
                            {id: 'cr_ht_brightness', label: 'Brightness', min:-100, max:100, default:0},
                            {id: 'cr_ht_dither', label: 'Dither', min:0, max:100, default:100},
                            {id: 'cr_ht_shape', label: 'Shape', type: 'combo', options: ['Dot', 'Square Dot', 'Line', 'Rhomboid', 'Cross Cut', 'Saddle', 'Random Dots'], default: 'Dot'},
                            {id: 'cr_ht_inverse', label: 'Inverse', type: 'checkbox', default: false}
                        ],
                        hasCanvas: 'halftone'
                    },
                    {
                        title: "Sharpen",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_usm_amount', label: 'Amount', min:0, max:200, default:0},
                            {id: 'cr_usm_radius', label: 'Radius', min:1, max:10, default:1},
                            {id: 'cr_usm_threshold', label: 'Threshold', min:0, max:255, default:0},
                            {id: 'cr_lap_amount', label: 'Laplacian Amount', min:0.0, max:1.0, step:0.01, default:0},
                            {id: 'cr_lap_kernel', label: 'Laplacian Kernel', type: 'combo', options: ['8-neighbor', '4-neighbor'], default: '8-neighbor'}
                        ]
                    },
                    {
                        title: "Posterize",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_post_enable', label: 'Enable Posterize', type: 'checkbox', default: false},
                            {id: 'cr_post_levels', label: 'Levels', min:2, max:32, default:4},
                            {id: 'cr_post_dither', label: 'Dither', min:0, max:100, default:0},
                            {id: 'cr_post_mode', label: 'Mode', type: 'combo', options: ['RGB', 'Luminance'], default: 'RGB'},
                            {id: 'cr_post_dither_mode', label: 'Dither Mode', type: 'combo', options: ['None', 'Bayer', 'Random', 'Floyd-Steinberg', 'Atkinson'], default: 'None'}
                        ]
                    },
                    {
                        title: "Effect",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_grain', label: 'Grain', min:0, max:150, default:0},
                            {id: 'cr_vignette', label: 'Vignette', min:0, max:150, default:0}
                        ]
                    },
                    {
                        title: "Sketch",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_sketch_kernel_size', label: 'Kernel Size', min:0, max:25, default:0},
                            {id: 'cr_sketch_sigma', label: 'Sigma', min:0.1, max:5.0, step:0.05, default:1.4},
                            {id: 'cr_sketch_k_sigma', label: 'K-Sigma', min:1.0, max:5.0, step:0.05, default:1.6},
                            {id: 'cr_sketch_epsilon', label: 'Epsilon', min:-0.2, max:0.2, step:0.005, default:-0.03},
                            {id: 'cr_sketch_phi', label: 'Phi', min:1.0, max:50.0, step:1.0, default:10.0},
                            {id: 'cr_sketch_gamma', label: 'Gamma', min:0.0, max:1.0, step:0.005, default:1.0},
                            {id: 'cr_sketch_color', label: 'Color Mode', type: 'combo', options: ['gray', 'rgb'], default: 'gray'}
                        ]
                    },
                    {
                        title: "Pixelize",
                        defaultOpen: false,
                        items: [
                            {id: 'cr_pixel_colors', label: 'Colors', min:2, max:256, default:128},
                            {id: 'cr_pixel_dot_size', label: 'Dot Size', min:0, max:32, default:0},
                            {id: 'cr_pixel_outline', label: 'Outline Inflating', min:0, max:9, default:0},
                            {id: 'cr_pixel_smoothing', label: 'Smoothing', min:0, max:10, default:0},
                            {id: 'cr_pixel_algo', label: 'Algorithm', type: 'combo', options: ['kmeans', 'dithering', 'kmeans with dithering'], default: 'kmeans'}
                        ]
                    }
                ];

                rawGroups.forEach((groupConf) => {
                    const panel = createUI_AccordionPanel(groupConf.title, groupConf.defaultOpen);
                    
                    if (groupConf.isHsl) {
                        groupTrackers.push({
                            header: panel.header,
                            isHsl: true
                        });
                        const activeRow = createToggleRow("Enable Hue/Saturation", "hsl_active");
                        panel.body.appendChild(activeRow);
                        
                        const hslContent = document.createElement("div");
                        hslContent.style.cssText = "display: flex; flex-direction: column; gap: 4px; padding: 4px; box-sizing: border-box; width: 100%;";
                        
                        // HSL Data State
                        const hWgt = getW("hsl_data");
                        let hslState = {
                            colorize: false, activeChannel: 'master',
                            master: { h: 0, s: 0, l: 0 },
                            reds: { h: 0, s: 0, l: 0, center: 0, width: 60 },
                            yellows: { h: 0, s: 0, l: 0, center: 60, width: 60 },
                            greens: { h: 0, s: 0, l: 0, center: 120, width: 60 },
                            cyans: { h: 0, s: 0, l: 0, center: 180, width: 60 },
                            blues: { h: 0, s: 0, l: 0, center: 240, width: 60 },
                            magentas: { h: 0, s: 0, l: 0, center: 300, width: 60 }
                        };
                        const defaultHslState = () => ({
                            colorize: false, activeChannel: 'master',
                            master: { h: 0, s: 0, l: 0 },
                            reds: { h: 0, s: 0, l: 0, center: 0, width: 60 },
                            yellows: { h: 0, s: 0, l: 0, center: 60, width: 60 },
                            greens: { h: 0, s: 0, l: 0, center: 120, width: 60 },
                            cyans: { h: 0, s: 0, l: 0, center: 180, width: 60 },
                            blues: { h: 0, s: 0, l: 0, center: 240, width: 60 },
                            magentas: { h: 0, s: 0, l: 0, center: 300, width: 60 }
                        });
                        const loadHslState = () => {
                            if (hWgt && hWgt.value && hWgt.value !== "{}" && hWgt.value !== "") {
                                try {
                                    const parsed = JSON.parse(hWgt.value);
                                    if (parsed && typeof parsed === "object") {
                                        hslState = Object.assign(defaultHslState(), parsed);
                                        return;
                                    }
                                } catch(e) {}
                            }
                            // Empty / invalid → reset to defaults
                            hslState = defaultHslState();
                        };
                        loadHslState();

                        // Channel select
                        const chRow = document.createElement("div");
                        chRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;";
                        const chLabel = document.createElement("span");
                        chLabel.innerText = "Channel:";
                        chLabel.style.cssText = "color: var(--trix-icon); font-size: 10px;";
                        const chSelect = document.createElement("select");
                        chSelect.style.cssText = "background: #111; color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 4px; font-size: 10px; padding: 1px 3px; max-width: 140px; cursor: pointer; flex: 1; margin-left: 10px;";
                        const channelsList = [
                            { v: 'master', t: 'Master' },
                            { v: 'reds', t: 'Reds' },
                            { v: 'yellows', t: 'Yellows' },
                            { v: 'greens', t: 'Greens' },
                            { v: 'cyans', t: 'Cyans' },
                            { v: 'blues', t: 'Blues' },
                            { v: 'magentas', t: 'Magentas' }
                        ];
                        channelsList.forEach(c => {
                            const o = document.createElement("option");
                            o.value = c.v; o.innerText = c.t;
                            chSelect.appendChild(o);
                        });
                        chSelect.value = hslState.activeChannel;
                        chRow.append(chLabel, chSelect);
                        hslContent.appendChild(chRow);

                        // Colorize checkbox
                        const colorizeRow = document.createElement("div");
                        colorizeRow.style.cssText = "display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(--trix-text); margin-bottom: 6px;";
                        const colorizeChk = document.createElement("input");
                        colorizeChk.type = "checkbox"; colorizeChk.style.cursor = "pointer";
                        colorizeChk.checked = !!hslState.colorize;
                        colorizeRow.append(colorizeChk, document.createTextNode("Colorize"));
                        hslContent.appendChild(colorizeRow);

                        // Spectrum gradients
                        const gradContainer = document.createElement("div");
                        gradContainer.style.cssText = "display: flex; flex-direction: column; gap: 3px; margin: 4px 0;";
                        const gradBase = document.createElement("div");
                        gradBase.style.cssText = "height: 6px; width: 100%; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); border-radius: 2px;";
                        const gradShift = document.createElement("div");
                        gradShift.style.cssText = "height: 6px; width: 100%; background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00); border-radius: 2px;";
                        gradContainer.append(gradBase, gradShift);
                        hslContent.appendChild(gradContainer);

                        const updateGradients = () => {
                            let shift = hslState[hslState.activeChannel]?.h || 0;
                            let c = [];
                            for (let i = 0; i <= 6; i++) {
                                let hue = (i * 60 + shift) % 360;
                                if (hue < 0) hue += 360;
                                c.push(`hsl(${hue}, 100%, 50%)`);
                            }
                            gradShift.style.background = `linear-gradient(to right, ${c.join(', ')})`;
                        };

                        // Helper to build HSL slider row
                        const createAioHslSliderRow = (key, labelText, min, max, def) => {
                            const r = document.createElement("div");
                            r.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 2px 0; min-height: 20px;";
                            const lbl = document.createElement("span");
                            lbl.innerText = labelText;
                            lbl.style.cssText = "color: var(--trix-icon); font-size: 10px; flex: 0 0 75px;";
                            
                            const sl = document.createElement("input");
                            sl.type = "range"; sl.min = min; sl.max = max; sl.style.cssText = "flex: 1; margin: 0 6px; height: 10px; accent-color: var(--trix-accent); cursor: pointer;";
                            
                            const inp = document.createElement("input");
                            inp.type = "text"; inp.style.cssText = "width: 32px; background: #111; color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 3px; font-size: 9.5px; text-align: center; padding: 1px 0; outline: none;";
                            
                            r.append(lbl, sl, inp);
                            
                            const updateVal = (val) => {
                                let parsed = parseInt(val) || 0;
                                parsed = Math.max(min, Math.min(max, parsed));
                                sl.value = parsed;
                                inp.value = parsed;
                                
                                if (hslState[hslState.activeChannel]) {
                                    hslState[hslState.activeChannel][key] = parsed;
                                    if (hWgt) {
                                        hWgt.value = JSON.stringify(hslState);
                                    }
                                }
                                
                                // Auto enable HSL active when adjusted
                                const wActive = getW("hsl_active");
                                if (wActive && !wActive.value) {
                                    wActive.value = true;
                                    const actChk = activeRow.querySelector("input[type=checkbox]");
                                    if (actChk) actChk.checked = true;
                                    const actTrack = activeRow.querySelector("span");
                                    if (actTrack) actTrack.style.backgroundColor = "var(--trix-active)";
                                }
                                
                                updateGradients();
                                updateGroupActiveColors();
                                if(app.graph) app.graph.setDirtyCanvas(true, true);
                            };
                            
                            sl.oninput = (e) => updateVal(e.target.value);
                            inp.onchange = (e) => updateVal(e.target.value);
                            
                            sl.addEventListener("mousedown", (e) => e.stopPropagation());
                            sl.addEventListener("pointerdown", (e) => e.stopPropagation());
                            inp.addEventListener("mousedown", (e) => e.stopPropagation());
                            inp.addEventListener("pointerdown", (e) => e.stopPropagation());

                            return { row: r, sl, inp, updateVal };
                        };

                        const rowH = createAioHslSliderRow('h', 'Hue:', -180, 180, 0);
                        const rowS = createAioHslSliderRow('s', 'Saturation:', -100, 100, 0);
                        const rowL = createAioHslSliderRow('l', 'Lightness:', -100, 100, 0);
                        const rowW = createAioHslSliderRow('width', 'Spread:', 10, 300, 60);

                        hslContent.append(rowH.row, rowS.row, rowL.row, rowW.row);

                        const syncSlidersFromState = () => {
                            loadHslState();
                            const ch = hslState.activeChannel;
                            colorizeChk.checked = !!hslState.colorize;
                            chSelect.value = ch;
                            if (hslState[ch]) {
                                rowH.sl.value = hslState[ch].h || 0; rowH.inp.value = hslState[ch].h || 0;
                                rowS.sl.value = hslState[ch].s || 0; rowS.inp.value = hslState[ch].s || 0;
                                rowL.sl.value = hslState[ch].l || 0; rowL.inp.value = hslState[ch].l || 0;
                                rowW.sl.value = hslState[ch].width || 60; rowW.inp.value = hslState[ch].width || 60;
                            }
                            rowW.row.style.display = (ch === 'master') ? 'none' : 'flex';
                            updateGradients();
                        };

                        chSelect.onchange = (e) => {
                            hslState.activeChannel = e.target.value;
                            if (hWgt) hWgt.value = JSON.stringify(hslState);
                            syncSlidersFromState();
                        };
                        chSelect.addEventListener("mousedown", (e) => e.stopPropagation());
                        chSelect.addEventListener("pointerdown", (e) => e.stopPropagation());

                        colorizeChk.onchange = (e) => {
                            hslState.colorize = e.target.checked;
                            if (hWgt) hWgt.value = JSON.stringify(hslState);
                            if(app.graph) app.graph.setDirtyCanvas(true, true);
                        };

                        node._syncHTMLWithWidgets.push(syncSlidersFromState);
                        panel.body.appendChild(hslContent);
                        syncSlidersFromState();
                        return;
                    }
                    if (groupConf.isCurve) {
                        groupTrackers.push({
                            header: panel.header,
                            isCurve: true
                        });
                        const activeRow = createToggleRow("Enable Curves", "curve_active");
                        panel.body.appendChild(activeRow);
                        
                        const curvesContent = document.createElement("div");
                        curvesContent.style.cssText = "display: flex; flex-direction: column; gap: 4px; padding: 4px; box-sizing: border-box; width: 100%; align-items: center;";
                        
                        const cWgt = getW("curve_data");
                        let curvesState = {
                            activeChannel: "rgb",
                            rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
                            r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
                            g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
                            b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
                        };
                        const defaultCurvesState = () => ({
                            activeChannel: "rgb",
                            rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
                            r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
                            g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
                            b: [{ x: 0, y: 0 }, { x: 255, y: 255 }]
                        });
                        const loadCurvesState = () => {
                            if (cWgt && cWgt.value && cWgt.value !== "{}" && cWgt.value !== "") {
                                try {
                                    const parsed = JSON.parse(cWgt.value);
                                    if (parsed && typeof parsed === "object" && parsed.rgb) {
                                        curvesState = Object.assign(defaultCurvesState(), parsed);
                                        return;
                                    }
                                } catch(e) {}
                            }
                            // Empty / invalid → reset to defaults
                            curvesState = defaultCurvesState();
                        };
                        loadCurvesState();

                        // Top control row (Channel + Reset)
                        const topRow = document.createElement("div");
                        topRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 6px; gap: 6px;";
                        
                        const chSelect = document.createElement("select");
                        chSelect.style.cssText = "background: #111; color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 4px; font-size: 10px; padding: 1.5px 3px; cursor: pointer; flex: 1;";
                        [
                            { v: "rgb", t: "RGB" },
                            { v: "r", t: "Red" },
                            { v: "g", t: "Green" },
                            { v: "b", t: "Blue" }
                        ].forEach(optData => {
                            const o = document.createElement("option");
                            o.value = optData.v; o.innerText = optData.t;
                            chSelect.appendChild(o);
                        });
                        chSelect.value = curvesState.activeChannel;
                        
                        const resetBtn = document.createElement("button");
                        resetBtn.innerHTML = svgResetCR;
                        resetBtn.title = "Reset Channel";
                        resetBtn.style.cssText = "background: #2a2a2f; border: 1px solid var(--trix-border); border-radius: 4px; color: #ccc; cursor: pointer; padding: 2px 6px; display: flex; align-items: center;";
                        resetBtn.onmouseenter = () => { resetBtn.style.background = "#d44a4a"; resetBtn.style.color = "#fff"; };
                        resetBtn.onmouseleave = () => { resetBtn.style.background = "#2a2a2f"; resetBtn.style.color = "#ccc"; };

                        topRow.append(chSelect, resetBtn);
                        curvesContent.appendChild(topRow);

                        // Canvas
                        const cvs = document.createElement("canvas");
                        cvs.width = 180; cvs.height = 180;
                        cvs.style.cssText = "background: #0f0f13; border: 1px solid var(--trix-border); border-radius: 4px; cursor: crosshair; display: block; width: 180px; height: 180px; box-sizing: border-box;";
                        curvesContent.appendChild(cvs);

                        const hint = document.createElement("div");
                        hint.innerText = "Click to add, drag to move, right click to delete point.";
                        hint.style.cssText = "color: #777; font-size: 9px; line-height: 1.2; margin-top: 4px; text-align: center;";
                        curvesContent.appendChild(hint);

                        const getChannelColor = (ch) => {
                            if (ch === "r") return "#ff5555";
                            if (ch === "g") return "#55ff55";
                            if (ch === "b") return "#5555ff";
                            return "#ffffff";
                        };

                        const drawCurvesCanvas = () => {
                            const ctx = cvs.getContext("2d");
                            const w = cvs.width; const h = cvs.height;
                            ctx.clearRect(0, 0, w, h);
                            ctx.fillStyle = "#0f0f13"; ctx.fillRect(0, 0, w, h);

                            // Draw grid lines
                            ctx.strokeStyle = "rgba(255,255,255,0.04)";
                            ctx.lineWidth = 1;
                            for (let i = 1; i <= 3; i++) {
                                const x = (w / 4) * i;
                                const y = (h / 4) * i;
                                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                            }

                            // Diagonal helper
                            ctx.strokeStyle = "rgba(255,255,255,0.15)";
                            ctx.setLineDash([2, 2]);
                            ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, 0); ctx.stroke();
                            ctx.setLineDash([]);

                            const ch = curvesState.activeChannel || "rgb";
                            const pts = curvesState[ch] || [{x:0, y:0}, {x:255, y:255}];

                            // Draw curve line
                            ctx.strokeStyle = getChannelColor(ch);
                            ctx.lineWidth = 1.8;
                            ctx.beginPath();
                            pts.forEach((pt, idx) => {
                                const cx = (pt.x / 255) * w;
                                const cy = (1 - pt.y / 255) * h;
                                if (idx === 0) ctx.moveTo(cx, cy);
                                else ctx.lineTo(cx, cy);
                            });
                            ctx.stroke();

                            // Draw control points
                            pts.forEach((pt, idx) => {
                                const cx = (pt.x / 255) * w;
                                const cy = (1 - pt.y / 255) * h;
                                ctx.fillStyle = getChannelColor(ch);
                                ctx.strokeStyle = "#111";
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                                ctx.fill(); ctx.stroke();
                            });
                        };

                        let dragIdx = -1;
                        let isDragging = false;

                        const getActivePoints = () => curvesState[curvesState.activeChannel] || [{x:0, y:0}, {x:255, y:255}];

                        cvs.addEventListener("mousedown", (e) => {
                            e.preventDefault(); e.stopPropagation();
                            const rect = cvs.getBoundingClientRect();
                            const mx = ((e.clientX - rect.left) / rect.width) * cvs.width;
                            const my = ((e.clientY - rect.top) / rect.height) * cvs.height;
                            const points = getActivePoints();

                            // Right click delete
                            if (e.button === 2) {
                                let hitIdx = -1;
                                for (let i = 1; i < points.length - 1; i++) {
                                    const cx = (points[i].x / 255) * cvs.width;
                                    const cy = (1 - points[i].y / 255) * cvs.height;
                                    if (Math.sqrt((mx - cx)**2 + (my - cy)**2) < 8) {
                                        hitIdx = i;
                                        break;
                                    }
                                }
                                if (hitIdx > 0 && hitIdx < points.length - 1) {
                                    points.splice(hitIdx, 1);
                                    if (cWgt) cWgt.value = JSON.stringify(curvesState);
                                    drawCurvesCanvas();
                                    if(app.graph) app.graph.setDirtyCanvas(true, true);
                                }
                                return;
                            }

                            // Left click select or add
                            if (e.button === 0) {
                                let hitIdx = -1;
                                for (let i = 0; i < points.length; i++) {
                                    const cx = (points[i].x / 255) * cvs.width;
                                    const cy = (1 - points[i].y / 255) * cvs.height;
                                    if (Math.sqrt((mx - cx)**2 + (my - cy)**2) < 8) {
                                        hitIdx = i;
                                        break;
                                    }
                                }
                                if (hitIdx >= 0) {
                                    dragIdx = hitIdx;
                                    isDragging = true;
                                } else {
                                    // Add new point
                                    const newX = Math.round((mx / cvs.width) * 255);
                                    const newY = Math.round((1 - my / cvs.height) * 255);
                                    let insertIdx = 0;
                                    while (insertIdx < points.length && points[insertIdx].x < newX) {
                                        insertIdx++;
                                    }
                                    points.splice(insertIdx, 0, { x: newX, y: newY });
                                    dragIdx = insertIdx;
                                    isDragging = true;
                                    if (cWgt) cWgt.value = JSON.stringify(curvesState);
                                    drawCurvesCanvas();
                                }
                            }
                        });

                        window.addEventListener("mousemove", (e) => {
                            if (isDragging && dragIdx >= 0) {
                                e.preventDefault(); e.stopPropagation();
                                const rect = cvs.getBoundingClientRect();
                                const mx = ((e.clientX - rect.left) / rect.width) * cvs.width;
                                const my = ((e.clientY - rect.top) / rect.height) * cvs.height;
                                const points = getActivePoints();

                                let newX = Math.round((mx / cvs.width) * 255);
                                let newY = Math.round((1 - my / cvs.height) * 255);
                                newY = Math.max(0, Math.min(255, newY));

                                if (dragIdx === 0) {
                                    newX = 0;
                                } else if (dragIdx === points.length - 1) {
                                    newX = 255;
                                } else {
                                    const minX = points[dragIdx - 1].x + 1;
                                    const maxX = points[dragIdx + 1].x - 1;
                                    newX = Math.max(minX, Math.min(maxX, newX));
                                }

                                points[dragIdx] = { x: newX, y: newY };
                                if (cWgt) cWgt.value = JSON.stringify(curvesState);
                                
                                // Auto enable curves active when dragging
                                const wActive = getW("curve_active");
                                if (wActive && !wActive.value) {
                                    wActive.value = true;
                                    const actChk = activeRow.querySelector("input[type=checkbox]");
                                    if (actChk) actChk.checked = true;
                                    const actTrack = activeRow.querySelector("span");
                                    if (actTrack) actTrack.style.backgroundColor = "var(--trix-active)";
                                }

                                drawCurvesCanvas();
                                updateGroupActiveColors();
                                if(app.graph) app.graph.setDirtyCanvas(true, true);
                            }
                        });

                        window.addEventListener("mouseup", () => {
                            isDragging = false; dragIdx = -1;
                        });

                        cvs.oncontextmenu = (e) => e.preventDefault();
                        cvs.addEventListener("mousedown", (e) => e.stopPropagation());
                        cvs.addEventListener("pointerdown", (e) => e.stopPropagation());

                        chSelect.onchange = (e) => {
                            curvesState.activeChannel = e.target.value;
                            if (cWgt) cWgt.value = JSON.stringify(curvesState);
                            drawCurvesCanvas();
                        };
                        chSelect.addEventListener("mousedown", (e) => e.stopPropagation());
                        chSelect.addEventListener("pointerdown", (e) => e.stopPropagation());

                        resetBtn.onclick = () => {
                            const ch = curvesState.activeChannel || "rgb";
                            curvesState[ch] = [{ x: 0, y: 0 }, { x: 255, y: 255 }];
                            if (cWgt) cWgt.value = JSON.stringify(curvesState);
                            drawCurvesCanvas();
                            updateGroupActiveColors();
                            if(app.graph) app.graph.setDirtyCanvas(true, true);
                        };
                        resetBtn.addEventListener("mousedown", (e) => e.stopPropagation());
                        resetBtn.addEventListener("pointerdown", (e) => e.stopPropagation());

                        const syncCurvesFromState = () => {
                            loadCurvesState();
                            chSelect.value = curvesState.activeChannel;
                            drawCurvesCanvas();
                        };

                        node._syncHTMLWithWidgets.push(syncCurvesFromState);
                        panel.body.appendChild(curvesContent);
                        panel.header.addEventListener("click", () => {
                            requestAnimationFrame(drawCurvesCanvas);
                        });
                        syncCurvesFromState();
                        return;
                    }

                    groupTrackers.push({
                        header: panel.header,
                        items: groupConf.items
                    });

                    if (groupConf.hasCanvas === 'color_filter') {
                        const cfWheelWrapper = document.createElement("div");
                        cfWheelWrapper.style.cssText = "display: flex; justify-content: center; margin-bottom: 6px; position: relative;";
                        const cfWheel = document.createElement("canvas");
                        cfWheel.width = 150; cfWheel.height = 150;
                        cfWheel.style.cssText = "border-radius: 50%; cursor: crosshair; border: 2px solid var(--trix-border); box-sizing: border-box;";
                        cfWheelWrapper.appendChild(cfWheel);
                        panel.body.appendChild(cfWheelWrapper);

                        drawCfWheelRefs.push(() => drawAioCfWheel(cfWheel));

                        let cfWheelDragging = false;
                        const cfWheelDown = (e) => {
                            e.preventDefault(); e.stopPropagation();
                            cfWheelDragging = true;
                            aioCfPickFromWheel(e, cfWheel);
                        };
                        const cfWheelMove = (e) => {
                            if (cfWheelDragging) {
                                e.preventDefault(); e.stopPropagation();
                                aioCfPickFromWheel(e, cfWheel);
                            }
                        };
                        cfWheel.addEventListener("mousedown", cfWheelDown);
                        cfWheel.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); cfWheelDragging = true; aioCfPickFromWheel(e, cfWheel); });
                        window.addEventListener("mousemove", cfWheelMove);
                        window.addEventListener("pointermove", (e) => { if (cfWheelDragging) { e.preventDefault(); e.stopPropagation(); aioCfPickFromWheel(e, cfWheel); } });
                        window.addEventListener("mouseup", () => { cfWheelDragging = false; });
                        window.addEventListener("pointerup", () => { cfWheelDragging = false; });
                        
                        panel.header.addEventListener("click", () => {
                            requestAnimationFrame(() => drawAioCfWheel(cfWheel));
                        });
                    } else if (groupConf.hasCanvas === 'levels') {
                        const lvlBarWrapper = document.createElement("div");
                        lvlBarWrapper.style.cssText = "margin: 4px 0 6px 0; user-select: none; display: flex; flex-direction: column; align-items: center; width: 100%;";
                        const lvlCanvas = document.createElement("canvas");
                        lvlCanvas.width = 276; lvlCanvas.height = 120;
                        lvlCanvas.style.cssText = "border-radius: 6px; border: 1px solid var(--trix-border); cursor: pointer; display: block; width: 276px; height: 120px;";
                        lvlBarWrapper.appendChild(lvlCanvas);
                        panel.body.appendChild(lvlBarWrapper);

                        drawLevelsBarRefs.push(() => drawAioLevelsBar(lvlCanvas));

                        const lvlHitAndDrag = (e) => {
                            const rect = lvlCanvas.getBoundingClientRect();
                            const mx = ((e.clientX - rect.left) / rect.width) * lvlCanvas.width;
                            const my = ((e.clientY - rect.top) / rect.height) * lvlCanvas.height;
                            const inB = parseFloat(getW('cr_lvl_in_black')?.value ?? 0);
                            const inW = parseFloat(getW('cr_lvl_in_white')?.value ?? 255);
                            const gamma = parseFloat(getW('cr_lvl_gamma')?.value ?? 1.0);
                            const outB = parseFloat(getW('cr_lvl_out_black')?.value ?? 0);
                            const outW = parseFloat(getW('cr_lvl_out_white')?.value ?? 255);
                            const handle = aioHitTestLvlHandle(mx, my, inB, inW, gamma, outB, outW);
                            if (handle) {
                                aioActiveLvlHandle = handle;
                                aioDragLvlHandle(mx, lvlCanvas);
                            }
                        };
                        lvlCanvas.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); lvlHitAndDrag(e); });
                        lvlCanvas.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); lvlHitAndDrag(e); });
                        window.addEventListener("mousemove", (e) => {
                            if (aioActiveLvlHandle) {
                                e.preventDefault(); e.stopPropagation();
                                const rect = lvlCanvas.getBoundingClientRect();
                                const mx = ((e.clientX - rect.left) / rect.width) * lvlCanvas.width;
                                aioDragLvlHandle(mx, lvlCanvas);
                            }
                        });
                        window.addEventListener("pointermove", (e) => {
                            if (aioActiveLvlHandle) {
                                e.preventDefault(); e.stopPropagation();
                                const rect = lvlCanvas.getBoundingClientRect();
                                const mx = ((e.clientX - rect.left) / rect.width) * lvlCanvas.width;
                                aioDragLvlHandle(mx, lvlCanvas);
                            }
                        });
                        window.addEventListener("mouseup", () => { aioActiveLvlHandle = null; });
                        window.addEventListener("pointerup", () => { aioActiveLvlHandle = null; });

                        panel.header.addEventListener("click", () => {
                            requestAnimationFrame(() => drawAioLevelsBar(lvlCanvas));
                        });
                    } else if (groupConf.hasCanvas === 'color_balance') {
                        const cbCanvasWrapper = document.createElement("div");
                        cbCanvasWrapper.style.cssText = "display: flex; justify-content: center; margin-bottom: 6px; position: relative; width: 100%; box-sizing: border-box; max-width: 100%; padding: 0 2px;";
                        const cbCanvas = document.createElement("canvas");
                        cbCanvas.width = 300; cbCanvas.height = 110;
                        cbCanvas.style.cssText = "background: #111; border-radius: 6px; border: 1px solid var(--trix-border); cursor: crosshair; display: block; max-width: 100%; height: auto; box-sizing: border-box;";
                        cbCanvasWrapper.appendChild(cbCanvas);
                        panel.body.appendChild(cbCanvasWrapper);

                        drawCbWheelsRefs.push(() => drawAioCbWheels(cbCanvas));

                        let cbDragging = false;
                        const cbDown = (e) => { e.preventDefault(); e.stopPropagation(); cbDragging = true; aioCbOnDown(e, cbCanvas); };
                        const cbMove = (e) => { if (cbDragging) { e.preventDefault(); e.stopPropagation(); aioCbPickFromCanvas(e, cbCanvas); } };
                        const cbUp = () => { cbDragging = false; aioCbDraggingIdx = -1; };
                        cbCanvas.addEventListener("mousedown", cbDown);
                        cbCanvas.addEventListener("pointerdown", cbDown);
                        window.addEventListener("mousemove", cbMove);
                        window.addEventListener("pointermove", cbMove);
                        window.addEventListener("mouseup", cbUp);
                        window.addEventListener("pointerup", cbUp);

                        panel.header.addEventListener("click", () => {
                            requestAnimationFrame(() => drawAioCbWheels(cbCanvas));
                        });
                    } else if (groupConf.hasCanvas === 'halftone') {
                        const htCanvasWrapper = document.createElement("div");
                        htCanvasWrapper.style.cssText = "display: flex; justify-content: center; margin-bottom: 6px; margin-top: 4px; position: relative; width: 100%; box-sizing: border-box; max-width: 100%; padding: 0 2px;";
                        const htAngleCanvas = document.createElement("canvas");
                        htAngleCanvas.width = 300; htAngleCanvas.height = 86;
                        htAngleCanvas.style.cssText = "display: block; margin: 4px auto; background: transparent; cursor: pointer; max-width: 100%; height: auto; box-sizing: border-box;";
                        htCanvasWrapper.appendChild(htAngleCanvas);
                        panel.body.appendChild(htCanvasWrapper);

                        drawHtDialRefs.push(() => drawAioHtDial(htAngleCanvas));

                        let htDialDragging = false;
                        const htDown = (e) => { e.preventDefault(); e.stopPropagation(); htDialDragging = true; aioHtPickAngle(e, htAngleCanvas); };
                        const htMove = (e) => { if (htDialDragging) { e.preventDefault(); e.stopPropagation(); aioHtPickAngle(e, htAngleCanvas); } };
                        const htUp = () => { htDialDragging = false; };
                        htAngleCanvas.addEventListener("mousedown", htDown);
                        htAngleCanvas.addEventListener("pointerdown", htDown);
                        window.addEventListener("mousemove", htMove);
                        window.addEventListener("pointermove", htMove);
                        window.addEventListener("mouseup", htUp);
                        window.addEventListener("pointerup", htUp);

                        panel.header.addEventListener("click", () => {
                            requestAnimationFrame(() => drawAioHtDial(htAngleCanvas));
                        });
                    }

                    groupConf.items.forEach(conf => {
                        if (groupConf.hasCanvas === 'color_balance') {
                            return;
                        }
                        if (groupConf.hasCanvas === 'levels' && conf.id !== 'cr_lvl_channel') {
                            return;
                        }
                        if (groupConf.hasCanvas === 'color_filter' && conf.id !== 'cr_cf_preserve') {
                            return;
                        }
                        const wgt = getW(conf.id);
                        const row = document.createElement("div");
                        row.style.cssText = "display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 2px 4px; margin-bottom: 2px; border-radius: 4px; flex-shrink: 0; min-height: 20px; transition: 0.1s;";
                        row.onmouseenter = () => { row.style.background = "#222"; };
                        row.onmouseleave = () => { row.style.background = "transparent"; };

                        const title = document.createElement("span");
                        title.innerText = conf.label;
                        title.style.cssText = "color: var(--trix-icon); font-family: var(--comfy-font-family, sans-serif); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 0 85px; cursor: pointer;";
                        row.appendChild(title);

                        if (conf.type === 'combo') {
                            const selectEl = document.createElement("select");
                            selectEl.style.cssText = "background: #111; color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 4px; font-size: 10px; padding: 1px 3px; max-width: 140px; outline: none; cursor: pointer; flex: 1;";
                            conf.options.forEach(opt => {
                                const o = document.createElement("option");
                                o.value = opt; o.innerText = opt;
                                selectEl.appendChild(o);
                            });

                            let startVal = (wgt && wgt.value !== undefined) ? wgt.value : (conf.default !== undefined ? conf.default : conf.options[0]);
                            selectEl.value = startVal;

                            selectEl.addEventListener("change", (e) => {
                                if (wgt) wgt.value = e.target.value;
                                updateGroupActiveColors();
                                if(app.graph) app.graph.setDirtyCanvas(true, true);
                            });
                            selectEl.addEventListener("mousedown", (e) => e.stopPropagation());
                            selectEl.addEventListener("pointerdown", (e) => e.stopPropagation());

                            node._syncHTMLWithWidgets.push(() => {
                                if (wgt && wgt.value !== undefined && wgt.value !== null) {
                                    let val = wgt.value;
                                    if (typeof val === "number") {
                                        if (val >= 0 && val < conf.options.length) {
                                            selectEl.value = conf.options[val];
                                        }
                                    } else {
                                        selectEl.value = val;
                                    }
                                }
                            });
                            row.appendChild(selectEl);
                        } else if (conf.type === 'checkbox') {
                            const checkboxEl = document.createElement("input");
                            checkboxEl.type = "checkbox";
                            checkboxEl.checked = (wgt && wgt.value !== undefined) ? !!wgt.value : (conf.default !== undefined ? conf.default : false);
                            checkboxEl.style.cssText = "cursor: pointer; width: 12px; height: 12px; accent-color: var(--trix-accent); margin: 0;";

                            checkboxEl.addEventListener("change", (e) => {
                                if (wgt) wgt.value = e.target.checked;
                                updateGroupActiveColors();
                                if(app.graph) app.graph.setDirtyCanvas(true, true);
                            });
                            checkboxEl.addEventListener("mousedown", (e) => e.stopPropagation());
                            checkboxEl.addEventListener("pointerdown", (e) => e.stopPropagation());

                            node._syncHTMLWithWidgets.push(() => {
                                if (wgt && wgt.value !== undefined && wgt.value !== null) {
                                    checkboxEl.checked = !!wgt.value;
                                }
                            });
                            row.appendChild(checkboxEl);
                        } else {
                            let isFloat = typeof conf.step !== "undefined" && conf.step < 1.0;
                            let startVal = (wgt && wgt.value !== undefined && wgt.value !== null) ? (isFloat ? parseFloat(wgt.value) : parseInt(wgt.value)) : (conf.default !== undefined ? conf.default : 0);
                            if(isNaN(startVal)) startVal = 0;
                            
                            const sliderEl = document.createElement("input");
                            sliderEl.type = "range"; sliderEl.min = conf.min; sliderEl.max = conf.max; sliderEl.value = startVal;
                            sliderEl.style.cssText = `flex: 1; margin: 0 6px; min-width: 30px; cursor: pointer; height: 10px; accent-color: var(--trix-accent);`; 
                            if (typeof conf.step !== "undefined") sliderEl.step = conf.step;
                            
                            const inputEl = document.createElement("input");
                            inputEl.type = "text"; inputEl.value = isFloat ? startVal.toFixed(3).replace(/\.?0+$/, "") : startVal;
                            inputEl.style.cssText = "width: 35px; background: #111; color: var(--trix-text); border: 1px solid var(--trix-border); border-radius: 3px; font-size: 9.5px; text-align: center; padding: 1px 0; outline: none;";
                            
                            sliderEl.addEventListener("mousedown", (e) => e.stopPropagation());
                            sliderEl.addEventListener("pointerdown", (e) => e.stopPropagation());
                            inputEl.addEventListener("mousedown", (e) => e.stopPropagation());
                            inputEl.addEventListener("pointerdown", (e) => e.stopPropagation());

                            const updateVals = (val) => {
                                let parsed = isFloat ? parseFloat(val) : parseInt(val);
                                if(isNaN(parsed)) parsed = 0;
                                parsed = Math.max(conf.min, Math.min(conf.max, parsed));
                                if (isFloat) {
                                    inputEl.value = parsed.toFixed(3).replace(/\.?0+$/, "");
                                } else {
                                    inputEl.value = parsed;
                                }
                                sliderEl.value = parsed;
                                if (wgt) wgt.value = parsed;
                                
                                if (groupConf.hasCanvas === 'levels') {
                                    drawLevelsBarRefs.forEach(ref => ref());
                                } else if (groupConf.hasCanvas === 'color_balance') {
                                    drawCbWheelsRefs.forEach(ref => ref());
                                } else if (groupConf.hasCanvas === 'color_filter') {
                                    drawCfWheelRefs.forEach(ref => ref());
                                } else if (groupConf.hasCanvas === 'halftone') {
                                    drawHtDialRefs.forEach(ref => ref());
                                }

                                updateGroupActiveColors();
                                if(app.graph) app.graph.setDirtyCanvas(true, true);
                            };

                            inputEl.onchange = (e) => updateVals(e.target.value);
                            sliderEl.oninput = (e) => updateVals(e.target.value);
                            
                            const doReset = () => updateVals(conf.default !== undefined ? conf.default : 0);
                            sliderEl.ondblclick = doReset;
                            title.ondblclick = doReset;

                            node._syncHTMLWithWidgets.push(() => {
                                if (wgt && wgt.value !== undefined && wgt.value !== null) {
                                    let parsed = isFloat ? parseFloat(wgt.value) : parseInt(wgt.value);
                                    if (!isNaN(parsed)) { 
                                        inputEl.value = isFloat ? parsed.toFixed(3).replace(/\.?0+$/, "") : parsed; 
                                        sliderEl.value = parsed; 
                                    }
                                }
                            });
                            row.append(sliderEl, inputEl);
                        }
                        panel.body.appendChild(row);
                    });
                });



                node._syncHTMLWithWidgets.push(() => {
                    updateGroupActiveColors();
                    drawCfWheelRefs.forEach(ref => ref());
                    drawLevelsBarRefs.forEach(ref => ref());
                    drawCbWheelsRefs.forEach(ref => ref());
                    drawHtDialRefs.forEach(ref => ref());
                });

                const bodyContainer = document.createElement("div");
                bodyContainer.style.cssText = "display: flex; flex: 1; width: 100%; position: relative; overflow: visible; min-height: 0;";

                const viewPort = document.createElement("div");
                viewPort.style.cssText = "position: relative; width: 100%; height: 100%; flex-grow: 1; pointer-events: none; overflow: visible; background: transparent; border-radius: 6px;";
                
                const imgContainer = document.createElement("div");
                imgContainer.style.cssText = "position: absolute; pointer-events: none; margin: 0; transform-origin: 0 0;";

                const applyZoomPan = () => { imgContainer.style.transformOrigin = "0 0"; imgContainer.style.transform = node.isFullscreen ? `translate(${node._fsPanX}px, ${node._fsPanY}px) scale(${node._fsZoom})` : "none"; };
                node.applyZoomPanRef = applyZoomPan;

                const imgTag = document.createElement("img"); imgTag.setAttribute("draggable", "false"); 
                imgTag.style.cssText = "max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none; user-select: none; -webkit-user-drag: none; display: block;";
                imgTag.crossOrigin = "Anonymous"; node.imgTagRef = imgTag; 
                
                const maskCanvas = document.createElement("canvas");
                maskCanvas.style.cssText = "position: absolute; top: 0; left: 0; cursor: none; z-index: 2; pointer-events: none;";
                const mctx = maskCanvas.getContext("2d"); node.maskCanvasRef = maskCanvas; maskCanvas.oncontextmenu = (e) => e.preventDefault();

                const brushCursor = document.createElement("div");
                brushCursor.classList.add("trix-brush-cursor");
                brushCursor.style.cssText = "position: absolute; border: 1px solid rgba(255, 255, 255, 0.85); border-radius: 50%; pointer-events: none; display: none; z-index: 100; transform: translate(-50%, -50%); box-sizing: border-box; box-shadow: 0 0 1px rgba(0, 0, 0, 0.5); background: transparent;";
                brushCursor.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; width: 2px; height: 2px; background: rgba(255, 255, 255, 0.95); border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 1px rgba(0,0,0,0.7);"></div>`;
                
                imgContainer.append(imgTag, maskCanvas, brushCursor);

                const resLabel = document.createElement("div");
                resLabel.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%; font-size: 10px; color: #ccc; font-family: monospace; user-select: none; pointer-events: none; box-sizing: border-box; display: none; align-items: center; justify-content: center; z-index: 5; padding-bottom: 2px;";
                resLabel.innerText = "0 x 0"; node.resLabelRef = resLabel;
                toolBar.appendChild(resLabel);

                viewPort.append(imgContainer); bodyContainer.append(viewPort, cameraRawPanel, resizePanel); wrapper.append(headerContainer, bodyContainer);
                
                const trixWidget = node.addDOMWidget("trix_ui_v2", "div", wrapper, { hideOnZoom: false });
                node.trixWidgetRef = trixWidget;
                if (trixWidget && trixWidget.element) {
                    trixWidget.element.style.pointerEvents = "auto";
                    trixWidget.element.style.background = "transparent";
                    trixWidget.element.style.overflow = "visible";
                    trixWidget.element.style.border = "none";
                    trixWidget.element.style.outline = "none";
                    trixWidget.element.style.boxShadow = "none";
                    
                    const origDraw = trixWidget.draw;
                    trixWidget.draw = function(ctx, n, widget_width, y, H) {
                        const oldStroke = ctx.strokeStyle;
                        const oldFill = ctx.fillStyle;
                        const oldAlpha = ctx.globalAlpha;
                        ctx.strokeStyle = "transparent";
                        ctx.fillStyle = "transparent";
                        ctx.globalAlpha = 0;
                        if (origDraw) origDraw.apply(this, arguments);
                        ctx.strokeStyle = oldStroke;
                        ctx.fillStyle = oldFill;
                        ctx.globalAlpha = oldAlpha;
                        if (this.element && !n.isFullscreen) {
                            this.element.style.setProperty("width", (n.size[0] - 2) + "px", "important");
                            /* To shift the toolbar/buttons left or right, adjust this -6px value */
                            this.element.style.setProperty("left", "-9px", "important");
                            this.element.style.setProperty("margin", "0px", "important");
                            this.element.style.setProperty("padding", "0px 2px", "important");
                            this.element.style.setProperty("box-sizing", "border-box", "important");
                            this.element.style.setProperty("background", "transparent", "important");
                            this.element.style.setProperty("overflow", "visible", "important");
                            this.element.style.setProperty("border", "none", "important");
                            this.element.style.setProperty("outline", "none", "important");
                            this.element.style.setProperty("box-shadow", "none", "important");
                        }
                    };
                }

                let currentScale = 1;

                const updateCursorSize = () => { 
                    const visualSize = node.brushSize * currentScale; 
                    brushCursor.style.width = `${visualSize}px`; 
                    brushCursor.style.height = `${visualSize}px`; 
                    
                    const innerHardnessSize = visualSize * node.brushHardness;
                    const showInner = node.brushHardness < 1.0 && node.brushHardness > 0;
                    brushCursor.innerHTML = `
                        <div style="position: absolute; top: 50%; left: 50%; width: 2px; height: 2px; background: rgba(255, 255, 255, 0.95); border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 1px rgba(0,0,0,0.7);"></div>
                        ${showInner ? `<div style="position: absolute; top: 50%; left: 50%; width: ${innerHardnessSize}px; height: ${innerHardnessSize}px; border: 0.75px solid rgba(255, 255, 255, 0.4); border-radius: 50%; transform: translate(-50%, -50%); box-sizing: border-box; box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.25);"></div>` : ""}
                    `;
                };

                maskCanvas.addEventListener("pointerenter", (e) => { const mode = widgets.mode ? widgets.mode.value : "Preview"; if (mode === "Mask" && (!node.isPreviewHidden || node.isFullscreen)) { brushCursor.style.display = "block"; node._lastPointerEvent = e; } });
                maskCanvas.addEventListener("pointerleave", () => { brushCursor.style.display = "none"; node._lastPointerEvent = null; });

                node.onResize = function(size) {
                    if (size[0] < 200) size[0] = 200;
                    if (size[1] < 200) size[1] = 200;
                    if (node.alignCanvasRef) node.alignCanvasRef();
                };

                const alignCanvas = () => {
                    if (!imgTag.naturalWidth) return;

                    if (node.isFullscreen) {
                        const aspect = imgTag.naturalHeight / imgTag.naturalWidth;
                        let availableW = window.innerWidth * 0.9 - 40; 
                        let maxH = window.innerHeight * 0.9 - 100; 
                        let scaledH = availableW * aspect;
                        
                        if (scaledH > maxH) { scaledH = maxH; availableW = scaledH / aspect; }
                        currentScale = availableW / imgTag.naturalWidth;
                        
                        node.headerContainerRef.style.width = "100%"; 
                        node.headerContainerRef.style.maxWidth = `${availableW}px`; 
                        node.headerContainerRef.style.alignSelf = "center";
                        
                        const vpRect = viewPort.getBoundingClientRect();
                        if (vpRect.width > 0) {
                            imgContainer.style.left = `${(vpRect.width - availableW) / 2}px`;
                            imgContainer.style.top = `${(vpRect.height - scaledH) / 2}px`;
                        } else {
                            imgContainer.style.left = "0px"; imgContainer.style.top = "0px";
                        }
                        
                        imgContainer.style.width = availableW + "px"; imgContainer.style.height = scaledH + "px";
                        imgTag.style.width = availableW + "px"; imgTag.style.height = scaledH + "px";
                        maskCanvas.style.width = availableW + "px"; maskCanvas.style.height = scaledH + "px";
                    } else {
                        const metrics = node.getLayoutMetrics();
                        if (!metrics) return;

                        currentScale = metrics.scale;
                        
                        node.headerContainerRef.style.width = "100%"; 
                        node.headerContainerRef.style.maxWidth = "none"; 
                        node.headerContainerRef.style.alignSelf = "stretch";

                        if (node.trixWidgetRef && node.trixWidgetRef.element) {
                            node.trixWidgetRef.element.style.setProperty("width", (node.size[0] - 2) + "px", "important");
                            /* To shift the toolbar/buttons left or right, adjust this -6px value */
                            node.trixWidgetRef.element.style.setProperty("left", "-9px", "important");
                            node.trixWidgetRef.element.style.setProperty("margin", "0px", "important");
                            node.trixWidgetRef.element.style.setProperty("padding", "0px 2px", "important");
                            node.trixWidgetRef.element.style.setProperty("box-sizing", "border-box", "important");
                            node.trixWidgetRef.element.style.setProperty("overflow", "hidden", "important");
                            node.trixWidgetRef.element.style.setProperty("border", "none", "important");
                            node.trixWidgetRef.element.style.setProperty("outline", "none", "important");
                            node.trixWidgetRef.element.style.setProperty("box-shadow", "none", "important");
                            wrapper.style.width = "100%";
                            wrapper.style.marginLeft = "0px";
                        }

                        imgContainer.style.left = `${metrics.localX}px`; 
                        imgContainer.style.top = `${metrics.localY}px`;
                        imgContainer.style.width = `${metrics.w}px`; 
                        imgContainer.style.height = `${metrics.h}px`;
                        
                        imgTag.style.width = `${metrics.w}px`; 
                        imgTag.style.height = `${metrics.h}px`;
                        maskCanvas.style.width = `${metrics.w}px`; 
                        maskCanvas.style.height = `${metrics.h}px`;
                    }
                    updateCursorSize();

                    if (node.resLabelRef && imgTag.naturalWidth > 0) {
                        if (node.updateResLabelTextRef) node.updateResLabelTextRef();
                    }
                };
                node.alignCanvasRef = alignCanvas;

                node._onResizeWindow = () => { if (node.isFullscreen) { node._fsZoom = 1.0; node._fsPanX = 0; node._fsPanY = 0; applyZoomPan(); alignCanvas(); } };
                node._onKeydownWindow = (e) => { if (e.key === "Escape" && node.isFullscreen) { node.isFullscreen = false; updateUI(); } };
                window.addEventListener("resize", node._onResizeWindow); window.addEventListener("keydown", node._onKeydownWindow);

                const saveHistory = () => { 
                    if (!maskCanvas) return;
                    maskCanvas.toBlob((blob) => {
                        if (!blob) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const data = reader.result;
                            if (node.historyIndex < node.history.length - 1) node.history = node.history.slice(0, node.historyIndex + 1); 
                            node.history.push(data); 
                            if (node.history.length > 15) node.history.shift(); 
                            node.historyIndex = node.history.length - 1; 
                            
                            if (widgets.mask_data) {
                                widgets.mask_data.value = data; 
                            }
                        };
                        reader.readAsDataURL(blob);
                    });
                };
                node.saveHistoryRef = saveHistory;

                imgTag.onload = () => { 
                    const preservedMaskData = (widgets.mask_data && widgets.mask_data.value) ||
                        (maskCanvas.width > 0 && maskCanvas.height > 0 ? maskCanvas.toDataURL() : "");
                    maskCanvas.width = imgTag.naturalWidth; 
                    maskCanvas.height = imgTag.naturalHeight;

                    if (node._isFirstLoad) {
                        node._isFirstLoad = false;
                        const targetW = 300; 
                        const headerReserve = node.headerContainerRef ? Math.max(72, node.headerContainerRef.offsetHeight + 18) : 112;
                        const targetH = Math.round((imgTag.naturalHeight / imgTag.naturalWidth) * targetW) + headerReserve; 
                        node.size = [targetW, targetH];
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                    }
                    
                    alignCanvas(); 
                    
                    if (preservedMaskData && widgets.mask_data) {
                        widgets.mask_data.value = preservedMaskData;
                    }
                    const restoreMaskPromise = node.syncMaskToCanvas ? node.syncMaskToCanvas() : Promise.resolve(false);

                    if (node._isConfiguring) {
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                        return;
                    } 

                    if (node._isChangingImage) {
                        restoreMaskPromise.then(() => {
                            node.history = [];
                            node.historyIndex = -1;
                            node._lastClickPos = null; 
                            saveHistory(); 
                            node._isChangingImage = false;
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                            updateUI();
                        });
                        return;
                    } 
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                    updateUI();
                };

                const applyHistory = (idx) => { 
                    if (idx < 0) {
                        idx = 0; 
                    }
                    if (idx >= node.history.length) {
                        idx = node.history.length - 1;
                    }

                    let restoreData = null;
                    if (node.history.length > 0 && node.history[idx]) {
                        node.historyIndex = idx;
                        restoreData = node.history[idx];
                    } else if (widgets.mask_data && widgets.mask_data.value) {
                        restoreData = widgets.mask_data.value;
                    }

                    if (restoreData) {
                        if (widgets.mask_data) widgets.mask_data.value = restoreData;
                        node.syncMaskToCanvas();
                        node._lastClickPos = null;
                    }
                };
                
                undoBtn.onclick = () => applyHistory(node.historyIndex - 1);
                redoBtn.onclick = () => applyHistory(node.historyIndex + 1); 
                
                clearBtn.onclick = () => { 
                    mctx.globalCompositeOperation = "source-over"; 
                    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height); 
                    if (node.isEraser) mctx.globalCompositeOperation = "destination-out"; 
                    node._lastClickPos = null; 
                    saveHistory(); 
                    if (app.graph) app.graph.setDirtyCanvas(true, true); 
                };

                let drawing = false; 
                let isPanning = false; 
                let resizingBrush = false; 
                let resizeStartX = 0; 
                let resizeStartY = 0; 
                let initialBrushSize = 0;
                let initialBrushHardness = 1.0;

                const getCanvasCoord = (e) => {
                    const rect = maskCanvas.getBoundingClientRect();
                    const xNorm = (e.clientX - rect.left) / rect.width;
                    const yNorm = (e.clientY - rect.top) / rect.height;
                    const x = xNorm * maskCanvas.width;
                    const y = yNorm * maskCanvas.height;
                    const cssX = xNorm * maskCanvas.offsetWidth;
                    const cssY = yNorm * maskCanvas.offsetHeight;
                    return { x, y, cssX, cssY };
                };

                maskCanvas.onpointerdown = (e) => {
                    if (app.canvas) app.canvas.allow_dragcanvas = false;
                    try { maskCanvas.setPointerCapture(e.pointerId); } catch(err){}
                    node._lastPointerEvent = e;
                    
                    const mode = widgets.mode ? widgets.mode.value : "Preview"; if (mode !== "Mask") return;

                    if (node.history.length === 0 && node.saveHistoryRef) {
                        node.saveHistoryRef();
                    }

                    if (e.button === 0 && e.ctrlKey) { 
                        drawing = false; 
                        const { x, y } = getCanvasCoord(e); 
                        let fR = 0, fG = 0, fB = 0, fA = 0; 
                        if (!node.isEraser) { 
                            const hex = node.maskColor.replace(/^#/, ""); 
                            const bigint = parseInt(hex, 16); 
                            fR = (bigint >> 16) & 255; fG = (bigint >> 8) & 255; fB = bigint & 255; fA = 255; 
                        } 
                        doFloodFillWorker(mctx, x, y, fR, fG, fB, fA, 200).then(() => { 
                            node._lastClickPos = null; 
                            saveHistory(); 
                            if (app.graph) app.graph.setDirtyCanvas(true, true); 
                        }); 
                        e.preventDefault(); e.stopPropagation(); return; 
                    }
                    if (e.button === 1 && node.isFullscreen) { isPanning = true; e.preventDefault(); e.stopPropagation(); return; }
                    
                    if (e.button === 2 && e.altKey) { 
                        resizingBrush = true; resizeStartX = e.clientX; resizeStartY = e.clientY; node._accumulatedMovementX = 0; node._accumulatedMovementY = 0; initialBrushSize = parseFloat(node.brushSize); initialBrushHardness = parseFloat(node.brushHardness); node._resizeAxisLock = null; 
                        const { cssX, cssY } = getCanvasCoord(e); node._lockedCssX = cssX; node._lockedCssY = cssY; 
                        if (maskCanvas.requestPointerLock) maskCanvas.requestPointerLock(); 
                        e.preventDefault(); e.stopPropagation(); return; 
                    }
                    if (e.button !== 0 && e.button !== 2) return; 

                    drawing = true;
                    node._isRmbErasing = (e.button === 2);
                    node._wasShiftDrawing = e.shiftKey;
                    const { x, y, cssX, cssY } = getCanvasCoord(e);
                    brushCursor.style.left = `${cssX}px`; brushCursor.style.top = `${cssY}px`; brushCursor.style.display = "block";

                    const blurAmount = (1 - node.brushHardness) * (node.brushSize / 4);
                    const drawSize = Math.max(1, node.brushSize - blurAmount);

                    mctx.lineWidth = drawSize; 
                    mctx.lineCap = "round"; 
                    mctx.lineJoin = "round"; 
                    mctx.globalCompositeOperation = (node.isEraser || node._isRmbErasing) ? "destination-out" : "source-over"; 
                    
                    if (blurAmount > 0) {
                        const offset = Math.max(maskCanvas.width, maskCanvas.height) + node.brushSize + 500;
                        mctx.shadowBlur = blurAmount;
                        mctx.shadowColor = node.maskColor;
                        mctx.shadowOffsetX = offset;
                        mctx.shadowOffsetY = offset;
                        mctx.strokeStyle = "rgba(0,0,0,1)"; 
                        mctx.fillStyle = "rgba(0,0,0,1)";

                        if (e.shiftKey && node._lastClickPos) { 
                            mctx.beginPath(); mctx.moveTo(node._lastClickPos.x - offset, node._lastClickPos.y - offset); mctx.lineTo(x - offset, y - offset); mctx.stroke(); 
                        } else { 
                            mctx.beginPath(); mctx.arc(x - offset, y - offset, drawSize / 2, 0, Math.PI * 2); mctx.fill(); 
                        }
                    } else {
                        mctx.shadowBlur = 0;
                        mctx.shadowColor = "transparent";
                        mctx.shadowOffsetX = 0;
                        mctx.shadowOffsetY = 0;
                        mctx.strokeStyle = node.maskColor; 
                        mctx.fillStyle = node.maskColor;

                        if (e.shiftKey && node._lastClickPos) { 
                            mctx.beginPath(); mctx.moveTo(node._lastClickPos.x, node._lastClickPos.y); mctx.lineTo(x, y); mctx.stroke(); 
                        } else { 
                            mctx.beginPath(); mctx.arc(x, y, drawSize / 2, 0, Math.PI * 2); mctx.fill(); 
                        }
                    }
                    mctx.shadowBlur = 0;
                    mctx.shadowOffsetX = 0;
                    mctx.shadowOffsetY = 0;
                    
                    node._lp = [x, y]; node._lastClickPos = { x, y }; node._dragStartX = x; node._dragStartY = y; node._shiftLockAxis = null; e.preventDefault(); e.stopPropagation(); if (app.graph) app.graph.setDirtyCanvas(true, true); 
                };

                maskCanvas.onpointermove = (e) => {
                    const mode = widgets.mode ? widgets.mode.value : "Preview"; if (mode !== "Mask") return;
                    node._lastPointerEvent = e;
                    if (isPanning) { node._fsPanX += e.movementX; node._fsPanY += e.movementY; applyZoomPan(); e.preventDefault(); e.stopPropagation(); return; }
                    
                    if (resizingBrush) { 
                        let deltaX = 0; let deltaY = 0;
                        if (document.pointerLockElement === maskCanvas) { 
                            node._accumulatedMovementX += (e.movementX || 0); node._accumulatedMovementY += (e.movementY || 0); 
                            deltaX = node._accumulatedMovementX; deltaY = node._accumulatedMovementY;
                        } else { deltaX = e.clientX - resizeStartX; deltaY = e.clientY - resizeStartY; } 
                        if (!node._resizeAxisLock) { if (Math.abs(deltaX) > 5) node._resizeAxisLock = 'x'; else if (Math.abs(deltaY) > 5) node._resizeAxisLock = 'y'; }
                        
                        if (node._resizeAxisLock === 'x') { 
                            let newSize = initialBrushSize + (deltaX * 0.5); 
                            newSize = Math.max(1, Math.min(250, newSize)); 
                            node.brushSize = newSize; slider.value = newSize; 
                            if(node._sizeNum) node._sizeNum.value = Math.round(newSize);
                        } else if (node._resizeAxisLock === 'y') { 
                            let newHardness = initialBrushHardness + (deltaY * 0.005); 
                            newHardness = Math.max(0, Math.min(1, newHardness)); 
                            node.brushHardness = newHardness; hardnessSlider.value = newHardness * 100; 
                            if(node._hardnessNum) node._hardnessNum.value = Math.round(newHardness * 100);
                        }
                        
                        brushCursor.style.left = `${node._lockedCssX}px`; brushCursor.style.top = `${node._lockedCssY}px`; brushCursor.style.display = "block"; updateCursorSize(); e.preventDefault(); e.stopPropagation(); return; 
                    }
                    
                    const { x, y, cssX, cssY } = getCanvasCoord(e); let cursorX = cssX; let cursorY = cssY; let currentX = x; let currentY = y;
                    
                    if (!drawing) { brushCursor.style.left = `${cssX}px`; brushCursor.style.top = `${cssY}px`; brushCursor.style.display = "block"; return; }
                    if (node._wasShiftDrawing && !e.shiftKey) {
                        drawing = false;
                        node._shiftLockAxis = null;
                        node._wasShiftDrawing = false;
                        saveHistory();
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                        const updatePos = () => {
                            const { cssX, cssY } = getCanvasCoord(e);
                            brushCursor.style.left = `${cssX}px`;
                            brushCursor.style.top = `${cssY}px`;
                        };
                        requestAnimationFrame(updatePos);
                        setTimeout(updatePos, 20);
                        return;
                    }
                    if (e.shiftKey) { node._wasShiftDrawing = true; if (!node._shiftLockAxis) { if (Math.abs(currentX - node._dragStartX) > Math.abs(currentY - node._dragStartY)) node._shiftLockAxis = 'y'; else if (Math.abs(currentY - node._dragStartY) > Math.abs(currentX - node._dragStartX)) node._shiftLockAxis = 'x'; } if (node._shiftLockAxis === 'y') { currentY = node._dragStartY; cursorY = currentY * currentScale; } else if (node._shiftLockAxis === 'x') { currentX = node._dragStartX; cursorX = currentX * currentScale; } } else { node._shiftLockAxis = null; node._dragStartX = currentX; node._dragStartY = currentY; }
                    brushCursor.style.left = `${cursorX}px`; brushCursor.style.top = `${cursorY}px`; brushCursor.style.display = "block";
                    
                    const blurAmount = (1 - node.brushHardness) * (node.brushSize / 4);
                    const drawSize = Math.max(1, node.brushSize - blurAmount);

                    mctx.lineWidth = drawSize; 
                    mctx.lineCap = "round"; 
                    mctx.lineJoin = "round"; 
                    mctx.globalCompositeOperation = (node.isEraser || node._isRmbErasing) ? "destination-out" : "source-over"; 
                    
                    if (blurAmount > 0) {
                        const offset = Math.max(maskCanvas.width, maskCanvas.height) + node.brushSize + 500;
                        mctx.shadowBlur = blurAmount;
                        mctx.shadowColor = node.maskColor;
                        mctx.shadowOffsetX = offset;
                        mctx.shadowOffsetY = offset;
                        mctx.strokeStyle = "rgba(0,0,0,1)"; 
                        mctx.fillStyle = "rgba(0,0,0,1)";
                        
                        mctx.beginPath(); 
                        mctx.moveTo(node._lp[0] - offset, node._lp[1] - offset); 
                        mctx.lineTo(currentX - offset, currentY - offset); 
                        mctx.stroke();
                    } else {
                        mctx.shadowBlur = 0;
                        mctx.shadowColor = "transparent";
                        mctx.shadowOffsetX = 0;
                        mctx.shadowOffsetY = 0;
                        mctx.strokeStyle = node.maskColor; 
                        mctx.fillStyle = node.maskColor;
                        
                        mctx.beginPath(); 
                        mctx.moveTo(node._lp[0], node._lp[1]); 
                        mctx.lineTo(currentX, currentY); 
                        mctx.stroke();
                    }
                    mctx.shadowBlur = 0;
                    mctx.shadowOffsetX = 0;
                    mctx.shadowOffsetY = 0;

                    node._lp = [currentX, currentY]; node._lastClickPos = { x: currentX, y: currentY }; e.preventDefault(); e.stopPropagation(); if (node.requestDirtyCanvas) node.requestDirtyCanvas();
                };

                node._pointerUpHandler = (e) => {
                    node._lastPointerEvent = e;
                    if (app.canvas) app.canvas.allow_dragcanvas = true;
                    if (isPanning) { isPanning = false; e.preventDefault(); }
                    if (resizingBrush) { resizingBrush = false; if (document.pointerLockElement === maskCanvas) document.exitPointerLock(); e.preventDefault(); }
                    if (drawing) {
                        drawing = false;
                        node._isRmbErasing = false;
                        try { maskCanvas.releasePointerCapture(e.pointerId); } catch(err){}
                        saveHistory();
                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                        e.preventDefault();
                        e.stopPropagation();

                        const { cssX, cssY } = getCanvasCoord(e);
                        brushCursor.style.left = `${cssX}px`;
                        brushCursor.style.top = `${cssY}px`;
                    }
                };
                window.addEventListener("pointerup", node._pointerUpHandler, { capture: true });

                const updateUI = (forceReload = false) => {
                    if (typeof app !== "undefined" && app.graph && app.graph.getNodeById(node.id) !== node) {
                        if (!node._isFirstLoad && !node._isConfiguring) {
                            return;
                        }
                    }
                    const mode = widgets.mode ? widgets.mode.value : "Preview"; node._lastMode = mode;
                    const inImageInput = node.inputs ? node.inputs.find(slot => slot && slot.name === "in_image") : null;
                    const willBeWired = inImageInput && inImageInput.link !== null && inImageInput.link !== undefined;
                    const isInImageConnected = trixIsInputWired(node) || willBeWired;
                    const isResizeMode = mode === "Resize";
                    removeNativeUploadWidget();

                    toolBar.style.minHeight = `${isResizeMode ? TOOLBAR_HEIGHT_RESIZE : TOOLBAR_HEIGHT_FILTER_MASK}px`;
                    toolBar.style.padding = "1px 6px 2px 6px";
                    toolBar.style.background = "var(--trix-panel-soft)";

                    if (filePanel) {
                        filePanel.style.background = "var(--trix-bg)";
                        filePanel.style.borderBottom = "1px solid var(--trix-control)";
                        filePanel.style.display = "flex";
                        if (node.refreshImagePickerRef) node.refreshImagePickerRef();
                        if (isInImageConnected) {
                            filePanel.style.opacity = "0.6";
                            filePanel.style.pointerEvents = "none";
                        } else {
                            filePanel.style.opacity = "1.0";
                            filePanel.style.pointerEvents = "auto";
                        }
                    }
                    if (filePanelTopShield) {
                        filePanelTopShield.style.background = "var(--trix-bg)";
                    }
                    if (resizePanel) {
                        resizePanel.style.background = "var(--trix-panel-soft)";
                    }
                    if (cameraRawPanel) {
                        cameraRawPanel.style.background = "var(--trix-panel-soft)";
                    }
                    if (node.headerContainerRef) {
                        node.headerContainerRef.style.background = "var(--trix-bg)";
                    }
                    if (tabs) {
                        tabs.style.background = "var(--trix-panel-soft)";
                    }

                    if (widgets.image) { 
                        hideWidget(widgets.image);
                    }

                    Object.keys(btnRef).forEach(k => { 
                        let isSelected = (k === mode);
                        let bgColor = "transparent";
                        let color = "var(--trix-icon)";

                        const isEnableResize = (widgets.enable_resize && widgets.enable_resize.value);
                        const isCrEnabled = (widgets.cr_enable && widgets.cr_enable.value);

                        if (k === "Resize") {
                            if (isEnableResize) {
                                bgColor = "var(--trix-active)";
                                color = "var(--trix-text)";
                            } else {
                                bgColor = isSelected ? "var(--trix-accent)" : "rgba(255, 255, 255, 0.2)";
                                color = "var(--trix-text)";
                            }
                        } else if (k === "Filter") {
                            if (isCrEnabled) {
                                bgColor = "var(--trix-active)";
                                color = "var(--trix-text)";
                            } else {
                                bgColor = isSelected ? "var(--trix-accent)" : "rgba(255, 255, 255, 0.2)";
                                color = "var(--trix-text)";
                            }
                        } else {
                            bgColor = isSelected ? "var(--trix-accent)" : "rgba(255, 255, 255, 0.2)";
                            color = "var(--trix-text)";
                        }

                        btnRef[k].style.background = bgColor; 
                        btnRef[k].style.color = color;
                    });

                    if (widgets.mode) { hideWidget(widgets.mode); }

                    const showTools = mode === "Mask" && !node._isToolbarHidden;

                    toolBar.style.display = "grid";
                    toolBar.style.visibility = "visible"; 
                    toolBar.style.opacity = "1";

                    Array.from(toolBar.children).forEach(child => {
                        if (child === node.resLabelRef) return;
                        child.style.visibility = showTools ? "visible" : "hidden";
                        child.style.opacity = showTools ? "1" : "0";
                        child.style.pointerEvents = showTools ? "auto" : "none";
                    });

                    if (mode === "Mask" || mode === "Filter") {
                        if (node.resLabelRef) node.resLabelRef.style.display = "none";
                    } else {
                        if (node.resLabelRef && !node.isPreviewHidden && !node.isFullscreen) {
                            node.resLabelRef.style.display = "flex";
                            if (mode === "Preview") {
                                node.resLabelRef.style.justifyContent = "center";
                            } else {
                                node.resLabelRef.style.justifyContent = "flex-start";
                            }
                            if (node.updateResLabelTextRef) node.updateResLabelTextRef();
                        } else if (node.resLabelRef) {
                            node.resLabelRef.style.display = "none";
                        }
                    }

                    if (mode === "Resize") {
                        viewPort.style.display = "none"; cameraRawPanel.style.display = "none"; resizePanel.style.display = "flex";
                        bodyContainer.style.overflow = "hidden";
                        
                        if (wrapper.parentNode === document.body && node._domPlaceholder && node._domPlaceholder.parentNode) { node._domPlaceholder.parentNode.replaceChild(wrapper, node._domPlaceholder); }
                        
                        node.headerContainerRef.style.marginTop = `${TRIX_HEADER_OFFSET_Y}px`;
                        wrapper.style.position = "relative"; wrapper.style.top = "auto"; wrapper.style.left = "auto"; wrapper.style.transform = "none"; wrapper.style.width = "100%"; wrapper.style.height = "100%"; wrapper.style.zIndex = ""; wrapper.style.background = "transparent"; wrapper.style.padding = "4px 0px 2px 0px"; wrapper.style.borderRadius = "0"; applyNodeDomSideOutline(); 
                        resizePanel.style.width = "100%"; resizePanel.style.borderRight = "none";

                    } else if (mode === "Filter") {
                        resizePanel.style.display = "none";
                        viewPort.style.display = "none";
                        cameraRawPanel.style.display = "flex";
                        bodyContainer.style.overflow = "hidden";
                        
                        imgTag.style.opacity = "0";
                        maskCanvas.style.opacity = "0";
                        
                        if (wrapper.parentNode === document.body && node._domPlaceholder && node._domPlaceholder.parentNode) { node._domPlaceholder.parentNode.replaceChild(wrapper, node._domPlaceholder); }

                        node.headerContainerRef.style.marginTop = `${TRIX_HEADER_OFFSET_Y}px`;
                        wrapper.style.position = "relative"; wrapper.style.top = "auto"; wrapper.style.left = "auto"; wrapper.style.transform = "none"; wrapper.style.width = "100%"; wrapper.style.height = "100%"; wrapper.style.zIndex = ""; wrapper.style.background = "transparent"; wrapper.style.padding = "4px 0px 2px 0px"; wrapper.style.borderRadius = "0"; applyNodeDomSideOutline(); 
                        
                        viewPort.style.justifyContent = "center"; viewPort.style.overflow = "visible"; 
                        if (node.resLabelRef) node.resLabelRef.style.display = "none";
                        
                        hardnessRow.wrap.style.display = "none"; 
                        if(node._sizeNum) node._sizeNum.style.display = "none";
                        if(node._hardnessNum) node._hardnessNum.style.display = "none";

                    } else if (mode === "Preview") {
                        resizePanel.style.display = "none";
                        viewPort.style.display = "flex";
                        cameraRawPanel.style.display = "none";
                        bodyContainer.style.overflow = "visible";
                        
                        imgTag.style.opacity = "0";
                        maskCanvas.style.opacity = "0";
                        
                        if (wrapper.parentNode === document.body && node._domPlaceholder && node._domPlaceholder.parentNode) { node._domPlaceholder.parentNode.replaceChild(wrapper, node._domPlaceholder); }

                        node.headerContainerRef.style.marginTop = `${TRIX_HEADER_OFFSET_Y}px`;
                        wrapper.style.position = "relative"; wrapper.style.top = "auto"; wrapper.style.left = "auto"; wrapper.style.transform = "none"; wrapper.style.width = "100%"; wrapper.style.height = "100%"; wrapper.style.zIndex = ""; wrapper.style.background = "transparent"; wrapper.style.padding = "4px 0px 2px 0px"; wrapper.style.borderRadius = "0"; applyNodeDomSideOutline(); 
                        
                        viewPort.style.justifyContent = "center"; viewPort.style.overflow = "visible"; 
                        if (node.resLabelRef) node.resLabelRef.style.display = node.isPreviewHidden ? "none" : "block";
                        
                        hardnessRow.wrap.style.display = "none"; 
                        if(node._sizeNum) node._sizeNum.style.display = "none";
                        if(node._hardnessNum) node._hardnessNum.style.display = "none";

                    } else {
                        resizePanel.style.display = "none"; cameraRawPanel.style.display = "none";
                        bodyContainer.style.overflow = "visible";

                        if (node.isFullscreen) {
                            if (!node._domPlaceholder) { node._domPlaceholder = document.createElement("div"); node._domPlaceholder.style.width = "100%"; node._domPlaceholder.style.height = "100%"; }
                            if (wrapper.parentNode && wrapper.parentNode !== document.body) { wrapper.parentNode.replaceChild(node._domPlaceholder, wrapper); document.body.appendChild(wrapper); }

                            node.headerContainerRef.style.marginTop = "0px";
                            wrapper.style.position = "fixed"; wrapper.style.top = "50%"; wrapper.style.left = "50%"; wrapper.style.transform = "translate(-50%, -50%)"; wrapper.style.width = "90vw"; wrapper.style.height = "90vh"; wrapper.style.zIndex = "9999"; wrapper.style.background = "rgba(18, 18, 20, 0.98)"; wrapper.style.padding = "20px"; wrapper.style.borderRadius = "12px"; wrapper.style.boxShadow = "0 10px 50px rgba(0,0,0,0.8)"; 
                            viewPort.style.justifyContent = "center"; viewPort.style.overflow = "hidden"; 
                            
                            imgTag.style.opacity = node.isPreviewHidden ? "0" : "1"; 
                            maskCanvas.style.opacity = node._isMaskHidden ? "0" : String(node._visualOpacityStandard !== undefined ? node._visualOpacityStandard : 0.8); 
                            viewPort.style.display = "flex"; node.resLabelRef.style.display = "none";
                            
                            hardnessRow.wrap.style.display = "flex"; 
                            if(node._sizeNum) node._sizeNum.style.display = "block";
                            if(node._hardnessNum) node._hardnessNum.style.display = "block";
                        } else {
                            if (wrapper.parentNode === document.body && node._domPlaceholder && node._domPlaceholder.parentNode) { node._domPlaceholder.parentNode.replaceChild(wrapper, node._domPlaceholder); }

                            node.headerContainerRef.style.marginTop = `${TRIX_HEADER_OFFSET_Y}px`;
                            wrapper.style.position = "relative"; wrapper.style.top = "auto"; wrapper.style.left = "auto"; wrapper.style.transform = "none"; wrapper.style.width = "100%"; wrapper.style.height = "100%"; wrapper.style.zIndex = ""; wrapper.style.background = "transparent"; wrapper.style.padding = "4px 0px 2px 0px"; wrapper.style.borderRadius = "0"; applyNodeDomSideOutline(); 
                            viewPort.style.justifyContent = "center"; viewPort.style.overflow = "visible"; 
                            
                            imgTag.style.opacity = "0"; 
                            maskCanvas.style.opacity = "0"; 
                            
                            viewPort.style.display = "flex"; 
                            if (node.resLabelRef) node.resLabelRef.style.display = node.isPreviewHidden ? "none" : "block";
                            
                            hardnessRow.wrap.style.display = "none"; 
                            if(node._sizeNum) node._sizeNum.style.display = "none";
                            if(node._hardnessNum) node._hardnessNum.style.display = "none";
                        }
                    }

                    if (widgets.mask_data) { hideWidget(widgets.mask_data); }
                    if (widgets.crop_data) { hideWidget(widgets.crop_data); }
                    if (widgets.crop_position) { hideWidget(widgets.crop_position); }
                    if (widgets.cr_enable) { hideWidget(widgets.cr_enable); }
                    if (widgets.hsl_active) { hideWidget(widgets.hsl_active); }
                    if (widgets.hsl_data) { hideWidget(widgets.hsl_data); }
                    if (findW("curve_active")) { hideWidget(findW("curve_active")); }
                    if (findW("curve_data")) { hideWidget(findW("curve_data")); }
                    
                    if (widgets.resize && Array.isArray(widgets.resize)) {
                        widgets.resize.forEach(w => { 
                            if (w && !w.name.startsWith("cr_") && !w.name.startsWith("hsl_") && !w.name.startsWith("curve_")) { hideWidget(w); } 
                        });
                    }
                    
                    if (node.widgets) {
                        node.widgets.forEach(w => {
                            if (w && w.name && (w.name.startsWith("cr_") || w.name.startsWith("hsl_") || w.name.startsWith("curve_"))) {
                                hideWidget(w);
                            }
                        });
                    }

                    alignCanvas();

                    maskCanvas.style.pointerEvents = (mode === "Mask" && (!node.isPreviewHidden || node.isFullscreen)) ? "auto" : "none";

                    if (isInImageConnected) {
                        if (node.pullLivePreviewRef) node.pullLivePreviewRef();
                    } else {
                        const name = widgets.image ? widgets.image.value : null;
                        if (name) {
                            let filename = name; let subfolder = ""; if (name.includes("/")) { const parts = name.split("/"); filename = parts.pop(); subfolder = parts.join("/"); }
                            const url = `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}`;
                            const finalUrl = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
                            
                            const getQueryParam = (urlStr, param) => {
                                if (!urlStr) return "";
                                try {
                                    const parsed = new URL(urlStr, window.location.origin);
                                    return parsed.searchParams.get(param) || "";
                                } catch(e) {
                                    const match = new RegExp("[&?]" + param + "=([^&]+)").exec(urlStr);
                                    return match ? decodeURIComponent(match[1]) : "";
                                }
                            };
                            const currentFilename = getQueryParam(imgTag.src, "filename");
                            const currentSubfolder = getQueryParam(imgTag.src, "subfolder");
                            const isSameImage = (currentFilename === filename) && (currentSubfolder === subfolder);

                            if (node._isConfiguring) {
                                node._lastImageName = name;
                                node._loadingImageUrl = finalUrl;
                                imgTag.src = finalUrl;
                            } else if (forceReload || node._lastImageName !== name || !imgTag.src || !isSameImage) { 
                                node._lastImageName = name; 
                                node._loadingImageUrl = finalUrl;
                                const preImg = new Image();
                                preImg.onload = () => {
                                    if (node._loadingImageUrl === finalUrl) {
                                        imgTag.src = finalUrl;
                                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                                    }
                                };
                                preImg.src = finalUrl;
                            }
                        }
                    }


                    
                    if (node.updateDynamicVisibilityRef) node.updateDynamicVisibilityRef();
                    updateGroupActiveColors();
                    if (app.graph) app.graph.setDirtyCanvas(true, true);
                };
                node.updateUIRef = updateUI; 

                const imgWidget = widgets.image; 
                if (imgWidget) {
                    const oldCb = imgWidget.callback;
                    imgWidget.callback = function() {
                        if (oldCb) oldCb.apply(this, arguments); 
                        const currentVal = imgWidget.value; 
                        if (!currentVal) return;
                        
                        if (!currentVal.includes("aio_crop_") && !currentVal.includes("clipspace-painted-masked")) {
                            node._originalImageForCrop = currentVal;
                        }
                        
                        if (node._isConfiguring) {
                            node._baseImageName = currentVal;
                            return; 
                        }

                        if (currentVal.includes("clipspace-painted-masked")) {
                            if (node._baseImageName && !node._baseImageName.includes("clipspace-painted-masked")) { imgWidget.value = node._baseImageName; }
                            let filename = currentVal; let subfolder = ""; if (currentVal.includes("/")) { const parts = currentVal.split("/"); filename = parts.pop(); subfolder = parts.join("/"); }
                            const maskUrl = `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}&t=${Date.now()}`;

                            fetch(maskUrl).then(r => r.blob()).then(blob => {
                                const blobUrl = URL.createObjectURL(blob); const tempImg = new Image();
                                tempImg.onload = () => {
                                    if (maskCanvas.width !== tempImg.naturalWidth) { maskCanvas.width = tempImg.naturalWidth; maskCanvas.height = tempImg.naturalHeight; alignCanvas(); }
                                    const mctx = maskCanvas.getContext("2d");
                                    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height); const tcanvas = document.createElement('canvas'); tcanvas.width = tempImg.naturalWidth; tcanvas.height = tempImg.naturalHeight; const tctx = tcanvas.getContext('2d', { willReadFrequently: true }); tctx.drawImage(tempImg, 0, 0); const imgData = tctx.getImageData(0, 0, tcanvas.width, tcanvas.height); const pixels = imgData.data;
                                    let r = 255, g = 0, b = 0; if (node.maskColor) { const hex = node.maskColor.replace(/^#/, ""); const bigint = parseInt(hex, 16); r = (bigint >> 16) & 255; g = (bigint >> 8) & 255; b = bigint & 255; }
                                    let hasAlpha = false; for (let i = 0; i < pixels.length; i += 4) { if (pixels[i + 3] < 250) { pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255; hasAlpha = true; } else { pixels[i+3] = 0; } }
                                    if (hasAlpha) { mctx.putImageData(imgData, 0, 0); } node._lastClickPos = null; saveHistory(); URL.revokeObjectURL(blobUrl); updateUI(true);
                                };
                                tempImg.src = blobUrl;
                            }).catch(e => console.error("TrixLoader Mask Intercept Error:", e));
                        } else {
                            node._baseImageName = currentVal; 
                            if (node._imageCallbackTimer) {
                                clearTimeout(node._imageCallbackTimer);
                            }
                            node._imageCallbackTimer = setTimeout(() => {
                                node._imageCallbackTimer = null;
                                if (node.updateUIRef) node.updateUIRef(true);
                            }, 50);
                        }
                        if (node.refreshImagePickerRef) node.refreshImagePickerRef();
                    };
                }

                const pasteHandler = async (e) => {
                    const selectedNodes = app.canvas ? app.canvas.selected_nodes : null;
                    const isHovered = !!(wrapper.matches && wrapper.matches(":hover"));
                    const hasFocusInside = !!(document.activeElement && wrapper.contains(document.activeElement));
                    const isSelected = !!(
                        node.isSelected ||
                        isHovered ||
                        hasFocusInside ||
                        (selectedNodes && selectedNodes[node.id]) ||
                        (Array.isArray(selectedNodes) && selectedNodes.includes(node))
                    );
                    if (!isSelected) return;

                    const clipboard = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
                    const items = clipboard && clipboard.items ? Array.from(clipboard.items) : [];
                    const imageItem = items.find((item) => item.kind === "file" && item.type && item.type.startsWith("image/"));
                    if (!imageItem) return;

                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

                    const file = imageItem.getAsFile ? imageItem.getAsFile() : null;
                    if (!file) return;

                    const localUuid = node.widgets ? node.widgets.find(w => w.name === "trix_uuid")?.value : null;
                    const filename = trixAioFilename("paste", localUuid || node.id, file.name, imageItem.type || file.type);
                    const newFile = new File([file], filename, { type: file.type || imageItem.type || "image/png" });
                    const body = new FormData();
                    body.append("image", newFile, filename);
                    trixAppendAioUploadFields(body, filename);

                    try {
                        const resp = await fetch("/upload/image", { method: "POST", body: body });
                        if (resp.status === 200) {
                            const data = await resp.json();
                            const finalName = trixAioFullPath(data);
                            if (imgWidget) {
                                imgWidget.value = finalName;
                                if (imgWidget.callback) imgWidget.callback(finalName);
                            }
                        }
                    } catch (err) {
                        console.error("TrixLoader Paste Error:", err);
                    }
                };

                window.addEventListener("paste", pasteHandler, { capture: true });
                document.addEventListener("paste", pasteHandler, { capture: true });
                const onRemoved = node.onRemoved; node.onRemoved = function() { 
                    if (typeof allTrixNodes !== "undefined") {
                        const idx = allTrixNodes.indexOf(node);
                        if (idx !== -1) allTrixNodes.splice(idx, 1);
                    }
                    if (node.cropPositionDropdown) { node.cropPositionDropdown.remove(); }
                    if (wrapper.parentNode === document.body) { document.body.removeChild(wrapper); }
                    window.removeEventListener("paste", pasteHandler, true);
                    document.removeEventListener("paste", pasteHandler, true); 
                    window.removeEventListener("resize", node._onResizeWindow); 
                    window.removeEventListener("keydown", node._onKeydownWindow); 
                    window.removeEventListener("pointerup", node._pointerUpHandler, { capture: true });
                    document.removeEventListener("dragover", documentDragOverHandler, { capture: true });
                    document.removeEventListener("drop", documentDropHandler, { capture: true });
                    document.removeEventListener("visibilitychange", node._onVisChange);
                    if (node.imgTagRef) node.imgTagRef.src = ""; if (node.tempHistoryImg) node.tempHistoryImg.src = ""; node.history = [];
                    if (onRemoved) onRemoved.apply(this, arguments); 
                };

                let dirtyCanvasPending = false;
                node.requestDirtyCanvas = () => {
                    if (!dirtyCanvasPending && app.graph) {
                        dirtyCanvasPending = true;
                        requestAnimationFrame(() => {
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                            dirtyCanvasPending = false;
                        });
                    }
                };

                updateUI();
            };

            const origOnDrawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function(ctx) {
                this.boxcolor = "rgba(0,0,0,0)";
                if (this.flags.collapsed) {
                    if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);
                    return;
                }
                if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);



                if (!this.flags.collapsed && this.drawTrixPreview) {
                    this.drawTrixPreview(ctx, true);
                }

                const titleHeight = (typeof LiteGraph !== "undefined" && LiteGraph.NODE_TITLE_HEIGHT) ? LiteGraph.NODE_TITLE_HEIGHT : 30;
                const nodeRadius = (typeof LiteGraph !== "undefined" && Number.isFinite(LiteGraph.ROUND_RADIUS)) ? LiteGraph.ROUND_RADIUS : TRIX_NODE_RADIUS;
                const w = TRIX_NODE_BORDER_WIDTH;
                if (w > 0) {
                    ctx.save();
                    ctx.strokeStyle = this._trixDropActive ? TRIX_ACCENT : TRIX_NODE_OUTLINE;
                    ctx.lineWidth = w;
                    drawRoundedNodeStroke(ctx, w / 2, -titleHeight + w / 2, this.size[0] - w, this.size[1] + titleHeight - w, nodeRadius);
                    ctx.restore();
                }
                
                if (!this.flags.collapsed) {
                    ctx.save();
                    ctx.fillStyle = "#00bfff";
                    ctx.font = "bold 16px sans-serif";
                    ctx.textAlign = "right";
                    ctx.fillText("?", this.size[0] - 12, -8);
                    ctx.restore();
                }
            };

            nodeType.prototype.onConnectionsChange = function(type, index, connected, link_info) { 
                if (this.inputs && this.inputs[index] && this.inputs[index].name === "in_image") { 
                    if (!connected) {
                        this._currentLiveUrl = null;
                        if (this.widgets) {
                            const myImgWidget = this.widgets.find(w => w.name === "image");
                            if (myImgWidget && myImgWidget.callback && myImgWidget.value) {
                                myImgWidget.callback(myImgWidget.value);
                            }
                        }
                    } else {
                        if (this.pullLivePreviewRef) {
                            this.pullLivePreviewRef();
                            const delayPull = () => {
                                if (this.pullLivePreviewRef) this.pullLivePreviewRef();
                            };
                            setTimeout(delayPull, 100);
                            setTimeout(delayPull, 300);
                            setTimeout(delayPull, 600);
                        }
                    }
                    refreshTrixOutputs(this);
                    if (this.updateUIRef) this.updateUIRef(); 
                } 
            };

            nodeType.prototype.onExecuted = function(message) {
                const node = this;
                node._currentLiveUrl = null;
                
                const localUuid = node.widgets ? node.widgets.find(w => w.name === "trix_uuid")?.value : null;
                if (localUuid && message && message.trix_uuid !== localUuid) {
                    return;
                }
                
                let incomingMaskName = null;
                if (message?.masks && message.masks.length > 0) {
                    incomingMaskName = message.masks[0];
                }

                if (message?.images && message.images.length > 0) {
                    const img_info = message.images[0]; 
                    const imgSubfolder = img_info.subfolder || "";
                    const url = `/view?filename=${encodeURIComponent(img_info.filename)}&type=${img_info.type}&subfolder=${encodeURIComponent(imgSubfolder)}&t=${Date.now()}`;
                    
                    const imgWidget = node.widgets ? node.widgets.find(w => w.name === "image") : null;
                    if (imgWidget && img_info.type === "input") {
                        imgWidget.value = imgSubfolder ? `${imgSubfolder}/${img_info.filename}` : img_info.filename;
                    }

                    if (node.imgTagRef) {
                        const originalOnload = node.imgTagRef.onload;
                        node.imgTagRef.onload = (e) => {
                            if (originalOnload) originalOnload(e);
                            
                            node.maskCanvasRef.width = node.imgTagRef.naturalWidth;
                            node.maskCanvasRef.height = node.imgTagRef.naturalHeight;
                            node.alignCanvasRef();
                            node.syncMaskToCanvas();
                            
                            if (incomingMaskName) {
                                setTimeout(() => {
                                    const mImg = new Image();
                                    mImg.onload = () => {
                                        const mctx = node.maskCanvasRef.getContext("2d");
                                        const tcanvas = document.createElement('canvas');
                                        tcanvas.width = mImg.naturalWidth; tcanvas.height = mImg.naturalHeight;
                                        const tctx = tcanvas.getContext('2d', { willReadFrequently: true });
                                        tctx.drawImage(mImg, 0, 0);
                                        
                                        const imgData = tctx.getImageData(0, 0, tcanvas.width, tcanvas.height);
                                        const pixels = imgData.data;

                                        let r = 255, g = 0, b = 0;
                                        if (node.maskColor) {
                                            const hex = node.maskColor.replace("#", "");
                                            r = parseInt(hex.substring(0, 2), 16) || 255;
                                            g = parseInt(hex.substring(2, 4), 16) || 0;
                                            b = parseInt(hex.substring(4, 6), 16) || 0;
                                        }

                                        let hasAlpha = false;
                                        for (let i = 0; i < pixels.length; i += 4) {
                                            const maskVal = pixels[i]; 
                                            if (maskVal > 5) { 
                                                pixels[i] = r;
                                                pixels[i+1] = g;
                                                pixels[i+2] = b;
                                                pixels[i+3] = maskVal; 
                                                hasAlpha = true;
                                            } else {
                                                pixels[i+3] = 0;
                                            }
                                        }
                                        
                                        mctx.globalCompositeOperation = "source-over";
                                        if (hasAlpha) {
                                            tctx.putImageData(imgData, 0, 0);
                                            mctx.drawImage(tcanvas, 0, 0);
                                            
                                            if (node.widgets) {
                                                const mData = node.widgets.find(w => w.name === "mask_data");
                                                if (mData) mData.value = node.maskCanvasRef.toDataURL();
                                            }
                                        }
                                        
                                        // Reset history because image size may have changed!
                                        node.history = [];
                                        node.historyIndex = -1;
                                        if (node.saveHistoryRef) node.saveHistoryRef();
                                        
                                        if (node.alignCanvasRef) node.alignCanvasRef();
                                        if (node.updateUIRef) node.updateUIRef();
                                        if (app.graph) app.graph.setDirtyCanvas(true, true);
                                    };
                                    mImg.src = `/view?filename=${encodeURIComponent(incomingMaskName.filename)}&type=${incomingMaskName.type}&subfolder=${encodeURIComponent(incomingMaskName.subfolder || "")}&t=${Date.now()}`;
                                }, 1000); 
                            }

                            if (app.graph) app.graph.setDirtyCanvas(true, true); 
                            if (node.updateUIRef) node.updateUIRef(); 
                            
                            // Restore original onload to prevent infinite wrapping if executed multiple times
                            node.imgTagRef.onload = originalOnload;
                        };
                        node.imgTagRef.src = url;
                    }
                } else if (incomingMaskName) {
                    setTimeout(() => {
                        const mImg = new Image();
                        mImg.onload = () => {
                            const mctx = node.maskCanvasRef.getContext("2d");
                            const tcanvas = document.createElement('canvas');
                            tcanvas.width = mImg.naturalWidth; tcanvas.height = mImg.naturalHeight;
                            const tctx = tcanvas.getContext('2d', { willReadFrequently: true });
                            tctx.drawImage(mImg, 0, 0);
                            
                            const imgData = tctx.getImageData(0, 0, tcanvas.width, tcanvas.height);
                            const pixels = imgData.data;

                            let r = 255, g = 0, b = 0;
                            if (node.maskColor) {
                                const hex = node.maskColor.replace("#", "");
                                r = parseInt(hex.substring(0, 2), 16) || 255;
                                g = parseInt(hex.substring(2, 4), 16) || 0;
                                b = parseInt(hex.substring(4, 6), 16) || 0;
                            }

                            let hasAlpha = false;
                            for (let i = 0; i < pixels.length; i += 4) {
                                const maskVal = pixels[i]; 
                                if (maskVal > 5) { 
                                    pixels[i] = r;
                                    pixels[i+1] = g;
                                    pixels[i+2] = b;
                                    pixels[i+3] = maskVal;
                                    hasAlpha = true;
                                } else {
                                    pixels[i+3] = 0;
                                }
                            }
                            
                            mctx.globalCompositeOperation = "source-over";
                            if (hasAlpha) {
                                tctx.putImageData(imgData, 0, 0);
                                mctx.drawImage(tcanvas, 0, 0);
                                
                                if (node.widgets) {
                                    const mData = node.widgets.find(w => w.name === "mask_data");
                                    if (mData) mData.value = node.maskCanvasRef.toDataURL();
                                }
                            }
                            
                            if (node.saveHistoryRef) node.saveHistoryRef();
                            if (node.alignCanvasRef) node.alignCanvasRef();
                            if (node.updateUIRef) node.updateUIRef();
                            if (app.graph) app.graph.setDirtyCanvas(true, true);
                        };
                        mImg.src = `/view?filename=${encodeURIComponent(incomingMaskName.filename)}&type=${incomingMaskName.type}&subfolder=${encodeURIComponent(incomingMaskName.subfolder || "")}&t=${Date.now()}`;
                    }, 1000); 
                }
            };
        }
    },
    nodeCreated(node) {
        if (node.comfyClass === "TrixLoadImageAIO") {
            try {
                applyTrixNodeChrome(node);
                refreshTrixOutputs(node);
                if (!node.title || node.title.toLowerCase().includes("load image aio")) {
                    node.title = TRIX_DISPLAY_TITLE;
                }
                if (node.updateUIRef) {
                    node.updateUIRef();
                }
                if (node.syncHTMLRef) {
                    node.syncHTMLRef();
                }
            } catch (err) {
                console.error("TrixLoader nodeCreated error:", err);
            }
        }
    }
});


