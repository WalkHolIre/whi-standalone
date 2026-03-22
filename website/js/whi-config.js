/**
 * WHI Ground Control — Website Configuration
 * ============================================
 * This file connects the Walking Holiday Ireland website
 * to the Ground Control admin system via Supabase.
 *
 * HOW TO ACTIVATE:
 * 1. Replace the SUPABASE_ANON_KEY below with your real anon key
 *    (find it in Supabase → Project Settings → API → anon/public key)
 * 2. The website will automatically start showing live data
 *
 * While the key is set to 'REPLACE_WITH_YOUR_REAL_ANON_KEY',
 * the site works normally with its static/fallback content.
 */

window.WHI_CONFIG = {

  // Supabase connection
  SUPABASE_URL: 'https://dfguqecbcbbgrttfkwfr.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZ3VxZWNiY2JiZ3J0dGZrd2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODY1OTEsImV4cCI6MjA4ODM2MjU5MX0.ckTn_XP0wKdxTK_KELaEq-02gcmSyaBGdA2iAfBuVIk',

  // Set to true once Supabase is configured and you want live data
  LIVE_DATA_ENABLED: true,

  // Cache duration in minutes (how long to keep fetched data before refreshing)
  CACHE_MINUTES: 15,

  // Slug-to-page mapping (connects Supabase tour slugs to website pages)
  TOUR_SLUGS: {
    'dingle-way':           { page: 'tours/dingle-way.html',           dest: 'destination-dingle.html' },
    'kerry-way':            { page: 'tours/kerry-way.html',            dest: 'destination-kerry.html' },
    'wicklow-way':          { page: 'tours/wicklow-way.html',          dest: 'destination-wicklow.html' },
    'wicklow-way-5-days':   { page: 'tours/wicklow-way-5-days.html',   dest: 'destination-wicklow.html' },
    'wicklow-way-7-days':   { page: 'tours/wicklow-way-7-days.html',   dest: 'destination-wicklow.html' },
    'wicklow-way-10-days':  { page: 'tours/wicklow-way-10-days.html',  dest: 'destination-wicklow.html' },
    'barrow-way':           { page: 'tours/barrow-way.html',           dest: 'destination-barrow.html' },
    'barrow-way-5-days':    { page: 'tours/barrow-way-5-days.html',    dest: 'destination-barrow.html' },
    'burren-way':           { page: 'tours/burren-way.html',           dest: 'destination-burren.html' },
    'burren-5-days':        { page: 'tours/burren-5-days.html',        dest: 'destination-burren.html' },
    'burren-6-days':        { page: 'tours/burren-6-days.html',        dest: 'destination-burren.html' },
    'burren-7-days':        { page: 'tours/burren-7-days.html',        dest: 'destination-burren.html' },
    'causeway-coast':       { page: 'tours/causeway-coast.html',       dest: 'destination-causeway.html' },
    'causeway-coast-5-days':{ page: 'tours/causeway-coast-5-days.html',dest: 'destination-causeway.html' },
    'cooley-mournes':       { page: 'tours/cooley-mournes.html',       dest: 'destination-cooley.html' },
    'cooley-peninsula-5-days':{ page: 'tours/cooley-peninsula-5-days.html', dest: 'destination-cooley.html' },
  },

  // Image paths for tour cards (used when rendering dynamic cards)
  TOUR_IMAGES: {
    'dingle-way':           'images/routes/dingle/card.jpg',
    'kerry-way':            'images/routes/kerry/card.jpg',
    'wicklow-way':          'images/routes/wicklow/card.jpg',
    'wicklow-way-5-days':   'images/routes/wicklow/card.jpg',
    'wicklow-way-7-days':   'images/routes/wicklow/card.jpg',
    'wicklow-way-10-days':  'images/routes/wicklow/card.jpg',
    'barrow-way':           'images/routes/barrow/card.jpg',
    'barrow-way-5-days':    'images/routes/barrow/card.jpg',
    'burren-way':           'images/routes/burren/card.jpg',
    'burren-5-days':        'images/routes/burren/card.jpg',
    'burren-6-days':        'images/routes/burren/card.jpg',
    'burren-7-days':        'images/routes/burren/card.jpg',
    'causeway-coast':       'images/routes/causeway/card.jpg',
    'causeway-coast-5-days':'images/routes/causeway/card.jpg',
    'cooley-mournes':       'images/routes/cooley-mournes/card.jpg',
    'cooley-peninsula-5-days':'images/routes/cooley-mournes/card.jpg',
  }
};
