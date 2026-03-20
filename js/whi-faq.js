/**
 * Walking Holiday Ireland — FAQ Interactivity
 * Handles search filtering, section tabs, deep-linking, and accordion enhancements
 */
(function() {
    'use strict';

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================

    const searchInput = document.getElementById('faq-search');
    const searchClear = document.getElementById('faq-search-clear');
    const searchResults = document.getElementById('faq-search-results');
    const tabContainer = document.getElementById('faq-tabs');
    const faqContent = document.getElementById('faq-content');

    // Early exit if not on FAQ page
    if (!faqContent) return;

    const allSections = faqContent.querySelectorAll('.faq-section');
    const allItems = faqContent.querySelectorAll('details');
    const allTabs = tabContainer ? tabContainer.querySelectorAll('.faq-tab') : [];

    // ============================================================================
    // SEARCH FUNCTIONALITY
    // ============================================================================

    let searchTimeout;

    /**
     * Performs search filtering across FAQ items
     * @param {string} query - The search query
     */
    function performSearch(query) {
        query = query.toLowerCase().trim();

        // Reset state if search is empty
        if (!query) {
            allItems.forEach(item => item.classList.remove('hidden'));
            allSections.forEach(section => section.classList.remove('hidden'));
            if (searchResults) {
                searchResults.classList.add('hidden');
                searchResults.textContent = '';
            }
            if (searchClear) searchClear.classList.add('hidden');
            return;
        }

        // Show clear button
        if (searchClear) searchClear.classList.remove('hidden');

        // Reset tab selection to "All" during search
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.section === 'all') tab.classList.add('active');
        });

        let matchCount = 0;

        // Filter FAQ items by matching question and answer attributes
        allItems.forEach(item => {
            const questionText = (item.dataset.question || '').toLowerCase();
            const answerText = (item.dataset.answer || '').toLowerCase();
            const matches = questionText.includes(query) || answerText.includes(query);

            item.classList.toggle('hidden', !matches);
            if (matches) matchCount++;
        });

        // Hide sections if all their items are hidden
        allSections.forEach(section => {
            const visibleItems = section.querySelectorAll('details:not(.hidden)');
            section.classList.toggle('hidden', visibleItems.length === 0);
        });

        // Update results text
        if (searchResults) {
            searchResults.classList.remove('hidden');
            if (matchCount === 0) {
                searchResults.textContent = `No results found for "${query}"`;
            } else {
                const pluralS = matchCount !== 1 ? 's' : '';
                searchResults.textContent = `Showing ${matchCount} result${pluralS} for "${query}"`;
            }
        }
    }

    /**
     * Debounced search input handler
     */
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => performSearch(this.value), 200);
        });

        /**
         * Escape key clears search
         */
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                performSearch('');
                this.blur();
            }
        });
    }

    /**
     * Clear button handler
     */
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            performSearch('');
            if (searchInput) searchInput.focus();
        });
    }

    // ============================================================================
    // SECTION TAB FILTERING
    // ============================================================================

    if (tabContainer) {
        tabContainer.addEventListener('click', function(e) {
            const tab = e.target.closest('.faq-tab');
            if (!tab) return;

            const section = tab.dataset.section;

            // Clear active search
            if (searchInput) searchInput.value = '';
            if (searchResults) {
                searchResults.classList.add('hidden');
                searchResults.textContent = '';
            }
            if (searchClear) searchClear.classList.add('hidden');

            // Update active tab styling
            allTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide sections based on selection
            if (section === 'all') {
                // Show all items and sections
                allItems.forEach(item => item.classList.remove('hidden'));
                allSections.forEach(s => s.classList.remove('hidden'));
            } else {
                // Show only matching section, hide others
                allSections.forEach(s => {
                    const isMatch = s.dataset.section === section;
                    s.classList.toggle('hidden', !isMatch);
                });
                // Ensure all items within visible sections are shown
                allItems.forEach(item => item.classList.remove('hidden'));
            }

            // Scroll to first visible section with smooth behavior
            const firstVisible = faqContent.querySelector('.faq-section:not(.hidden)');
            if (firstVisible) {
                firstVisible.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // Update URL hash for deep-linking
            const newHash = section === 'all' ? window.location.pathname : '#' + section;
            history.replaceState(null, '', newHash);
        });
    }

    // ============================================================================
    // DEEP-LINK SUPPORT
    // ============================================================================

    /**
     * Handles URL hash changes and activates corresponding section
     */
    function handleHash() {
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;

        // Find and click the matching tab
        const matchingTab = tabContainer?.querySelector(`.faq-tab[data-section="${hash}"]`);
        if (matchingTab) {
            matchingTab.click();
        }
    }

    // Handle hash on initial page load
    handleHash();

    // Handle hash changes (browser back/forward)
    window.addEventListener('hashchange', handleHash);

})();
