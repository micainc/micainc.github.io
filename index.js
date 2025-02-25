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









    // Create an array to track loaded images
    const imageLoadTracker = {
        hero: false,
        samples: false,
        team: false
    };

    // 1. Preload hero images first with high priority
    const heroImageUrls = [
        './public/imgs/w3_2_composite.jpg',
        './public/imgs/w3_2_aligned_cp_1.jpg',
        './public/imgs/w3_2_aligned_cp_2.jpg',
        './public/imgs/w3_2_aligned_cp_3.jpg',
        './public/imgs/w3_2_aligned_cp_4.jpg'
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
    const sampleImageUrls = [
        './public/imgs/9b_2_lin.jpg',
        './public/imgs/9b_2_composite.jpg',
        './public/imgs/9b_2_texture.jpg',
        './public/imgs/9b_2_segmentation_map.png'
    ];
    
    // Add loading indicators to sample container
    const samplesContainer = document.getElementById('samples-container');
    if (samplesContainer) {
        samplesContainer.innerHTML += '<div id="samples-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);padding:15px;border-radius:5px;color:white;">Loading samples...</div>';
    }

    // 3. Add lazy loading to team profile images
    document.querySelectorAll('.profile img').forEach(img => {
        img.setAttribute('loading', 'lazy');
        
        // Store original src and set a placeholder
        const originalSrc = img.getAttribute('src');
        img.setAttribute('data-src', originalSrc);
        img.setAttribute('src', 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E');
    });

    // Now start the loading sequence
    Promise.all(heroPreloads)
        .then(() => {
            console.log('Hero images loaded successfully');
            imageLoadTracker.hero = true;
            
            // Now load sample images
            const samplesLoading = document.getElementById('samples-loading');
            
            // Create image objects to preload sample images
            const samplePreloads = sampleImageUrls.map(url => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => resolve(url);
                    img.onerror = () => reject(url);
                });
            });
            
            return Promise.all(samplePreloads);
        })
        .then(() => {
            console.log('Sample images loaded successfully');
            imageLoadTracker.samples = true;
            
            // Hide the loading indicator
            const samplesLoading = document.getElementById('samples-loading');
            if (samplesLoading) samplesLoading.style.display = 'none';
            
            // Now initialize the sample container layout
            // This is your existing updateLayout function
            updateLayout();
            
            // Start loading team images
            document.querySelectorAll('.profile img').forEach(img => {
                const originalSrc = img.getAttribute('data-src');
                if (originalSrc) {
                    img.setAttribute('src', originalSrc);
                }
            });
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
            updateLayout();
        });





    
    const navbar = document.getElementById('navbar');
    const logo = document.getElementById('logo');
    const icon = document.getElementById('icon');

    const heroSection = document.querySelector('.hero');
    const heroImages = document.querySelectorAll('.hero-image');
    const totalImages = heroImages.length - 1;
    const hero = document.getElementById('hero')
    const heroFov = document.getElementById('hero-fov')

    const heroWidth = hero.offsetWidth; // note: when window size changes, these need to update
    const heroHeight = hero.offsetHeight;
    const heroFovRadius = heroFov.offsetWidth/2;


    navbar.style.opacity = '1';
    // always show base 'composite' image
    heroImages[0].style.display = 'block';
    heroImages[0].style.opacity = '1';

    function updateOpacities(offsetX, offsetY, distance) {
        var angle = 180 * Math.atan2(offsetY, offsetX) / Math.PI  // to degrees
    
        // Update image visibility
        heroImages.forEach((image, index) => {
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
                    var opacity = distance/heroFovRadius * (1 - getAngularDistance(angle, peakAngles[index]) / 90); 
                    image.style.opacity = Math.max(0, Math.min(1, opacity));
                }
            }
        });
    }

    
    hero.addEventListener('mouseleave', () => {
        heroImages.forEach((image, index) => {
            if(index === 0) return;
            image.style.transition = 'opacity 0.5s';
            image.style.opacity = 0;
        });
     });
     
     hero.addEventListener('mouseenter', () => {
        setTimeout(() => {
            heroImages.forEach((image, index) => {
                if(index === 0) return;
                image.style.transition = 'opacity 0s';
            })
        }, 500)
     });

         // Function to handle touch position
    function handleTouch(e) {
        const touch = e.touches[0];
        // Convert touch coordinates to relative position within hero
        const rect = hero.getBoundingClientRect();
        const offsetX = touch.clientX - rect.left - heroWidth/2;
        const offsetY = touch.clientY - rect.top - heroHeight/2;
        const distance = (offsetX**2 + offsetY**2)**0.5;

        updateOpacities(offsetX, offsetY, distance);
    }

    // Add touch events
    hero.addEventListener('touchstart', handleTouch);
    hero.addEventListener('touchmove', handleTouch);


    hero.addEventListener('mousemove', (e) => {
        // find x, y distance from CENTER of hero  to mouse position
        var offsetX = e.offsetX - heroWidth/2;
        var offsetY = e.offsetY - heroHeight/2;

        var distance = (offsetX**2 + offsetY**2)**0.5
        updateOpacities(offsetX, offsetY, distance);
    });





    

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
            navbar.style.backdropFilter= 'blur(16px)';
            navbar.style.backgroundColor= '#00000040';     

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
    const sampleImages = samplesSection.querySelectorAll('img');
    const numImages = sampleImages.length;
    const imgWidth = sampleImages[0].naturalWidth
    let windowWidth = (samplesSection.clientWidth/numImages);
    let widthScaleFactor = samplesSection.clientWidth/imgWidth
    
    // console.log("WINDOW WIDTH: ",  windowWidth);
    console.log("NATURAL WIDTH: ",  imgWidth);
    console.log("SCALE: ", widthScaleFactor)
    console.log("SAMPLES SECTION WIDTH: ", samplesSection.clientWidth);
    console.log(samplesSection);
    console.log(sampleImages);

    function updateLayout() {
        windowWidth = samplesSection.clientWidth/numImages
        console.log("WINDOW WIDTH: ", windowWidth)
        widthScaleFactor = samplesSection.clientWidth/imgWidth
        
        console.log("UPDATING LAYOUT")
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

    window.addEventListener('resize', updateLayout);
    samplesSection.addEventListener('mouseover', handleHover);
    samplesSection.addEventListener('mouseleave', updateLayout);
    // updateLayout();

});


