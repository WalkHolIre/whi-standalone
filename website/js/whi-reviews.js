/**
 * WHI Reviews — Client-side interactivity
 * Handles: carousel navigation, filters, pagination, expand/collapse
 */
(function() {
    'use strict';

    // ==========================================
    // Reviews Page: Filters & Pagination
    // ==========================================
    const REVIEWS_PER_PAGE = 12;
    let visibleCount = REVIEWS_PER_PAGE;

    function initReviewsPage() {
        const grid = document.getElementById('reviews-grid');
        if (!grid) return;

        const cards = Array.from(grid.querySelectorAll('.review-card'));
        const filterTour = document.getElementById('filter-tour');
        const filterDest = document.getElementById('filter-destination');
        const filterRating = document.getElementById('filter-rating');
        const filterReset = document.getElementById('filter-reset');
        const filterCount = document.getElementById('filter-count');
        const loadMoreBtn = document.getElementById('load-more-btn');
        const loadMoreContainer = document.getElementById('load-more-container');

        function applyFilters() {
            const tourVal = filterTour ? filterTour.value : 'all';
            const destVal = filterDest ? filterDest.value : 'all';
            const ratingVal = filterRating ? filterRating.value : 'all';

            let shown = 0;
            let total = 0;

            cards.forEach(function(card) {
                const cardTour = card.getAttribute('data-tour') || '';
                const cardDest = card.getAttribute('data-dest') || '';
                const cardRating = parseInt(card.getAttribute('data-rating') || '5');

                let matches = true;
                if (tourVal !== 'all' && cardTour !== tourVal) matches = false;
                if (destVal !== 'all' && cardDest !== destVal) matches = false;
                if (ratingVal !== 'all') {
                    var minRating = parseInt(ratingVal);
                    if (cardRating < minRating) matches = false;
                }

                if (matches) {
                    total++;
                    if (total <= visibleCount) {
                        card.classList.remove('hidden');
                        shown++;
                    } else {
                        card.classList.add('hidden');
                    }
                } else {
                    card.classList.add('hidden');
                }
            });

            // Update count text
            if (filterCount) {
                var isFiltered = tourVal !== 'all' || destVal !== 'all' || ratingVal !== 'all';
                if (isFiltered) {
                    filterCount.textContent = 'Showing ' + shown + ' of ' + total + ' matching reviews';
                    filterCount.classList.remove('hidden');
                } else {
                    filterCount.textContent = 'Showing ' + shown + ' of ' + cards.length + ' reviews';
                    filterCount.classList.remove('hidden');
                }
            }

            // Show/hide reset button
            if (filterReset) {
                var hasFilter = tourVal !== 'all' || destVal !== 'all' || ratingVal !== 'all';
                filterReset.classList.toggle('hidden', !hasFilter);
            }

            // Show/hide load more
            if (loadMoreContainer) {
                loadMoreContainer.classList.toggle('hidden', shown >= total);
            }
        }

        // Bind filter events
        if (filterTour) filterTour.addEventListener('change', function() { visibleCount = REVIEWS_PER_PAGE; applyFilters(); });
        if (filterDest) filterDest.addEventListener('change', function() { visibleCount = REVIEWS_PER_PAGE; applyFilters(); });
        if (filterRating) filterRating.addEventListener('change', function() { visibleCount = REVIEWS_PER_PAGE; applyFilters(); });

        if (filterReset) {
            filterReset.addEventListener('click', function() {
                if (filterTour) filterTour.value = 'all';
                if (filterDest) filterDest.value = 'all';
                if (filterRating) filterRating.value = 'all';
                visibleCount = REVIEWS_PER_PAGE;
                applyFilters();
            });
        }

        // Load more
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', function() {
                visibleCount += REVIEWS_PER_PAGE;
                applyFilters();
            });
        }

        // Initial render
        applyFilters();
    }

    // ==========================================
    // Carousel: Navigation & Auto-advance
    // ==========================================
    function initCarousels() {
        var carousels = document.querySelectorAll('.review-carousel');

        carousels.forEach(function(carousel) {
            var track = carousel.querySelector('.carousel-track');
            var prevBtn = carousel.querySelector('.carousel-prev');
            var nextBtn = carousel.querySelector('.carousel-next');
            var dots = carousel.querySelectorAll('.carousel-dot');
            var autoAdvance = parseInt(carousel.getAttribute('data-auto-advance') || '0');

            if (!track) return;

            var cards = track.querySelectorAll('.review-card');
            if (cards.length === 0) return;

            var currentPage = 0;
            var cardsPerPage = getCardsPerPage();
            var totalPages = Math.ceil(cards.length / cardsPerPage);
            var autoTimer = null;

            function getCardsPerPage() {
                if (window.innerWidth >= 1024) return 3;
                if (window.innerWidth >= 768) return 2;
                return 1;
            }

            function scrollToPage(page) {
                if (page < 0) page = totalPages - 1;
                if (page >= totalPages) page = 0;
                currentPage = page;

                var cardWidth = cards[0].offsetWidth;
                var gap = 24; // gap-6 = 1.5rem = 24px
                var scrollPos = page * cardsPerPage * (cardWidth + gap);
                track.scrollTo({ left: scrollPos, behavior: 'smooth' });

                // Update dots
                dots.forEach(function(dot, i) {
                    if (i === currentPage) {
                        dot.classList.remove('bg-slate-300');
                        dot.classList.add('bg-primary');
                    } else {
                        dot.classList.remove('bg-primary');
                        dot.classList.add('bg-slate-300');
                    }
                });
            }

            // Navigation buttons
            if (prevBtn) prevBtn.addEventListener('click', function() {
                scrollToPage(currentPage - 1);
                resetAutoAdvance();
            });
            if (nextBtn) nextBtn.addEventListener('click', function() {
                scrollToPage(currentPage + 1);
                resetAutoAdvance();
            });

            // Dot navigation
            dots.forEach(function(dot) {
                dot.addEventListener('click', function() {
                    var page = parseInt(dot.getAttribute('data-page') || '0');
                    scrollToPage(page);
                    resetAutoAdvance();
                });
            });

            // Auto-advance
            function startAutoAdvance() {
                if (autoAdvance > 0 && totalPages > 1) {
                    autoTimer = setInterval(function() {
                        scrollToPage(currentPage + 1);
                    }, autoAdvance);
                }
            }

            function resetAutoAdvance() {
                if (autoTimer) clearInterval(autoTimer);
                startAutoAdvance();
            }

            // Pause on hover
            carousel.addEventListener('mouseenter', function() {
                if (autoTimer) clearInterval(autoTimer);
            });
            carousel.addEventListener('mouseleave', function() {
                startAutoAdvance();
            });

            // Pause on keyboard focus (accessibility)
            carousel.addEventListener('focusin', function() {
                if (autoTimer) clearInterval(autoTimer);
            });
            carousel.addEventListener('focusout', function() {
                startAutoAdvance();
            });

            // Handle resize (debounced)
            var resizeTimer = null;
            window.addEventListener('resize', function() {
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    var newPerPage = getCardsPerPage();
                    if (newPerPage !== cardsPerPage) {
                        cardsPerPage = newPerPage;
                        totalPages = Math.ceil(cards.length / cardsPerPage);
                        if (currentPage >= totalPages) currentPage = 0;
                        scrollToPage(currentPage);
                    }
                }, 150);
            });

            // ARIA attributes for accessibility
            carousel.setAttribute('tabindex', '0');
            carousel.setAttribute('role', 'region');
            carousel.setAttribute('aria-label', 'Customer reviews carousel');
            carousel.setAttribute('aria-roledescription', 'carousel');
            if (prevBtn) {
                prevBtn.setAttribute('aria-label', 'Previous reviews');
            }
            if (nextBtn) {
                nextBtn.setAttribute('aria-label', 'Next reviews');
            }
            dots.forEach(function(dot, i) {
                dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
            });

            // Keyboard navigation
            carousel.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft') { scrollToPage(currentPage - 1); resetAutoAdvance(); e.preventDefault(); }
                if (e.key === 'ArrowRight') { scrollToPage(currentPage + 1); resetAutoAdvance(); e.preventDefault(); }
            });

            startAutoAdvance();
        });
    }

    // ==========================================
    // Init on DOM ready
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initReviewsPage();
            initCarousels();
        });
    } else {
        initReviewsPage();
        initCarousels();
    }
})();
