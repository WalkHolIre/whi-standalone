/**
 * WHI Tours Listing — Client-side interactivity
 * Handles: filtering by region/difficulty/duration, sorting, rendering tour cards
 * Card design inspired by Base44 .de site
 */
(function() {
    'use strict';

    var dataEl = document.getElementById('toursData');
    if (!dataEl) return;

    var toursData;
    try {
        toursData = JSON.parse(dataEl.textContent);
    } catch(e) {
        console.error('WHI: Failed to parse tours data', e);
        return;
    }
    var toursGrid = document.getElementById('toursGrid');
    var regionFilter = document.getElementById('regionFilter');
    var difficultyFilter = document.getElementById('difficultyFilter');
    var durationFilter = document.getElementById('durationFilter');
    var sortFilter = document.getElementById('sortFilter');
    var resultsCount = document.getElementById('resultsCount');

    if (!toursGrid) return;

    /* Region → walking area page mapping */
    var regionPageMap = {
        'Dingle Peninsula': 'walking-area-dingle-way.html',
        'County Kerry': 'walking-area-kerry-way.html',
        'Wicklow Mountains': 'walking-area-wicklow-way.html',
        'South East Ireland': 'walking-area-barrow-way.html',
        'The Burren': 'walking-area-burren-way.html',
        'Causeway Coast': 'walking-area-causeway-coast.html',
        'Cooley Peninsula': 'walking-area-cooley-mournes.html',
        'Connemara': 'walking-area-connemara.html',
        'Beara Peninsula': 'walking-area-beara-way.html',
        'Glens of Antrim': 'walking-area-antrim-glens.html',
        'Mourne Mountains': 'walking-area-mourne-mountains.html',
        'The Sperrins': 'walking-area-the-sperrins.html'
    };

    /* Region → Wild Atlantic Way / descriptive label */
    var regionLabelMap = {
        'Dingle Peninsula': 'Wild Atlantic Way',
        'County Kerry': 'Wild Atlantic Way',
        'Wicklow Mountains': 'Ireland\'s Ancient East',
        'South East Ireland': 'Ireland\'s Ancient East',
        'The Burren': 'Wild Atlantic Way',
        'Causeway Coast': 'Causeway Coastal Route',
        'Cooley Peninsula': 'Ireland\'s Ancient East',
        'Connemara': 'Wild Atlantic Way',
        'Beara Peninsula': 'Wild Atlantic Way',
        'Glens of Antrim': 'Causeway Coastal Route',
        'Mourne Mountains': 'Mourne Heritage Trail',
        'The Sperrins': 'Sperrins Heritage Trail'
    };

    /* Return boot icons: filled = dark purple, outline = mauve */
    function getDifficultyBoots(difficulty) {
        var filled = 1;
        switch(difficulty) {
            case 'Easy': filled = 1; break;
            case 'Moderate': filled = 2; break;
            case 'Intermediate': filled = 2; break;
            case 'Challenging': filled = 3; break;
            default: filled = 1;
        }
        var html = '';
        for (var i = 0; i < 3; i++) {
            if (i < filled) {
                html += '<img src="images/icons/boot-filled.svg" alt="" width="34" height="34" style="display:inline-block;margin-right:-2px;">';
            } else {
                html += '<img src="images/icons/boot-outline.svg" alt="" width="34" height="34" style="display:inline-block;margin-right:-2px;">';
            }
        }
        return html;
    }

    function matchesDuration(days, filterValue) {
        if (!filterValue) return true;
        if (filterValue === '5') return days === 5;
        if (filterValue === '6-8') return days >= 6 && days <= 8;
        if (filterValue === '9+') return days >= 9;
        return true;
    }

    function formatPrice(price) {
        var p = parseFloat(price);
        if (isNaN(p)) return price;
        return p === Math.floor(p) ? Math.floor(p).toString() : p.toFixed(2);
    }

    /* Star rating HTML */
    function renderStars(rating) {
        if (!rating) return '';
        var html = '';
        var full = Math.floor(rating);
        var half = (rating - full) >= 0.3;
        for (var i = 0; i < full; i++) {
            html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="#f59e0b"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>';
        }
        if (half) {
            html += '<svg width="16" height="16" viewBox="0 0 20 20"><defs><linearGradient id="halfStar"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z" fill="url(#halfStar)"/></svg>';
        }
        var remaining = 5 - full - (half ? 1 : 0);
        for (var j = 0; j < remaining; j++) {
            html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="#d1d5db"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>';
        }
        return html;
    }

    function renderTours(tours) {
        toursGrid.innerHTML = tours.map(function(tour) {
            /* Calculate per-day averages */
            var walkDays = tour.walking_days || (tour.days - 1);
            var kmPerDay = tour.total_km ? Math.round(tour.total_km / walkDays) : null;
            var ascentPerDay = tour.total_ascent ? Math.round(tour.total_ascent / walkDays) : null;
            var descentPerDay = tour.total_descent ? Math.round(tour.total_descent / walkDays) : null;

            /* Price badge — dark purple, larger */
            var priceHtml = '<div class="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 text-center">' +
                '<span class="block text-xs text-slate-500 font-medium leading-none mb-1">From</span>' +
                '<span class="block text-2xl font-extrabold leading-tight" style="color:#210747;">&euro;' + formatPrice(tour.price) + '</span>' +
                '<a href="price-promise.html" class="text-[10px] text-slate-400 hover:text-primary underline" title="Best price guarantee — see our price promise" onclick="event.stopPropagation();">*Price Promise</a>' +
            '</div>';

            /* Purple gradient overlay + title at bottom of image */
            var gradientHtml = '<div class="absolute inset-x-0 bottom-0 pointer-events-none" style="height:40%;background:linear-gradient(to top,rgba(33,7,71,0.55) 0%,rgba(33,7,71,0) 100%);"></div>';

            var titleOverImage = '<h3 class="absolute bottom-3 left-3 right-3 text-white text-lg font-bold leading-snug drop-shadow-lg z-10" style="text-shadow:0 1px 4px rgba(0,0,0,0.5);">' + tour.name + '</h3>';

            /* Review stars + count */
            var reviewHtml = '';
            if (tour.avg_rating && tour.review_count > 0) {
                reviewHtml = '<div class="flex items-center gap-2">' +
                    '<div class="flex items-center gap-0.5">' + renderStars(tour.avg_rating) + '</div>' +
                    '<span class="text-sm font-bold text-slate-700">' + tour.avg_rating + '</span>' +
                    '<span class="text-xs text-slate-400">(' + tour.review_count + ')</span>' +
                '</div>';
            }

            /* Difficulty boot icons — bigger, tighter spacing, hover text */
            var bootsHtml = '<div class="flex items-center" title="Diff.: ' + tour.difficulty + '" style="gap:0;">' + getDifficultyBoots(tour.difficulty) + '</div>';

            /* Walking region label */
            var regionLabel = regionLabelMap[tour.region] || tour.region;
            var regionPage = regionPageMap[tour.region] || '';
            var regionLinkHtml = regionPage ?
                '<span class="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style="color:#3F0F87;" onclick="event.stopPropagation();event.preventDefault();window.location.href=\'' + regionPage + '\';">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                    regionLabel +
                '</span>' :
                '<span class="inline-flex items-center gap-1 text-xs font-semibold" style="color:#3F0F87;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                    regionLabel +
                '</span>';

            /* Stats bar: days, km/day, ascent/day, descent/day — proper spacing */
            var statsItems = [];
            statsItems.push(
                '<div class="flex flex-col items-center" style="min-width:60px;">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' +
                    '<span class="text-xs font-bold text-slate-700 mt-1">' + tour.days + ' Days</span>' +
                '</div>'
            );
            if (kmPerDay) {
                statsItems.push(
                    '<div class="flex flex-col items-center" style="min-width:60px;">' +
                        '<img src="images/icons/distance.svg" alt="" width="20" height="20" style="display:inline-block;">' +
                        '<span class="text-xs font-bold text-slate-700 mt-1">' + kmPerDay + ' km</span>' +
                        '<span class="text-[9px] text-slate-400">/Day</span>' +
                    '</div>'
                );
            }
            if (ascentPerDay) {
                statsItems.push(
                    '<div class="flex flex-col items-center" style="min-width:60px;">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M7 17l5-10 5 10"/><path d="M4 20h16"/></svg>' +
                        '<span class="text-xs font-bold text-slate-700 mt-1">&uarr;' + ascentPerDay + 'm</span>' +
                        '<span class="text-[9px] text-slate-400">/Day</span>' +
                    '</div>'
                );
            }
            if (descentPerDay) {
                statsItems.push(
                    '<div class="flex flex-col items-center" style="min-width:60px;">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M7 7l5 10 5-10"/><path d="M4 4h16"/></svg>' +
                        '<span class="text-xs font-bold text-slate-700 mt-1">&darr;' + descentPerDay + 'm</span>' +
                        '<span class="text-[9px] text-slate-400">/Day</span>' +
                    '</div>'
                );
            }

            var statsBarHtml = '<div class="flex items-start justify-evenly py-3 px-2 border-t border-slate-100 gap-2">' +
                statsItems.join('') +
            '</div>';

            return '<a href="tours/' + tour.slug + '.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full tour-card" data-region="' + tour.region + '" data-difficulty="' + tour.difficulty + '" data-days="' + tour.days + '">' +
                /* Image area with gradient, title, price badge */
                '<div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-brand-purple/20">' +
                    '<img src="images/routes/' + tour.slug + '/card.jpg" srcset="images/routes/' + tour.slug + '/card-400w.jpg 400w, images/routes/' + tour.slug + '/card-800w.jpg 800w, images/routes/' + tour.slug + '/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="' + tour.name + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="1200" height="800" onerror="this.style.display=\'none\'"/>' +
                    gradientHtml +
                    titleOverImage +
                    priceHtml +
                '</div>' +
                /* Card body */
                '<div class="flex flex-col justify-between flex-grow p-4 pb-2">' +
                    '<div>' +
                        '<p class="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-2">' + tour.short_desc + '</p>' +
                        regionLinkHtml +
                    '</div>' +
                    /* Reviews + Difficulty row */
                    '<div class="flex items-center justify-between mt-3 mb-1">' +
                        reviewHtml +
                        bootsHtml +
                    '</div>' +
                '</div>' +
                /* Stats bar at bottom */
                statsBarHtml +
            '</a>';
        }).join('');
    }

    function applyFiltersAndSort() {
        var regionVal = regionFilter ? regionFilter.value : '';
        var difficultyVal = difficultyFilter ? difficultyFilter.value : '';
        var durationVal = durationFilter ? durationFilter.value : '';
        var sortVal = sortFilter ? sortFilter.value : 'popular';

        var filtered = toursData.filter(function(tour) {
            var regionMatch = !regionVal || tour.region === regionVal;
            var difficultyMatch = !difficultyVal || tour.difficulty === difficultyVal;
            var durationMatch = matchesDuration(tour.days, durationVal);
            return regionMatch && difficultyMatch && durationMatch;
        });

        if (sortVal === 'price-asc') {
            filtered.sort(function(a, b) { return a.price - b.price; });
        } else if (sortVal === 'price-desc') {
            filtered.sort(function(a, b) { return b.price - a.price; });
        } else if (sortVal === 'duration') {
            filtered.sort(function(a, b) { return a.days - b.days; });
        }

        if (resultsCount) {
            resultsCount.textContent = filtered.length;
        }

        renderTours(filtered);
    }

    // Bind events
    if (regionFilter) regionFilter.addEventListener('change', applyFiltersAndSort);
    if (difficultyFilter) difficultyFilter.addEventListener('change', applyFiltersAndSort);
    if (durationFilter) durationFilter.addEventListener('change', applyFiltersAndSort);
    if (sortFilter) sortFilter.addEventListener('change', applyFiltersAndSort);

    // Initial render
    renderTours(toursData);
})();
