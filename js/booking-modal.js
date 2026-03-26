/**
 * WHI Booking Modal
 * Complete self-contained JavaScript for the 3-step booking modal
 * Renders on tour pages, submits to Supabase process-booking edge function
 */

const SUPABASE_URL = 'https://dfguqecbcbbgrttfkwfr.supabase.co';
const BALANCE_DUE_DAYS = 42;
const MIN_ADVANCE_DAYS = 21;

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
    bookingConfirmed: 'Booking Request Received!',
    bookingRequested: 'Booking Requested!',
    bookingReference: 'Your booking reference is',
    whatHappensNext: 'What Happens Next',
    whatHappensNextStep1: 'We will start working on your booking and confirm availability before sending you a booking confirmation.',
    whatHappensNextStep2: 'Final payment is due 6 weeks before departure.',
    whatHappensNextStep3: '21 days before departure we will send you your accommodation list and pre-departure documents with itinerary app login details.',
    whatHappensNextStep4: 'Start your holiday knowing all the details have been expertly taken care of by us — relax!',
    whatHappensNextStep5: 'Your walking adventure begins!',
    confirmAvailability: 'We confirm availability and send your booking details',
    receiveDeparturePack: 'You receive your pre-departure pack with itinerary',
    adventureBegins: 'Your walking adventure begins!',
    weReceivedRequest: 'We\'ve received your booking request. Our team will contact you within 24 hours to confirm availability.',
    paymentProcessing: 'Your payment is being processed. You\'ll receive a confirmation email shortly.',
    contactUs: 'Get in touch',
    email: 'Email: info@walkingholidayireland.com',
    whatsapp: 'WhatsApp: +353 42 932 3396',
    phone: 'Phone: +353 42 932 3396',

    // Room assignment
    bedroomAssignment: 'Bedroom Assignment',
    bedroomAssignmentHint: 'Please tell us your preferred room configuration',
    bedroomPlaceholder: 'e.g. 1 double room, or 2 single rooms, or 1 twin room...',
    roomType: 'Room Type',
    roomSingle: 'Single',
    roomDouble: 'Double',
    roomTriple: 'Triple',
    roomFamily: 'Family',

    // T&Cs and mailing
    termsAccept: 'I accept the',
    termsLink: 'Terms & Conditions',
    mailingListOptIn: 'Keep me updated with offers and walking tips',
    termsRequired: 'Please accept the Terms & Conditions to continue',

    // Payment options
    howToProceed: 'How would you like to proceed?',
    payDepositOption: 'Pay Deposit',
    payFullOption: 'Pay in Full',
    requestBookingOption: 'Request Booking',
    noPaymentNow: 'No payment now — we confirm availability first',
    bankTransfer: 'Bank Transfer',
    comingSoon: 'Coming Soon',
    payWith: 'Pay with',

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
    bookingConfirmed: 'Buchungsanfrage erhalten!',
    bookingRequested: 'Buchungsanfrage gesendet!',
    bookingReference: 'Ihre Buchungsreferenz lautet',
    whatHappensNext: 'Was passiert als Nächstes?',
    whatHappensNextStep1: 'Wir werden an Ihrer Buchung arbeiten und die Verfügbarkeit bestätigen, bevor wir Ihnen eine Buchungsbestätigung senden.',
    whatHappensNextStep2: 'Die Restzahlung ist 6 Wochen vor der Abreise fällig.',
    whatHappensNextStep3: '21 Tage vor der Abreise senden wir Ihnen Ihre Unterkunftsliste und Abreisedokumente mit Anmeldedaten der Reiseplan-App.',
    whatHappensNextStep4: 'Starten Sie Ihren Urlaub in dem Wissen, dass alle Details von uns fachgerecht arrangiert wurden — entspannen Sie sich!',
    whatHappensNextStep5: 'Ihr Wanderabenteuer beginnt!',
    confirmAvailability: 'Wir bestätigen die Verfügbarkeit und senden Ihre Buchungsdetails',
    receiveDeparturePack: 'Sie erhalten Ihr Abfahrtspaket mit Reiseplan',
    adventureBegins: 'Ihr Wanderabenteuer beginnt!',
    weReceivedRequest: 'Wir haben Ihre Buchungsanfrage erhalten. Unser Team wird sich innerhalb von 24 Stunden bei Ihnen melden, um die Verfügbarkeit zu bestätigen.',
    paymentProcessing: 'Ihre Zahlung wird verarbeitet. Sie erhalten bald eine Bestätigungsemail.',
    contactUs: 'Kontaktieren Sie uns',
    email: 'E-Mail: info@walkingholidayireland.com',
    whatsapp: 'WhatsApp: +353 42 932 3396',
    phone: 'Telefon: +353 42 932 3396',

    // Room assignment
    bedroomAssignment: 'Zimmerzuweisung',
    bedroomAssignmentHint: 'Bitte teilen Sie uns Ihre bevorzugte Zimmerkonfiguration mit',
    bedroomPlaceholder: 'z.B. 1 Doppelzimmer, oder 2 Einzelzimmer, oder 1 Zweibettzimmer...',
    roomType: 'Zimmertyp',
    roomSingle: 'Einzel',
    roomDouble: 'Doppel',
    roomTriple: 'Dreibett',
    roomFamily: 'Familie',

    // T&Cs and mailing
    termsAccept: 'Ich akzeptiere die',
    termsLink: 'AGB',
    mailingListOptIn: 'Haltet mich über Angebote und Wandertipps auf dem Laufenden',
    termsRequired: 'Bitte akzeptieren Sie die AGB um fortzufahren',

    // Payment options
    howToProceed: 'Wie möchten Sie vorgehen?',
    payDepositOption: 'Anzahlung leisten',
    payFullOption: 'Vollständig bezahlen',
    requestBookingOption: 'Buchung anfragen',
    noPaymentNow: 'Jetzt keine Zahlung — wir bestätigen die Verfügbarkeit zuerst',
    bankTransfer: 'Banküberweisung',
    comingSoon: 'Kommt bald',
    payWith: 'Bezahlen mit',

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
    bookingConfirmed: 'Boekingsaanvraag ontvangen!',
    bookingRequested: 'Boekingsaanvraag verzonden!',
    bookingReference: 'Uw boekingsreferentie is',
    whatHappensNext: 'Wat gebeurt er nu?',
    whatHappensNextStep1: 'We zullen aan uw boeking werken en de beschikbaarheid bevestigen voordat we u een boekingsbevestiging sturen.',
    whatHappensNextStep2: 'Eindige betaling verschuldigd 6 weken voor vertrek.',
    whatHappensNextStep3: '21 dagen voor vertrek sturen we u uw verblijfslijst en vertrekdocumenten met inloggegevens voor de reisroute-app.',
    whatHappensNextStep4: 'Begin uw vakantie met het vertrouwen dat alle details vakkundig door ons zijn verzorgd — ontspan!',
    whatHappensNextStep5: 'Uw wandelavontuur begint!',
    confirmAvailability: 'We bevestigen beschikbaarheid en sturen uw boekingsgegevens',
    receiveDeparturePack: 'U ontvangt uw vertrekpakket met reisschema',
    adventureBegins: 'Uw wandelavontuur begint!',
    weReceivedRequest: 'We hebben uw boekingsaanvraag ontvangen. Ons team zal u binnen 24 uur contacteren om de beschikbaarheid te bevestigen.',
    paymentProcessing: 'Uw betaling wordt verwerkt. U ontvangt binnenkort een bevestigingse-mail.',
    contactUs: 'Neem contact op',
    email: 'E-mail: info@walkingholidayireland.com',
    whatsapp: 'WhatsApp: +353 42 932 3396',
    phone: 'Telefoon: +353 42 932 3396',

    // Room assignment
    bedroomAssignment: 'Kamertoewijzing',
    bedroomAssignmentHint: 'Geef uw voorkeurskamerconfiguratie aan',
    bedroomPlaceholder: 'bijv. 1 tweepersoonskamer, of 2 eenpersoonskamers, of 1 tweepersoonskamer...',
    roomType: 'Kamertype',
    roomSingle: 'Enkel',
    roomDouble: 'Dubbel',
    roomTriple: 'Driepersoons',
    roomFamily: 'Familie',

    // T&Cs and mailing
    termsAccept: 'Ik accepteer de',
    termsLink: 'Algemene voorwaarden',
    mailingListOptIn: 'Houd mij op de hoogte van aanbiedingen en wandeltips',
    termsRequired: 'Accepteer de Algemene Voorwaarden om door te gaan',

    // Payment options
    howToProceed: 'Hoe wilt u verder gaan?',
    payDepositOption: 'Aanbetaling doen',
    payFullOption: 'Volledig betalen',
    requestBookingOption: 'Boeking aanvragen',
    noPaymentNow: 'Nu geen betaling — we bevestigen eerst de beschikbaarheid',
    bankTransfer: 'Bankoverschrijving',
    comingSoon: 'Binnenkort beschikbaar',
    payWith: 'Betaal met',

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
    room: 'double',
  },
  additionalTravellers: [],
  specialRequests: '',
  bedroomAssignment: '',

  // Step 3
  paymentOption: 'deposit', // 'deposit' | 'full' | 'enquiry'
  paymentMethod: 'stripe', // 'stripe' | 'enquiry'
  payFull: false,
  isSubmitting: false,
  termsAccepted: false,
  mailingList: false,
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
  const walkingDays = tour.walking_days || (tour.duration_days - 1);

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
  header.style.background = 'linear-gradient(135deg, #210747 0%, #3F0F87 100%)';
  header.style.padding = '24px 32px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'flex-start';
  header.innerHTML = `
    <div style="flex: 1;">
      <p id="bm-step-label" class="bm-step-label" style="color: white; font-size: 13px; font-weight: 500; margin: 0 0 8px 0;">Step 1 of 4</p>
      <h2 id="bm-step-title" class="bm-step-title" style="color: #F17E00; font-size: 20px; font-weight: 700; margin: 0;">Tour & Extras</h2>
    </div>
    <button class="bm-close-btn" aria-label="${t('close')}" onclick="window.closeBookingModal()" style="background: none; border: none; cursor: pointer; padding: 0; color: white;">
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
// HEADER HELPER
// ============================================================================

function updateHeader(stepNum, subtitle) {
  const stepLabel = document.getElementById('bm-step-label');
  const stepTitle = document.getElementById('bm-step-title');
  if (stepLabel) {
    stepLabel.textContent = `Step ${stepNum} of 4`;
  }
  if (stepTitle) {
    stepTitle.textContent = subtitle;
  }
}

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

  updateHeader(1, t('stepTourExtras'));
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

  // Line-art bed SVG icons
  const bedSvgSingle = '<svg viewBox="0 0 48 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:28px;"><rect x="4" y="6" width="40" height="24" rx="3"/><path d="M8 16h32v8H8z"/><rect x="16" y="10" width="16" height="6" rx="2"/><line x1="4" y1="30" x2="4" y2="34"/><line x1="44" y1="30" x2="44" y2="34"/></svg>';
  const bedSvgDouble = '<svg viewBox="0 0 48 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:28px;"><rect x="4" y="6" width="40" height="24" rx="3"/><path d="M8 16h32v8H8z"/><rect x="10" y="10" width="12" height="6" rx="2"/><rect x="26" y="10" width="12" height="6" rx="2"/><line x1="4" y1="30" x2="4" y2="34"/><line x1="44" y1="30" x2="44" y2="34"/></svg>';
  const bedSvgTriple = '<svg viewBox="0 0 64 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:46px;height:28px;"><rect x="4" y="6" width="56" height="24" rx="3"/><path d="M8 16h48v8H8z"/><rect x="8" y="10" width="14" height="6" rx="2"/><rect x="25" y="10" width="14" height="6" rx="2"/><rect x="42" y="10" width="14" height="6" rx="2"/><line x1="4" y1="30" x2="4" y2="34"/><line x1="60" y1="30" x2="60" y2="34"/></svg>';
  const bedSvgFamily = '<svg viewBox="0 0 58 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:42px;height:32px;"><rect x="4" y="6" width="50" height="24" rx="3"/><path d="M8 16h42v8H8z"/><rect x="10" y="10" width="16" height="6" rx="2"/><rect x="30" y="10" width="16" height="6" rx="2"/><line x1="4" y1="30" x2="4" y2="34"/><line x1="54" y1="30" x2="54" y2="34"/><rect x="14" y="32" width="30" height="10" rx="2"/><path d="M20 38h18v4H20z"/><rect x="22" y="34" width="6" height="4" rx="1.5"/><rect x="30" y="34" width="6" height="4" rx="1.5"/></svg>';

  const roomTypes = [
    { id: 'single', icon: bedSvgSingle, label: t('roomSingle') },
    { id: 'double', icon: bedSvgDouble, label: t('roomDouble') },
    { id: 'triple', icon: bedSvgTriple, label: t('roomTriple') },
    { id: 'family', icon: bedSvgFamily, label: t('roomFamily') },
  ];

  function roomSelector(currentRoom, onchangeFn) {
    return `<div class="bm-form-group">
      <label class="bm-label">${t('roomType')}</label>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${roomTypes.map(r => `<button type="button" onclick="${onchangeFn}('${r.id}')"
          style="flex: 1; min-width: 70px; padding: 10px 4px; border: 2px solid ${currentRoom === r.id ? '#F17E00' : '#e5e7eb'}; border-radius: 8px; background: ${currentRoom === r.id ? '#fff7ed' : 'white'}; cursor: pointer; text-align: center; transition: all 0.2s; color: ${currentRoom === r.id ? '#F17E00' : '#9ca3af'};">
          <div style="display:flex;justify-content:center;">${r.icon}</div>
          <div style="font-size: 11px; font-weight: ${currentRoom === r.id ? '700' : '500'}; color: ${currentRoom === r.id ? '#F17E00' : '#6b7280'}; margin-top: 4px;">${r.label}</div>
        </button>`).join('')}
      </div>
    </div>`;
  }

  let additionalTravellersHtml = '';
  for (let i = 1; i < bookingState.walkers; i++) {
    const traveller = bookingState.additionalTravellers[i - 1] || {
      firstName: '',
      lastName: '',
      dietary: '',
      room: 'double',
    };

    additionalTravellersHtml += `
      <div class="bm-traveller-card">
        <div class="bm-traveller-header">
          <h3 class="bm-traveller-title">${t('traveller')} ${i + 1}</h3>
          <button class="bm-remove-btn" onclick="window.removeTraveller(${i})">
            ${t('remove')}
          </button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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
        </div>
        ${roomSelector(traveller.room || 'double', `window.setTravellerField.bind(null, ${i}, 'room')`)}
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
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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
      ${roomSelector(bookingState.leadTraveller.room || 'double', "window.setLeadTraveller.bind(null, 'room')")}
    </div>

    ${additionalTravellersHtml}

    <div class="bm-form-group" style="margin-top: 20px;">
      <label class="bm-label">${t('specialRequests')}</label>
      <textarea class="bm-textarea"
                onchange="window.setSpecialRequests(this.value)">${escapeHtml(bookingState.specialRequests)}</textarea>
    </div>
  `;

  updateHeader(2, t('stepTravellerDetails'));
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

  // Build payment options
  let paymentOptionsHtml = `
    <div class="bm-form-group">
      <label class="bm-label" style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">${t('howToProceed')}</label>
  `;

  if (canPayDeposit) {
    paymentOptionsHtml += `
      <div class="bm-radio-card ${bookingState.paymentOption === 'deposit' ? 'bm-active' : ''}"
           onclick="window.setPaymentOption('deposit')"
           style="padding: 16px; margin-bottom: 12px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d1d5db; background: ${bookingState.paymentOption === 'deposit' ? '#F17E00' : 'white'};"></div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #1f2937;">${t('payDepositOption')} (25%) — ${formatCurrency(pricing.depositAmount)}</p>
          </div>
        </div>
      </div>
    `;
  }

  paymentOptionsHtml += `
    <div class="bm-radio-card ${bookingState.paymentOption === 'full' ? 'bm-active' : ''}"
         onclick="window.setPaymentOption('full')"
         style="padding: 16px; margin-bottom: 12px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d1d5db; background: ${bookingState.paymentOption === 'full' ? '#F17E00' : 'white'};"></div>
        <div>
          <p style="margin: 0; font-weight: 600; color: #1f2937;">${t('payFullOption')} — ${formatCurrency(pricing.subtotal)}</p>
        </div>
      </div>
    </div>

    <div class="bm-radio-card ${bookingState.paymentOption === 'enquiry' ? 'bm-active' : ''}"
         onclick="window.setPaymentOption('enquiry')"
         style="padding: 16px; margin-bottom: 12px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d1d5db; background: ${bookingState.paymentOption === 'enquiry' ? '#F17E00' : 'white'};"></div>
        <div>
          <p style="margin: 0; font-weight: 600; color: #1f2937;">${t('requestBookingOption')}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">${t('noPaymentNow')}</p>
        </div>
      </div>
    </div>
    </div>
  `;

  // T&Cs and mailing list checkboxes
  const termsAndMailingHtml = `
    <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
      <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-bottom: 12px;">
        <input type="checkbox" id="bm-terms" ${bookingState.termsAccepted ? 'checked' : ''}
               onchange="window.setTermsAccepted(this.checked)"
               style="margin-top: 3px; width: 18px; height: 18px; accent-color: #F17E00;">
        <span style="font-size: 14px; color: #374151;">${t('termsAccept')} <a href="/terms.html" target="_blank" style="color: #F17E00; text-decoration: underline;">${t('termsLink')}</a> <span style="color: #ef4444;">*</span></span>
      </label>
      <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
        <input type="checkbox" id="bm-mailing" ${bookingState.mailingList ? 'checked' : ''}
               onchange="window.setMailingList(this.checked)"
               style="margin-top: 3px; width: 18px; height: 18px; accent-color: #F17E00;">
        <span style="font-size: 14px; color: #374151;">${t('mailingListOptIn')}</span>
      </label>
    </div>
    <div id="bm-terms-error" style="display: none; color: #ef4444; font-size: 13px; margin-top: 8px; padding: 0 4px;">${t('termsRequired')}</div>
  `;

  // Spinner HTML for loading state
  const spinnerSvg = '<svg style="width:20px;height:20px;animation:bm-spin 1s linear infinite;" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M12 2a10 10 0 019.95 9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const submittingStyle = 'opacity: 0.6; pointer-events: none; cursor: wait;';

  // Build payment buttons based on selected option
  let paymentButtonsHtml = '';
  if (bookingState.paymentOption === 'enquiry') {
    paymentButtonsHtml = `
      <div class="bm-form-group" style="margin-top: 24px;">
        <button class="bm-btn bm-btn-primary" onclick="window.submitBooking()" style="width: 100%; padding: 14px; border: none; border-radius: 8px; background: #F17E00; color: white; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; ${bookingState.isSubmitting ? submittingStyle : ''}" ${bookingState.isSubmitting ? 'disabled' : ''}>
          ${bookingState.isSubmitting ? spinnerSvg + ' ' + t('processing') : t('requestBooking')}
        </button>
      </div>
    `;
  } else if (bookingState.isSubmitting) {
    paymentButtonsHtml = `
      <div class="bm-form-group" style="margin-top: 24px; text-align: center; padding: 20px;">
        ${spinnerSvg.replace('width:20px;height:20px;', 'width:32px;height:32px;color:#F17E00;')}
        <p style="margin-top: 12px; color: #6b7280; font-size: 14px;">${t('processing')}</p>
      </div>
    `;
  } else {
    paymentButtonsHtml = `
      <div class="bm-form-group" style="margin-top: 24px;">
        <button class="bm-btn" onclick="window.setPaymentMethodAndSubmit('stripe')" style="width: 100%; padding: 14px; margin-bottom: 12px; border: 2px solid ${bookingState.paymentMethod === 'stripe' ? '#F17E00' : '#e5e7eb'}; border-radius: 8px; background: white; color: #1f2937; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg viewBox="0 0 24 24" style="height:20px;width:20px;" fill="none"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/></svg>
          <span>${t('payByCard')}</span>
          <span style="margin-left: auto; display: flex; gap: 4px; align-items: center;">
            <svg viewBox="0 0 48 32" style="height:20px;" fill="none"><rect width="48" height="32" rx="4" fill="#1A1F71"/><path d="M18.5 21.5l2.1-13h3.4l-2.1 13h-3.4zm14-13l-3.2 9-1.3-6.6-.4-2c-.2-.5-.7-.5-1.3-.5h-5.3l-.1.3c1.3.3 2.7.8 3.5 1.3l3 11.5h3.5l5.3-13h-3.7zm-20.4 0l-3.4 8.9-.4-1.9c-.7-2.3-2.8-4.8-5.2-6l3 11h3.5l5.3-13h-2.8z" fill="white"/><path d="M10.3 8.5c-.3-1.1-1.2-1.4-2.3-1.5H2.1L2 7.3c4 1 6.6 3.5 7.7 6.4l-1.1-5.2c-.2-.8-.8-1-1.3-1z" fill="#F7B600"/></svg>
            <svg viewBox="0 0 48 32" style="height:20px;" fill="none"><rect width="48" height="32" rx="4" fill="#252525"/><circle cx="19" cy="16" r="10" fill="#EB001B"/><circle cx="29" cy="16" r="10" fill="#F79E1B"/><path d="M24 8.8a10 10 0 000 14.4 10 10 0 000-14.4z" fill="#FF5F00"/></svg>
          </span>
        </button>
        <button class="bm-btn" onclick="window.setPaymentMethodAndSubmit('paypal')" style="width: 100%; padding: 14px; margin-bottom: 12px; border: 2px solid ${bookingState.paymentMethod === 'paypal' ? '#F17E00' : '#e5e7eb'}; border-radius: 8px; background: white; color: #1f2937; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg viewBox="0 0 101 32" style="height:22px;" fill="none"><path d="M12.2 4.3h8.1c2.7 0 5.5.2 7.2 2.3 1 1.2 1.4 2.9 1.2 4.7-.7 5-3.8 7.8-8.8 7.8h-2.3c-.7 0-1.2.5-1.3 1.1L15.1 27c-.1.5-.5.8-1 .8H9.8c-.5 0-.9-.5-.8-1l3-21.5c.1-.6.6-1 1.2-1z" fill="#003087"/><path d="M38.5 4.3h8.1c2.7 0 5.5.2 7.2 2.3 1 1.2 1.4 2.9 1.2 4.7-.7 5-3.8 7.8-8.8 7.8h-2.3c-.7 0-1.2.5-1.3 1.1l-1.2 6.8c-.1.5-.5.8-1 .8h-3.6c-.5 0-.9-.5-.8-1l3-21.5c.1-.6.6-1 1.2-1z" fill="#0070E0"/><path d="M70.3 8.6c.3-1.6-.1-2.7-.9-3.7C68.3 3.6 66.2 3 63.4 3h-8.8c-.7 0-1.3.5-1.4 1.2L49.7 27c-.1.5.3 1 .8 1h5.8l1.5-9.3c.1-.6.7-1.2 1.4-1.2h2.9c5.7 0 10.1-2.3 11.4-9 .5-2.8.2-5-.8-6.6z" fill="#003087"/><path d="M70.3 8.6c-.6 3.4-2.5 5.8-5.3 7.2-1.4.7-3.1 1-5 1h-3.5l-1.4 8.9c-.1.5-.5.8-1 .8h-4.3c-.5 0-.9-.5-.8-1l.2-1.4 1.3-8.3.1-.4c.1-.6.7-1.2 1.4-1.2h2.9c5.7 0 10.1-2.3 11.4-9 .5-2.8.2-5-.8-6.6.9.8 1.5 1.8 1.8 3.1 .3 1 .4 2.2.2 3.5l-1.2 7.6z" fill="#0070E0"/></svg>
        </button>
      </div>
    `;
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

    ${paymentOptionsHtml}
    ${termsAndMailingHtml}
    ${paymentButtonsHtml}
  `;

  updateHeader(3, t('stepReviewPay'));
  renderFooter([
    { label: t('back'), onclick: () => goToStep(2) },
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
        ${t('bookingConfirmed')}
      </h2>
      <div class="bm-confirmation-ref">${escapeHtml(bookingRef)}</div>
      <p class="bm-confirmation-message">
        ${isEnquiry ? t('weReceivedRequest') : t('paymentProcessing')}
      </p>

      <div class="bm-next-steps">
        <h4 class="bm-next-steps-title">${t('whatHappensNext')}</h4>
        <ol class="bm-next-steps-list" style="list-style: decimal; padding-left: 20px;">
          <li class="bm-next-steps-item">${t('whatHappensNextStep1')}</li>
          <li class="bm-next-steps-item">${t('whatHappensNextStep2')}</li>
          <li class="bm-next-steps-item">${t('whatHappensNextStep3')}</li>
          <li class="bm-next-steps-item">${t('whatHappensNextStep4')}</li>
          <li class="bm-next-steps-item">${t('whatHappensNextStep5')}</li>
        </ol>
      </div>

      <div class="bm-contact-links">
        <p style="margin: 0; font-weight: 600; color: #1f2937;">${t('contactUs')}</p>
        <a href="mailto:info@walkingholidayireland.com" class="bm-contact-link">
          ${t('email')}
        </a>
        <a href="https://wa.me/353879573856" target="_blank" class="bm-contact-link">
          ${t('whatsapp')}
        </a>
        <a href="tel:+353429323396" class="bm-contact-link">
          ${t('phone')}
        </a>
      </div>
    </div>
  `;

  updateHeader(4, t('bookingConfirmed'));
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
  // Only update price summary, don't re-render entire step
  const priceSummary = document.querySelector('.bm-price-summary');
  if (priceSummary) {
    const pricing = calcPricing();
    priceSummary.innerHTML = renderPricingSummary(pricing);
  }
};

window.incrementWalkers = function () {
  if (bookingState.walkers < bookingState.tour.max_walkers) {
    bookingState.walkers++;
    if (bookingState.additionalTravellers.length < bookingState.walkers - 1) {
      bookingState.additionalTravellers.push({ firstName: '', lastName: '', dietary: '', room: 'double' });
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
  if (field === 'room') renderStep2();
};

window.setTravellerField = function (index, field, value) {
  if (bookingState.additionalTravellers[index - 1]) {
    bookingState.additionalTravellers[index - 1][field] = value;
    if (field === 'room') renderStep2();
  }
};

window.setSpecialRequests = function (value) {
  bookingState.specialRequests = value;
};

window.setBedroomAssignment = function (value) {
  bookingState.bedroomAssignment = value;
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

window.setPaymentOption = function (option) {
  bookingState.paymentOption = option;
  if (option === 'enquiry') {
    bookingState.paymentMethod = 'enquiry';
  } else {
    bookingState.paymentMethod = 'stripe';
  }
  if (option === 'full') {
    bookingState.payFull = true;
  } else {
    bookingState.payFull = false;
  }
  renderStep3();
};

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

window.setTermsAccepted = function (checked) {
  bookingState.termsAccepted = checked;
};

window.setMailingList = function (checked) {
  bookingState.mailingList = checked;
};

window.setPaymentMethodAndSubmit = function (method) {
  if (bookingState.isSubmitting) return; // prevent double-click
  if (!bookingState.termsAccepted) {
    alert(t('termsRequired'));
    return;
  }
  bookingState.paymentMethod = method;
  bookingState.isSubmitting = true;
  renderStep3(); // re-render shows spinner/disabled state
  window.submitBooking();
};

// ============================================================================
// SUBMISSION
// ============================================================================

window.submitBooking = async function () {
  // Validation
  if (!bookingState.termsAccepted) {
    alert(t('termsRequired'));
    return;
  }

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
      room: bookingState.leadTraveller.room || 'double',
    },
    additional_travellers: bookingState.additionalTravellers.map(tr => ({
      firstName: tr.firstName,
      lastName: tr.lastName,
      dietary: tr.dietary,
      room: tr.room || 'double',
    })),
    special_requirements: bookingState.specialRequests,
    bedroom_assignment: bookingState.bedroomAssignment,
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
    mailing_list: bookingState.mailingList,
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
  bookingState.walkers = 2;
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
    room: 'double',
  };
  bookingState.additionalTravellers = [];
  bookingState.specialRequests = '';
  bookingState.bedroomAssignment = '';
  bookingState.paymentOption = 'deposit';
  bookingState.paymentMethod = 'stripe';
  bookingState.payFull = false;
  bookingState.isSubmitting = false;
  bookingState.termsAccepted = false;
  bookingState.mailingList = false;

  // Read sidebar quick-book values
  const sidebarDate = document.getElementById('sidebar-start-date');
  const sidebarWalkers = document.getElementById('sidebar-walkers');
  if (sidebarDate && sidebarDate.value) {
    bookingState.startDate = sidebarDate.value;
  }
  if (sidebarWalkers && sidebarWalkers.value) {
    bookingState.walkers = parseInt(sidebarWalkers.value) || 2;
  }

  // Initialize additionalTravellers array to match walkers count
  bookingState.additionalTravellers = [];
  for (let i = 1; i < bookingState.walkers; i++) {
    bookingState.additionalTravellers.push({
      firstName: '',
      lastName: '',
      dietary: '',
      room: 'double',
    });
  }

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
