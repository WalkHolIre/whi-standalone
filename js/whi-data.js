/**
 * WHI Ground Control — Data Integration Layer
 * =============================================
 * Connects the static website to Supabase for live tour data,
 * reviews, and enquiry form submissions.
 *
 * Progressive Enhancement:
 * - If Supabase is not configured, everything stays static (no errors)
 * - If Supabase IS configured, dynamic data replaces static placeholders
 * - Tour prices, reviews, and availability update automatically
 * - Enquiry forms submit directly to the bookings pipeline
 */

(function () {
  'use strict';

  const CONFIG = window.WHI_CONFIG || {};

  // ──────────────────────────────────────────────
  // 1. SUPABASE CLIENT (lightweight, no SDK needed)
  // ──────────────────────────────────────────────

  const SupabaseClient = {
    url: CONFIG.SUPABASE_URL || '',
    key: CONFIG.SUPABASE_ANON_KEY || '',

    isConfigured() {
      return (
        CONFIG.LIVE_DATA_ENABLED === true &&
        this.key &&
        this.key !== 'REPLACE_WITH_YOUR_REAL_ANON_KEY' &&
        this.url
      );
    },

    async query(table, { select = '*', filters = {}, order = null, limit = null } = {}) {
      if (!this.isConfigured()) return null;

      let url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;

      for (const [key, value] of Object.entries(filters)) {
        url += `&${key}=eq.${encodeURIComponent(value)}`;
      }

      if (order) {
        url += `&order=${order}`;
      }

      if (limit) {
        url += `&limit=${limit}`;
      }

      try {
        const response = await fetch(url, {
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        });

        if (!response.ok) {
          console.warn(`[WHI] Supabase query failed for ${table}:`, response.status);
          return null;
        }

        return await response.json();
      } catch (err) {
        console.warn(`[WHI] Supabase connection failed:`, err.message);
        return null;
      }
    },

    async insert(table, data) {
      if (!this.isConfigured()) return null;

      try {
        const response = await fetch(`${this.url}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`[WHI] Insert failed for ${table}:`, response.status, errorBody);
          return null;
        }

        const result = await response.json();
        return result[0] || result;
      } catch (err) {
        console.error(`[WHI] Insert error:`, err.message);
        return null;
      }
    }
  };


  // ──────────────────────────────────────────────
  // 2. CACHE LAYER
  // ──────────────────────────────────────────────

  const Cache = {
    _store: {},
    ttl: (CONFIG.CACHE_MINUTES || 15) * 60 * 1000,

    get(key) {
      const item = this._store[key];
      if (!item) return null;
      if (Date.now() - item.timestamp > this.ttl) {
        delete this._store[key];
        return null;
      }
      return item.data;
    },

    set(key, data) {
      this._store[key] = { data, timestamp: Date.now() };
    }
  };


  // ──────────────────────────────────────────────
  // 3. DATA FETCHERS
  // ──────────────────────────────────────────────

  const WHIData = {

    /** Fetch all published tours */
    async getTours() {
      const cached = Cache.get('tours');
      if (cached) return cached;

      const data = await SupabaseClient.query('tours', {
        select: 'id,name,slug,duration_days,price_per_person_eur,difficulty_level,status,destination_id,description,short_description',
        filters: { status: 'published' },
        order: 'name.asc'
      });

      if (data) Cache.set('tours', data);
      return data;
    },

    /** Fetch all published destinations */
    async getDestinations() {
      const cached = Cache.get('destinations');
      if (cached) return cached;

      const data = await SupabaseClient.query('destinations', {
        select: 'id,name,slug,country,region_id,status,hero_image',
        filters: { status: 'published' }
      });

      if (data) Cache.set('destinations', data);
      return data;
    },

    /** Fetch approved reviews, optionally filtered by tour */
    async getReviews(tourId) {
      const cacheKey = tourId ? `reviews-${tourId}` : 'reviews-all';
      const cached = Cache.get(cacheKey);
      if (cached) return cached;

      const filters = { status: 'published' };
      if (tourId) filters.tour_id = tourId;

      const data = await SupabaseClient.query('reviews', {
        select: 'id,reviewer_name,reviewer_country,title,content,rating,tour_id,review_date',
        filters,
        order: 'review_date.desc',
        limit: 20
      });

      if (data) Cache.set(cacheKey, data);
      return data;
    },

    /** Submit an enquiry (creates a booking with status "Enquiry") */
    async submitEnquiry(formData) {
      const booking = {
        customer_name: formData.name || '',
        customer_email: formData.email || '',
        customer_phone: formData.phone || '',
        tour_name: formData.tour || '',
        number_of_walkers: parseInt(formData.walkers) || 1,
        preferred_start_date: formData.startDate || null,
        notes: formData.message || '',
        status: 'Enquiry',
        source: 'website',
        created_date: new Date().toISOString()
      };

      return await SupabaseClient.insert('bookings', booking);
    }
  };


  // ──────────────────────────────────────────────
  // 4. DOM UPDATERS (progressive enhancement)
  // ──────────────────────────────────────────────

  const DOMUpdater = {

    /** Update all tour price elements on the page */
    async updatePrices() {
      const tours = await WHIData.getTours();
      if (!tours) return;

      // Find all elements with data-whi-price="tour-slug"
      document.querySelectorAll('[data-whi-price]').forEach(el => {
        const slug = el.getAttribute('data-whi-price');
        const tour = tours.find(t => t.slug === slug);
        if (tour && tour.price_per_person_eur) {
          el.textContent = `From €${tour.price_per_person_eur}`;
        }
      });

      // Find all elements with data-whi-duration="tour-slug"
      document.querySelectorAll('[data-whi-duration]').forEach(el => {
        const slug = el.getAttribute('data-whi-duration');
        const tour = tours.find(t => t.slug === slug);
        if (tour && tour.duration_days) {
          el.textContent = `${tour.duration_days} Days`;
        }
      });

      // Find all elements with data-whi-difficulty="tour-slug"
      document.querySelectorAll('[data-whi-difficulty]').forEach(el => {
        const slug = el.getAttribute('data-whi-difficulty');
        const tour = tours.find(t => t.slug === slug);
        if (tour && tour.difficulty_level) {
          el.textContent = tour.difficulty_level.charAt(0).toUpperCase() + tour.difficulty_level.slice(1);
        }
      });
    },

    /** Render live reviews into a container */
    async updateReviews(containerId, tourSlug) {
      const container = document.getElementById(containerId);
      if (!container) return;

      // If we have a tour slug, first get tours to find the ID
      let tourId = null;
      if (tourSlug) {
        const tours = await WHIData.getTours();
        if (tours) {
          const tour = tours.find(t => t.slug === tourSlug);
          if (tour) tourId = tour.id;
        }
      }

      const reviews = await WHIData.getReviews(tourId);
      if (!reviews || reviews.length === 0) return;

      // Build review cards HTML
      const reviewsHTML = reviews.map(review => {
        const stars = Array.from({ length: 5 }, (_, i) =>
          `<span class="material-symbols-outlined text-base ${i < review.rating ? 'text-primary' : 'text-slate-300'}">star</span>`
        ).join('');

        const date = review.review_date
          ? new Date(review.review_date).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })
          : '';

        return `
          <div class="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div class="flex items-center gap-1 mb-3">${stars}</div>
            ${review.title ? `<h4 class="font-bold text-white mb-2">${escapeHTML(review.title)}</h4>` : ''}
            <p class="text-white/90 text-sm leading-relaxed mb-4">${escapeHTML(review.content)}</p>
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-white">${escapeHTML(review.reviewer_name)}</span>
              ${review.reviewer_country ? `<span class="text-sm text-white/60">${escapeHTML(review.reviewer_country)}</span>` : ''}
              ${date ? `<span class="text-xs text-white/50">${date}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = reviewsHTML;
    },

    /** Render tour cards dynamically into a container */
    async renderTourCards(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const tours = await WHIData.getTours();
      if (!tours) return;

      let filteredTours = tours;

      // Filter by destination if specified
      if (options.destinationSlug) {
        const destinations = await WHIData.getDestinations();
        if (destinations) {
          const dest = destinations.find(d => d.slug === options.destinationSlug);
          if (dest) {
            filteredTours = tours.filter(t => t.destination_id === dest.id);
          }
        }
      }

      // Limit number of cards
      if (options.limit) {
        filteredTours = filteredTours.slice(0, options.limit);
      }

      // Determine path prefix (are we in /tours/ subfolder?)
      const isInSubfolder = window.location.pathname.includes('/tours/');
      const prefix = isInSubfolder ? '../' : '';

      const cardsHTML = filteredTours.map(tour => {
        const slug = tour.slug || '';
        const tourMapping = CONFIG.TOUR_SLUGS[slug] || {};
        const imagePath = CONFIG.TOUR_IMAGES[slug] || '';
        const tourPage = tourMapping.page || '#';
        const difficulty = (tour.difficulty_level || 'moderate').charAt(0).toUpperCase() + (tour.difficulty_level || 'moderate').slice(1);
        const badgeClass = tour.difficulty_level === 'easy' ? 'badge-easy' : tour.difficulty_level === 'challenging' ? 'badge-challenging' : 'badge-moderate';

        return `
          <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div class="relative h-56 bg-slate-200">
              <img src="${prefix}${imagePath}" alt="${escapeHTML(tour.name)}" class="w-full h-full object-cover" loading="lazy"/>
            </div>
            <div class="p-6">
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-2xl font-bold text-slate-900">${escapeHTML(tour.name)}</h3>
                <span class="${badgeClass} px-3 py-1 rounded-full text-xs font-bold">${difficulty}</span>
              </div>
              <div class="flex gap-4 mb-4 text-sm text-slate-600">
                <div class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-base text-primary">calendar_today</span>
                  ${tour.duration_days || '–'} Days
                </div>
              </div>
              ${tour.short_description ? `<p class="text-slate-700 text-sm leading-relaxed mb-4">${escapeHTML(tour.short_description)}</p>` : ''}
              <div class="mb-4 pt-4 border-t border-slate-200">
                <p class="text-lg font-bold text-primary">From €${tour.price_per_person_eur || '–'} <span class="text-sm text-slate-600 font-normal">per person</span></p>
              </div>
              <a href="${prefix}${tourPage}" class="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-semibold transition-all active:scale-95 text-center block">
                View Details
              </a>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = cardsHTML;
    }
  };


  // ──────────────────────────────────────────────
  // 5. ENQUIRY FORM HANDLER
  // ──────────────────────────────────────────────

  function initEnquiryForm() {
    const forms = document.querySelectorAll('[data-whi-enquiry-form]');

    forms.forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';

        // Show loading state
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `
            <span class="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            Sending...
          `;
        }

        // Gather form data
        const formData = {
          name: form.querySelector('[name="name"]')?.value || '',
          email: form.querySelector('[name="email"]')?.value || '',
          phone: form.querySelector('[name="phone"]')?.value || '',
          tour: form.querySelector('[name="tour"]')?.value || '',
          walkers: form.querySelector('[name="walkers"]')?.value || '2',
          startDate: form.querySelector('[name="start_date"]')?.value || '',
          message: form.querySelector('[name="message"]')?.value || '',
        };

        // Validate basics
        if (!formData.name || !formData.email) {
          showFormMessage(form, 'Please fill in your name and email.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          }
          return;
        }

        // Submit to Supabase
        const result = await WHIData.submitEnquiry(formData);

        if (result) {
          // Success — show confirmation
          showFormMessage(form, 'Thank you! We\'ve received your enquiry and will get back to you within 24 hours.', 'success');
          form.reset();
        } else {
          // Supabase not configured or failed — fall back to mailto
          const subject = encodeURIComponent(`Walking Holiday Enquiry — ${formData.tour || 'General'}`);
          const body = encodeURIComponent(
            `Name: ${formData.name}\n` +
            `Email: ${formData.email}\n` +
            `Phone: ${formData.phone}\n` +
            `Tour: ${formData.tour}\n` +
            `Walkers: ${formData.walkers}\n` +
            `Preferred Start Date: ${formData.startDate}\n\n` +
            `Message:\n${formData.message}`
          );

          window.location.href = `mailto:info@walkingholidayireland.com?subject=${subject}&body=${body}`;
        }

        // Reset button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      });
    });
  }

  function showFormMessage(form, message, type) {
    // Remove existing messages
    form.querySelectorAll('.whi-form-message').forEach(el => el.remove());

    const msgEl = document.createElement('div');
    msgEl.className = `whi-form-message mt-4 p-4 rounded-xl text-sm font-medium ${
      type === 'success'
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
    }`;
    msgEl.textContent = message;

    form.appendChild(msgEl);

    // Auto-remove after 8 seconds
    setTimeout(() => msgEl.remove(), 8000);
  }


  // ──────────────────────────────────────────────
  // 6. UTILITY
  // ──────────────────────────────────────────────

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


  // ──────────────────────────────────────────────
  // 7. INITIALISATION
  // ──────────────────────────────────────────────

  async function init() {
    // Always init enquiry forms (they fall back to mailto if Supabase isn't configured)
    initEnquiryForm();

    // If Supabase isn't configured, stop here — everything stays static
    if (!SupabaseClient.isConfigured()) {
      console.log('[WHI] Static mode — Supabase not configured. Site runs with static content.');
      return;
    }

    console.log('[WHI] Live mode — Fetching data from Ground Control...');

    // Run all dynamic updates in parallel
    await Promise.allSettled([
      DOMUpdater.updatePrices(),
    ]);

    // Update reviews if a container exists
    const reviewContainer = document.getElementById('whi-live-reviews');
    if (reviewContainer) {
      const tourSlug = reviewContainer.getAttribute('data-tour-slug');
      await DOMUpdater.updateReviews('whi-live-reviews', tourSlug);
    }

    // Render dynamic tour cards if container exists
    const tourCardsContainer = document.getElementById('whi-tour-cards');
    if (tourCardsContainer) {
      const destSlug = tourCardsContainer.getAttribute('data-walking-area-slug');
      const limit = parseInt(tourCardsContainer.getAttribute('data-limit')) || null;
      await DOMUpdater.renderTourCards('whi-tour-cards', {
        destinationSlug: destSlug || null,
        limit
      });
    }

    console.log('[WHI] Live data loaded successfully.');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API for advanced use
  window.WHI = {
    data: WHIData,
    updater: DOMUpdater,
    config: CONFIG
  };

})();
