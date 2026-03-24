/**
 * WHI Booking Modal
 * Complete self-contained JavaScript for the 3-step booking modal
 * Renders on tour pages, submits to Supabase process-booking edge function
 */

const SUPABASE_URL = 'https://dfguqecbcbbgrttfkwfr.supabase.co';
const BALANCE_DUE_DAYS = 42;
const MIN_ADVANCE_DAYS = 7;

// ============================================================================
// I18N - TRANSLATIONS
// ============================================================================

const I18N = {
  en: {
    // Step titles
    stepTourExtras: 'Tour & Extras',
    stepTravellerDetails: 'Traveller Details',
    stepReviewPay: 'Review & Pay',

    // Form labels
    startDate: 'Start date',
    numberOfWalkers: 'Number of walkers',
    singleRoomSupplement: 'Single room supplement',
    extraRestDays: 'Extra rest days',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    dietaryRequirements: 'Dietary requirements',
    specialRequests: 'Special requests',
    addTraveller: 'Add traveller',
    traveller: 'Traveller',
    leadTraveller: 'Lead traveller',
    remove: 'Remove',

    // Countries
    germany: 'Germany',
    netherlands: 'Netherlands',
    belgium: 'Belgium',
    austria: 'Austria',
    france: 'France',
    ireland: 'Ireland',
    unitedKingdom: 'United Kingdom',
    unitedStates: 'United States',
    canada: 'Canada',
    australia: 'Australia',
    switzerland: 'Switzerland',
    other: 'Other',

    // Price labels
    perPerson: 'per person',
    perDay: 'per day',
    perPersonPerDay: 'per person/day',
    priceOnRequest: 'Price on request',
    subtotal: 'Subtotal',
    singleTravellerSurcharge: 'Single traveller supplement',
    singleOccupancySurcharge: 'Single room supplement',
    extraDays: 'Extra days',
    extras: 'Extras',
    total: 'Total',
    deposit: 'Deposit',
    balanceDue: 'Balance due',
    payInFull: 'Pay in full',
    fullPaymentRequired: 'Full payment required',

    // Payment
    payByCard: 'Pay by Card',
    requestBooking: 'Request Booking',
    requestBookingSubtitle: 'No payment now — we\'ll confirm availability',
    payDeposit: 'Pay Deposit',
    payFull: 'Pay in Full',
    completeBooking: 'Complete Booking',
    processing: 'Processing...',

    // Confirmation
    bookingConfirmed: 'Booking Confirmed!',
    bookingRequested: 'Booking Requested!',
    bookingReference: 'Your booking reference is',
    whatHappensNext: 'What Happens Next',
    confirmAvailability: 'We confirm availability and send your booking details',
    receiveDeparturePack: 'You receive your pre-departure pack with itinerary',
    adventureBegins: 'Your walking adventure begins!',
    weReceivedRequest: 'We\'ve received your booking request. Our team will contact you within 24 hours to confirm availability.',
    paymentProcessing: 'Your payment is being processed. You\'ll receive a confirmation email shortly.',
    contactUs: 'Get in touch',
    email: 'Email: info@walkingholidayireland.com',
    whatsapp: 'WhatsApp: +353 42 937 5983',
    phone: 'Phone: +353 42 937 5983',

    // Errors
    selectStartDate: 'Please select a start date',
    enterDetails: 'Please enter your details',
    selectTour: 'Please select a tour',
    enterFirstName: 'Please enter your first name',
    enterLastName: 'Please enter your last name',
    enterValidEmail: 'Please enter a valid email',
    selectCountry: 'Please select a country',

    // Navigation
    next: 'Next',
    back: 'Back',
    close: 'Close',

    // Badges
    easy: 'Easy',
    moderate: 'Moderate',
    challenging: 'Challenging',
    days: 'days',
  },

  de: {
    // Step titles
    stepTourExtras: 'Tour & Extra',
    stepTravellerDetails: 'Reisende',
    stepReviewPay: 'Überprüfen & Bezahlen',

    // Form labels
    startDate: 'Startdatum',
    numberOfWalkers: 'Anzahl der Wanderer',
    singleRoomSupplement: 'Einzelzimmerzuschlag',
    extraRestDays: 'Zusätzliche Ruhetage',
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    country: 'Land',
    dietaryRequirements: 'Ernährungsbedürfnisse',
    specialRequests: 'Besondere Wünsche',
    addTraveller: 'Reisenden hinzufügen',
    traveller: 'Reisende(r)',
    leadTraveller: 'Hauptreisende(r)',
    remove: 'Entfernen',

    // Countries
    germany: 'Deutschland',
    netherlands: 'Niederlande',
    belgium: 'Belgien',
    austria: 'Österreich',
    france: 'Frankreich',
    ireland: 'Irland',
    unitedKingdom: 'Vereinigtes Königreich',
    unitedStates: 'Vereinigte Staaten',
    canada: 'Kanada',
    australia: 'Australien',
    switzerland: 'Schweiz',
    other: 'Andere',

    // Price labels
    perPerson: 'pro Person',
    perDay: 'pro Tag',
    perPersonPerDay: 'pro Person/Tag',
    priceOnRequest: 'Preis auf Anfrage',
    subtotal: 'Zwischensumme',
    singleTravellerSurcharge: 'Einzelreisenden-Zuschlag',
    singleOccupancySurcharge: 'Einzelzimmerzuschlag',
    extraDays: 'Zusätzliche Tage',
    extras: 'Extras',
    total: 'Gesamt',
    deposit: 'Anzahlung',
    balanceDue: 'Restbetrag',
    payInFull: 'Vollständig bezahlen',
    fullPaymentRequired: 'Vollzahlung erforderlich',

    // Payment
    payByCard: 'Mit Karte bezahlen',
    requestBooking: 'Buchung anfragen',
    requestBookingSubtitle: 'Jetzt keine Zahlung – wir bestätigen die Verfügbarkeit',
    payDeposit: 'Anzahlung leisten',
    payFull: 'Vollständig bezahlen',
    completeBooking: 'Buchung abschließen',
    processing: 'Wird verarbeitet...',

    // Confirmation
    bookingConfirmed: 'Buchung bestätigt!',
    bookingRequested: 'Buchungsanfrage gesendet!',
    bookingReference: 'Ihre Buchungsreferenz lautet',
    whatHappensNext: 'Was passiert als Nächstes?',
    confirmAvailability: 'Wir bestätigen die Verfügbarkeit und senden Ihre Buchungsdetails',
    receiveDeparturePack: 'Sie erhalten Ihr Abfahrtspaket mit Reiseplan',
    adventureBegins: 'Ihr Wanderabenteuer beginnt!',
    weReceivedRequest: 'Wir haben Ihre Buchungsanfrage erhalten. Unser Team wird sich innerhalb von 24 Stunden bei Ihnen melden, um die Verfügbarkeit zu bestätigen.',
    paymentProcessing: 'Ihre Zahlung wird verarbeitet. Sie erhalten bald eine Bestätigungsemail.',
    contactUs: 'Kontaktieren Sie uns',
    email: 'E-Mail: info@walkingholidayireland.com',
    whatsapp: 'WhatsApp: +353 42 937 5983',
    phone: 'Telefon: +353 42 937 5983',

    // Errors
    selectStartDate: 'Bitte wählen Sie ein Startdatum',
    enterDetails: 'Bitte geben Sie Ihre Daten ein',
    selectTour: 'Bitte wählen Sie eine Tour',
    enterFirstName: 'Bitte geben Sie Ihren Vornamen ein',
    enterLastName: 'Bitte geben Sie Ihren Nachname ein',
    enterValidEmail: 'Bitte geben Sie eine gültige E-Mail ein',
    selectCountry: 'Bitte wählen Sie ein Land',

    // Navigation
    next: 'Weiter',
    back: 'Zurück',
    close: 'Schließen',

    // Badges
    easy: 'Einfach',
    moderate: 'Mittelschwer',
    challenging: 'Anspruchsvoll',
    days: 'Tage',
  },

  nl: {
    // Step titles
    stepTourExtras: 'Tour & Extra\'s',
    stepTravellerDetails: 'Reizigersgegevens',
    stepReviewPay: 'Controleren & Betalen',

    // Form labels
    startDate: 'Startdatum',
    numberOfWalkers: 'Aantal wandelaars',
    singleRoomSupplement: 'Eenpersoonskamertoeslag',
    extraRestDays: 'Extra rustdagen',
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    email: 'E-mail',
    phone: 'Telefoon',
    country: 'Land',
    dietaryRequirements: 'Dieetwensen',
    specialRequests: 'Speciale verzoeken',
    addTraveller: 'Reiziger toevoegen',
    traveller: 'Reiziger',
    leadTraveller: 'Hoofdreiziger',
    remove: 'Verwijderen',

    // Countries
    germany: 'Duitsland',
    netherlands: 'Nederland',
    belgium: 'België',
    austria: 'Oostenrijk',
    france: 'Frankrijk',
    ireland: 'Ierland',
    unitedKingdom: 'Verenigd Koninkrijk',
    unitedStates: 'Verenigde Staten',
    canada: 'Canada',
    australia: 'Australië',
    switzerland: 'Zwitserland',
    other: 'Anders',

    // Price labels
    perPerson: 'per persoon',
    perDay: 'per dag',
    perPersonPerDay: 'per persoon/dag',
    priceOnRequest: 'Prijs op aanvraag',
    subtotal: 'Subtotaal',
    singleTravellerSurcharge: 'Toeslag alleenreiziger',
    singleOccupancySurcharge: 'Eenpersoonskamertoeslag',
    extraDays: 'Extra dagen',
    extras: 'Extra\'s',
    total: 'Totaal',
    deposit: 'Aanbetaling',
    balanceDue: 'Restbedrag',
    payInFull: 'Volledig betalen',
    fullPaymentRequired: 'Volledige betaling vereist',

    // Payment
    payByCard: 'Betaal met kaart',
    requestBooking: 'Boeking aanvragen',
    requestBookingSubtitle: 'Nu geen betaling – we bevestigen de beschikbaarheid',
    payDeposit: 'Aanbetaling doen',
    payFull: 'Volledig betalen',
    completeBooking: 'Boeking voltooien',
    processing: 'Verwerken...',

    // Confirmation
    bookingConfirmed: 'Boeking bevestigd!',
    bookingRequested: 'Boekingsaanvraag verzonden!',
    bookingReference: 'Uw boekingsreferentie is',
    whatHappensNext: 'Wat gebeurt er nu?',
    confirmAvailability: 'We bevestigen beschikbaarheid en sturen uw boekingsgegevens',
    receiveDeparturePack: 'U ontvangt uw vertrekpakket met reisschema',
    adventureBegins: 'Uw wandelavontuur begint!',
    weReceivedRequest: 'We hebben uw boekingsaanvraag ontvangen. Ons team zal u binnen 24 uur contacteren om de beschikbaarheid te bevestigen.',
    paymentProcessing: 'Uw betaling wordt verwerkt. U ontvangt binnenkort een bevestigingse-mail.',
    contactUs: 'Neem contact op',
    email: 'E-mail: info@walkingholidayireland.com',
    whatsapp: 'WhatsApp: +353 42 937 5983',
    phone: 'Telefoon: +353 42 937 5983',

    // Errors
    selectStartDate: 'Selecteer een startdatum',
    enterDetails: 'Vul uw gegevens in',
    selectTour: 'Selecteer een tour',
    enterFirstName: 'Vul uw voornaam in',
    enterLastName: 'Vul uw achternaam in',
    enterValidEmail: 'Vul een geldig e-mailadres in',
    selectCountry: 'Selecteer een land',

    // Navigation
    next: 'Volgende',
    back: 'Terug',
    close: 'Sluiten',

    // Badges
    easy: 'Gemakkelijk',
    moderate: 'Gemiddeld',
    challenging: 'Uitdagend',
    days: 'dagen',
  },
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let bookingState = {
  currentStep: 1,
  tour: null,
  extras: [],
  settings: null,
  lang: 'en',

  // Step 1
  startDate: null,
  walkers: 1,
  singleRoom: false,
  extraDays: 0,
  selectedExtras: [],

  // Step 2
  leadTraveller: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    dietary: '',
  },
  additionalTravellers: [],
  specialRequests: '',

  // Step 3
  paymentMethod: 'stripe', // 'stripe' | 'enquiry'
  payFull: false,
  isSubmitting: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function t(key) {
  const lang = bookingState.lang || 'en';
  return I18N[lang] ? I18N[lang][key] || I18N.en[key] : I18N.en[key];
}

function formatCurrency(amount) {
  const lang = bookingState.lang || 'en';
  const locale = lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : 'en-IE';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr) {
  const lang = bookingState.lang || 'en';
  const locale = lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : 'en-IE';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getMinDate() {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + MIN_ADVANCE_DAYS);
  return minDate.toISOString().split('T')[0];
}

function calculateEndDate(startDateStr, extraDaysCount) {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + bookingState.tour.duration_days - 1 + extraDaysCount);
  return end.toISOString().split('T')[0];
}

