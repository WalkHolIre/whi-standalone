/**
 * Walking Holiday Ireland - Mobile Navigation Handler
 * Manages hamburger menu toggle and mobile menu interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get hamburger button and mobile menu
    const hamburgerBtn = document.getElementById('hamburger-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    // Exit if elements don't exist
    if (!hamburgerBtn || !mobileMenu) {
        return;
    }

    // Toggle menu on hamburger click
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        mobileMenu.classList.toggle('active');
        hamburgerBtn.classList.toggle('active');
    });

    // Close menu when clicking on a link
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
        });
    });

    // Close menu when clicking outside of it
    document.addEventListener('click', function(e) {
        if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            if (mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                hamburgerBtn.classList.remove('active');
            }
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
        }
    });

    // Hamburger animation (transform to X when active)
    const style = document.createElement('style');
    style.textContent = `
        .hamburger span {
            transition: all 0.3s ease;
        }

        .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(10px, 10px);
        }

        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(5px, -5px);
        }
    `;
    document.head.appendChild(style);
});
