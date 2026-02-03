import { LABEL_COLOURS } from './src/label_colours.js';
import { SEG_MAP_DATA_URL } from './src/9b_segmentation_map.js';

// ===== Segmentation Map Overlay =====
// Loads the segmentation map invisibly, samples pixel colors on hover,
// reveals xpol_ref pixels for the hovered segment while darkening everything else.
// Uses two canvases for crossfade transitions between segments.
// Grain-level outline: clusters pixels by 6D HSV-cartesian color (xpol+ppol) + proximity,
// draws a pixelated white outline around the nearest grain, with a leader line + typewriter label.

document.addEventListener('DOMContentLoaded', () => {
    const heroBg = document.getElementById('hero-bg');
    const canvasA = document.getElementById('seg-overlay-a');
    const canvasB = document.getElementById('seg-overlay-b');
    const ctxA = canvasA.getContext('2d');
    const ctxB = canvasB.getContext('2d');
    const segLabel = document.getElementById('seg-label');

    // front = currently visible canvas, back = off-screen canvas to draw next mask on
    let front = { canvas: canvasA, ctx: ctxA };
    let back = { canvas: canvasB, ctx: ctxB };

    // Hidden canvas for sampling pixel colors from the segmentation map
    const segHidden = document.createElement('canvas');
    segHidden.style.imageRendering = '-webkit-optimize-contrast'; /* Safari */
    segHidden.style.imageRendering = 'crisp-edges';             /* Firefox */
    segHidden.style.imageRendering = 'pixelated';               /* Chrome */ 
    // segHidden.style.zIndex = 1;
    // segHidden.style.pointerEvents = 'none';
    // heroBg.appendChild(segHidden)

    const segHiddenCtx = segHidden.getContext('2d');
    // Hidden canvas for xpol_ref scaled to cover dimensions
    const xpolRefCanvas = document.createElement('canvas');
    const xpolRefCtx = xpolRefCanvas.getContext('2d');

    let segImageData = null;
    const labelColours = LABEL_COLOURS;
    let lastSegColor = null;
    let maskCache = {};
    let xpolRefLoaded = false;
    let transitionTimer = null;
    let transitioning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastClientX = 0;
    let lastClientY = 0;
    let currentPortrait = false;

    // --- Grain outline system ---
    // Canvas for grain outline + leader line + label (on top of seg overlays)
    const grainCanvas = document.createElement('canvas');
    grainCanvas.style.position = 'absolute';
    grainCanvas.style.top = '0';
    grainCanvas.style.left = '0';
    grainCanvas.style.width = '100%';
    grainCanvas.style.height = '100%';
    grainCanvas.style.pointerEvents = 'none';
    grainCanvas.style.zIndex = '3';
    grainCanvas.style.imageRendering = 'pixelated';
    grainCanvas.imageSmoothingEnabled = 'false';
    // grainCanvas.style.mixBlendMode = 'difference';
    heroBg.appendChild(grainCanvas);
    const grainCtx = grainCanvas.getContext('2d');

    // Hidden canvas for ppol image (for 6D color)
    const ppolCanvas = document.createElement('canvas');
    const ppolCtx = ppolCanvas.getContext('2d');
    let ppolLoaded = false;

    // Precomputed mineral data: hex -> { count, xs, ys, xpol6, ppol6, mean6d }
    let mineralData = {};
    let precomputed = false;
    let xpolImageData = null;
    let ppolImageData = null;

    // Grain tuning parameters
    const GRAIN_COLOR_SCALE = 1.6;
    const GRAIN_SPATIAL_SCALE = 30;
    const GRAIN_THRESHOLD = 1;

    // Grain animation state
    let grainAnimId = 0;
    let lastGrainHex = null;
    let lastGrainCx = -999;
    let lastGrainCy = -999;
    let cachedBoundary = null;
    let cachedCentroid = null;
    let cachedMineral = null;
    let lastMoveTime = 0;
    const IDLE_DELAY = 200; // ms of no movement before showing line + label
    let selectedMineralHex = null;

    // Load the segmentation map from embedded base64 data.
    // Native pixel data is captured at 1:1 so we can do nearest-neighbor scaling
    // in JS — Safari doesn't respect imageSmoothingEnabled=false in drawImage.
    let nativeSegData = null;
    let nativeSegW = 0, nativeSegH = 0;
    const segImg = new Image();
    segImg.src = SEG_MAP_DATA_URL;
    segImg.onload = function() {
        const nc = document.createElement('canvas');
        nc.width = segImg.naturalWidth;
        nc.height = segImg.naturalHeight;
        const nctx = nc.getContext('2d');
        nctx.drawImage(segImg, 0, 0); // 1:1, no scaling
        nativeSegData = nctx.getImageData(0, 0, nc.width, nc.height);
        nativeSegW = nc.width;
        nativeSegH = nc.height;

        resizeSegCanvases();
        window.addEventListener('resize', resizeSegCanvases);
        tryPrecompute();
    };

    // Load the xpol_ref image for segment reveal
    const xpolRefImg = new Image();
    xpolRefImg.src = '/imgs/9B_xpol_ref.jpg';
    xpolRefImg.onload = function() {
        xpolRefLoaded = true;
        if (segHidden.width > 0) {
            xpolRefCanvas.width = segHidden.width;
            xpolRefCanvas.height = segHidden.height;
            drawCover(xpolRefCtx, xpolRefImg, segHidden.width, segHidden.height);
        }
        tryPrecompute();
    };

    // Load the ppol image for 6D grain color
    const ppolImg = new Image();
    ppolImg.src = '/imgs/9B_ppol.jpg';
    ppolImg.onload = function() {
        ppolLoaded = true;
        if (segHidden.width > 0) {
            ppolCanvas.width = segHidden.width;
            ppolCanvas.height = segHidden.height;
            drawCover(ppolCtx, ppolImg, segHidden.width, segHidden.height);
        }
        tryPrecompute();
    };

    // Draw image with background-size:cover / background-position:center logic.
    // When rotate=true, draws the image rotated 90° CW to better fill portrait containers.
    function drawCover(ctx, img, cw, ch, rotate) {
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cw, ch);

        if (rotate) {
            ctx.save();
            ctx.translate(cw / 2, ch / 2);
            ctx.rotate(Math.PI / 2);
            // In rotated space, the drawing area is ch wide × cw tall
            const imgAspect = img.width / img.height;
            const areaAspect = ch / cw;
            let dw, dh;
            if (areaAspect > imgAspect) {
                dw = ch;
                dh = ch / imgAspect;
            } else {
                dh = cw;
                dw = cw * imgAspect;
            }
            ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            ctx.restore();
        } else {
            const imgAspect = img.width / img.height;
            const containerAspect = cw / ch;
            let dw, dh, dx, dy;
            if (containerAspect > imgAspect) {
                dw = cw;
                dh = cw / imgAspect;
                dx = 0;
                dy = (ch - dh) / 2;
            } else {
                dh = ch;
                dw = ch * imgAspect;
                dx = (cw - dw) / 2;
                dy = 0;
            }
            ctx.drawImage(img, dx, dy, dw, dh);
        }
    }

    // Manual nearest-neighbor scaling of the seg map from native resolution to display resolution.
    // Bypasses browser drawImage which Safari interpolates even with imageSmoothingEnabled=false.
    function buildSegMapData(w, h, portrait) {
        const imgW = nativeSegW;
        const imgH = nativeSegH;
        const imgAspect = imgW / imgH;
        const src = nativeSegData.data;
        const out = new ImageData(w, h);
        const dst = out.data;

        if (portrait) {
            // Rotated 90° CW cover: drawing area is h wide × w tall
            const areaAspect = h / w;
            let dw, dh;
            if (areaAspect > imgAspect) { dw = h; dh = h / imgAspect; }
            else                        { dh = w; dw = w * imgAspect; }

            for (let py = 0; py < h; py++) {
                for (let px = 0; px < w; px++) {
                    // Reverse the translate(cw/2,ch/2) + rotate(90°) transform
                    const a = py - h / 2;
                    const b = w / 2 - px;
                    const srcX = Math.floor((a + dw / 2) / dw * imgW);
                    const srcY = Math.floor((b + dh / 2) / dh * imgH);
                    if (srcX >= 0 && srcX < imgW && srcY >= 0 && srcY < imgH) {
                        const oi = (py * w + px) * 4;
                        const si = (srcY * imgW + srcX) * 4;
                        dst[oi]     = src[si];
                        dst[oi + 1] = src[si + 1];
                        dst[oi + 2] = src[si + 2];
                        dst[oi + 3] = src[si + 3];
                    }
                }
            }
        } else {
            // Standard cover
            const containerAspect = w / h;
            let dx, dy, dw, dh;
            if (containerAspect > imgAspect) { dw = w; dh = w / imgAspect; dx = 0; dy = (h - dh) / 2; }
            else                             { dh = h; dw = h * imgAspect; dx = (w - dw) / 2; dy = 0; }

            for (let py = 0; py < h; py++) {
                for (let px = 0; px < w; px++) {
                    const srcX = Math.floor((px - dx) / dw * imgW);
                    const srcY = Math.floor((py - dy) / dh * imgH);
                    if (srcX >= 0 && srcX < imgW && srcY >= 0 && srcY < imgH) {
                        const oi = (py * w + px) * 4;
                        const si = (srcY * imgW + srcX) * 4;
                        dst[oi]     = src[si];
                        dst[oi + 1] = src[si + 1];
                        dst[oi + 2] = src[si + 2];
                        dst[oi + 3] = src[si + 3];
                    }
                }
            }
        }

        return out;
    }

    function resizeSegCanvases() {
        console.log("RESIZING CANVAS")
        const w = heroBg.offsetWidth;
        const h = heroBg.offsetHeight;
        const portrait = w < h;

        const dpr = window.devicePixelRatio || 1;
        currentPortrait = portrait;

        // Overlay canvases: scale by dpr for retina crispness
        canvasA.width = w * dpr;  canvasA.height = h * dpr;
        canvasB.width = w * dpr;  canvasB.height = h * dpr;
        ctxA.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Grain canvas: also dpr-scaled
        grainCanvas.width = w * dpr;
        grainCanvas.height = h * dpr;
        grainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Data canvases: stay at logical resolution for pixel lookups
        segHidden.width = w;
        segHidden.height = h;
        xpolRefCanvas.width = w;
        xpolRefCanvas.height = h;
        ppolCanvas.width = w;
        ppolCanvas.height = h;

        // Rotate the CSS bg-image to match canvas rotation on portrait
        const heroBgImage = heroBg.querySelector('.hero-bg-image');
        if (heroBgImage) {
            if (portrait) {
                heroBgImage.style.width = h + 'px';
                heroBgImage.style.height = w + 'px';
                heroBgImage.style.top = '50%';
                heroBgImage.style.left = '50%';
                heroBgImage.style.transform = 'translate(-50%, -50%) rotate(90deg)';
            } else {
                heroBgImage.style.width = '100%';
                heroBgImage.style.height = '100%';
                heroBgImage.style.top = '0';
                heroBgImage.style.left = '0';
                heroBgImage.style.transform = '';
            }
        }

        // Seg map: manual nearest-neighbor scaling (bypasses Safari drawImage interpolation bug)
        if (nativeSegData) {
            segImageData = buildSegMapData(w, h, portrait);
            segHiddenCtx.putImageData(segImageData, 0, 0);
        } else {
            drawCover(segHiddenCtx, segImg, w, h, portrait);
            segImageData = segHiddenCtx.getImageData(0, 0, w, h);
        }

        // Draw xpol_ref scaled to match
        if (xpolRefLoaded) {
            drawCover(xpolRefCtx, xpolRefImg, w, h, portrait);
        }

        // Draw ppol scaled to match
        if (ppolLoaded) {
            drawCover(ppolCtx, ppolImg, w, h, portrait);
        }

        // Clear caches since dimensions changed
        maskCache = {};
        lastSegColor = null;
        precomputed = false;
        mineralData = {};
        clearGrainOverlay();
        tryPrecompute();
    }

    function getSegPixel(x, y) {
        const w = segHidden.width;
        const i = (Math.floor(y) * w + Math.floor(x)) * 4;
        return {
            r: segImageData.data[i],
            g: segImageData.data[i + 1],
            b: segImageData.data[i + 2],
            a: segImageData.data[i + 3]
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c =>
            c.toString(16).padStart(2, '0').toUpperCase()
        ).join('');
    }

    // Convert RGB (0-255) to HSV-cartesian: [hx, hy, v]
    // Hue and saturation are mapped onto a unit circle: hx = S·cos(H), hy = S·sin(H)
    // hx, hy ∈ [-1, 1], v ∈ [0, 1]
    function rgbToHsvCart(r, g, b) {
        const rf = r / 255;
        const gf = g / 255;
        const bf = b / 255;
        const max = Math.max(rf, gf, bf);
        const min = Math.min(rf, gf, bf);
        const d = max - min;
        const v = max;
        const s = max === 0 ? 0 : d / max;
        let h = 0;
        if (d > 0) {
            if (max === rf) {
                h = ((gf - bf) / d) % 6;
                if (h < 0) h += 6;
            } else if (max === gf) {
                h = (bf - rf) / d + 2;
            } else {
                h = (rf - gf) / d + 4;
            }
            h *= Math.PI / 3; // to radians [0, 2π)
        }
        return [s * Math.cos(h), s * Math.sin(h), v];
    }

    // ========== Mineral mask (existing) ==========

    function buildMask(targetR, targetG, targetB) {
        const w = segHidden.width;
        const h = segHidden.height;
        const mask = document.createElement('canvas');
        mask.width = w;
        mask.height = h;
        const mCtx = mask.getContext('2d');
        const mData = mCtx.createImageData(w, h);
        const src = segImageData.data;

        for (let i = 0; i < src.length; i += 4) {
            if (src[i] === targetR && src[i + 1] === targetG && src[i + 2] === targetB && src[i + 3] > 128) {
                mData.data[i] = 255;
                mData.data[i + 1] = 255;
                mData.data[i + 2] = 255;
                mData.data[i + 3] = 255;
            }
        }

        mCtx.putImageData(mData, 0, 0);
        return mask;
    }

    function drawSegMask(ctx, w, h, maskCanvas) {
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        // Draw source image directly for full dpr resolution (not from 1x xpolRefCanvas)
        drawCover(ctx, xpolRefImg, w, h, currentPortrait);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
    }

    // ========== Grain outline system ==========

    function tryPrecompute() {
        if (precomputed) return;
        if (!segImageData || !xpolRefLoaded || !ppolLoaded) return;
        if (segHidden.width === 0) return;
        // console.log("PRECOMPUTING...")
        xpolImageData = xpolRefCtx.getImageData(0, 0, segHidden.width, segHidden.height);
        ppolImageData = ppolCtx.getImageData(0, 0, segHidden.width, segHidden.height);

        const w = segHidden.width;
        const h = segHidden.height;
        const segData = segImageData.data;
        const xData = xpolImageData.data;
        const pData = ppolImageData.data;

        // First pass: count pixels per mineral
        const counts = {};
        for (let i = 0; i < segData.length; i += 4) {
            if (segData[i + 3] < 128) continue;
            const hex = rgbToHex(segData[i], segData[i + 1], segData[i + 2]);
            if (!labelColours[hex] || labelColours[hex] === 'undefined') continue;
            counts[hex] = (counts[hex] || 0) + 1;
        }

        // Allocate typed arrays per mineral
        const offsets = {};
        for (const hex in counts) {
            const n = counts[hex];
            mineralData[hex] = {
                count: n,
                xs: new Uint16Array(n),
                ys: new Uint16Array(n),
                xpolHx: new Float32Array(n),
                xpolHy: new Float32Array(n),
                xpolV:  new Float32Array(n),
                ppolHx: new Float32Array(n),
                ppolHy: new Float32Array(n),
                ppolV:  new Float32Array(n),
                mean6d: new Float32Array(6)
            };
            offsets[hex] = 0;
        }

        // Second pass: fill arrays + accumulate for mean
        const sums = {};
        const rgbSums = {};
        for (const hex in counts) {
            sums[hex] = new Float64Array(6);
            rgbSums[hex] = new Float64Array(3);
        }

        for (let i = 0; i < segData.length; i += 4) {
            if (segData[i + 3] < 128) continue;
            const hex = rgbToHex(segData[i], segData[i + 1], segData[i + 2]);
            const md = mineralData[hex];
            if (!md) continue;

            const j = offsets[hex]++;
            const pi = i; // pixel index into RGBA data
            const px = (i / 4) % w;
            const py = Math.floor((i / 4) / w);

            md.xs[j] = px;
            md.ys[j] = py;
            const [xhx, xhy, xv] = rgbToHsvCart(xData[pi], xData[pi + 1], xData[pi + 2]);
            const [phx, phy, pv] = rgbToHsvCart(pData[pi], pData[pi + 1], pData[pi + 2]);
            md.xpolHx[j] = xhx;
            md.xpolHy[j] = xhy;
            md.xpolV[j]  = xv;
            md.ppolHx[j] = phx;
            md.ppolHy[j] = phy;
            md.ppolV[j]  = pv;

            sums[hex][0] += xhx;
            sums[hex][1] += xhy;
            sums[hex][2] += xv;
            sums[hex][3] += phx;
            sums[hex][4] += phy;
            sums[hex][5] += pv;

            rgbSums[hex][0] += xData[pi];
            rgbSums[hex][1] += xData[pi + 1];
            rgbSums[hex][2] += xData[pi + 2];

            // Track brightest xpol pixel per mineral
            const lum = 0.299 * xData[pi] + 0.587 * xData[pi + 1] + 0.114 * xData[pi + 2];
            if (!md.brightestLum || lum > md.brightestLum) {
                md.brightestLum = lum;
                md.brightestR = xData[pi];
                md.brightestG = xData[pi + 1];
                md.brightestB = xData[pi + 2];
            }
        }

        // Compute means + average xpol RGB
        let totalPixels = 0;
        for (const hex in mineralData) {
            const md = mineralData[hex];
            const s = sums[hex];
            for (let k = 0; k < 6; k++) md.mean6d[k] = s[k] / md.count;
            const rs = rgbSums[hex];
            const avgR = Math.round(rs[0] / md.count);
            const avgG = Math.round(rs[1] / md.count);
            const avgB = Math.round(rs[2] / md.count);
            md.highlightRgb = `rgb(${md.brightestR},${md.brightestG},${md.brightestB})`;
            md.avgRgb = `rgb(${avgR},${avgG},${avgB})`;

            // Legend color: hue + saturation from avg, value (brightness) from highlight
            const aMax = Math.max(avgR, avgG, avgB);
            const aMin = Math.min(avgR, avgG, avgB);
            const aD = aMax - aMin;
            const aS = aMax === 0 ? 0 : aD / aMax;
            let aH = 0;
            if (aD > 0) {
                if (aMax === avgR) { aH = ((avgG - avgB) / aD) % 6; if (aH < 0) aH += 6; }
                else if (aMax === avgG) aH = (avgB - avgR) / aD + 2;
                else aH = (avgR - avgG) / aD + 4;
            }
            const hlV = Math.max(md.brightestR, md.brightestG, md.brightestB) / 255;
            const c = hlV * aS;
            const x = c * (1 - Math.abs(aH % 2 - 1));
            const m = hlV - c;
            let lr, lg, lb;
            if      (aH < 1) { lr = c; lg = x; lb = 0; }
            else if (aH < 2) { lr = x; lg = c; lb = 0; }
            else if (aH < 3) { lr = 0; lg = c; lb = x; }
            else if (aH < 4) { lr = 0; lg = x; lb = c; }
            else if (aH < 5) { lr = x; lg = 0; lb = c; }
            else              { lr = c; lg = 0; lb = x; }
            md.legendRgb = `rgb(${Math.round((lr + m) * 255)},${Math.round((lg + m) * 255)},${Math.round((lb + m) * 255)})`;

            totalPixels += md.count;
        }

        // Compute percentages
        for (const hex in mineralData) {
            mineralData[hex].pct = mineralData[hex].count / totalPixels;
        }

        precomputed = true;
        buildMineralLegend();
    }

    // ========== Mineral legend (bottom-left of hero) ==========

    const legendContainer = document.getElementById('mineral-legend');
    const legendItems = {}; // hex -> DOM element

    function buildMineralLegend() {
        legendContainer.innerHTML = '';

        // Sort minerals by scarcity (most scarce first = ascending count)
        const sorted = Object.keys(mineralData)
            .filter(hex => labelColours[hex] && labelColours[hex] !== 'undefined')
            .sort((a, b) => mineralData[a].count - mineralData[b].count);

        for (const hex of sorted) {
            const md = mineralData[hex];
            const name = labelColours[hex];
            const pctStr = (md.pct * 100).toFixed(3) + '%';

            const item = document.createElement('span');
            item.className = 'legend-item';
            item.textContent = `${name} ${pctStr}`;
            item.dataset.hex = hex;
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => selectMineral(hex));

            legendContainer.appendChild(item);
            legendItems[hex] = item;
            legendContainer.addEventListener('mousemove', (e) => e.stopPropagation());
        }
    }

    function highlightLegend(activeHex) {
        for (const hex in legendItems) {
            const item = legendItems[hex];
            if (hex === activeHex) {
                // console.log("COLORS: " + mineralData[hex].highlightRgb + ", "  + mineralData[hex].avgRgb)
                // item.style.color = `${(mineralData[hex].highlightRgb + mineralData[hex].avgRgb )/2} !important`;
                item.style.color = mineralData[hex].legendRgb;

                item.classList.add('active');
                item.classList.remove('faded');
            } else {
                item.style.color = '';
                item.classList.remove('active');
                item.classList.add('faded');
            }
        }
    }

    function resetLegend() {
        for (const hex in legendItems) {
            const item = legendItems[hex];
            item.style.color = '';
            item.classList.remove('active', 'faded');
        }
    }

    // Find the nearest 9 same-mineral pixels in a neighborhood around cursor
    function sampleCursorColor(hex, cx, cy) {
        const w = segHidden.width;
        const h = segHidden.height;
        const segData = segImageData.data;
        const xData = xpolImageData.data;
        const pData = ppolImageData.data;
        const candidates = [];
        // Numeric RGB comparison instead of rgbToHex string allocation per pixel
        const tr = parseInt(hex.slice(1, 3), 16);
        const tg = parseInt(hex.slice(3, 5), 16);
        const tb = parseInt(hex.slice(5, 7), 16);

        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const pi = (ny * w + nx) * 4;
                if (segData[pi + 3] < 128) continue;
                if (segData[pi] !== tr || segData[pi + 1] !== tg || segData[pi + 2] !== tb) continue;
                candidates.push({ dist: dx * dx + dy * dy, pi });
            }
        }

        candidates.sort((a, b) => a.dist - b.dist);
        const top = candidates.slice(0, 9);
        if (top.length === 0) return null;

        const cc = new Float32Array(6);
        for (const c of top) {
            const [xhx, xhy, xv] = rgbToHsvCart(xData[c.pi], xData[c.pi + 1], xData[c.pi + 2]);
            const [phx, phy, pv] = rgbToHsvCart(pData[c.pi], pData[c.pi + 1], pData[c.pi + 2]);
            cc[0] += xhx;
            cc[1] += xhy;
            cc[2] += xv;
            cc[3] += phx;
            cc[4] += phy;
            cc[5] += pv;
        }
        for (let k = 0; k < 6; k++) cc[k] /= top.length;
        return cc;
    }

    // Find grain pixels: all mineral pixels within threshold in 8D (6 color + 2 spatial)
    function findGrain(hex, cx, cy) {
        const md = mineralData[hex];
        // console.log("MD: ", md)

        if (!md) return null;

        let cc = sampleCursorColor(hex, cx, cy);
        // console.log("CURSOR COLOUR: ", cc)

        if (!cc) return null;

        // console.log("FINDING GRAIN")
        const n = md.count;
        const cScaleSq = GRAIN_COLOR_SCALE * GRAIN_COLOR_SCALE;
        const sScaleSq = GRAIN_SPATIAL_SCALE * GRAIN_SPATIAL_SCALE;
        const threshSq = GRAIN_THRESHOLD * GRAIN_THRESHOLD;
        const grainIndices = [];

        for (let j = 0; j < n; j++) {
            // Color distance (6D HSV-cartesian) — early exit if color alone exceeds threshold
            const d0 = md.xpolHx[j] - cc[0];
            const d1 = md.xpolHy[j] - cc[1];
            const d2 = md.xpolV[j]  - cc[2];
            const d3 = md.ppolHx[j] - cc[3];
            const d4 = md.ppolHy[j] - cc[4];
            const d5 = md.ppolV[j]  - cc[5];
            const colorDistSq = (d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4 + d5 * d5) / cScaleSq;
            if (colorDistSq > threshSq) continue;

            // Spatial distance (2D)
            const dx = md.xs[j] - cx;
            const dy = md.ys[j] - cy;
            const spatialDistSq = (dx * dx + dy * dy) / sScaleSq;

            // Combined distance (weighted sum of squares)
            const combinedSq = 0.8 * colorDistSq + 0.2 * spatialDistSq;
            if (combinedSq < threshSq) {
                grainIndices.push(j);
            }
        }

        return grainIndices;
    }

    // Compute outline 2px outside the grain edge via two outward expansion steps.
    // Uses a Uint8Array over the bounding box instead of Sets for faster lookups.
    function computeGrainBoundary(grainIndices, hex) {
        const md = mineralData[hex];
        const w = segHidden.width;
        const h = segHidden.height;

        // Bounding box of grain + 2px padding for shells
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const j of grainIndices) {
            const x = md.xs[j], y = md.ys[j];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        minX = Math.max(0, minX - 2);
        maxX = Math.min(w - 1, maxX + 2);
        minY = Math.max(0, minY - 2);
        maxY = Math.min(h - 1, maxY + 2);
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;

        // 0=empty, 1=grain, 2=shell1, 3=shell2
        const grid = new Uint8Array(bw * bh);

        for (const j of grainIndices) {
            grid[(md.ys[j] - minY) * bw + (md.xs[j] - minX)] = 1;
        }

        // Shell 1: empty pixels 4-adjacent to grain
        for (const j of grainIndices) {
            const x = md.xs[j] - minX;
            const y = md.ys[j] - minY;
            const idx = y * bw + x;
            if (x > 0     && grid[idx - 1]  === 0) grid[idx - 1]  = 2;
            if (x < bw - 1 && grid[idx + 1]  === 0) grid[idx + 1]  = 2;
            if (y > 0      && grid[idx - bw] === 0) grid[idx - bw] = 2;
            if (y < bh - 1 && grid[idx + bw] === 0) grid[idx + bw] = 2;
        }

        // Shell 2: empty pixels 4-adjacent to shell1
        const boundary = [];
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] !== 2) continue;
            const x = i % bw;
            const y = (i - x) / bw;
            if (x > 0      && grid[i - 1]  === 0) { grid[i - 1]  = 3; boundary.push(x - 1 + minX, y + minY); }
            if (x < bw - 1 && grid[i + 1]  === 0) { grid[i + 1]  = 3; boundary.push(x + 1 + minX, y + minY); }
            if (y > 0      && grid[i - bw] === 0) { grid[i - bw] = 3; boundary.push(x + minX, y - 1 + minY); }
            if (y < bh - 1 && grid[i + bw] === 0) { grid[i + bw] = 3; boundary.push(x + minX, y + 1 + minY); }
        }

        return boundary;
    }

    function computeGrainCentroid(grainIndices, hex) {
        const md = mineralData[hex];
        let sx = 0, sy = 0;
        for (const j of grainIndices) {
            sx += md.xs[j];
            sy += md.ys[j];
        }
        return { x: sx / grainIndices.length, y: sy / grainIndices.length };
    }

    function clearGrainOverlay() {
        // console.log("CLEAR GRAIN OVERLAY")
        grainAnimId++;
        grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
        lastGrainHex = null;
        lastGrainCx = -999;
        lastGrainCy = -999;
        cachedBoundary = null;
        cachedCentroid = null;
        cachedMineral = null;
    }

    function selectMineral(hex) {
        if (selectedMineralHex === hex) {
            deselectMineral();
            return;
        }
        selectedMineralHex = hex;
        grainAnimId++;
        transitioning = false;
        clearTimeout(transitionTimer);

        // Show xpol_ref reveal for entire mineral
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        if (!maskCache[hex]) {
            maskCache[hex] = buildMask(r, g, b);
        }
        const w = heroBg.offsetWidth;
        const h = heroBg.offsetHeight;
        drawSegMask(back.ctx, w, h, maskCache[hex]);
        back.canvas.style.opacity = '1';
        front.canvas.style.opacity = '0';
        const tmp = front;
        front = back;
        back = tmp;
        lastSegColor = hex;

        // Compute + cache full-segment boundary
        const md = mineralData[hex];
        if (!md.fullBoundary) {
            const allIndices = new Array(md.count);
            for (let j = 0; j < md.count; j++) allIndices[j] = j;
            md.fullBoundary = computeGrainBoundary(allIndices, hex);
        }

        // Draw outline of entire segment
        grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
        grainCtx.shadowColor = '#000000';
        grainCtx.shadowBlur = 0;
        grainCtx.shadowOffsetX = 1;
        grainCtx.shadowOffsetY = 1;
        grainCtx.fillStyle = '#FFFFFF';
        grainCtx.beginPath();
        for (let i = 0; i < md.fullBoundary.length; i += 2) {
            grainCtx.rect(md.fullBoundary[i], md.fullBoundary[i + 1], 1, 1);
        }
        grainCtx.fill();
        grainCtx.shadowColor = 'transparent';

        highlightLegend(hex);
    }

    function deselectMineral() {
        selectedMineralHex = null;
        clearSegOverlay();
    }

    function updateGrainOverlay(hex, cx, cy, mineral) {
        const dx = cx - lastGrainCx;
        const dy = cy - lastGrainCy;
        const movedSq = dx * dx + dy * dy;

        // Only recompute grain if cursor moved >3px or mineral changed
        if (hex === lastGrainHex && movedSq <= 9) return;

        lastGrainHex = hex;
        lastGrainCx = cx;
        lastGrainCy = cy;
        lastMoveTime = performance.now();

        const grainIndices = findGrain(hex, cx, cy);
        if (!grainIndices || grainIndices.length < 5) {
            // console.log("GRAIN INDICES: ", grainIndices)
            clearGrainOverlay();
            lastGrainHex = hex; // keep tracking mineral even if no grain found
            return;
        }

        cachedBoundary = computeGrainBoundary(grainIndices, hex);
        const newCentroid = computeGrainCentroid(grainIndices, hex);
        cachedCentroid = newCentroid;
        cachedMineral = mineral;

        // Start/restart animation loop
        const animId = ++grainAnimId;
        requestAnimationFrame(function frame() {
            if (animId !== grainAnimId) return;
            drawGrainFrame();
            // Keep running until idle + typewriter finished
            const now = performance.now();
            const idleStart = lastMoveTime + IDLE_DELAY;
            const isIdle = now >= idleStart;
            const typewriterDone = isIdle && (now - idleStart) >= 200 + cachedMineral.length * 40 + 200;
            if (!typewriterDone) {
                requestAnimationFrame(frame);
            }
        });
    }

    function drawGrainFrame() {
        const w = grainCanvas.width;
        const h = grainCanvas.height;
        grainCtx.clearRect(0, 0, w, h);

        if (!cachedBoundary || !cachedCentroid || !cachedMineral) return;

        grainCtx.shadowColor = '#000000';
        grainCtx.shadowBlur = 0;
        grainCtx.shadowOffsetX = 1;
        grainCtx.shadowOffsetY = 1;
        grainCtx.fillStyle = '#FFFFFF';
        grainCtx.beginPath();
        for (let i = 0; i < cachedBoundary.length; i+=2) {
            const bx = cachedBoundary[i];
            const by = cachedBoundary[i + 1];
            grainCtx.rect(bx, by, 1, 1);

            // if ((bx + by) % 2 === 0) {
            //     grainCtx.rect(bx, by, 2, 2);
            // }
        }
        grainCtx.fill();
        grainCtx.shadowColor = '#000000';

        // Only show leader line + label after cursor stops moving
        const now = performance.now();
        const idleStart = lastMoveTime + IDLE_DELAY;
        if (now < idleStart) return;

        // Leader line toward viewport center, starting from boundary edge
        const rect = heroBg.getBoundingClientRect();
        const viewCenterX = (window.innerWidth / 2) - rect.left;
        const viewCenterY = (window.innerHeight / 2) - rect.top;

        const ldx = viewCenterX - cachedCentroid.x;
        const ldy = viewCenterY - cachedCentroid.y;
        const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
        if (ldist < 1) return;

        const dirX = ldx / ldist;
        const dirY = ldy / ldist;

        // Find boundary pixel farthest along the direction toward viewport center
        let bestDot = -Infinity;
        let edgeX = cachedCentroid.x;
        let edgeY = cachedCentroid.y;
        for (let i = 0; i < cachedBoundary.length; i += 2) {
            const bx = cachedBoundary[i];
            const by = cachedBoundary[i + 1];
            const dot = (bx - cachedCentroid.x) * dirX + (by - cachedCentroid.y) * dirY;
            if (dot > bestDot) {
                bestDot = dot;
                edgeX = bx;
                edgeY = by;
            }
        }

        const lineLen = 48;
        const elapsed = now - idleStart;
        const LINE_ANIM_MS = 200;
        const lineProgress = Math.min(1, elapsed / LINE_ANIM_MS);

        // Animate line extending from edge toward label
        const curLen = lineLen * lineProgress;
        const curEndX = edgeX + dirX * curLen;
        const curEndY = edgeY + dirY * curLen;

        grainCtx.strokeStyle = '#FFFFFF';
        grainCtx.lineWidth = 2;
        grainCtx.setLineDash([3, 3]);
        grainCtx.beginPath();
        grainCtx.moveTo(Math.round(edgeX), Math.round(edgeY));
        grainCtx.lineTo(Math.round(curEndX), Math.round(curEndY));
        grainCtx.stroke();
        grainCtx.setLineDash([]);

        // Typewriter label (starts after line finishes extending)
        if (lineProgress < 1) return;
        const endX = curEndX;
        const endY = curEndY;
        const textElapsed = elapsed - LINE_ANIM_MS;
        const charsToShow = Math.min(cachedMineral.length, Math.floor(textElapsed / 20));
        if (charsToShow <= 0) return;

        const displayText = cachedMineral.substring(0, charsToShow);
        const textX = Math.round(endX + dirX * 10);
        const textY = Math.round(endY + dirY * 10);

        grainCtx.font = '14px "Geist Mono", monospace';
        grainCtx.letterSpacing='-0.05em';
        grainCtx.textAlign = dirX > 0 ? 'left' : 'right';
        grainCtx.textBaseline = 'middle';

        grainCtx.shadowColor = '#000000';
        grainCtx.shadowBlur = 0;
        grainCtx.shadowOffsetX = 2;
        grainCtx.shadowOffsetY = 2;
        grainCtx.fillStyle = '#FFFFFF';
        grainCtx.fillText(displayText, textX, textY);
        grainCtx.shadowColor = 'transparent';
    }

    // ========== Overlay clear + hover handler ==========

    function clearSegOverlay() {
        lastSegColor = null;
        front.canvas.style.opacity = '0';
        back.canvas.style.opacity = '0';
        segLabel.style.opacity = '0';
        // console.log("CLEAR SEG OVERLAY")
        clearGrainOverlay();
        resetLegend();
    }

    function handleSegMove(x, y) {
        // if (selectedMineralHex) return;

        const px = Math.floor(x);
        const py = Math.floor(y);

        lastMouseX = x;
        lastMouseY = y;

        const color = getSegPixel(px, py);

        if (color.a < 128) {
            // console.log("COLOR: ", color)
            clearSegOverlay(); 
            return; 
    
        }
        const hex = rgbToHex(color.r, color.g, color.b);
        const mineral = labelColours[hex];
        if (!mineral || mineral === 'undefined') { 
            // console.log("MINERAL: ", mineral)
            clearSegOverlay(); 
            return; 
        }

        highlightLegend(hex);

        // Grain outline (runs on every cursor move, independent of mineral transition)
        if (precomputed && mineralData[hex]) {
            segLabel.style.opacity = '0'; // grain system handles the label
            updateGrainOverlay(hex, px, py, mineral);
        } else {
            // Fallback: position label near cursor
            segLabel.textContent = mineral;
            segLabel.style.opacity = '1';
            let lx = px + 20;
            let ly = py - 12;
            if (lx + 160 > segHidden.width) lx = px - 170;
            if (ly < 0) ly = py + 24;
            segLabel.style.left = lx + 'px';
            segLabel.style.top = ly + 'px';
        }

        if (!segImageData || !labelColours || transitioning) return;

        if (px < 0 || py < 0 || px >= segHidden.width || py >= segHidden.height) {
            clearSegOverlay();
            return;
        }

        // Only recompute mineral mask when hovering a new segment color
        if (hex === lastSegColor) return;
        lastSegColor = hex;

        if (!maskCache[hex]) {
            maskCache[hex] = buildMask(color.r, color.g, color.b);
        }

        // Draw new mask on the back canvas, then crossfade
        const w = heroBg.offsetWidth;
        const h = heroBg.offsetHeight;
        drawSegMask(back.ctx, w, h, maskCache[hex]);

        back.canvas.style.opacity = '1';   // fade in new
        front.canvas.style.opacity = '0';  // fade out old

        // Lock out new segment changes during transition
        transitioning = true;
        clearTimeout(transitionTimer);
        transitionTimer = setTimeout(() => {
            transitioning = false;
            handleSegMove(lastMouseX, lastMouseY);
        }, 250);

        // Swap front and back
        const tmp = front;
        front = back;
        back = tmp;
    }

    // Mouse and touch event listeners
    heroBg.addEventListener('mousemove', (e) => {
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        const rect = heroBg.getBoundingClientRect();
        handleSegMove(e.clientX - rect.left, e.clientY - rect.top);
    });

    // Re-evaluate on scroll so the label follows while scrolling
    window.addEventListener('scroll', () => {
        if (selectedMineralHex) return;
        const rect = heroBg.getBoundingClientRect();
        const x = lastClientX - rect.left;
        const y = lastClientY - rect.top;
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
            clearSegOverlay();
        } else {
            handleSegMove(x, y);
        }
    });

    heroBg.addEventListener('mouseleave', () => {
        if (!selectedMineralHex) clearSegOverlay();
    });

    heroBg.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = heroBg.getBoundingClientRect();
        handleSegMove(touch.clientX - rect.left, touch.clientY - rect.top);
    });

    heroBg.addEventListener('touchend', clearSegOverlay);

    // Click on hero (outside legend) deselects the selected mineral
    heroBg.addEventListener('click', (e) => {
        if (e.target.closest('#mineral-legend')) return;
        if (selectedMineralHex) deselectMineral();
    });
});
