function getAngularDistance(angle1, angle2) {
    let diff = Math.abs(angle1 - angle2);
    return Math.min(diff, 360 - diff);
}

// In your mousemove handler, modify the opacity calculation:
const peakAngles = {
    1: -135,  // top-left
    2: -45,    // top-right
    3: 45,   // bottom-left
    4: 135   // bottom-right
};



document.addEventListener('DOMContentLoaded', () => {

    // Scroll reveal — animate .reveal elements when they enter viewport
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    revealElements.forEach(el => revealObserver.observe(el));


    // ===== About-section mineral grains =====
    generateGrains();
    let grainResizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(grainResizeTimer);
        grainResizeTimer = setTimeout(generateGrains, 200);
    });









    // Create an array to track loaded images
    const imageLoadTracker = {
        hero: false,
        samples: false,
        team: false
    };

    // 1. Preload hero images first with high priority
    const heroImageUrls = [
        '/imgs/w3_2_composite.jpg',
        '/imgs/w3_2_aligned_cp_1.jpg',
        '/imgs/w3_2_aligned_cp_2.jpg',
        '/imgs/w3_2_aligned_cp_3.jpg',
        '/imgs/w3_2_aligned_cp_4.jpg',
        // '/imgs/9B_ppol.jpg',
        '/imgs/9B_xpol_ref.jpg',
    ];
    
    // Create image objects to preload hero images
    const heroPreloads = heroImageUrls.map(url => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(url);
            img.onerror = () => reject(url);
        });
    });

    // 2. Load sample images after hero images
    // const sampleImageUrls = [
    //     '/imgs/9b_2_old_lin.jpg',
    //     '/imgs/9b_2_old_composite.jpg',
    //     '/imgs/9b_2_old_texture.jpg',
    //     '/imgs/9b_2_old_segmentation_map.png'
    // ];
    

    // Native lazy loading for team profile images
    document.querySelectorAll('.profile img').forEach(img => {
        img.setAttribute('loading', 'lazy');
    });

    // Now start the loading sequence
    Promise.all(heroPreloads)
        // .then(() => {
        //     console.log('Hero images loaded successfully');
        //     imageLoadTracker.hero = true;
            
        //     // Now load sample images
        //     const samplesLoading = document.getElementById('samples-loading');
            
        //     // Create image objects to preload sample images
        //     const samplePreloads = sampleImageUrls.map(url => {
        //         return new Promise((resolve, reject) => {
        //             const img = new Image();
        //             img.src = url;
        //             img.onload = () => resolve(url);
        //             img.onerror = () => reject(url);
        //         });
        //     });
            
        //     return Promise.all(samplePreloads);
        // })
        .then(() => {
            console.log('Sample images loaded successfully');
            imageLoadTracker.samples = true;
            
            updateSlideLayout();
        })
        .catch(errorUrl => {
            console.error('Failed to load image:', errorUrl);
            // Handle failed image loading - provide fallbacks
            
            // If hero images fail, still try to load samples
            if (!imageLoadTracker.hero) {
                imageLoadTracker.hero = true; // Mark as attempted
                // Try to load sample images anyway
                const samplesLoading = document.getElementById('samples-loading');
                if (samplesLoading) samplesLoading.innerHTML = 'Loading samples (fallback)...';
                
                // Load sample images
                const sampleElements = document.querySelectorAll('#samples-container img');
                sampleElements.forEach(img => {
                    img.style.opacity = '1';
                });
            }
            
            // Ensure error doesn't prevent other functionality
            updateSlideLayout();
        });



    
    const navbar = document.getElementById('navbar');
    const logo = document.getElementById('logo');
    const icon = document.getElementById('icon');

    const cardGraphicImages = document.querySelectorAll('.card-graphic-image');
    const totalImages = cardGraphicImages.length - 1;
    const cardGraphic = document.getElementById('card-graphic')
    const cardGraphicFov = document.getElementById('card-graphic-fov')

    const cardGraphicWidth = cardGraphic.offsetWidth; // note: when window size changes, these need to update
    const cardGraphicHeight = cardGraphic.offsetHeight;
    const cardGraphicFovRadius = cardGraphicFov.offsetWidth/2;


    navbar.style.opacity = '1';
    // always show base 'composite' image
    cardGraphicImages[0].style.display = 'block';
    cardGraphicImages[0].style.opacity = '1';

    function updateOpacities(offsetX, offsetY, distance) {
        var angle = 180 * Math.atan2(offsetY, offsetX) / Math.PI  // to degrees

        // Update image visibility
        cardGraphicImages.forEach((image, index) => {
            if(index === 0) {
                // always show base 'composite' image

                return
            } else {
                // opacity should be a function of the distance from the center AND the proximity to the cardinal angle for a given image
                var angularDistance = getAngularDistance(angle, peakAngles[index])
                if(angularDistance > 90) {
                    image.style.display = 'none';
                } else {
                    image.style.display = 'block';
                    var opacity = distance/cardGraphicFovRadius * (1 - getAngularDistance(angle, peakAngles[index]) / 90);
                    image.style.opacity = Math.max(0, Math.min(1, opacity));
                }
            }
        });
    }

    
    cardGraphic.addEventListener('mouseleave', () => {
        cardGraphicImages.forEach((image, index) => {
            if(index === 0) return;
            image.style.transition = 'opacity 0.5s';
            image.style.opacity = 0;
        });
     });

     cardGraphic.addEventListener('mouseenter', () => {
        setTimeout(() => {
            cardGraphicImages.forEach((image, index) => {
                if(index === 0) return;
                image.style.transition = 'opacity 0s';
            })
        }, 500)
     });

         // Function to handle touch position
    function handleTouch(e) {
        const touch = e.touches[0];
        // Convert touch coordinates to relative position within microscope
        const rect = cardGraphic.getBoundingClientRect();
        const offsetX = touch.clientX - rect.left - cardGraphicWidth/2;
        const offsetY = touch.clientY - rect.top - cardGraphicHeight/2;
        const distance = (offsetX**2 + offsetY**2)**0.5;

        updateOpacities(offsetX, offsetY, distance);
    }

    // Add touch events
    cardGraphic.addEventListener('touchstart', handleTouch);
    cardGraphic.addEventListener('touchmove', handleTouch);


    cardGraphic.addEventListener('mousemove', (e) => {
        // find x, y distance from CENTER of microscope to mouse position
        var offsetX = e.offsetX - cardGraphicWidth/2;
        var offsetY = e.offsetY - cardGraphicHeight/2;

        var distance = (offsetX**2 + offsetY**2)**0.5
        updateOpacities(offsetX, offsetY, distance);
    });










    // ===== Hero Background (9B) interactive effect =====
    // Vertical position controls which image is shown:
    //   0-20%: ppol_texture (index 0, base — always visible)
    //  20-40%: ppol (index 1)
    //  40-60%: xpol (index 2)
    //  60-80%: xpol_texture (index 3)
    //  80-100%: ref (index 4)
    // const heroBg = document.getElementById('hero-bg');
    // const heroBgImages = heroBg.querySelectorAll('.hero-bg-image');

    // // always show base image
    // heroBgImages[0].style.display = 'block';
    // heroBgImages[0].style.opacity = '1';

    // function updateHeroBgOpacities(t) {
    //     // t is 0 at top, 1 at bottom
    //     // Each overlay i (1-4) has its center at (0.2*i + 0.1)
    //     // and crossfades over a 0.2 band
    //     heroBgImages.forEach((image, index) => {
    //         if(index === 0) return;
    //         var center = 0.2 * index + 0.1;
    //         var opacity = Math.max(0, 1 - Math.abs(t - center) / 0.2);
    //         image.style.display = opacity > 0 ? 'block' : 'none';
    //         image.style.opacity = opacity;
    //     });
    // }

    // heroBg.addEventListener('mouseleave', () => {
    //     heroBgImages.forEach((image, index) => {
    //         if(index === 0) return;
    //         image.style.transition = 'opacity 0.5s';
    //         image.style.opacity = 0;
    //     });
    // });

    // heroBg.addEventListener('mouseenter', () => {
    //     setTimeout(() => {
    //         heroBgImages.forEach((image, index) => {
    //             if(index === 0) return;
    //             image.style.transition = 'opacity 0s';
    //         });
    //     }, 500);
    // });

    // heroBg.addEventListener('mousemove', (e) => {
    //     const rect = heroBg.getBoundingClientRect();
    //     var t = (e.clientY - rect.top) / rect.height;
    //     t = Math.max(0, Math.min(1, t));
    //     updateHeroBgOpacities(t);
    // });

    // function handleHeroBgTouch(e) {
    //     const touch = e.touches[0];
    //     const rect = heroBg.getBoundingClientRect();
    //     var t = (touch.clientY - rect.top) / rect.height;
    //     t = Math.max(0, Math.min(1, t));
    //     updateHeroBgOpacities(t);
    // }

    // heroBg.addEventListener('touchstart', handleHeroBgTouch);
    // heroBg.addEventListener('touchmove', handleHeroBgTouch);















    // hamburger menu
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.navbar-links');
    const links = document.querySelectorAll('.navbar-links a');


    function toggleMenu() {
        navLinks.classList.toggle('active');
        hamburger.style.zIndex = hamburger.style.zIndex === 5? 0 : 5;
        logo.style.zIndex = logo.style.zIndex === 5? 0 : 5;
        icon.style.zIndex = icon.style.zIndex === 5? 0 : 5;

    }

    // Close menu when a link is clicked
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            
            // The smooth scroll behavior we added earlier will handle the scrolling
        });
    });

    hamburger.addEventListener('click', toggleMenu);






    // navbar detect section overlap
    const sections = document.querySelector('#sections');
    const navbarHeight = navbar.offsetHeight;

    function updateNavbar() {
        const sectionsRect = sections.getBoundingClientRect();
        
        if (sectionsRect.top <= navbarHeight) { // first section overlaps navbar: 
            navbar.style.outline = '2px solid #FFFFFF';
            // navbar.style.backdropFilter= 'blur(16px)';
            navbar.style.backgroundColor= '#000000';     

        } else {
            navbar.style.outline = '0px solid #FFFFFF';
            navbar.style.backdropFilter= 'none';
            navbar.style.backgroundColor= '#00000000';
        }
    }

    // Initial check
    updateNavbar();

    // Add scroll event listener
    window.addEventListener('scroll', updateNavbar);





    

    let samplesSection = document.getElementById('samples-container');
    const sampleImages = samplesSection ? samplesSection.querySelectorAll('img') : [];
    const numImages = sampleImages.length;
    let imgWidth = numImages > 0 ? sampleImages[0].naturalWidth : 1;
    let windowWidth = samplesSection ? (samplesSection.clientWidth/numImages) : 0;
    let widthScaleFactor = samplesSection ? samplesSection.clientWidth/imgWidth : 1;
    
    // console.log("WINDOW WIDTH: ",  windowWidth);
    // console.log("NATURAL WIDTH: ",  imgWidth);
    // console.log("SCALE: ", widthScaleFactor)
    // console.log("SAMPLES SECTION WIDTH: ", samplesSection.clientWidth);
    // console.log(samplesSection);
    // console.log(sampleImages);

    function updateSlideLayout() {
        if (!samplesSection || numImages === 0) return;
        imgWidth = sampleImages[0].naturalWidth
        windowWidth = samplesSection.clientWidth/numImages
        widthScaleFactor = samplesSection.clientWidth/imgWidth

        let initPos = samplesSection.offsetLeft;
        sampleImages.forEach(image => {
            image.style.transformOrigin = 'top left';
            image.style.transform = `scale(${widthScaleFactor})`;

            image.style.width = `${windowWidth/widthScaleFactor}px`;
            image.style.height = `${512/widthScaleFactor}px`;

            image.style.left = `${initPos}px`;
            image.style.objectFit = `none`;
            image.style.objectPosition = `${samplesSection.offsetLeft/widthScaleFactor-initPos/widthScaleFactor}px 0px`;
            initPos += windowWidth;
    
        })
    }

    function handleHover(e) {
        const hoveredImg = e.target.closest('img');
        if (!hoveredImg) return;
        samplesSection = document.getElementById('samples-container');
        if (!samplesSection) return;

        const initImgWidth = samplesSection.clientWidth/numImages;
        const widthScaleFactor = samplesSection.clientWidth/imgWidth

        const hoveredImgWidth = initImgWidth*2;
        const ignoredImgWidth = (samplesSection.clientWidth - initImgWidth) / numImages;

        let initPos = samplesSection.offsetLeft;
        sampleImages.forEach(image => {
            if(image === hoveredImg) {
                image.style.width = `${hoveredImgWidth/widthScaleFactor}px`;
                image.style.height = `${512/widthScaleFactor}px`;

                image.style.left = `${initPos}px`;
                image.style.objectPosition = `${samplesSection.offsetLeft/widthScaleFactor-initPos/widthScaleFactor}px 0px`;
                initPos += hoveredImgWidth;

            } else {
                image.style.width = `${ignoredImgWidth/widthScaleFactor}px`;
                image.style.height = `${512/widthScaleFactor}px`;

                image.style.left = `${initPos}px`;
                image.style.objectPosition = `${samplesSection.offsetLeft/widthScaleFactor-initPos/widthScaleFactor}px 0px`;    
                initPos += ignoredImgWidth;
            }

        })
    }

    window.addEventListener('resize', updateSlideLayout);
    if (samplesSection) {
        samplesSection.addEventListener('mouseover', handleHover);
        samplesSection.addEventListener('mouseleave', updateSlideLayout);
    }

    // Add this after your existing event listeners
    function setupTouchEvents() {
        const samplesContainer = document.getElementById('samples-container');
        if (!samplesContainer) return;
        let currentTouchedImage = null;

        // Handle touch detection throughout the samples section
        samplesContainer.addEventListener('touchmove', function(e) {
            // Get the touch position
            const touch = e.touches[0];
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Find which image is under the touch position
            let imageUnderTouch = null;
            sampleImages.forEach(image => {
                const rect = image.getBoundingClientRect();
                if (touchX >= rect.left && touchX <= rect.right && 
                    touchY >= rect.top && touchY <= rect.bottom) {
                    imageUnderTouch = image;
                }
            });
            
            // If we found an image under the touch and it's different from the current one
            if (imageUnderTouch && imageUnderTouch !== currentTouchedImage) {
                // Apply hover effect to the new image
                const touchEvent = {
                    target: {
                        closest: function() { return imageUnderTouch; }
                    }
                };
                
                // Call the same handler used for mouse hover
                handleHover(touchEvent);
                currentTouchedImage = imageUnderTouch;
            }
        }, { passive: true });
        
        // Initial touch still triggers hover
        sampleImages.forEach(image => {
            image.addEventListener('touchstart', function(e) {
                const touchEvent = {
                    target: {
                        closest: function() { return image; }
                    }
                };
                handleHover(touchEvent);
                currentTouchedImage = image;
                
            }, { passive: false });
        });
    }

    // Call this function to set up touch events
    setupTouchEvents();

});


