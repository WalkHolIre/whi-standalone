# WHI Booking System — Frontend Implementation Prompt

**Scope: whi-standalone repo only (all language sites). For use with Claude Code or Cowork.**

---

## What Already Exists (DO NOT rebuild)

| Component | Where | Status |
|-----------|-------|--------|
| `process-booking` edge function | Supabase (deployed, ACTIVE) | Handles booking creation, customer find-or-create, Stripe Checkout Sessions with localised payment methods, booking_guests, audit logging |
| `tour_extras` table | Supabase | Seeded with 5 standard extras per published tour (Airport Transfers, Lunches, Rest Day, Poles) |
| `global_settings.payment_config` | Supabase | `deposit_percent: 25`, `currency: EUR`, Stripe keys (sandbox/live), mode toggle |
| `global_settings.company_config` | Supabase | `deposit_percentage: 25`, bank details (IBAN, BIC), company address, VAT |
| Bookings management dashboard | whi-ground-control | Full CRUD, payment tracking, status workflow, guest management |
| Email templates & sending | whi-ground-control + Resend | Handled separately — NOT part of whi-standalone |
| German checkout.html | whi-standalone root | Translated (old flow — will be replaced by modal) |
| German booking-success.html | whi-standalone root | Exists, translated |
| German tour page nav/CTA labels | whi-standalone /tours/ | Translated (Jetzt buchen, Ab, pro Person, etc.) |

---

## What Needs To Be Built (Frontend Only)

### 1. Create `js/booking-modal.js`

A multi-step booking modal overlay triggered by "Book Now" buttons on tour pages. It reads embedded JSON data and calls the existing `process-booking` edge function.

**Data sources (embedded in page by build.py at build time):**
```html
<script>
window.__WHI_TOUR = { id, name, slug, duration_days, price_per_person_eur, difficulty_level,
  hero_image, min_walkers, max_walkers, max_extra_days, extra_day_price_eur,
  single_occupancy_surcharge, single_traveller_surcharge };
window.__WHI_EXTRAS = [{ id, name, description, price_eur, price_type, max_quantity, sort_order }];
window.__WHI_SETTINGS = { deposit_percent: 25, currency: "EUR", stripe_publishable_key: "pk_..." };
window.__WHI_LANG = "en"; // or "de" or "nl"
</script>
```

**Step 1 — Tour & Extras:**
- Tour summary card (hero image, name, days, difficulty, price from `__WHI_TOUR`)
- Start date picker (minimum 7 days from today)
- Number of walkers stepper (+/− buttons, respects `min_walkers` / `max_walkers`)
- Single room supplement toggle (show only for 2+ walkers when tour has `single_occupancy_surcharge > 0`)
- Extra rest days stepper (0 to `max_extra_days`)
- Optional extras checkboxes from `__WHI_EXTRAS`
- Live price summary updating in real-time

**Step 2 — Traveller Details:**
- Lead traveller: firstName, lastName, email, phone, country (dropdown), dietary
- Additional travellers (auto-populated from walker count): firstName, lastName, dietary
- Add/remove traveller buttons (updates walker count)
- Special requests textarea

**Step 3 — Review & Pay:**
- Full booking summary (tour, dates, travellers, extras)
- Complete price breakdown
- Deposit vs full payment toggle:
  - Start date ≥ 42 days away → customer chooses deposit OR full (`BALANCE_DUE_DAYS = 42`)
  - Start date < 42 days away → full payment only
  - Deposit percentage from `__WHI_SETTINGS.deposit_percent` (currently 25%)
- Payment method: Card (Stripe), or Request Booking (enquiry)
  - PayPal: show as "coming soon" or hide (backend placeholder only)
- Submit button label changes based on method + amount

**Confirmation Screen (shown after successful API response):**
- Animated success checkmark
- Booking reference (WHI-XXXXXX from API response)
- Different message for enquiry vs paid booking
- "What Happens Next" 3-step guide
- Contact links (email, WhatsApp, phone)

