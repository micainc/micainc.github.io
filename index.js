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
            navbar.style.backdropFilter= 'blur(16px)';

            navbar.style.backgroundColor= '#00000040';     
            navbar.style.outline = '2px solid #FFFFFF';

        } else {
            navbar.style.backdropFilter= 'none';
            navbar.style.backgroundColor= '#00000000';
            navbar.style.outline = '0px solid #101030';

        }
    }

    // Initial check
    updateNavbar();

    // Add scroll event listener
    window.addEventListener('scroll', updateNavbar);

});