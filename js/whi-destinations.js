/**
 * WHI Destinations Listing — Client-side interactivity
 * Handles: region tab filtering, URL parameter reading, static map interaction
 */
(function() {
    'use strict';

    // ==========================================
    // Region Tab Filtering
    // ==========================================
    var tabs = document.querySelectorAll('.region-tab');
    var regionSections = document.querySelectorAll('.region-section');

    function activateTab(region) {
        tabs.forEach(function(t) {
            t.classList.remove('active', 'bg-primary', 'text-white');
            t.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        });

        // Find and activate the matching tab
        var matchedTab = null;
        tabs.forEach(function(t) {
            if (t.getAttribute('data-region') === region) {
                matchedTab = t;
            }
        });

        if (matchedTab) {
            matchedTab.classList.add('active', 'bg-primary', 'text-white');
            matchedTab.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
        }

        // Filter sections
        if (region === 'all') {
            regionSections.forEach(function(s) { s.classList.remove('hidden'); });
        } else {
            regionSections.forEach(function(s) {
                if (s.getAttribute('data-region') === region) {
                    s.classList.remove('hidden');
                } else {
                    s.classList.add('hidden');
                }
            });
        }

        // Highlight map region
        highlightMapRegion(region);
    }

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var region = tab.getAttribute('data-region');
            activateTab(region);
        });
    });

    // ==========================================
    // Read URL parameter on load
    // ==========================================
    var urlParams = new URLSearchParams(window.location.search);
    var regionParam = urlParams.get('region');

    if (regionParam) {
        // Map homepage region slugs to destinations page region slugs
        var regionMap = {
            'wild-atlantic-way': 'wild-atlantic-way',
            'ancient-east': 'irelands-ancient-east',
            'irelands-ancient-east': 'irelands-ancient-east',
            'hidden-heartlands': 'irelands-ancient-east',
            'northern-ireland': 'northern-ireland'
        };
        var mapped = regionMap[regionParam] || regionParam;
        activateTab(mapped);

        // Scroll to the region tabs
        var tabsEl = document.getElementById('region-tabs');
        if (tabsEl) {
            setTimeout(function() {
                tabsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }

    // ==========================================
    // Static Map Region Highlighting
    // ==========================================
    function highlightMapRegion(region) {
        var regions = ['wild-atlantic-way', 'irelands-ancient-east', 'northern-ireland'];
        regions.forEach(function(r) {
            var el = document.getElementById('map-region-' + r);
            if (el) {
                if (region === 'all' || region === r) {
                    el.style.opacity = '1';
                    el.style.filter = 'none';
                } else {
                    el.style.opacity = '0.3';
                    el.style.filter = 'grayscale(50%)';
                }
            }
        });
    }

    // Make map regions clickable
    var mapRegions = document.querySelectorAll('.map-region');
    mapRegions.forEach(function(el) {
        el.addEventListener('click', function() {
            var region = el.getAttribute('data-region');
            activateTab(region);
        });
        el.style.cursor = 'pointer';
    });

})();
