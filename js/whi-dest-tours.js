/**
 * WHI Destination Tour Cards — Client-side rendering
 * Renders tour cards on walking area pages matching the redesigned card style
 */
(function() {
    'use strict';

    var dataEl = document.getElementById('destToursData');
    var grid = document.getElementById('destToursGrid');
    if (!dataEl || !grid) return;

    var tours;
    try {
        tours = JSON.parse(dataEl.textContent);
    } catch(e) {
        console.error('WHI: Failed to parse destination tours data', e);
        return;
    }

    if (!tours || !tours.length) return;

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

    function getBootCount(difficulty) {
        if (difficulty === 'Moderate' || difficulty === 'Intermediate') return 2;
        if (difficulty === 'Challenging') return 3;
        return 1;
    }

    function formatPrice(price) {
        if (!price) return '0';
        var p = parseFloat(price);
        return p === Math.floor(p) ? p.toFixed(0) : p.toFixed(2);
    }

    grid.innerHTML = tours.map(function(tour) {
        var walkDays = tour.walking_days || (tour.days - 1) || 1;
        var kmPerDay = tour.total_km ? Math.round(tour.total_km / walkDays) : null;
        var ascentPerDay = tour.total_ascent ? Math.round(tour.total_ascent / walkDays) : null;

        /* Region link */
        var regionLabel = regionLabelMap[tour.region] || tour.region;
        var regionPage = regionPageMap[tour.region] || '';
        var regionOnclick = regionPage ? ' onclick="event.stopPropagation();event.preventDefault();window.location.href=\'' + regionPage + '\';"' : '';
        var regionCursor = regionPage ? ' cursor-pointer hover:underline' : '';

        /* Review HTML */
        var reviewHtml = '';
        if (tour.avg_rating && tour.review_count > 0) {
            reviewHtml = '<div class="flex items-center gap-1.5">' +
                '<svg class="w-6 h-6 fill-current" style="color:#F17E00;" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>' +
                '<span class="font-extrabold text-lg leading-none" style="color:#210747;">' + tour.avg_rating + '</span>' +
                '<span class="text-gray-400 text-sm font-medium">(' + tour.review_count + ' Reviews)</span>' +
            '</div>';
        }

        /* Difficulty boots — filled at full opacity, unfilled at 40% */
        var filled = getBootCount(tour.difficulty);
        var bootsHtml = '<div class="flex gap-1" title="Difficulty: ' + tour.difficulty + '">';
        for (var b = 0; b < 3; b++) {
            var op = b < filled ? 'opacity-100' : 'opacity-40';
            bootsHtml += '<img src="images/icons/boot-filled.svg" alt="" class="w-[34px] h-[34px] object-contain ' + op + '">';
        }
        bootsHtml += '</div>';

        /* Stats bar items */
        var statsHtml = '';
        // Days
        statsHtml += '<div class="flex flex-col items-center justify-center">' +
            '<svg class="h-6 w-6 mb-1" style="color:#F17E00;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>' +
            '<span class="font-extrabold text-base" style="color:#210747;">' + tour.days + ' Days</span>' +
        '</div>';
        var statsCols = 1;
        // km/Day
        if (kmPerDay) {
            statsCols++;
            statsHtml += '<div class="flex flex-col items-center justify-center">' +
                '<svg class="h-6 w-6 mb-1" style="color:#F17E00;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>' +
                '<div class="text-center"><span class="font-extrabold text-base block" style="color:#210747;">' + kmPerDay + ' km</span><span class="text-gray-400 text-[10px] font-bold uppercase tracking-tight -mt-1 block">/Day</span></div>' +
            '</div>';
        }
        // Ascent/Day
        if (ascentPerDay) {
            statsCols++;
            statsHtml += '<div class="flex flex-col items-center justify-center">' +
                '<svg class="h-6 w-6 mb-1" style="color:#F17E00;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>' +
                '<div class="text-center"><span class="font-extrabold text-base block" style="color:#210747;">&uarr; ' + ascentPerDay + 'm</span><span class="text-gray-400 text-[10px] font-bold uppercase tracking-tight -mt-1 block">/Day</span></div>' +
            '</div>';
        }

        return '<div class="w-full max-w-[420px] mx-auto">' +
            '<a href="tours/' + tour.slug + '.html" class="tour-card flex flex-col h-full bg-white rounded-2xl overflow-hidden no-underline group">' +
                /* Image area */
                '<div class="relative aspect-[4/3] overflow-hidden">' +
                    '<img src="images/routes/' + tour.slug + '/card.jpg" srcset="images/routes/' + tour.slug + '/card-400w.jpg 400w, images/routes/' + tour.slug + '/card-800w.jpg 800w, images/routes/' + tour.slug + '/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="' + tour.name + '" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" onerror="this.style.display=\'none\'"/>' +
                    '<div class="absolute inset-0 image-overlay"></div>' +
                    /* Price badge */
                    '<div class="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md text-center">' +
                        '<span class="block text-[11px] font-bold uppercase tracking-widest text-gray-500 leading-tight mb-0.5">From</span>' +
                        '<span class="text-2xl font-black" style="color:#210747;">&euro;' + formatPrice(tour.price) + '</span>' +
                    '</div>' +
                    /* Tour title */
                    '<div class="absolute bottom-5 left-6 right-6">' +
                        '<h3 class="text-white text-2xl font-extrabold leading-tight">' + tour.name + '</h3>' +
                    '</div>' +
                '</div>' +
                /* Card body */
                '<div class="flex-grow p-6 flex flex-col">' +
                    /* Region */
                    '<div class="flex items-center gap-1.5 font-semibold text-sm mb-3' + regionCursor + '" style="color:#210747;"' + regionOnclick + '>' +
                        '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>' +
                        '<span>' + regionLabel + '</span>' +
                    '</div>' +
                    /* Description */
                    '<p class="text-gray-600 text-base leading-relaxed mb-6">' + (tour.short_desc || '') + '</p>' +
                    /* Rating + Difficulty row */
                    '<div class="mt-auto flex items-center justify-between border-t border-gray-100 pt-6">' +
                        reviewHtml +
                        bootsHtml +
                    '</div>' +
                '</div>' +
                /* Stats bar */
                '<div class="bg-gray-50 grid grid-cols-' + statsCols + ' border-t border-gray-100 divide-x divide-gray-200 py-5">' +
                    statsHtml +
                '</div>' +
            '</a>' +
        '</div>';
    }).join('');
})();
