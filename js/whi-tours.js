/**
 * WHI Tours Listing — Client-side interactivity
 * Handles: filtering by region/difficulty/duration, sorting, rendering tour cards
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

    function getDifficultyColor(difficulty) {
        switch(difficulty) {
            case 'Easy': return '#10b981';
            case 'Moderate': return '#f59e0b';
            case 'Intermediate': return '#f97316';
            case 'Challenging': return '#ef4444';
            default: return '#64748b';
        }
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

    function renderTours(tours) {
        toursGrid.innerHTML = tours.map(function(tour) {
            var distanceHtml = '';
            if (tour.total_km) {
                distanceHtml = '<span class="flex items-center gap-1 text-xs text-slate-500"><span class="material-symbols-outlined text-[14px]">straighten</span>' + tour.total_km + ' km</span>';
            }

            var elevationHtml = '';
            if (tour.total_ascent) {
                elevationHtml = '<span class="flex items-center gap-1 text-xs text-slate-500"><span class="material-symbols-outlined text-[14px]">terrain</span>' + tour.total_ascent + 'm</span>';
            }

            var statsRow = '';
            if (distanceHtml || elevationHtml) {
                statsRow = '<div class="flex items-center gap-3 mb-3">' + distanceHtml + elevationHtml + '</div>';
            }

            return '<a href="tours/' + tour.slug + '.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-2xl transition-all flex flex-col h-full tour-card" data-region="' + tour.region + '" data-difficulty="' + tour.difficulty + '" data-days="' + tour.days + '">' +
                '<div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/30 to-brand-purple/30">' +
                    '<img src="images/routes/' + tour.slug + '/card.jpg" srcset="images/routes/' + tour.slug + '/card-400w.jpg 400w, images/routes/' + tour.slug + '/card-800w.jpg 800w, images/routes/' + tour.slug + '/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="' + tour.name + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" width="1200" height="800" onerror="this.style.display=\'none\'"/>' +
                    (tour.featured ? '<div class="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">Popular</div>' : '') +
                '</div>' +
                '<div class="flex flex-col justify-between flex-grow p-6">' +
                    '<div>' +
                        '<div class="mb-3"><span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">' + tour.region + '</span></div>' +
                        '<h3 class="text-xl font-bold mb-3 leading-snug text-slate-900 group-hover:text-primary transition-colors">' + tour.name + '</h3>' +
                        '<div class="flex items-center gap-4 mb-3 text-sm">' +
                            '<span class="text-slate-600 font-medium">' + tour.days + ' Days / ' + (tour.days - 1) + ' Nights</span>' +
                            '<div class="flex items-center gap-2">' +
                                '<div style="width:10px;height:10px;border-radius:50%;background-color:' + getDifficultyColor(tour.difficulty) + ';"></div>' +
                                '<span class="text-slate-600 font-medium">' + tour.difficulty + '</span>' +
                            '</div>' +
                        '</div>' +
                        statsRow +
                        '<p class="text-slate-600 text-sm leading-relaxed line-clamp-2 mb-4">' + tour.short_desc + '</p>' +
                    '</div>' +
                    '<div class="flex items-center justify-between pt-4 border-t border-slate-100">' +
                        '<span class="text-lg font-bold text-primary">&euro;' + formatPrice(tour.price) + '</span>' +
                        '<div class="flex items-center gap-2 text-primary font-bold group-hover:gap-3 transition-all">View Tour <span class="material-symbols-outlined text-lg">arrow_forward</span></div>' +
                    '</div>' +
                '</div>' +
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