// let matrixInterval; // Store interval ID globally
// let resizeTimeout;

// function initMatrix() {

//     if (matrixInterval) {
//         clearInterval(matrixInterval);
//     }

//     const matrix = document.querySelector('.hero-matrix');
//     matrix.style.fontSize = '36px';
//     matrix.style.visibility = 'visible';

//     const testSpan = document.createElement('span');
//     testSpan.style.cssText = `
//     position: absolute;
//     top: 0;
//     left: 0;
//     font-family: "Roboto Mono", monospace;
//     font-weight: bolder;
//     font-size: 36px;

//     `;

//     //background-color: red;  // Makes it visible for testing
//     //color: black;


//     testSpan.textContent = "█";
//     document.body.appendChild(testSpan);
//     const charWidth = testSpan.getBoundingClientRect().width;
//     console.log("CHAR WIDTH: ", charWidth)
//     document.body.removeChild(testSpan);

//     matrix.style.lineHeight = charWidth + 'px';

//     console.log('Matrix width:', matrix.offsetWidth);
//     console.log('Characters per row:', Math.floor(matrix.offsetWidth / charWidth));
//     console.log('Actual width used:', Math.floor(matrix.offsetWidth / charWidth) * charWidth);

//     const width = Math.ceil(matrix.offsetWidth / charWidth); // use 'ceil' to go one character over the max visible width
//     const height = Math.ceil(matrix.offsetHeight / charWidth) + 1;
//     console.log("WIDTH: ", width)
//     console.log("HEIGHT: ", height)






//     // Define character transitions (each char can become the ones adjacent to it in this array)
//     //const charSequence = ['\u00A0', '\u00A0', '.', '·', ':', '▪', '▄', '▀', '■', '█', '█'];
//     // const charSequence = ['\u00A0', '\u00A0', '.', '·', ':', '▪', '▄', '▀', '■', '■',];

//     // const charSequence = ['\u00A0', '·', '▪', '▄', '▀', '■', '█'];
//     // const charSequence = ['\u00A0', '\u00A0', '·', '▪', '▄', '▀', '■', '█', '█'];
//     const charSequence = ['\u00A0', '\u00A0', '·', '▪', '■', '■']; // 

//     const charLevels = new Map(charSequence.map((char, i) => [char, i]));
//     const maxLevel = charSequence.length - 1;

