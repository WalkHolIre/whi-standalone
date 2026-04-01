/**
 * WHI Booking Modal
 * Complete self-contained JavaScript for the 3-step booking modal
 * Renders on tour pages, submits to Supabase process-booking edge function
 */

const SUPABASE_URL = 'https://dfguqecbcbbgrttfkwfr.supabase.co';
const BALANCE_DUE_DAYS = 42;
const MIN_ADVANCE_DAYS = 20;

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
    // extraDays removed — rest days now handled as tour extras
    extras: 'Extras',
    total: 'Total',
    deposit: 'Deposit',
    balanceDue: 'Balance due',
    payInFull: 'Pay in full',
    fullPaymentRequired: 'Full payment required',

    // Payment
    payByCard: 'Pay Securely',
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
    contactEmail: 'Email: info@walkingholidayireland.com',
    contactWhatsapp: 'WhatsApp: +353 42 932 3396',
    contactPhone: 'Phone: +353 42 932 3396',

    // Room assignment
    bedroomAssignment: 'Bedroom Assignment',
    bedroomAssignmentHint: 'Please tell us your preferred room configuration',
    bedroomPlaceholder: 'e.g. 1 double room, or 2 single rooms, or 1 twin room...',
    roomType: 'Room Type',
    roomSingle: 'Single',
    roomDouble: 'Double',
    roomTwin: 'Twin (2 single beds)',
    roomFamily: 'Double + Single',

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
    bankTransfer: 'Bank Transfer (SEPA/Swift)',
    bankTransferHint: 'We\'ll email you our bank details',
    payWith: 'Pay with',

    // Errors
    selectStartDate: 'Please select a start date',
    dateOutOfSeason: 'This tour runs from {first} to {last}. Please choose a date within that season.',
    dateTooSoon: 'Please select a date at least 20 days from today.',
    enterDetails: 'Please enter your details',
    selectTour: 'Please select a tour',
    enterFirstName: 'Please enter your first name',
    enterLastName: 'Please enter your last name',
    enterValidEmail: 'Please enter a valid email',
    selectCountry: 'Please select a country',

    // Season
    seasonInfo: 'Season: {first} – {last}',

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
    extras: 'Extras',
    total: 'Gesamt',
    deposit: 'Anzahlung',
    balanceDue: 'Restbetrag',
    payInFull: 'Vollständig bezahlen',
    fullPaymentRequired: 'Vollzahlung erforderlich',

    // Payment
    payByCard: 'Sicher bezahlen',
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
    contactEmail: 'E-Mail: info@walkingholidayireland.com',
    contactWhatsapp: 'WhatsApp: +353 42 932 3396',
    contactPhone: 'Telefon: +353 42 932 3396',

    // Room assignment
    bedroomAssignment: 'Zimmerzuweisung',
    bedroomAssignmentHint: 'Bitte teilen Sie uns Ihre bevorzugte Zimmerkonfiguration mit',
    bedroomPlaceholder: 'z.B. 1 Doppelzimmer, oder 2 Einzelzimmer, oder 1 Zweibettzimmer...',
    roomType: 'Zimmertyp',
    roomSingle: 'Einzel',
    roomDouble: 'Doppel',
    roomTwin: 'Twin (2 Einzelbetten)',
    roomFamily: 'Doppel + Einzel',

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
    bankTransfer: 'Banküberweisung (SEPA/Swift)',
    bankTransferHint: 'Wir senden Ihnen unsere Bankdaten per E-Mail',
    payWith: 'Bezahlen mit',

    // Errors
    selectStartDate: 'Bitte wählen Sie ein Startdatum',
    dateOutOfSeason: 'Diese Tour ist von {first} bis {last} verfügbar. Bitte wählen Sie ein Datum in dieser Saison.',
    dateTooSoon: 'Bitte wählen Sie ein Datum mindestens 20 Tage im Voraus.',
    enterDetails: 'Bitte geben Sie Ihre Daten ein',
    selectTour: 'Bitte wählen Sie eine Tour',
    enterFirstName: 'Bitte geben Sie Ihren Vornamen ein',
    enterLastName: 'Bitte geben Sie Ihren Nachname ein',
    enterValidEmail: 'Bitte geben Sie eine gültige E-Mail ein',
    selectCountry: 'Bitte wählen Sie ein Land',

    // Season
    seasonInfo: 'Saison: {first} – {last}',

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
    extras: 'Extra\'s',
    total: 'Totaal',
    deposit: 'Aanbetaling',
    balanceDue: 'Restbedrag',
    payInFull: 'Volledig betalen',
    fullPaymentRequired: 'Volledige betaling vereist',

    // Payment
    payByCard: 'Veilig betalen',
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
    contactEmail: 'E-mail: info@walkingholidayireland.com',
    contactWhatsapp: 'WhatsApp: +353 42 932 3396',
    contactPhone: 'Telefoon: +353 42 932 3396',

    // Room assignment
    bedroomAssignment: 'Kamertoewijzing',
    bedroomAssignmentHint: 'Geef uw voorkeurskamerconfiguratie aan',
    bedroomPlaceholder: 'bijv. 1 tweepersoonskamer, of 2 eenpersoonskamers, of 1 tweepersoonskamer...',
    roomType: 'Kamertype',
    roomSingle: 'Enkel',
    roomDouble: 'Dubbel',
    roomTwin: 'Twin (2 eenpersoonsbedden)',
    roomFamily: 'Dubbel + Enkel',

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
    bankTransfer: 'Bankoverschrijving (SEPA/Swift)',
    bankTransferHint: 'We sturen u onze bankgegevens per e-mail',
    payWith: 'Betaal met',

    // Errors
    selectStartDate: 'Selecteer een startdatum',
    dateOutOfSeason: 'Deze tour is beschikbaar van {first} tot {last}. Kies een datum binnen dat seizoen.',
    dateTooSoon: 'Selecteer een datum minstens 20 dagen van vandaag.',
    enterDetails: 'Vul uw gegevens in',
    selectTour: 'Selecteer een tour',
    enterFirstName: 'Vul uw voornaam in',
    enterLastName: 'Vul uw achternaam in',
    enterValidEmail: 'Vul een geldig e-mailadres in',
    selectCountry: 'Selecteer een land',

    // Season
    seasonInfo: 'Seizoen: {first} – {last}',

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