// ===== About-section mineral grains generator =====
// Each grain is rendered in its own local coordinate frame: the polygon is built
// centered at (0,0), then the whole grain group is translated to its grid cell
// via the SVG `transform` attribute. To move a grain anywhere, just change its
// `transform="translate(cx,cy)"`.
//
// Shape primitive: superellipse  (|x/rx|^n + |y/ry|^n)^(1/n) = 1.
//   n=2 → ellipse, n=4 → soft rectangle, n=8+ → nearly flat-sided rectangle.
// Each grain is the superellipse multiplied by a small bounded radial wobble
// (1 + w·cos(k·θ + φ)) with w < 1 — keeps r > 0 always (no spider artefacts).
const GRAIN_FRAME_SIZE = 96;
// Scale used to convert viewBox² area into a realistic µm² label.
// 1 viewBox unit ≈ √UM2_PER_VB2 µm. At 25, that's 5 µm/vb → typical plag
// reads as ~40,000–90,000 µm² (medium grain, realistic for thin section).
const UM2_PER_VB2 = 25;

function generateGrains() {
    const svg = document.querySelector('.grains-svg');
    const about = document.getElementById('about')
    if (!svg) return;

    // Use sibling text block's height as the available vertical space so the
    // grain grid renders at the same height as the text it sits next to.
    // (svg.clientHeight is unreliable before viewBox is set.)
    const textEl = document.querySelector('.about-text');
    const availW = svg.clientWidth || (svg.parentElement ? svg.parentElement.clientWidth / 2 : 600);
    const availH = about.clientWidth < 1024 ? 128 : textEl.clientHeight;

    const cols = Math.max(1, Math.floor(availW / GRAIN_FRAME_SIZE));
    const rows = Math.max(1, Math.floor(availH / GRAIN_FRAME_SIZE));
    const totalGrains = cols * rows;

    // Mineral classes.
    //   radiusRange: base radius. Effective extent ≈ radius * √aspect on the
    //     major axis. Pick to stay within GRAIN_FRAME_SIZE/2.
    //   aspect:      [min, max] ellipse aspect ratio (1 = circular).
    //   exponent:    superellipse exponent. 2 = ellipse, 4 = rounded rect,
    //                8+ = almost-flat-sided rectangle.
    //   wobbles:     { amp, freq, offset } perturbation bundle. Each field
    //                may be a fixed value OR a [min, max] range rolled per
    //                grain. amp must stay < 1 to avoid radius going negative.
    //                  amp:    bump strength (float).
    //                  freq:   bump count around perimeter (integer).
    //                  offset: phase in radians; defaults to [0, 2π].
    //   samples:     polygon vertex count around the outline.
    //   fabric:      'twinning' | null (extend later for cleavage modes).
    const minerals = {
        // Plagioclase feldspar: tabular lath with straight crystal edges.
        plagioclase: {
            color: '#4A90E2', weight: 0.38,
            radiusRange: [24, 32],
            aspect: [1.0, 3.0],
            exponent: 4,
            wobbles: { amp: [0.03, 0.06], freq: [5, 9] },
            samples: 16,
            fabric: 'twinning',
            fill: 'none', stroke: 2,
        },
        // Biotite: high-aspect flake, slightly softer outline than plag.
        biotite: {
            color: '#C84B3E', weight: 0.24,
            radiusRange: [12, 20],
            aspect: [1, 3],
            exponent: 3,
            wobbles: { amp: [0.04, 0.08], freq: [4, 7] },
            samples: 16,
            fabric: null,
            fill: 'none', stroke: 2,
        },
        // Hornblende: prismatic, similar tabular outline to plag.
        hornblende: {
            color: '#3FA86A', weight: 0.24,
            radiusRange: [12, 20],
            aspect: [1, 2],
            exponent: 4,
            wobbles: { amp: [0.03, 0.07], freq: [5, 9] },
            samples: 16,
            // Diagnostic 56°/124° crossing cleavage of amphiboles.
            fabric: 'cleavage-amphibole',
            fill: 'none', stroke: 2,
        },
        // Native gold: opaque nugget. Soft ellipse + heavy bounded wobble.
        //   amp + freq + offset all variable → each grain looks unique.
        gold: {
            color: '#E0B43A', weight: 0.14,
            radiusRange: [4, 8],
            aspect: [1.0, 4],
            exponent: 2.5,
            wobbles: { amp: [0.08, 0.20], freq: [2, 5] },
            samples: 32,
            fabric: null,
            fill: '#E0B43A', stroke: 2,
        },
    };

    // Build grain list
    const grains = [];
    Object.entries(minerals).forEach(([name, cfg]) => {
        const count = Math.max(1, Math.round(totalGrains * cfg.weight));
        for (let i = 0; i < count; i++) {
            const radius = lerp(cfg.radiusRange[0], cfg.radiusRange[1], Math.random());
            grains.push({ type: name, cfg, radius });
        }
    });

    // Sort by radius descending, then trim to exactly fill the grid.
    grains.sort((a, b) => b.radius - a.radius);
    grains.length = Math.min(grains.length, totalGrains);

    // Grid placement: each grain centered in its GRAIN_FRAME_SIZE cell.
    // Largest -> top-left, smallest -> bottom-right.
    grains.forEach((g, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        g.cx = col * GRAIN_FRAME_SIZE + GRAIN_FRAME_SIZE / 2;
        g.cy = row * GRAIN_FRAME_SIZE + GRAIN_FRAME_SIZE / 2;
    });

    // Render
    svg.setAttribute('viewBox', `0 0 ${cols * GRAIN_FRAME_SIZE} ${rows * GRAIN_FRAME_SIZE}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    let defs = '';
    let body = '';
    grains.forEach((g, idx) => {
        const { points, rotation, majorRadius } = generateGrainPolygon(g.radius, g.cfg);
        const polyStr = points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        const delay = idx * 50;
        const fillAttr = g.cfg.fill === 'none' ? 'transparent' : g.cfg.fill;

        let bodyMarkup = `<polygon points="${polyStr}" fill="${fillAttr}" stroke="${g.cfg.color}" stroke-width="${g.cfg.stroke}" stroke-linejoin="round"/>`;

        let fabricAngle = null;
        if (g.cfg.fabric) {
            const clipId = `grain-clip-${idx}`;
            defs += `<clipPath id="${clipId}"><polygon points="${polyStr}"/></clipPath>`;
            const fab = generateFabric(majorRadius, g.cfg.fabric, g.cfg.color);
            bodyMarkup += `<g clip-path="url(#${clipId})">${fab.markup}</g>`;
            fabricAngle = fab.angle;
        }

        // Labels at top-left of the frame cell. Grain is translated to cell
        // center, so frame top-left in local coords is (-FRAME/2, -FRAME/2).
        // Default state shows just the index; on :hover the full 3-line info
        // fades in (handled in CSS via .grain-index / .grain-label).
        const areaUm2 = polygonArea(points) * UM2_PER_VB2;
        const halfFrame = GRAIN_FRAME_SIZE / 2;
        const labelLines = [g.type, `${areaUm2.toFixed(0)} µm²`];
        if (fabricAngle != null) labelLines.push(`${(fabricAngle * 180 / Math.PI).toFixed(0)}°`);
        const lx = -halfFrame + 2;
        const ly = -halfFrame + 8;
        const tspans = labelLines.map((line, i) =>
            `<tspan x="${lx}" dy="${i === 0 ? 0 : 9}">${line}</tspan>`
        ).join('');
        const indexMarkup = `<text class="grain-index" x="${lx}" y="${ly}" font-size="10" fill="${g.cfg.color}" font-family="monospace">${idx + 1}</text>`;
        const labelMarkup = `<text class="grain-label" x="${lx}" y="${ly}" font-size="10" fill="${g.cfg.color}" font-family="monospace">${tspans}</text>`;

        // Invisible rect covering the full frame cell — the actual hover
        // target so :hover triggers anywhere in the frame, not just over the
        // polygon. pointer-events="all" catches even though fill is transparent.
        const hoverRect = `<rect class="grain-hit" x="${-halfFrame}" y="${-halfFrame}" width="${GRAIN_FRAME_SIZE}" height="${GRAIN_FRAME_SIZE}" fill="transparent" pointer-events="all"/>`;

        // .grain-body wraps polygon + fabric so CSS can scale it independently
        // of the cell translate and the labels.
        body += `<g class="grain" transform="translate(${g.cx},${g.cy})" style="transition-delay:${delay}ms">${hoverRect}<g class="grain-body">${bodyMarkup}</g>${indexMarkup}${labelMarkup}</g>`;
    });
    console.log("FLAG")
    svg.innerHTML = `<defs>${defs}</defs>${body}`;
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Resolves a config value that may be a fixed number OR a [min, max] range.
//   pickRange(0.5)         → 0.5
//   pickRange([0.1, 0.3])  → random float in [0.1, 0.3]
//   pickRange([3, 8], true)→ random integer in [3, 8]
function pickRange(v, asInt = false) {
    if (!Array.isArray(v)) return v;
    if (asInt) return v[0] + Math.floor(Math.random() * (v[1] - v[0] + 1));
    return lerp(v[0], v[1], Math.random());
}

// Generates a grain outline in local coordinates centered at (0,0).
// Returns the points, the rotation used (for fabric alignment), and the
// major-axis half-length (for fabric span).
function generateGrainPolygon(radius, cfg) {
    const aspect = lerp(cfg.aspect[0], cfg.aspect[1], Math.random());
    const rx = radius * Math.sqrt(aspect);
    const ry = radius / Math.sqrt(aspect);
    const n = cfg.exponent;
    const rotation = Math.random() * Math.PI;

    // Wobble bundle: amp / freq / offset each may be fixed or a [min, max]
    // range. amp must stay < 1 so the radius never goes negative.
    const w = cfg.wobbles || {};
    const wAmp = pickRange(w.amp ?? 0);
    const wFreq = pickRange(w.freq ?? 0, true);
    const wPhase = pickRange(w.offset ?? [0, Math.PI * 2]);

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    const samples = cfg.samples;
    const points = [];
    for (let i = 0; i < samples; i++) {
        const t = (i / samples) * Math.PI * 2;
        const cosT = Math.cos(t);
        const sinT = Math.sin(t);
        // Superellipse radius at this angle
        const base = Math.pow(
            Math.pow(Math.abs(cosT) / rx, n) + Math.pow(Math.abs(sinT) / ry, n),
            -1 / n
        );
        // Bounded wobble: 1 + w·cos(...) stays strictly positive for w < 1
        const r = base * (1 + wAmp * Math.cos(wFreq * t + wPhase));
        // Sample in local (unrotated) frame, then rotate
        const lx = r * cosT;
        const ly = r * sinT;
        points.push([lx * cosR - ly * sinR, lx * sinR + ly * cosR]);
    }
    return { points, rotation, majorRadius: rx };
}

// One set of parallel lines stepping perpendicular to `angle`, drawn in
// local coords centered at (0,0). Lines extend past the grain so the
// clipPath at render time crops them cleanly.
function parallelLines(radius, angle, color, strokeWidth, spacing) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const span = radius * 1.6;
    const lineLen = span * 2.4;
    const steps = Math.ceil(span / spacing) + 1;
    let lines = '';
    for (let i = -steps; i <= steps; i++) {
        const ox = i * spacing * cosA;
        const oy = i * spacing * sinA;
        const x1 = ox - sinA * lineLen;
        const y1 = oy + cosA * lineLen;
        const x2 = ox + sinA * lineLen;
        const y2 = oy - cosA * lineLen;
        lines += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
    return lines;
}

// Fabric dispatcher. Returns { markup, angle } where markup is the inner
// <line> SVG (clipped by the grain polygon at render time) and angle is
// the primary fabric orientation in radians — exposed so the grain label
// can display it. angle is null for fabricless minerals.
function generateFabric(radius, mode, color) {
    if (mode === 'twinning') {
        // Polysynthetic albite twinning — fine, tightly-spaced lines.
        const angle = Math.random() * Math.PI;
        const markup = parallelLines(radius, angle, color, 1.5, Math.max(3, radius / 3));
        return { markup, angle };
    }
    if (mode === 'cleavage-amphibole') {
        // Diagnostic 56°/124° crossing cleavage of amphiboles (basal section).
        const base = Math.random() * Math.PI;
        const half = 28 * Math.PI / 180;
        const sp = Math.max(4, radius / 3);
        const markup = parallelLines(radius, base - half, color, 1, sp)
                     + parallelLines(radius, base + half, color, 1, sp);
        return { markup, angle: base };
    }
    return { markup: '', angle: null };
}

// Shoelace formula — signed polygon area, absolute-valued.
function polygonArea(points) {
    let a = 0;
    for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
}

// Min/max bounding box of a list of [x, y] points.
function polygonBounds(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
}

