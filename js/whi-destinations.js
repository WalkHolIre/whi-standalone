/**
 * WHI Destinations Listing — Client-side interactivity
 * Handles: region tab filtering, interactive Leaflet map
 */
(function() {
    'use strict';

    // ==========================================
    // Region Tab Filtering
    // ==========================================
    var tabs = document.querySelectorAll('.region-tab');
    var regionSections = document.querySelectorAll('.region-section');
    var destCards = document.querySelectorAll('.dest-card');

    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            var region = tab.getAttribute('data-region');

            // Update active tab
            tabs.forEach(function(t) {
                t.classList.remove('active', 'bg-primary', 'text-white');
                t.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
            });
            tab.classList.add('active', 'bg-primary', 'text-white');
            tab.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');

            // Filter sections
            if (region === 'all') {
                regionSections.forEach(function(s) { s.classList.remove('hidden'); });
                destCards.forEach(function(c) { c.classList.remove('filtered-out'); });
            } else {
                regionSections.forEach(function(s) {
                    if (s.getAttribute('data-region') === region) {
                        s.classList.remove('hidden');
                    } else {
                        s.classList.add('hidden');
                    }
                });
            }
        });
    });

    // ==========================================
    // Interactive Leaflet Map
    // ==========================================
    var mapEl = document.getElementById('dest-map');
    var dataEl = document.getElementById('destinationsData');
    if (!mapEl || !dataEl) return;

    var destinations;
    try {
        destinations = JSON.parse(dataEl.textContent);
    } catch(e) {
        return;
    }

    // Default coordinates for known destinations (since DB lat/lng are null)
    var defaultCoords = {
        'dingle-way': [52.1409, -10.2671],
        'kerry-way': [51.8969, -9.8893],
        'wicklow-way': [53.0633, -6.3401],
        'barrow-way': [52.5500, -6.9500],
        'burren-way': [53.0200, -9.0600],
        'causeway-coast': [55.2408, -6.5116],
        'causeway-glens': [55.1500, -6.2000],
        'cooley-mournes': [54.0500, -6.2500],
        'cooley-peninsula': [54.0400, -6.3000],
        'connemara': [53.4800, -9.9200],
        'beara-way': [51.7600, -9.8200],
        'the-sperrins': [54.7500, -7.0500]
    };

    // Initialize map centered on Ireland
    var map = L.map('dest-map', {
        scrollWheelZoom: false,
        zoomControl: true
    }).setView([53.3, -7.8], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 15
    }).addTo(map);

    // Custom marker icon
    var markerIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="width:32px;height:32px;background:#F17E00;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M13.5 5.5C14.59 5.5 15.5 4.58 15.5 3.5S14.59 1.5 13.5 1.5 11.5 2.42 11.5 3.5 12.42 5.5 13.5 5.5M9.89 19.38L10.89 15l2.11 2v6h2v-7.5l-2.11-2 .61-3c1.07 1.2 2.66 2 4.5 2v-2c-1.54 0-2.87-.81-3.5-2l-1-1.6c-.38-.6-1.03-1-1.76-1-.17 0-.34.02-.51.07L6 8.3v4.7h2v-3.4l1.78-.63L8.12 17l1.77 2.38z"/></svg></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34]
    });

    // HTML-escape helper to prevent XSS
    function esc(str) {
        var div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // Add markers
    destinations.forEach(function(dest) {
        var coords = defaultCoords[dest.slug];
        if (!coords) return;

        var tourCountText = dest.tour_count === 1 ? '1 tour' : dest.tour_count + ' tours';
        var priceText = dest.min_price ? ' &middot; From &euro;' + esc(String(dest.min_price)) : '';

        var popup = '<div style="min-width:200px;font-family:Inter,sans-serif;">' +
            '<h3 style="font-weight:700;font-size:1rem;margin:0 0 4px;">' + esc(dest.name) + '</h3>' +
            '<p style="color:#64748b;font-size:0.8rem;margin:0 0 8px;">' + tourCountText + priceText + '</p>' +
            '<a href="destination-' + esc(dest.slug) + '.html" style="color:#F17E00;font-weight:600;font-size:0.85rem;text-decoration:none;">View destination &rarr;</a>' +
        '</div>';

        L.marker(coords, { icon: markerIcon })
            .addTo(map)
            .bindPopup(popup);
    });

    // Invalidate map size after a short delay (ensures proper rendering)
    setTimeout(function() { map.invalidateSize(); }, 200);

})();
