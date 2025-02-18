// Add this helper function at the start
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