**Price Calculation (client-side, `calcPricing` function):**
```
subtotal = (price_per_person_eur × walkers)
  + single_traveller_surcharge    (if walkers === 1 AND surcharge exists)
  + single_occupancy_surcharge    (if checkbox ticked AND walkers >= 2)
  + (extra_day_price_eur × extra_days × walkers)
  + extras_total
```

**Extras pricing types from `tour_extras.price_type`:**
- `per_person` → price × walkers
- `per_group` → flat price
- `per_day` → price × walking_days (duration_days - 1)
- `per_person_per_day` → price × walkers × walking_days
- `poa` → shows "Price on request", adds €0

**API call (on submit):**
```javascript
POST https://dfguqecbcbbgrttfkwfr.supabase.co/functions/v1/process-booking
Content-Type: application/json

{
  tour_id: __WHI_TOUR.id,
  tour_name: __WHI_TOUR.name,
  tour_slug: __WHI_TOUR.slug,
  start_date: "2026-06-15",
  end_date: "2026-06-22",           // calculated from start + duration + extra_days
  number_of_walkers: 2,
  extra_days: 0,
  single_occupancy: false,
  lead_traveller: { firstName, lastName, email, phone, country, dietary },
  additional_travellers: [{ firstName, lastName, dietary }],
  special_requirements: "...",
  extras: [{ id, name, price_eur, price_type, quantity }],
  pricing: { subtotal: 1798, deposit_amount: 449.50, balance_due: 1348.50 },
  payment_method: "stripe" | "paypal" | "enquiry",
  pay_full: false,
  payment_amount: 449.50,           // actual amount to charge (deposit or full)
  source: "website",
  language: "de",                   // from __WHI_LANG
  site_origin: "https://walkingholidayireland.de"  // for Stripe success/cancel URLs
}
```

**IMPORTANT:** The edge function currently hardcodes `success_url` to `walkingholidayireland.com`. Pass `site_origin` so the edge function can redirect back to the correct language site. *(Edge function update needed — see below.)*

**i18n — all UI strings must be translatable:**
```javascript
const I18N = {
  en: {
    step1Title: "Tour & Extras", selectDate: "Start date", walkers: "Number of walkers",
    singleRoom: "Single room supplement", extraDays: "Extra rest days",
    step2Title: "Traveller Details", firstName: "First name", lastName: "Last name",
    email: "Email", phone: "Phone", country: "Country", dietary: "Dietary requirements",
    specialRequests: "Special requests", addTraveller: "Add traveller",
    step3Title: "Review & Pay", depositLabel: "Deposit", fullPayment: "Pay in full",
    payDeposit: "Pay Deposit", requestBooking: "Request Booking",
    bookingConfirmed: "Booking Confirmed!", bookingRequested: "Booking Requested!",
    // ... etc
  },
  de: {
    step1Title: "Tour & Extras", selectDate: "Startdatum", walkers: "Anzahl der Wanderer",
    singleRoom: "Einzelzimmerzuschlag", extraDays: "Zusätzliche Ruhetage",
    step2Title: "Reisende", firstName: "Vorname", lastName: "Nachname",
    email: "E-Mail", phone: "Telefon", country: "Land", dietary: "Ernährungsbedürfnisse",
    specialRequests: "Besondere Wünsche", addTraveller: "Reisenden hinzufügen",
    step3Title: "Überprüfen & Bezahlen", depositLabel: "Anzahlung", fullPayment: "Vollständig bezahlen",
    payDeposit: "Anzahlung leisten", requestBooking: "Buchung anfragen",
    bookingConfirmed: "Buchung bestätigt!", bookingRequested: "Buchungsanfrage gesendet!",
    // ... etc
  },
  nl: {
    step1Title: "Tour & Extra's", selectDate: "Startdatum", walkers: "Aantal wandelaars",
    singleRoom: "Eenpersoonskamertoeslag", extraDays: "Extra rustdagen",
    step2Title: "Reizigersgegevens", firstName: "Voornaam", lastName: "Achternaam",
    email: "E-mail", phone: "Telefoon", country: "Land", dietary: "Dieetwensen",
    specialRequests: "Speciale verzoeken", addTraveller: "Reiziger toevoegen",
    step3Title: "Controleren & Betalen", depositLabel: "Aanbetaling", fullPayment: "Volledig betalen",
    payDeposit: "Aanbetaling doen", requestBooking: "Boeking aanvragen",
    bookingConfirmed: "Boeking bevestigd!", bookingRequested: "Boekingsaanvraag verzonden!",
    // ... etc
  }
};
const t = I18N[window.__WHI_LANG || 'en'];
```

