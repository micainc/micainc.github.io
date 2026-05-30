
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