//     // Create typed arrays for better performance
//     let currentGrid = new Uint8Array(width * height);
//     let newGrid = new Uint8Array(width * height);
    
//     // Initialize with random values
//     function initializeState() {
//         currentGrid.fill(0);
//         matrix.textContent = gridToString(currentGrid);
//     }

//     // Convert grid indices to display string
//     function gridToString(grid) {
//         let result = '';
//         for(let i = 0; i < height; i++) {
//             for(let j = 0; j < width; j++) {
//                 result += charSequence[grid[i * width + j]];
//             }
//             result += '\n';
//         }
//         return result;
//     }

        
//     // Convert state string to 2D array for easier neighbor checking
//     function stateToGrid(state) {
//         return state.split('\n').filter(line => line.length > 0)
//             .map(line => line.split(''));
//     }




//     // Track mouse position relative to matrix
//     let mouseRow = -1;
//     let mouseCol = -1;

//     matrix.addEventListener('mousemove', (e) => {
//         const rect = matrix.getBoundingClientRect();
//         mouseCol = Math.floor((e.clientX - rect.left) / charWidth);
//         mouseRow = Math.floor((e.clientY - rect.top) / charWidth);
//     });

//     matrix.addEventListener('mouseleave', () => {
//         mouseRow = -1;
//         mouseCol = -1;
//     });

        

//     // Optimized neighbor checking
//     function updateCell(row, col) {
//         const idx = row * width + col;
//         const currLvl = currentGrid[idx];

//         // If this is the cell under cursor, increase its level
//         if (row === mouseRow && col === mouseCol && currLvl < maxLevel) {
//             newGrid[idx] = currLvl + 1;
//             return;
//         }
        
//         if(Math.random()<0.875) {
//             newGrid[idx] = currLvl;
//             return;
//         }

//         const verticalPosition = row / (height - 1);

//         // Get neighbor levels
//         let sum = currLvl;
//         let count = 1;
        
//         // Up
//         if(row > 0) {
//             sum += currentGrid[idx - width];
//             count++;
//         }
//         // Down
//         if(row < height - 1) {
//             sum += currentGrid[idx + width];
//             count++;
//         }
//         // Left
//         if(col > 0) {
//             sum += currentGrid[idx - 1];
//             count++;
//         }
//         // Right
//         if(col < width - 1) {
//             sum += currentGrid[idx + 1];
//             count++;
//         }

//         const avgLevel = sum / count;
    
//         // Combine vertical position with neighbor average
//         const bias = verticalPosition - 0.5; // -1 at top, 0 at middle, 1 at bottom
//         const influence = avgLevel + (Math.random() * 2 - 1) + bias/2;
        
//         if(influence > currLvl && currLvl < maxLevel) {
//             newGrid[idx] = currLvl + 1;
//         } else if(influence < currLvl && currLvl > 0) {
//             newGrid[idx] = currLvl - 1;
//         } else {
//             newGrid[idx] = currLvl;
//         }


//         // // Calculate new level
//         // const avgLevel = Math.round(sum / count + (Math.random() * 2 - 1));
//         // if(avgLevel > currLvl && currLvl < maxLevel) {
//         //     newGrid[idx] = currLvl + 1;
//         // } else if(avgLevel < currLvl && currLvl > 0) {
//         //     newGrid[idx] = currLvl - 1;
//         // } else {
//         //     newGrid[idx] = currLvl;
//         // }
//     }

//     function updateMatrix() {
//         // Update all cells
//         for(let i = 0; i < height; i++) {
//             for(let j = 0; j < width; j++) {
//                 updateCell(i, j);
//             }
//         }
        
//         // Swap grids and update display
//         [currentGrid, newGrid] = [newGrid, currentGrid];
//         matrix.textContent = gridToString(currentGrid);
//     }

//     initializeState();
//     matrixInterval = setInterval(updateMatrix, 50);
// }
  
// document.addEventListener('DOMContentLoaded', initMatrix);

// // Check if device is desktop (not touch-based)
// const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// // Only add resize listener if on desktop
// if (isDesktop) {
//     window.addEventListener('resize', () => {
//         const matrix = document.querySelector('.hero-matrix');
//         matrix.style.visibility = 'hidden';

//         clearTimeout(resizeTimeout);
//         resizeTimeout = setTimeout(() => {
//             initMatrix();
//         }, 250);
//     });
// }