/**
 * Get the season month range from a tour's best_months array.
 * Returns { firstMonth: 0-11, lastMonth: 0-11, firstName: 'April', lastName: 'October' }
 * or null if no best_months data.
 */
function getSeasonRange(tour) {
  const months = tour && tour.best_months;
  if (!months || !Array.isArray(months) || months.length === 0) return null;

  const monthOrder = ['january','february','march','april','may','june',
                      'july','august','september','october','november','december'];
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

  const indices = [];
  for (const m of months) {
    const cleaned = m.trim().replace(/"/g, '').toLowerCase().slice(0, 3);
    for (let i = 0; i < monthOrder.length; i++) {
      if (monthOrder[i].startsWith(cleaned)) {
        indices.push(i);
        break;
      }
    }
  }
  if (indices.length === 0) return null;

  indices.sort((a, b) => a - b);
  return {
    firstMonth: indices[0],
    lastMonth: indices[indices.length - 1],
    firstName: monthNames[indices[0]],
    lastName: monthNames[indices[indices.length - 1]],
  };
}

/**
 * Translate a month name for display in season hints.
 */
function translateMonth(monthName, lang) {
  const translations = {
    de: { January:'Januar', February:'Februar', March:'März', April:'April',
          May:'Mai', June:'Juni', July:'Juli', August:'August',
          September:'September', October:'Oktober', November:'November', December:'Dezember' },
    nl: { January:'januari', February:'februari', March:'maart', April:'april',
          May:'mei', June:'juni', July:'juli', August:'augustus',
          September:'september', October:'oktober', November:'november', December:'december' },
  };
  if (translations[lang]) return translations[lang][monthName] || monthName;
  return monthName;
}

/**
 * Check whether a date string (YYYY-MM-DD) falls within the tour's season months.
 * Returns true if in season, false if out of season, true if no season data.
 */
function isDateInSeason(dateStr, tour) {
  const season = getSeasonRange(tour);
  if (!season) return true; // no season data = all months OK
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.getMonth(); // 0-11
  return month >= season.firstMonth && month <= season.lastMonth;
}

/**
 * Validate a selected date: must be in season AND >= minDate.
 * Returns { valid: true } or { valid: false, message: '...' }
 */
function validateStartDate(dateStr, tour) {
  if (!dateStr) return { valid: false, message: t('selectStartDate') };

  const lang = bookingState.lang || 'en';
  const minDate = getMinDate();

  // Check minimum advance days
  if (dateStr < minDate) {
    return { valid: false, message: t('dateTooSoon') };
  }

  // Check season
  const season = getSeasonRange(tour);
  if (season) {
    const date = new Date(dateStr + 'T00:00:00');
    const month = date.getMonth();
    if (month < season.firstMonth || month > season.lastMonth) {
      const first = translateMonth(season.firstName, lang);
      const last = translateMonth(season.lastName, lang);
      const msg = t('dateOutOfSeason').replace('{first}', first).replace('{last}', last);
      return { valid: false, message: msg };
    }
  }

  return { valid: true };
}

function calculateEndDate(startDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + bookingState.tour.duration_days - 1);
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

  const subtotal = base + singleTravellerSurcharge + singleOccupancySurcharge + extrasTotal;
  const depositPercent = bookingState.settings?.deposit_percent || 25;
  const depositAmount = Math.round((subtotal * (depositPercent / 100)) * 100) / 100;
  const balanceDue = subtotal - depositAmount;

  return {
    base,
    singleTravellerSurcharge,
    singleOccupancySurcharge,
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
      ${(() => {
        const season = getSeasonRange(tour);
        const lang = bookingState.lang || 'en';
        let seasonMin = minDate;
        let seasonMax = '';
        if (season) {
          // Calculate the earliest valid season start from minDate
          const minD = new Date(minDate + 'T00:00:00');
          const minYear = minD.getFullYear();
          const minMonth = minD.getMonth();
          // If we're past the season end this year, use next year's season start
          let startYear = minYear;
          if (minMonth > season.lastMonth) {
            startYear = minYear + 1;
          }
          // Season start: first day of firstMonth in startYear
          const sStart = new Date(startYear, season.firstMonth, 1);
          // If minDate is already inside or before season, use minDate; otherwise use season start
          if (sStart > minD) {
            seasonMin = sStart.toISOString().split('T')[0];
          }
          // Season end: last day of lastMonth — allow booking into next year too
          const endYear = startYear + 1;
          const sEnd = new Date(endYear, season.lastMonth + 1, 0);
          seasonMax = sEnd.toISOString().split('T')[0];
        }
        return '<input type="date" id="bm-start-date" class="bm-input" min="' + seasonMin + '"'
          + (seasonMax ? ' max="' + seasonMax + '"' : '')
          + ' value="' + (bookingState.startDate || '') + '"'
          + ' onchange="window.setStartDate(this.value)">';
      })()}
      ${(() => {
        const season = getSeasonRange(tour);
        if (season) {
          const lang = bookingState.lang || 'en';
          const first = translateMonth(season.firstName, lang);
          const last = translateMonth(season.lastName, lang);
          const hint = t('seasonInfo').replace('{first}', first).replace('{last}', last);
          return '<p style="margin:4px 0 0;font-size:0.8rem;color:#6b7280;">' + escapeHtml(hint) + '</p>';
        }
        return '';
      })()}
      <p id="bm-date-error" style="display:none;margin:6px 0 0;font-size:0.85rem;color:#ef4444;font-weight:500;"></p>
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
  const bedSvgTwin = '<svg viewBox="0 0 48 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:28px;"><rect x="2" y="6" width="19" height="24" rx="3"/><path d="M5 16h13v8H5z"/><rect x="7" y="10" width="9" height="6" rx="2"/><line x1="2" y1="30" x2="2" y2="34"/><line x1="21" y1="30" x2="21" y2="34"/><rect x="27" y="6" width="19" height="24" rx="3"/><path d="M30 16h13v8H30z"/><rect x="32" y="10" width="9" height="6" rx="2"/><line x1="27" y1="30" x2="27" y2="34"/><line x1="46" y1="30" x2="46" y2="34"/></svg>';
  const bedSvgFamily = '<svg viewBox="0 0 58 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:42px;height:28px;"><rect x="2" y="6" width="32" height="24" rx="3"/><path d="M5 16h26v8H5z"/><rect x="8" y="10" width="9" height="6" rx="2"/><rect x="20" y="10" width="9" height="6" rx="2"/><line x1="2" y1="30" x2="2" y2="34"/><line x1="34" y1="30" x2="34" y2="34"/><rect x="39" y="10" width="16" height="20" rx="3"/><path d="M42 16h10v8H42z"/><rect x="43" y="12" width="8" height="4" rx="1.5"/><line x1="39" y1="30" x2="39" y2="34"/><line x1="55" y1="30" x2="55" y2="34"/></svg>';

  const roomTypes = [
    { id: 'single', icon: bedSvgSingle, label: t('roomSingle') },
    { id: 'double', icon: bedSvgDouble, label: t('roomDouble') },
    { id: 'twin', icon: bedSvgTwin, label: t('roomTwin') },
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
                 placeholder=""
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
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <button class="bm-btn" onclick="window.setPaymentMethodAndSubmit('stripe')" style="padding: 14px 8px; border: 2px solid ${bookingState.paymentMethod === 'stripe' ? '#F17E00' : '#e5e7eb'}; border-radius: 10px; background: linear-gradient(135deg, #210747 0%, #3F0F87 100%); color: white; cursor: pointer; text-align: center;">
            <svg viewBox="0 0 24 24" style="width:22px;height:22px;margin:0 auto 6px;" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <div style="font-size: 13px; font-weight: 600;">${t('payByCard')}</div>
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:3px;margin-top:6px;">
              <span style="background:#1A1F71;color:white;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;">VISA</span>
              <span style="background:#EB001B;color:white;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;">MC</span>
              <span style="background:#fff;color:#cc2277;border:1px solid #ddd;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;">iDEAL</span>
              <span style="background:#FFB3C7;color:#17120F;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700;">Klarna</span>
            </div>
          </button>
          <button class="bm-btn" onclick="window.setPaymentMethodAndSubmit('paypal')" style="padding: 14px 8px; border: 2px solid ${bookingState.paymentMethod === 'paypal' ? '#F17E00' : '#e5e7eb'}; border-radius: 10px; background: #FFC439; cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" style="width:22px;height:22px;margin-bottom:6px;" fill="none" stroke="#253B80" stroke-width="2"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.79a.77.77 0 01.757-.646h6.427c2.134 0 3.727.535 4.728 1.59.47.494.784 1.064.938 1.695.163.668.176 1.463.038 2.432-.01.063-.02.126-.032.19-.363 2.078-1.424 3.503-2.864 4.344-1.39.81-3.09 1.152-4.86 1.152H8.677a.95.95 0 00-.939.803l-.87 5.506-.247 1.565a.497.497 0 01-.49.416z"/></svg>
            <div style="font-size:13px;font-weight:700;"><span style="color:#253B80;">Pay</span><span style="color:#179BD7;">Pal</span></div>
          </button>
          <button class="bm-btn" onclick="window.setPaymentMethodAndSubmit('bank_transfer')" style="padding: 14px 8px; border: 2px solid ${bookingState.paymentMethod === 'bank_transfer' ? '#F17E00' : '#e5e7eb'}; border-radius: 10px; background: white; color: #1f2937; cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" style="width:22px;height:22px;margin-bottom:6px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
            <div style="font-size: 13px; font-weight: 600;">${t('bankTransfer')}</div>
            <div style="font-size:10px;color:#6b7280;margin-top:2px;">${t('bankTransferHint')}</div>
          </button>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="bm-summary-card">
      <div class="bm-summary-section">
        <h4 class="bm-summary-title">${t('stepTourExtras')}</h4>
        <p class="bm-summary-text"><strong>${escapeHtml(tour.name)}</strong></p>
        <p class="bm-summary-text">
          ${formatDate(bookingState.startDate)} – ${formatDate(calculateEndDate(bookingState.startDate))}
        </p>
      </div>

      <div class="bm-summary-section">
        <h4 class="bm-summary-title">${t('stepTravellerDetails')}</h4>
        <div style="font-size:14px;color:#374151;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;">
            <span><strong>1.</strong> ${escapeHtml(bookingState.leadTraveller.firstName)} ${escapeHtml(bookingState.leadTraveller.lastName)} <span style="color:#6b7280;font-size:12px;">(${t('leadTraveller')})</span></span>
            <span style="color:#6b7280;font-size:13px;">${t('roomType')}: ${(() => { const r = bookingState.leadTraveller.room || 'double'; return r === 'single' ? t('roomSingle') : r === 'double' ? t('roomDouble') : r === 'twin' ? t('roomTwin') : t('roomFamily'); })()}</span>
          </div>
          ${bookingState.additionalTravellers.map((tr, i) => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;${i < bookingState.additionalTravellers.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
            <span><strong>${i + 2}.</strong> ${escapeHtml(tr.firstName || '—')} ${escapeHtml(tr.lastName || '—')}</span>
            <span style="color:#6b7280;font-size:13px;">${t('roomType')}: ${(() => { const r = tr.room || 'double'; return r === 'single' ? t('roomSingle') : r === 'double' ? t('roomDouble') : r === 'twin' ? t('roomTwin') : t('roomFamily'); })()}</span>
          </div>`).join('')}
        </div>
      </div>
      ${bookingState.selectedExtras.length > 0 ? `
      <div class="bm-summary-section">
        <h4 class="bm-summary-title">${t('extras')}</h4>
        <div style="font-size:14px;color:#374151;">
          ${bookingState.selectedExtras.map(ex => `<div style="padding:3px 0;">• ${escapeHtml(ex.name)} — ${ex.price_type === 'poa' ? t('priceOnRequest') : formatCurrency(ex.price_eur) + ' ' + getPriceTypeLabel(ex.price_type)}</div>`).join('')}
        </div>
      </div>` : ''}
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
      <div style="text-align:center;margin-bottom:16px;">
        <img src="/images/logo/WHI_Logo.webp" alt="Walking Holiday Ireland" style="height:60px;margin:0 auto;" onerror="this.src='/images/logo/walking_holiday_ireland_logo.jpg';this.onerror=null;">
      </div>
      <h2 class="bm-confirmation-title">
        ${t('bookingConfirmed')}
      </h2>
      <div class="bm-confirmation-ref" style="font-size:28px;font-weight:700;letter-spacing:1px;padding:12px 20px;">${escapeHtml(bookingRef)}</div>
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
          ${t('contactEmail')}
        </a>
        <a href="https://wa.me/353879573856" target="_blank" class="bm-contact-link">
          ${t('contactWhatsapp')}
        </a>
        <a href="tel:+353429323396" class="bm-contact-link">
          ${t('contactPhone')}
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

  if (pricing.extrasTotal > 0 && bookingState.selectedExtras && bookingState.selectedExtras.length > 0) {
    const walkers = bookingState.walkers;
    const walkingDays = bookingState.tour.walking_days || (bookingState.tour.duration_days - 1);
    bookingState.selectedExtras.forEach((extra) => {
      let extraCost = 0;
      if (extra.price_type === 'per_person') extraCost = extra.price_eur * walkers;
      else if (extra.price_type === 'per_group') extraCost = extra.price_eur;
      else if (extra.price_type === 'per_day') extraCost = extra.price_eur * walkingDays;
      else if (extra.price_type === 'per_person_per_day') extraCost = extra.price_eur * walkers * walkingDays;
      if (extraCost > 0) {
        html += `
          <div class="bm-price-row">
            <span>${escapeHtml(extra.name)}</span>
            <span class="bm-price-amount">${formatCurrency(extraCost)}</span>
          </div>
        `;
      }
    });
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
  if (step === 2) {
    const dateCheck = validateStartDate(bookingState.startDate, bookingState.tour);
    if (!dateCheck.valid) {
      alert(dateCheck.message);
      return;
    }
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

  // Validate the selected date
  const errorEl = document.getElementById('bm-date-error');
  if (value) {
    const check = validateStartDate(value, bookingState.tour);
    if (!check.valid) {
      if (errorEl) {
        errorEl.textContent = check.message;
        errorEl.style.display = 'block';
      }
      bookingState.startDate = null;
      return;
    }
  }
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

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
  // Bank transfer submits like an enquiry (no online payment)
  if (method === 'bank_transfer') {
    bookingState.paymentOption = 'bank_transfer';
  }
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

  const dateCheck = validateStartDate(bookingState.startDate, bookingState.tour);
  if (!dateCheck.valid) {
    alert(dateCheck.message);
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

  const endDate = calculateEndDate(bookingState.startDate);

  const payload = {
    tour_id: tour.id,
    tour_name: tour.name,
    tour_slug: tour.slug,
    start_date: bookingState.startDate,
    end_date: endDate,
    number_of_walkers: bookingState.walkers,
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
