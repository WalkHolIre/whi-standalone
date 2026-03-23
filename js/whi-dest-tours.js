/**
 * WHI Destination Tour Cards — Client-side rendering
 * Renders tour cards on walking area pages matching the redesigned card style
 * Uses inline styles to avoid dependency on Tailwind CDN
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

    /* SVG icons for stats bar */
    var iconDays = '<svg style="width:24px;height:24px;color:#F17E00;margin-bottom:4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
    var iconDistance = '<svg style="width:24px;height:24px;color:#F17E00;margin-bottom:4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';
    var iconAscent = '<svg style="width:24px;height:24px;color:#F17E00;margin-bottom:4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M17 7h4v4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>';

    grid.innerHTML = tours.map(function(tour) {
        var walkDays = tour.walking_days || (tour.days - 1) || 1;
        var kmPerDay = tour.total_km ? Math.round(tour.total_km / walkDays) : null;
        var ascentPerDay = tour.total_ascent ? Math.round(tour.total_ascent / walkDays) : null;

        /* Region link */
        var regionLabel = regionLabelMap[tour.region] || tour.region;
        var regionPage = regionPageMap[tour.region] || '';
        var regionOnclick = regionPage ? ' onclick="event.stopPropagation();event.preventDefault();window.location.href=\'' + regionPage + '\';"' : '';
        var regionCursor = regionPage ? 'cursor:pointer;' : '';

        /* Review HTML — single large star + rating */
        var reviewHtml = '';
        if (tour.avg_rating && tour.review_count > 0) {
            reviewHtml = '<div style="display:flex;align-items:center;gap:6px;">' +
                '<svg style="width:24px;height:24px;color:#F17E00;" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>' +
                '<span style="font-weight:800;font-size:18px;line-height:1;color:#210747;">' + tour.avg_rating + '</span>' +
                '<span style="color:#9ca3af;font-size:14px;font-weight:500;">(' + tour.review_count + ')</span>' +
            '</div>';
        }

        /* Difficulty boots */
        var filled = getBootCount(tour.difficulty);
        var bootsHtml = '<div style="display:flex;gap:4px;" title="Difficulty: ' + tour.difficulty + '">';
        for (var b = 0; b < 3; b++) {
            var opacity = b < filled ? '1' : '0.35';
            bootsHtml += '<img src="images/icons/boot-filled.svg" alt="" style="width:34px;height:34px;object-fit:contain;opacity:' + opacity + ';">';
        }
        bootsHtml += '</div>';

        /* Stats bar items */
        var statItems = [];
        statItems.push(
            '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:0 8px;">' +
                iconDays +
                '<span style="font-weight:800;font-size:16px;color:#210747;">' + tour.days + ' Days</span>' +
            '</div>'
        );
        if (kmPerDay) {
            statItems.push(
                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:0 8px;border-left:1px solid #e5e7eb;">' +
                    iconDistance +
                    '<div style="text-align:center;"><span style="font-weight:800;font-size:16px;color:#210747;display:block;">' + kmPerDay + ' km</span><span style="color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;display:block;">/Day</span></div>' +
                '</div>'
            );
        }
        if (ascentPerDay) {
            statItems.push(
                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:0 8px;border-left:1px solid #e5e7eb;">' +
                    iconAscent +
                    '<div style="text-align:center;"><span style="font-weight:800;font-size:16px;color:#210747;display:block;">&uarr; ' + ascentPerDay + 'm</span><span style="color:#9ca3af;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;display:block;">/Day</span></div>' +
                '</div>'
            );
        }

        /* Promotional ribbon */
        var ribbonHtml = '';
        if (tour.discount_pct && tour.sale_price) {
            ribbonHtml = '<div class="ribbon-wrapper">' +
                '<div style="position:absolute;top:0;left:100px;width:10px;height:10px;background:#9c5100;clip-path:polygon(0 100%, 100% 100%, 0 0);"></div>' +
                '<div style="position:absolute;top:100px;left:0;width:10px;height:10px;background:#9c5100;clip-path:polygon(100% 0, 100% 100%, 0 0);"></div>' +
                '<span class="ribbon">SAVE ' + tour.discount_pct + '%</span>' +
            '</div>';
        }

        /* Price badge */
        var priceHtml = tour.sale_price
            ? '<span style="font-size:14px;text-decoration:line-through;color:#9ca3af;">&euro;' + formatPrice(tour.price) + '</span> ' +
              '<span style="font-size:24px;font-weight:900;color:#F17E00;">&euro;' + formatPrice(tour.sale_price) + '</span>'
            : '<span style="font-size:24px;font-weight:900;color:#210747;">&euro;' + formatPrice(tour.price) + '</span>';

        return '<div style="width:100%;max-width:420px;margin:0 auto;">' +
            '<div style="position:relative;">' +
            ribbonHtml +
            '<a href="tours/' + tour.slug + '.html" class="tour-card" style="display:flex;flex-direction:column;height:100%;background:#fff;border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;">' +
                /* Image area with gradient overlay and title */
                '<div style="position:relative;aspect-ratio:4/3;overflow:hidden;">' +
                    '<img src="images/routes/' + tour.slug + '/card.jpg" srcset="images/routes/' + tour.slug + '/card-400w.jpg 400w, images/routes/' + tour.slug + '/card-800w.jpg 800w, images/routes/' + tour.slug + '/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="' + tour.name + '" style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s ease;" loading="lazy" onerror="this.style.display=\'none\'"/>' +
                    '<div class="image-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;"></div>' +
                    /* Price badge */
                    '<div style="position:absolute;top:16px;right:16px;background:#fff;padding:8px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.12);text-align:center;">' +
                        '<span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;line-height:1;margin-bottom:2px;">From</span>' +
                        priceHtml +
                    '</div>' +
                    /* Tour title at bottom of image */
                    '<div style="position:absolute;bottom:20px;left:24px;right:24px;">' +
                        '<h3 style="color:#fff;font-size:24px;font-weight:800;line-height:1.2;margin:0;text-shadow:0 2px 8px rgba(0,0,0,0.3);">' + tour.name + '</h3>' +
                    '</div>' +
                '</div>' +
                /* Card body */
                '<div style="flex-grow:1;padding:24px;display:flex;flex-direction:column;">' +
                    /* Region */
                    '<div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:14px;color:#210747;margin-bottom:12px;' + regionCursor + '"' + regionOnclick + '>' +
                        '<svg style="width:16px;height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>' +
                        '<span>' + regionLabel + '</span>' +
                    '</div>' +
                    /* Description */
                    '<p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">' + (tour.short_desc || '') + '</p>' +
                    /* Rating + Difficulty row */
                    '<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f3f4f6;padding-top:24px;">' +
                        reviewHtml +
                        bootsHtml +
                    '</div>' +
                '</div>' +
                /* Stats bar */
                '<div style="background:#f9fafb;display:flex;border-top:1px solid #f3f4f6;padding:20px 0;">' +
                    statItems.join('') +
                '</div>' +
            '</a>' +
            '</div>' +
        '</div>';
    }).join('');
})();