---

### 2. Create `css/booking-modal.css`

Branded modal styling:
- Brand colours: orange `#F17E00`, purple `#210747`, bright purple `#3F0F87`, mauve `#B58DB6`
- Modal overlay with backdrop blur
- Step indicator (1 → 2 → 3) with progress
- Responsive: full-screen on mobile, centered overlay on desktop
- Smooth step transitions / animations
- Consistent with existing site design (Inter font, rounded corners, shadows)
- Form inputs matching existing site style

---

### 3. Update `website/_templates/tour.html`

In the English build template:

**a) Replace checkout link with modal trigger:**
```html
<!-- OLD -->
<a href="../checkout.html" class="...">Book Now</a>

<!-- NEW -->
<button onclick="openBookingModal()" class="...">Book Now</button>
```

Apply to BOTH Book Now buttons (hero section + sidebar/sticky CTA).

**b) Add CSS and JS includes:**
```html
<!-- In <head> -->
<link rel="stylesheet" href="../css/booking-modal.css"/>

<!-- Before </body> -->
{booking_data_script}
<script src="../js/booking-modal.js"></script>
```

**c) Add `{booking_data_script}` placeholder** — build.py will replace this with the embedded JSON.

---

### 4. Update `build.py`

Add data embedding for the booking modal:

**a) Fetch tour_extras for each tour:**
```python
extras = fetch_supabase('tour_extras', f'&tour_id=eq.{tour_id}&is_active=eq.true&order=sort_order')
```

**b) Fetch global_settings (once, at start of build):**
```python
settings = fetch_supabase('global_settings', "&setting_key=in.(payment_config,company_config)")
```

Extract: `deposit_percent`, `stripe.{mode}.publishable_key`, `currency`.

**c) Generate booking data script for each tour page:**
```python
booking_script = f"""<script>
window.__WHI_TOUR = {json.dumps(tour_data)};
window.__WHI_EXTRAS = {json.dumps(extras_data)};
window.__WHI_SETTINGS = {json.dumps(settings_data)};
window.__WHI_LANG = "en";
</script>"""
```

**d) Replace `{{booking_data_script}}` in rendered HTML.**

---

### 5. Update German tour pages (`/tours/*.html`)

Once `booking-modal.js` and `booking-modal.css` are built:

**a)** Replace `<a href="../checkout.html">Jetzt buchen</a>` with `<button onclick="openBookingModal()">Jetzt buchen</button>` in all 18 tour pages.

**b)** Add CSS/JS includes and `__WHI_LANG = "de"` to each page.

**c)** The JS data (`__WHI_TOUR`, `__WHI_EXTRAS`, `__WHI_SETTINGS`) needs to be manually embedded or generated by a DE build script. Until `build.py` supports `--lang=de`, this can be a one-time script that fetches tour data and injects it.

---

### 6. Create English `booking-success.html`

The German version exists. Create `website/booking-success.html` (English) with:
- Reads `?ref=WHI-XXXXXX` from URL
- Shows animated success icon + booking reference
- "What Happens Next" 3-step guide
- Contact links
- Link back to tours/home

The Stripe Checkout Session redirects here after successful payment.

---

### 7. Multi-language `build.py` support (future)