function getDaysUntilStart(startDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const today = new Date();
  const diffMs = start - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getDifficultyColor(level) {
  if (!level) return '#888';
  const lower = level.toLowerCase();
  if (lower === 'easy') return '#10b981';
  if (lower === 'moderate') return '#f59e0b';
  if (lower === 'challenging') return '#ef4444';
  return '#888';
}

// ============================================================================
// PRICE CALCULATION
// ============================================================================

function calcPricing() {
  if (!bookingState.tour) return null;

  const tour = bookingState.tour;
  const walkers = bookingState.walkers;
  const singleRoom = bookingState.singleRoom;
  const extraDaysCount = bookingState.extraDays;
  const selectedExtras = bookingState.selectedExtras;

  // Base price
  let base = tour.price_per_person_eur * walkers;

  // Single traveller surcharge
  let singleTravellerSurcharge = 0;
  if (walkers === 1 && tour.single_traveller_surcharge) {
    singleTravellerSurcharge = tour.single_traveller_surcharge;
  }

  // Single occupancy surcharge
  let singleOccupancySurcharge = 0;
  if (singleRoom && walkers >= 2 && tour.single_occupancy_surcharge) {
    singleOccupancySurcharge = tour.single_occupancy_surcharge;
  }

  // Extra days
  let extraDaysCost = 0;
  if (extraDaysCount > 0 && tour.extra_day_price_eur) {
    extraDaysCost = tour.extra_day_price_eur * extraDaysCount * walkers;
  }

  // Extras
  let extrasTotal = 0;
  const walkingDays = tour.duration_days - 1;

  selectedExtras.forEach((extra) => {
    if (extra.price_type === 'per_person') {
      extrasTotal += extra.price_eur * walkers;
    } else if (extra.price_type === 'per_group') {
      extrasTotal += extra.price_eur;
    } else if (extra.price_type === 'per_day') {
      extrasTotal += extra.price_eur * walkingDays;
    } else if (extra.price_type === 'per_person_per_day') {
      extrasTotal += extra.price_eur * walkers * walkingDays;
    }
    // poa: skip, price is 0
  });

  const subtotal = base + singleTravellerSurcharge + singleOccupancySurcharge + extraDaysCost + extrasTotal;
  const depositPercent = bookingState.settings?.deposit_percent || 25;
  const depositAmount = Math.round((subtotal * (depositPercent / 100)) * 100) / 100;
  const balanceDue = subtotal - depositAmount;

  return {
    base,
    singleTravellerSurcharge,
    singleOccupancySurcharge,
    extraDaysCost,
    extrasTotal,
    subtotal,
    depositAmount,
    balanceDue,
    depositPercent,
  };
}

// ============================================================================
// MODAL DOM CREATION & MANAGEMENT
// ============================================================================

function createModal() {
  const overlay = document.createElement('div');
  overlay.className = 'bm-overlay';
  overlay.id = 'bm-overlay';

  const modal = document.createElement('div');
  modal.className = 'bm-modal';
  modal.id = 'bm-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'bm-title');

  const header = document.createElement('div');
  header.className = 'bm-header';
  header.innerHTML = `
    <h2 id="bm-title" class="bm-title"></h2>
    <button class="bm-close-btn" aria-label="${t('close')}" onclick="window.closeBookingModal()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  const content = document.createElement('div');
  content.className = 'bm-content';
  content.id = 'bm-content';

  const footer = document.createElement('div');
  footer.className = 'bm-footer';
  footer.id = 'bm-footer';

  modal.appendChild(header);
  modal.appendChild(content);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('bm-overlay')) {
      window.closeBookingModal();
    }
  });

  // Handle overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      window.closeBookingModal();
    }
  });
}

// All styling is in external css/booking-modal.css


// ============================================================================
// STEP RENDERING
// ============================================================================

function renderStep1() {
  const content = document.getElementById('bm-content');
  const tour = bookingState.tour;
  const pricing = calcPricing();

  let extrasHtml = '';
  if (bookingState.extras && bookingState.extras.length > 0) {
    extrasHtml = `
      <div class="bm-form-group">
        <label class="bm-label">${t('extras')}</label>
        ${bookingState.extras
          .map(
            (extra) => `
          <div class="bm-card ${bookingState.selectedExtras.some((e) => e.id === extra.id) ? 'bm-active' : ''}"
               onclick="window.toggleExtra('${extra.id}')">
            <div class="bm-card-header">
              <input type="checkbox" class="bm-checkbox"
                     ${bookingState.selectedExtras.some((e) => e.id === extra.id) ? 'checked' : ''}
                     onclick="event.stopPropagation()">
              <div class="bm-card-content">
                <p class="bm-card-title">${escapeHtml(extra.name)}</p>
                <p class="bm-card-description">${escapeHtml(extra.description)}</p>
                <div class="bm-card-price">
                  ${
                    extra.price_type === 'poa'
                      ? `<span>${t('priceOnRequest')}</span>`
                      : `<span>${formatCurrency(extra.price_eur)}</span>
                         <span class="bm-card-price-type">${getPriceTypeLabel(extra.price_type)}</span>`
                  }
                </div>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  let singleRoomHtml = '';
  if (
    bookingState.walkers >= 2 &&
    tour.single_occupancy_surcharge &&
    tour.single_occupancy_surcharge > 0
  ) {
    singleRoomHtml = `
      <div class="bm-form-group">
        <div class="bm-card ${bookingState.singleRoom ? 'bm-active' : ''}"
             onclick="window.toggleSingleRoom()">
          <div class="bm-card-header">
            <input type="checkbox" class="bm-checkbox"
                   ${bookingState.singleRoom ? 'checked' : ''}
                   onclick="event.stopPropagation()">
            <div class="bm-card-content">
              <p class="bm-card-title">${t('singleRoomSupplement')}</p>
              <div class="bm-card-price">
                ${formatCurrency(tour.single_occupancy_surcharge)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const minDate = getMinDate();

  content.innerHTML = `
    <div class="bm-tour-card">
      <img src="${escapeHtml(tour.hero_image)}" alt="${escapeHtml(tour.name)}" class="bm-tour-image" onerror="this.style.display='none'">
      <div class="bm-tour-info">
        <h3 class="bm-tour-name">${escapeHtml(tour.name)}</h3>
        <div class="bm-tour-meta">
          <span>${tour.duration_days} ${t('days')}</span>
          <span class="bm-difficulty-badge" style="background-color: ${getDifficultyColor(tour.difficulty_level)};">
            ${escapeHtml(getDifficultyTranslated(tour.difficulty_level))}
          </span>
        </div>
        <div class="bm-price">${formatCurrency(tour.price_per_person_eur)}</div>
      </div>
    </div>

    <div class="bm-form-group">
      <label class="bm-label" for="bm-start-date">${t('startDate')}</label>
      <input type="date" id="bm-start-date" class="bm-input" min="${minDate}"
             value="${bookingState.startDate || ''}"
             onchange="window.setStartDate(this.value)">
    </div>

    <div class="bm-form-group">
      <label class="bm-label">${t('numberOfWalkers')}</label>
      <div class="bm-stepper">
        <button class="bm-stepper-btn" onclick="window.decrementWalkers()"
                ${bookingState.walkers <= tour.min_walkers ? 'disabled' : ''}>−</button>
        <div class="bm-stepper-value">${bookingState.walkers}</div>
        <button class="bm-stepper-btn" onclick="window.incrementWalkers()"
                ${bookingState.walkers >= tour.max_walkers ? 'disabled' : ''}>+</button>
      </div>
    </div>

    ${singleRoomHtml}

    <div class="bm-form-group">
      <label class="bm-label">${t('extraRestDays')}</label>
      <div class="bm-stepper">
        <button class="bm-stepper-btn" onclick="window.decrementExtraDays()"
                ${bookingState.extraDays === 0 ? 'disabled' : ''}>−</button>
        <div class="bm-stepper-value">${bookingState.extraDays}</div>
        <button class="bm-stepper-btn" onclick="window.incrementExtraDays()"
                ${bookingState.extraDays >= tour.max_extra_days ? 'disabled' : ''}>+</button>
      </div>
    </div>

    ${extrasHtml}

    <div class="bm-price-summary">
      ${renderPricingSummary(pricing)}
    </div>
  `;

  document.getElementById('bm-title').textContent = t('stepTourExtras');
  renderFooter([
    { label: t('next'), onclick: () => goToStep(2), primary: true },
  ]);
}

function renderStep2() {
  const tour = bookingState.tour;
  const countries = [
    { code: 'DE', name: t('germany') },
    { code: 'NL', name: t('netherlands') },
    { code: 'BE', name: t('belgium') },
    { code: 'AT', name: t('austria') },
    { code: 'FR', name: t('france') },
    { code: 'IE', name: t('ireland') },
    { code: 'GB', name: t('unitedKingdom') },
    { code: 'US', name: t('unitedStates') },
    { code: 'CA', name: t('canada') },
    { code: 'AU', name: t('australia') },
    { code: 'CH', name: t('switzerland') },
    { code: 'OTHER', name: t('other') },
  ];

  const content = document.getElementById('bm-content');

  let additionalTravellersHtml = '';
  for (let i = 1; i < bookingState.walkers; i++) {
    const traveller = bookingState.additionalTravellers[i - 1] || {
      firstName: '',
      lastName: '',
      dietary: '',
    };

    additionalTravellersHtml += `
      <div class="bm-traveller-card">
        <div class="bm-traveller-header">
          <h3 class="bm-traveller-title">${t('traveller')} ${i + 1}</h3>
          <button class="bm-remove-btn" onclick="window.removeTraveller(${i})">
            ${t('remove')}
          </button>
        </div>
        <div class="bm-form-group">
          <label class="bm-label" for="bm-traveller-${i}-fn">${t('firstName')}</label>
          <input type="text" id="bm-traveller-${i}-fn" class="bm-input"
                 value="${escapeHtml(traveller.firstName)}"
                 onchange="window.setTravellerField(${i}, 'firstName', this.value)">
        </div>
        <div class="bm-form-group">
          <label class="bm-label" for="bm-traveller-${i}-ln">${t('lastName')}</label>
          <input type="text" id="bm-traveller-${i}-ln" class="bm-input"
                 value="${escapeHtml(traveller.lastName)}"
                 onchange="window.setTravellerField(${i}, 'lastName', this.value)">
        </div>
        <div class="bm-form-group">
          <label class="bm-label" for="bm-traveller-${i}-diet">${t('dietaryRequirements')}</label>
          <input type="text" id="bm-traveller-${i}-diet" class="bm-input"
                 value="${escapeHtml(traveller.dietary)}"
                 onchange="window.setTravellerField(${i}, 'dietary', this.value)">
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="bm-traveller-card">
      <div class="bm-traveller-header">
        <h3 class="bm-traveller-title">${t('traveller')} 1 (${t('leadTraveller')})</h3>
      </div>
      <div class="bm-form-group">
        <label class="bm-label" for="bm-lead-fn">${t('firstName')} <span style="color: #ef4444;">*</span></label>
        <input type="text" id="bm-lead-fn" class="bm-input"
               value="${escapeHtml(bookingState.leadTraveller.firstName)}"
               onchange="window.setLeadTraveller('firstName', this.value)">
      </div>
      <div class="bm-form-group">
        <label class="bm-label" for="bm-lead-ln">${t('lastName')} <span style="color: #ef4444;">*</span></label>
        <input type="text" id="bm-lead-ln" class="bm-input"
               value="${escapeHtml(bookingState.leadTraveller.lastName)}"
               onchange="window.setLeadTraveller('lastName', this.value)">
      </div>
      <div class="bm-form-group">
        <label class="bm-label" for="bm-lead-email">${t('email')} <span style="color: #ef4444;">*</span></label>
        <input type="email" id="bm-lead-email" class="bm-input"
               value="${escapeHtml(bookingState.leadTraveller.email)}"
               onchange="window.setLeadTraveller('email', this.value)">
      </div>
      <div class="bm-form-group">
        <label class="bm-label" for="bm-lead-phone">${t('phone')}</label>
        <input type="tel" id="bm-lead-phone" class="bm-input"
               value="${escapeHtml(bookingState.leadTraveller.phone)}"
               onchange="window.setLeadTraveller('phone', this.value)">
      </div>
      <div class="bm-form-group">
        <label class="bm-label" for="bm-lead-country">${t('country')} <span style="color: #ef4444;">*</span></label>
        <select id="bm-lead-country" class="bm-select"
                onchange="window.setLeadTraveller('country', this.value)">
          <option value="">${t('country')}</option>
          ${countries.map((c) => `<option value="${c.code}" ${bookingState.leadTraveller.country === c.code ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="bm-form-group">
        <label class="bm-label" for="bm-lead-diet">${t('dietaryRequirements')}</label>
        <input type="text" id="bm-lead-diet" class="bm-input"
               value="${escapeHtml(bookingState.leadTraveller.dietary)}"
               onchange="window.setLeadTraveller('dietary', this.value)">
      </div>
    </div>

    ${additionalTravellersHtml}

    <div class="bm-form-group" style="margin-top: 20px;">
      <label class="bm-label">${t('specialRequests')}</label>
      <textarea class="bm-textarea"
                onchange="window.setSpecialRequests(this.value)">${escapeHtml(bookingState.specialRequests)}</textarea>
    </div>
  `;

  document.getElementById('bm-title').textContent = t('stepTravellerDetails');
  renderFooter([
    { label: t('back'), onclick: () => goToStep(1) },
    { label: t('next'), onclick: () => goToStep(3), primary: true },
  ]);
}

function renderStep3() {
  const content = document.getElementById('bm-content');
  const tour = bookingState.tour;
  const pricing = calcPricing();

  const startDate = new Date(bookingState.startDate + 'T00:00:00');
  const daysUntilStart = getDaysUntilStart(bookingState.startDate);
  const canPayDeposit = daysUntilStart >= BALANCE_DUE_DAYS;

  let paymentMethodHtml = `
    <div class="bm-form-group">
      <label class="bm-label">${t('payByCard')}</label>
      <div class="bm-radio-card ${bookingState.paymentMethod === 'stripe' ? 'bm-active' : ''}"
           onclick="window.setPaymentMethod('stripe')">
        <div class="bm-radio"></div>
        <div class="bm-radio-content">
          <h4 class="bm-radio-label">${t('payByCard')}</h4>
          ${
            canPayDeposit
              ? `<p class="bm-radio-subtitle">${t('payDeposit')} / ${t('payFull')}</p>`
              : `<p class="bm-radio-subtitle">${t('fullPaymentRequired')}</p>`
          }
        </div>
      </div>
    </div>

    <div class="bm-form-group">
      <div class="bm-radio-card ${bookingState.paymentMethod === 'enquiry' ? 'bm-active' : ''}"
           onclick="window.setPaymentMethod('enquiry')">
        <div class="bm-radio"></div>
        <div class="bm-radio-content">
          <h4 class="bm-radio-label">${t('requestBooking')}</h4>
          <p class="bm-radio-subtitle">${t('requestBookingSubtitle')}</p>
        </div>
      </div>
    </div>
  `;

  if (bookingState.paymentMethod === 'stripe' && canPayDeposit) {
    paymentMethodHtml += `
      <div class="bm-form-group">
        <label class="bm-label">${t('payInFull')}</label>
        <div class="bm-card ${bookingState.payFull ? 'bm-active' : ''}"
             onclick="window.togglePayFull()">
          <div class="bm-card-header">
            <input type="checkbox" class="bm-checkbox"
                   ${bookingState.payFull ? 'checked' : ''}
                   onclick="event.stopPropagation()">
            <div class="bm-card-content">
              <p class="bm-card-title">${t('payInFull')}</p>
              <p class="bm-card-description">${t('payInFull')} ${formatCurrency(pricing.subtotal)}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let paymentButtonLabel = '';
  if (bookingState.paymentMethod === 'enquiry') {
    paymentButtonLabel = t('requestBooking');
  } else if (bookingState.paymentMethod === 'stripe') {
    if (canPayDeposit && !bookingState.payFull) {
      paymentButtonLabel = `${t('payDeposit')} ${formatCurrency(pricing.depositAmount)}`;
    } else {
      paymentButtonLabel = `${t('payFull')} ${formatCurrency(pricing.subtotal)}`;
    }
  }

  content.innerHTML = `
    <div class="bm-summary-card">
      <div class="bm-summary-section">
        <h4 class="bm-summary-title">${t('stepTourExtras')}</h4>
        <p class="bm-summary-text"><strong>${escapeHtml(tour.name)}</strong></p>
        <p class="bm-summary-text">
          ${formatDate(bookingState.startDate)} – ${formatDate(calculateEndDate(bookingState.startDate, bookingState.extraDays))}
        </p>
      </div>

      <div class="bm-summary-section">
        <h4 class="bm-summary-title">${t('stepTravellerDetails')}</h4>
        <p class="bm-summary-text">
          ${escapeHtml(bookingState.leadTraveller.firstName)} ${escapeHtml(bookingState.leadTraveller.lastName)}
          ${
            bookingState.additionalTravellers.length > 0
              ? `<br>+ ${bookingState.additionalTravellers.length} ${t('traveller')}${bookingState.additionalTravellers.length > 1 ? 's' : ''}`
              : ''
          }
        </p>
      </div>
    </div>

    <div class="bm-price-summary">
      ${renderPricingSummary(pricing)}
    </div>

    <div class="bm-form-group">
      ${paymentMethodHtml}
    </div>
  `;

  document.getElementById('bm-title').textContent = t('stepReviewPay');
  renderFooter([
    { label: t('back'), onclick: () => goToStep(2) },
    {
      label: bookingState.isSubmitting ? t('processing') : paymentButtonLabel,
      onclick: () => submitBooking(),
      primary: true,
      disabled: bookingState.isSubmitting,
      spinner: bookingState.isSubmitting,
    },
  ]);
}

function renderConfirmation(bookingRef, paymentMethod) {
  const content = document.getElementById('bm-content');
  const isEnquiry = paymentMethod === 'enquiry';

  content.innerHTML = `
    <div class="bm-confirmation">
      <div class="bm-checkmark">
        <svg viewBox="0 0 24 24">
          <path d="M9 16.2L4.8 12m-0 0a6 6 0 1 1 8.485-8.485M9 16.2l5.4-5.4"></path>
        </svg>
      </div>
      <h2 class="bm-confirmation-title">
        ${isEnquiry ? t('bookingRequested') : t('bookingConfirmed')}
      </h2>
      <div class="bm-confirmation-ref">${escapeHtml(bookingRef)}</div>
      <p class="bm-confirmation-message">
        ${isEnquiry ? t('weReceivedRequest') : t('paymentProcessing')}
      </p>

      <div class="bm-next-steps">
        <h4 class="bm-next-steps-title">${t('whatHappensNext')}</h4>
        <ul class="bm-next-steps-list">
          <li class="bm-next-steps-item">${t('confirmAvailability')}</li>
          <li class="bm-next-steps-item">${t('receiveDeparturePack')}</li>
          <li class="bm-next-steps-item">${t('adventureBegins')}</li>
        </ul>
      </div>

      <div class="bm-contact-links">
        <p style="margin: 0; font-weight: 600; color: #1f2937;">${t('contactUs')}</p>
        <a href="mailto:info@walkingholidayireland.com" class="bm-contact-link">
          ${t('email')}
        </a>
        <a href="https://wa.me/353429375983" target="_blank" class="bm-contact-link">
          ${t('whatsapp')}
        </a>
        <a href="tel:+353429375983" class="bm-contact-link">
          ${t('phone')}
        </a>
      </div>
    </div>
  `;

  document.getElementById('bm-title').textContent = '';
  renderFooter([{ label: t('close'), onclick: () => window.closeBookingModal(), primary: true }]);
}

function renderFooter(buttons) {
  const footer = document.getElementById('bm-footer');
  footer.innerHTML = '';
  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.className = `bm-btn ${btn.primary ? 'bm-btn-primary' : 'bm-btn-secondary'}`;
    if (btn.disabled) button.disabled = true;
    button.innerHTML = `${btn.spinner ? '<div class="bm-spinner"></div>' : ''}${btn.label}`;
    if (btn.onclick) {
      button.addEventListener('click', btn.onclick);
    }
    footer.appendChild(button);
  });
}

function renderPricingSummary(pricing) {
  if (!pricing) return '';

  let html = `
    <div class="bm-price-row">
      <span>${bookingState.walkers} × ${formatCurrency(bookingState.tour.price_per_person_eur)} ${t('perPerson')}</span>
      <span class="bm-price-amount">${formatCurrency(pricing.base)}</span>
    </div>
  `;

  if (pricing.singleTravellerSurcharge > 0) {
    html += `
      <div class="bm-price-row">
        <span>${t('singleTravellerSurcharge')}</span>
        <span class="bm-price-amount">${formatCurrency(pricing.singleTravellerSurcharge)}</span>
      </div>
    `;
  }

  if (pricing.singleOccupancySurcharge > 0) {
    html += `
      <div class="bm-price-row">
        <span>${t('singleOccupancySurcharge')}</span>
        <span class="bm-price-amount">${formatCurrency(pricing.singleOccupancySurcharge)}</span>
      </div>
    `;
  }

  if (pricing.extraDaysCost > 0) {
    html += `
      <div class="bm-price-row">
        <span>${t('extraDays')} (${bookingState.extraDays})</span>
        <span class="bm-price-amount">${formatCurrency(pricing.extraDaysCost)}</span>
      </div>
    `;
  }

  if (pricing.extrasTotal > 0) {
    html += `
      <div class="bm-price-row">
        <span>${t('extras')}</span>
        <span class="bm-price-amount">${formatCurrency(pricing.extrasTotal)}</span>
      </div>
    `;
  }

  html += `
    <div class="bm-price-row bm-total">
      <span>${t('total')}</span>
      <span>${formatCurrency(pricing.subtotal)}</span>
    </div>
  `;

  if (bookingState.currentStep === 3 && bookingState.paymentMethod === 'stripe') {
    const daysUntilStart = getDaysUntilStart(bookingState.startDate);
    const canPayDeposit = daysUntilStart >= BALANCE_DUE_DAYS;

    if (canPayDeposit) {
      html += `
        <div style="border-top: 1px solid #d1d5db; margin-top: 12px; padding-top: 12px;">
          <div class="bm-price-row">
            <span>${t('deposit')} (${pricing.depositPercent}%)</span>
            <span class="bm-price-amount">${formatCurrency(pricing.depositAmount)}</span>
          </div>
          <div class="bm-price-row">
            <span>${t('balanceDue')}</span>
            <span class="bm-price-amount">${formatCurrency(pricing.balanceDue)}</span>
          </div>
        </div>
      `;
    }
  }

  return html;
}

function getDifficultyTranslated(level) {
  if (!level) return '';
  const lower = level.toLowerCase();
  if (lower === 'easy') return t('easy');
  if (lower === 'moderate') return t('moderate');
  if (lower === 'challenging') return t('challenging');
  return level;
}

function getPriceTypeLabel(priceType) {
  if (priceType === 'per_person') return t('perPerson');
  if (priceType === 'per_day') return t('perDay');
  if (priceType === 'per_group') return '';
  if (priceType === 'per_person_per_day') return t('perPersonPerDay');
  return '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function goToStep(step) {
  if (step === 2 && !bookingState.startDate) {
    alert(t('selectStartDate'));
    return;
  }
  if (step === 3 && (!bookingState.leadTraveller.firstName || !bookingState.leadTraveller.lastName || !bookingState.leadTraveller.email || !bookingState.leadTraveller.country)) {
    alert(t('enterDetails'));
    return;
  }

  bookingState.currentStep = step;
  if (step === 1) renderStep1();
  else if (step === 2) renderStep2();
  else if (step === 3) renderStep3();
}

// ============================================================================
// STATE SETTERS (Step 1)
// ============================================================================

window.setStartDate = function (value) {
  bookingState.startDate = value;
  renderStep1();
};

window.incrementWalkers = function () {
  if (bookingState.walkers < bookingState.tour.max_walkers) {
    bookingState.walkers++;
    if (bookingState.additionalTravellers.length < bookingState.walkers - 1) {
      bookingState.additionalTravellers.push({ firstName: '', lastName: '', dietary: '' });
    }
    renderStep1();
  }
};

window.decrementWalkers = function () {
  if (bookingState.walkers > bookingState.tour.min_walkers) {
    bookingState.walkers--;
    bookingState.additionalTravellers.pop();
    renderStep1();
  }
};

window.incrementExtraDays = function () {
  if (bookingState.extraDays < bookingState.tour.max_extra_days) {
    bookingState.extraDays++;
    renderStep1();
  }
};

window.decrementExtraDays = function () {
  if (bookingState.extraDays > 0) {
    bookingState.extraDays--;
    renderStep1();
  }
};

window.toggleSingleRoom = function () {
  bookingState.singleRoom = !bookingState.singleRoom;
  renderStep1();
};

window.toggleExtra = function (extraId) {
  const extra = bookingState.extras.find((e) => e.id === extraId);
  const index = bookingState.selectedExtras.findIndex((e) => e.id === extraId);
  if (index >= 0) {
    bookingState.selectedExtras.splice(index, 1);
  } else {
    bookingState.selectedExtras.push(extra);
  }
  renderStep1();
};

// ============================================================================
// STATE SETTERS (Step 2)
// ============================================================================

window.setLeadTraveller = function (field, value) {
  bookingState.leadTraveller[field] = value;
};

window.setTravellerField = function (index, field, value) {
  if (bookingState.additionalTravellers[index - 1]) {
    bookingState.additionalTravellers[index - 1][field] = value;
  }
};

window.setSpecialRequests = function (value) {
  bookingState.specialRequests = value;
};

window.removeTraveller = function (index) {
  if (bookingState.walkers > bookingState.tour.min_walkers) {
    bookingState.walkers--;
    bookingState.additionalTravellers.splice(index - 1, 1);
    renderStep2();
  }
};

// ============================================================================
// STATE SETTERS (Step 3)
// ============================================================================

window.setPaymentMethod = function (method) {
  bookingState.paymentMethod = method;
  if (method === 'enquiry') {
    bookingState.payFull = false;
  }
  renderStep3();
};

window.togglePayFull = function () {
  bookingState.payFull = !bookingState.payFull;
  renderStep3();
};

// ============================================================================
// SUBMISSION
// ============================================================================

window.submitBooking = async function () {
  // Validation
  if (!bookingState.startDate) {
    alert(t('selectStartDate'));
    return;
  }

  if (!bookingState.leadTraveller.firstName || !bookingState.leadTraveller.lastName || !bookingState.leadTraveller.email || !bookingState.leadTraveller.country) {
    alert(t('enterDetails'));
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(bookingState.leadTraveller.email)) {
    alert(t('enterValidEmail'));
    return;
  }

  bookingState.isSubmitting = true;
  if (bookingState.currentStep === 3) {
    renderStep3();
  }

  const tour = bookingState.tour;
  const pricing = calcPricing();
  const daysUntilStart = getDaysUntilStart(bookingState.startDate);
  const canPayDeposit = daysUntilStart >= BALANCE_DUE_DAYS;
  const payFull = !canPayDeposit || bookingState.payFull;

  const endDate = calculateEndDate(bookingState.startDate, bookingState.extraDays);

  const payload = {
    tour_id: tour.id,
    tour_name: tour.name,
    tour_slug: tour.slug,
    start_date: bookingState.startDate,
    end_date: endDate,
    number_of_walkers: bookingState.walkers,
    extra_days: bookingState.extraDays,
    single_occupancy: bookingState.singleRoom,
    lead_traveller: {
      firstName: bookingState.leadTraveller.firstName,
      lastName: bookingState.leadTraveller.lastName,
      email: bookingState.leadTraveller.email,
      phone: bookingState.leadTraveller.phone,
      country: bookingState.leadTraveller.country,
      dietary: bookingState.leadTraveller.dietary,
    },
    additional_travellers: bookingState.additionalTravellers,
    special_requirements: bookingState.specialRequests,
    extras: bookingState.selectedExtras.map((e) => ({
      id: e.id,
      name: e.name,
      price_eur: e.price_eur,
      price_type: e.price_type,
      quantity: 1,
    })),
    pricing: {
      subtotal: pricing.subtotal,
      deposit_amount: pricing.depositAmount,
      balance_due: pricing.balanceDue,
    },
    payment_method: bookingState.paymentMethod,
    pay_full: payFull,
    payment_amount: payFull ? pricing.subtotal : pricing.depositAmount,
    source: 'website',
    language: bookingState.lang || 'en',
    site_origin: window.location.origin,
  };

  try {
    const response = await fetch(SUPABASE_URL + '/functions/v1/process-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.stripe_url) {
      // Redirect to Stripe Checkout
      window.location.href = data.stripe_url;
    } else if (data.success && data.booking_reference) {
      // Show confirmation modal
      renderConfirmation(data.booking_reference, bookingState.paymentMethod);
    } else {
      throw new Error(data.error || 'Booking submission failed');
    }
  } catch (error) {
    console.error('Booking error:', error);
    bookingState.isSubmitting = false;
    renderStep3();
    alert('An error occurred while processing your booking. Please try again.');
  }
};

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

window.openBookingModal = function () {
  // Get data from window
  bookingState.tour = window.__WHI_TOUR;
  bookingState.extras = window.__WHI_EXTRAS || [];
  bookingState.settings = window.__WHI_SETTINGS;
  bookingState.lang = window.__WHI_LANG || 'en';

  if (!bookingState.tour) {
    console.error('Tour data not found. Ensure window.__WHI_TOUR is set.');
    return;
  }

  // Initialize state
  bookingState.currentStep = 1;
  bookingState.startDate = null;
  bookingState.walkers = 1;
  bookingState.singleRoom = false;
  bookingState.extraDays = 0;
  bookingState.selectedExtras = [];
  bookingState.leadTraveller = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    dietary: '',
  };
  bookingState.additionalTravellers = [];
  bookingState.specialRequests = '';
  bookingState.paymentMethod = 'stripe';
  bookingState.payFull = false;
  bookingState.isSubmitting = false;

  // Create modal
  if (!document.getElementById('bm-modal')) {
    createModal();
  }

  // Render step 1
  renderStep1();
};

window.closeBookingModal = function () {
  const overlay = document.getElementById('bm-overlay');
  if (overlay) {
    overlay.classList.add('bm-fade-out');
    overlay.addEventListener('animationend', () => {
      overlay.remove();
    });
  }
};