Add `--lang` argument to `build.py`:
- `python build.py` → English (current behaviour)
- `python build.py --lang=de` → German site
- `python build.py --lang=nl` → Dutch site

When `--lang=de`:
- Fetch from `tour_translations` for translated content
- Set `window.__WHI_LANG = "de"`
- Translate hardcoded template strings (month names, "Day", "ascent", etc.)
- Update canonical/hreflang/OG URLs to `.de` domain
- Set `lang="de"` on `<html>`

This replaces the current manual page-by-page translation approach.

---

## Edge Function Fix Needed (one-line change)

The `process-booking` edge function hardcodes the Stripe success/cancel URLs to `walkingholidayireland.com`. It needs to accept `site_origin` from the frontend and use it:

```typescript
// CURRENT (hardcoded):
"success_url": `https://walkingholidayireland.com/booking-success.html?ref=${bookingRef}`,
"cancel_url": `https://walkingholidayireland.com/tours/${tour_slug}.html?booking=cancelled`,

// SHOULD BE:
const origin = body.site_origin || "https://walkingholidayireland.com";
"success_url": `${origin}/booking-success.html?ref=${bookingRef}`,
"cancel_url": `${origin}/tours/${tour_slug}.html?booking=cancelled`,
```

---

## Supabase Reference

| Item | Value |
|------|-------|
| Project ID | `dfguqecbcbbgrttfkwfr` |
| URL | `https://dfguqecbcbbgrttfkwfr.supabase.co` |
| Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZ3VxZWNiY2JiZ3J0dGZrd2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODY1OTEsImV4cCI6MjA4ODM2MjU5MX0.ckTn_XP0wKdxTK_KELaEq-02gcmSyaBGdA2iAfBuVIk` |
| Edge Function | `POST /functions/v1/process-booking` |
| Deposit % | From `global_settings.payment_config.deposit_percent` (currently 25) |
| Currency | EUR |
| Stripe mode | `global_settings.payment_config.mode` (currently "sandbox") |

### Key Tour Fields (from `tours` table)
`id`, `name`, `slug`, `duration_days`, `price_per_person_eur`, `difficulty_level`, `hero_image`, `min_walkers`, `max_walkers`, `max_extra_days`, `extra_day_price_eur`, `single_occupancy_surcharge`, `single_traveller_surcharge`

### Tour Extras Fields (from `tour_extras` table)
`id`, `tour_id`, `name`, `description`, `price_eur`, `price_type`, `max_quantity`, `is_active`, `sort_order`

**price_type values:** `per_person`, `per_group`, `per_day`, `per_person_per_day`, `poa`

---

## Key Constants

| Constant | Value | Notes |
|----------|-------|-------|
| `BALANCE_DUE_DAYS` | 42 | If start date < 42 days away, full payment required |
| `MIN_ADVANCE_DAYS` | 7 | Earliest bookable date is 7 days from today |
| `deposit_percent` | Read from `__WHI_SETTINGS` | Currently 25, changeable via Ground Control |
| Booking ref format | WHI-XXXXXX | Generated by edge function |

---

## Language Domains

| Language | Domain | `__WHI_LANG` | `site_origin` |
|----------|--------|-------------|---------------|
| English | walkingholidayireland.com | `en` | `https://walkingholidayireland.com` |
| German | walkingholidayireland.de | `de` | `https://walkingholidayireland.de` |
| Dutch | wandelvakantieierland.nl | `nl` | `https://wandelvakantieierland.nl` |

---

## Build Order

1. **booking-modal.js + booking-modal.css** — the core deliverable
2. **Update tour.html template** — wire up the modal
3. **Update build.py** — embed tour data/extras/settings
4. **English booking-success.html** — Stripe redirect landing
5. **Update German tour pages** — swap checkout link for modal
6. **Edge function fix** — accept `site_origin` for Stripe URLs
7. **Multi-language build.py** — generate DE/NL sites from translations (future phase)

---

*Generated March 2026 — Walking Holiday Ireland*
