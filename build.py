#!/usr/bin/env python3
"""
Walking Holiday Ireland — Pre-render Build System
==================================================
Fetches content from Supabase and generates static HTML pages from templates.

Database schema (WHI Ground Control):
  - tours: name, slug, subtitle, description, highlights, itinerary (jsonb),
           whats_included, whats_not_included, difficulty_level, duration_days,
           price_per_person_eur, best_months (text[]), hero_image, meta_title, seo_description
  - destinations: name, slug, short_description, overview, description, landscape_description,
           cultural_highlights, difficulty_overview, practical_info, best_months (text[]),
           hero_image, points_of_interest (jsonb), meta_title, seo_description
  - reviews: reviewer_name, reviewer_country, rating, title, content, tour_id, status
  - Translations live in tour_translations / destination_translations tables
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from html import escape

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://dfguqecbcbbgrttfkwfr.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZ3VxZWNiY2JiZ3J0dGZrd2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODY1OTEsImV4cCI6MjA4ODM2MjU5MX0.ckTn_XP0wKdxTK_KELaEq-02gcmSyaBGdA2iAfBuVIk')
WEBSITE_DIR = Path(__file__).parent
DRY_RUN = '--dry-run' in sys.argv
VERBOSE = '--verbose' in sys.argv or '-v' in sys.argv
LOCAL_MODE = '--local' in sys.argv

# ── Multilingual URL Configuration ──────────────────────────────────
# Each language gets its own domain/subfolder and translated filenames.
LANG_DOMAINS = {
    'en': 'https://walkingholidayireland.com',
    'de': 'https://walkingholidayireland.de',
    'nl': 'https://walkingholidayireland.com/nl',
}

def lang_url(lang, path):
    """Build an absolute URL for a given language and path."""
    base = LANG_DOMAINS.get(lang, f'https://walkingholidayireland.com/{lang}')
    return f'{base}/{path.lstrip("/")}'

# Translated folder/prefix names per language
TOUR_FOLDER = {'en': 'walking-tours', 'de': 'wandertouren', 'nl': 'wandeltochten'}
WALKING_AREA_PREFIX = {'en': 'walking-area', 'de': 'wandergebiet', 'nl': 'wandelgebied'}
DESTINATION_PREFIX = {'en': 'destination', 'de': 'wanderziel', 'nl': 'wandelbestemming'}

# Translated static page filenames: (en_slug) → {lang: translated_slug}
STATIC_SLUG_MAP = {
    'about':            {'de': 'ueber-uns',            'nl': 'over-ons'},
    'contact':          {'de': 'kontakt',              'nl': 'contact'},
    'how-it-works':     {'de': 'so-funktioniert-es',   'nl': 'hoe-het-werkt'},
    'tour-grading':     {'de': 'tourbewertung',        'nl': 'moeilijkheidsgraad'},
    'tailor-made':      {'de': 'massgeschneidert',     'nl': 'op-maat'},
    'reviews':          {'de': 'bewertungen',          'nl': 'beoordelingen'},
    'self-guided-walking-holidays-ireland': {'de': 'individuelle-wanderferien-irland', 'nl': 'wandelvakantie-ierland-op-eigen-houtje'},
    'solo-walking-holidays-ireland':        {'de': 'solo-wanderurlaub-irland',         'nl': 'solo-wandelvakantie-ierland'},
    'walking-holidays-ireland-over-50s':    {'de': 'wanderurlaub-irland-50-plus',      'nl': 'wandelvakantie-ierland-50-plus'},
    'northern-ireland': {'de': 'nordirland',           'nl': 'noord-ierland'},
    'privacy-policy':   {'de': 'datenschutz',          'nl': 'privacybeleid'},
    'terms-and-conditions': {'de': 'agb',              'nl': 'algemene-voorwaarden'},
    'destinations':     {'de': 'wanderziele-irland',   'nl': 'wandelbestemmingen'},
    'walking-tours':    {'de': 'wandertouren',         'nl': 'wandeltochten'},
}

def translate_static_slug(en_slug, lang):
    """Return the translated filename slug for a static page, or the English slug if no translation."""
    if lang == 'en':
        return en_slug
    return STATIC_SLUG_MAP.get(en_slug, {}).get(lang, en_slug)

# Track generation
generated = {
    'tours': [],
    'destinations': [],
    'errors': []
}

# UI translations for multiple languages
UI_STRINGS = {
    'en': {
        'book_now': 'Book Now',
        'starting_from': 'Starting From',
        'per_person': 'per person',
        'days': 'Days',
        'nights': 'Nights',
        'highlights': 'Highlights',
        'tour_itinerary': 'Tour Itinerary',
        'whats_included': "What's Included",
        'not_included': 'Not Included',
        'best_time_to_visit': 'Best Time to Visit',
        'who_is_it_for': 'Who Is This For?',
        'accommodation': 'Accommodation',
        'similar_walks': "Similar Walks You'll Love",
        'similar_walks_sub': 'Similar difficulty and nearby destinations',
        'walking_tours': 'Walking Tours',
        'walking_holidays': 'Walking Holidays',
        'how_it_works': 'How It Works',
        'about_us': 'About Us',
        'blog': 'Blog',
        'get_in_touch': 'Get in Touch',
        'home': 'Home',
        'overview': 'Overview',
        'get_free_quote': 'Get a Free Quote',
        'proceed_booking': 'Proceed to Booking',
        'ask_question': 'Ask a Question',
        'or_call': 'or call',
        'preferred_start_date': 'Preferred Start Date',
        'book_advance': 'Book at least 28 days in advance',
        'num_walkers': 'Number of Walkers',
        'person_1': '1 Person',
        'people_2': '2 People',
        'people_3': '3 People',
        'people_4': '4+ People',
        'based_on_sharing': 'Based on 2 sharing',
        'no_deposit': 'No deposit required to enquire',
        'free_changes': 'Free changes up to 30 days before',
        'personal_response': 'Personal response within 24 hours',
        'price_match': 'Price Match Promise',
        'price_match_desc': "Found this holiday cheaper? Send us the URL and we'll match the itinerary, services, and price.",
        'your_hosts': 'Your Personal Hosts',
        'host_desc': "Have a question about this tour? We've walked it dozens of times and love helping you plan your trip.",
        'chat_whatsapp': 'Chat on WhatsApp',
        'what_walkers_say': 'What Our Walkers Say',
        'read_all_reviews': 'Read all reviews',
        'faq_title': 'Frequently Asked Questions',
        'view_all_faqs': 'View all FAQs',
        'about_destination': 'About',
        'guide_to_walking': 'Your guide to walking in this stunning region',
        'quick_facts': 'Walking Area Quick Facts',
        'walking_tours_in': 'Walking Tours in',
        'self_guided_desc': 'Self-guided walking holidays with accommodation and luggage transfers included',
        'tailor_made_cta': 'Want something different? Let us create a tailor-made tour for you',
        'the_landscape': 'The Landscape',
        'landscape_sub': 'What to expect along the way',
        'points_of_interest': 'Points of Interest',
        'poi_sub': "Key highlights you'll discover in",
        'things_to_do': 'Things to Do in',
        'things_to_do_sub': 'Top activities and experiences in the area',
        'culture_heritage': 'Culture & Heritage',
        'culture_sub': 'The stories and traditions of',
        'where_youll_stay': "Where You'll Stay",
        'stay_sub': 'Handpicked accommodation along the route',
        'getting_here': 'Getting Here & Practical Info',
        'getting_here_sub': 'Everything you need to know before you go',
        'travel_tips': 'Travel Tips',
        'travel_tips_sub': 'Insider advice for your trip',
        'local_cuisine': 'Local Cuisine',
        'ready_to_walk': 'Ready to Walk',
        'ready_to_walk_desc': 'Let us plan your perfect self-guided walking holiday. Every tour includes accommodation, luggage transfers, maps, and 24/7 local support.',
        'call_us': 'Call Us',
        'footer_tagline': "Self-guided walking holidays through Ireland's most stunning landscapes since 2012. Family-run by Cliff & Louise.",
        'quick_links': 'Quick Links',
        'all_rights': 'Walking Holiday Ireland. All rights reserved.',
        'secure_payments': 'Secure payments powered by Stripe',
        'tailor_made': 'Tailor-Made Tours',
        'contact': 'Contact',
        'difficulty': 'Difficulty',
        'duration': 'Duration',
        'best_months': 'Best Months',
        'from_price': 'From',
        'walking_tour_s': 'Walking Tour(s)',
        'day': 'Day',
        'price_promise': 'Price Promise',
        'best_price_guarantee': 'Best price guarantee — see our price promise',
        'tour_grading': 'Tour Grading & Difficulty',
        'walking': 'Walking',
    },
    'de': {
        'book_now': 'Jetzt Buchen',
        'starting_from': 'Ab',
        'per_person': 'pro Person',
        'days': 'Tage',
        'nights': 'Nächte',
        'highlights': 'Highlights',
        'tour_itinerary': 'Reiseverlauf',
        'whats_included': 'Inklusivleistungen',
        'not_included': 'Nicht Enthalten',
        'best_time_to_visit': 'Beste Reisezeit',
        'who_is_it_for': 'Für wen ist diese Tour?',
        'accommodation': 'Unterkunft',
        'similar_walks': 'Ähnliche Wanderungen',
        'similar_walks_sub': 'Ähnlicher Schwierigkeitsgrad und nahegelegene Ziele',
        'walking_tours': 'Wandertouren',
        'walking_holidays': 'Wanderurlaub',
        'how_it_works': 'So funktioniert es',
        'about_us': 'Über Uns',
        'blog': 'Blog',
        'get_in_touch': 'Kontakt',
        'home': 'Startseite',
        'overview': 'Überblick',
        'get_free_quote': 'Kostenloses Angebot',
        'proceed_booking': 'Zur Buchung',
        'ask_question': 'Frage Stellen',
        'or_call': 'oder anrufen',
        'preferred_start_date': 'Gewünschtes Startdatum',
        'book_advance': 'Buchung mindestens 28 Tage im Voraus',
        'num_walkers': 'Anzahl der Wanderer',
        'person_1': '1 Person',
        'people_2': '2 Personen',
        'people_3': '3 Personen',
        'people_4': '4+ Personen',
        'based_on_sharing': 'Basierend auf 2 Personen',
        'no_deposit': 'Keine Anzahlung für Anfragen erforderlich',
        'free_changes': 'Kostenlose Änderungen bis 30 Tage vorher',
        'personal_response': 'Persönliche Antwort innerhalb von 24 Stunden',
        'price_match': 'Preisgarantie',
        'price_match_desc': 'Diesen Urlaub günstiger gefunden? Senden Sie uns die URL und wir passen Reiseroute, Leistungen und Preis an.',
        'your_hosts': 'Ihre persönlichen Gastgeber',
        'host_desc': 'Haben Sie eine Frage zu dieser Tour? Wir sind sie schon dutzende Male gewandert und helfen Ihnen gerne bei der Planung.',
        'chat_whatsapp': 'Chat auf WhatsApp',
        'what_walkers_say': 'Was unsere Wanderer sagen',
        'read_all_reviews': 'Alle Bewertungen lesen',
        'faq_title': 'Häufig Gestellte Fragen',
        'view_all_faqs': 'Alle FAQs ansehen',
        'about_destination': 'Über',
        'guide_to_walking': 'Ihr Wanderführer durch diese atemberaubende Region',
        'quick_facts': 'Kurzübersicht Wandergebiet',
        'walking_tours_in': 'Wandertouren in',
        'self_guided_desc': 'Individuelle Wanderurlaube mit Unterkunft und Gepäcktransfer inklusive',
        'tailor_made_cta': 'Wünschen Sie etwas anderes? Wir erstellen Ihnen eine maßgeschneiderte Tour',
        'the_landscape': 'Die Landschaft',
        'landscape_sub': 'Was Sie unterwegs erwartet',
        'points_of_interest': 'Sehenswürdigkeiten',
        'poi_sub': 'Wichtige Highlights, die Sie entdecken in',
        'things_to_do': 'Aktivitäten in',
        'things_to_do_sub': 'Top-Aktivitäten und Erlebnisse in der Umgebung',
        'culture_heritage': 'Kultur & Geschichte',
        'culture_sub': 'Die Geschichten und Traditionen von',
        'where_youll_stay': 'Ihre Unterkünfte',
        'stay_sub': 'Handverlesene Unterkünfte entlang der Route',
        'getting_here': 'Anreise & Praktische Infos',
        'getting_here_sub': 'Alles was Sie vor der Reise wissen müssen',
        'travel_tips': 'Reisetipps',
        'travel_tips_sub': 'Insider-Tipps für Ihre Reise',
        'local_cuisine': 'Lokale Küche',
        'ready_to_walk': 'Bereit zum Wandern',
        'ready_to_walk_desc': 'Lassen Sie uns Ihren perfekten individuellen Wanderurlaub planen. Jede Tour beinhaltet Unterkunft, Gepäcktransfer, Karten und 24/7 lokale Unterstützung.',
        'call_us': 'Rufen Sie uns an',
        'footer_tagline': 'Individuelle Wanderurlaube durch Irlands schönste Landschaften seit 2012. Familiengeführt von Cliff & Louise.',
        'quick_links': 'Quicklinks',
        'all_rights': 'Walking Holiday Ireland. Alle Rechte vorbehalten.',
        'secure_payments': 'Sichere Zahlungen mit Stripe',
        'tailor_made': 'Maßgeschneiderte Touren',
        'contact': 'Kontakt',
        'difficulty': 'Schwierigkeitsgrad',
        'duration': 'Dauer',
        'best_months': 'Beste Monate',
        'from_price': 'Ab',
        'walking_tour_s': 'Wandertour(en)',
        'day': 'Tag',
        'price_promise': 'Preisgarantie',
        'best_price_guarantee': 'Bestpreisgarantie — siehe unsere Preisgarantie',
        'tour_grading': 'Tourbewertung & Schwierigkeitsgrad',
        'walking': 'Wandern',
        # Search/filter
        'destination': 'Ziel',
        'all_walking_areas': 'Alle Wandergebiete',
        'any_level': 'Alle Stufen',
        'easy': 'Leicht',
        'moderate': 'Mittelschwer',
        'intermediate': 'Fortgeschritten',
        'challenging': 'Anspruchsvoll',
        'any': 'Alle',
        'find_tours': 'Touren Finden',
        '5_days': '5 Tage',
        '6_days': '6 Tage',
        '7_days': '7 Tage',
        '8_10_days': '8-10 Tage',
        # Homepage CTAs
        'take_fitness_quiz': 'Fitness-Quiz machen',
        'learn_our_story': 'Unsere Geschichte',
        'read_all_reviews': 'Alle 63 Bewertungen lesen →',
        'what_walkers_say': 'Was unsere Wanderer sagen',
        'based_on_reviews': 'Basierend auf 63 verifizierten Bewertungen',
        'explore_region': 'Region erkunden',
        'view_all_areas': 'Alle Wandergebiete ansehen',
        'meet_cliff_louise': 'Treffen Sie Cliff & Louise',
        'stay_updated': 'Bleiben Sie auf dem Laufenden',
        'subscribe': 'Abonnieren',
        'your_questions': 'Ihre Fragen, beantwortet',
        # FAQ items on homepage
        'faq_lost': 'Was passiert, wenn ich mich verlaufe?',
        'faq_luggage': 'Wie funktioniert der Gepäcktransfer?',
        'faq_solo': 'Kann ich alleine wandern?',
        'faq_weather': 'Wie ist das Wetter?',
        'faq_accommodation': 'Welche Unterkünfte nutzen Sie?',
        'faq_booking': 'Wie weit im Voraus sollte ich buchen?',
        # Footer
        'privacy_policy': 'Datenschutzrichtlinie',
        'terms_conditions': 'Allgemeine Geschäftsbedingungen',
        # Navigation dropdown items
        'dingle_peninsula': 'Dingle-Halbinsel',
        'county_kerry': 'County Kerry',
        'dublin_wicklow': 'Dublin & Wicklow',
        'burren_clare': 'Burren & Clare',
        'causeway_coast': 'Causeway Coast',
        'cooley_mournes': 'Cooley & Mournes',
        'barrow_valley': 'Barrow Valley',
        # Regions
        'wild_atlantic_way': 'Wild Atlantic Way',
        'irelands_ancient_east': 'Irlands alter Osten',
        'northern_ireland': 'Nordirland',
        # Countries
        'united_kingdom': 'Vereinigtes Königreich',
        'australia': 'Australien',
        'canada': 'Kanada',
        'germany': 'Deutschland',
        # About page / stats
        'by_the_numbers': 'In Zahlen',
        'years': 'Jahre',
        'happy_walkers': 'Zufriedene Wanderer',
        'tours_stat': 'Touren',
        'destinations_stat': 'Reiseziele',
        'countries_served': 'Bediente Länder',
        'the_team': 'Das Team',
        'cofound_ops': 'Mitgründer & Betrieb',
        'cofound_hosp': 'Mitgründerin & Gastfreundschaft',
        'why_self_guided': 'Warum selbstgeführt?',
        'ready_walk_ireland': 'Bereit, Irland zu erwandern?',
        'all_rights_reserved': 'Alle Rechte vorbehalten.',
        'quick_links_heading': 'Schnelllinks',
        # How It Works page
        'step': 'Schritt',
        'your_email': 'Ihre E-Mail',
        'your_name': 'Ihr Name',
        'your_message': 'Ihre Nachricht',
        'send_message': 'Nachricht senden',
        'phone': 'Telefon',
        'email': 'E-Mail',
        'address': 'Adresse',
    },
    'nl': {
        'book_now': 'Nu Boeken',
        'starting_from': 'Vanaf',
        'per_person': 'per persoon',
        'days': 'Dagen',
        'nights': 'Nachten',
        'highlights': 'Hoogtepunten',
        'tour_itinerary': 'Reisschema',
        'whats_included': 'Inbegrepen',
        'not_included': 'Niet Inbegrepen',
        'best_time_to_visit': 'Beste Reistijd',
        'who_is_it_for': 'Voor wie is deze tour?',
        'accommodation': 'Accommodatie',
        'similar_walks': 'Vergelijkbare Wandelingen',
        'similar_walks_sub': 'Vergelijkbare moeilijkheidsgraad en nabijgelegen bestemmingen',
        'walking_tours': 'Wandeltochten',
        'walking_holidays': 'Wandelvakanties',
        'how_it_works': 'Hoe het werkt',
        'about_us': 'Over Ons',
        'blog': 'Blog',
        'get_in_touch': 'Neem Contact Op',
        'home': 'Home',
        'overview': 'Overzicht',
        'get_free_quote': 'Gratis Offerte',
        'proceed_booking': 'Naar Boeking',
        'ask_question': 'Stel een Vraag',
        'or_call': 'of bel',
        'preferred_start_date': 'Gewenste Startdatum',
        'book_advance': 'Boek minstens 28 dagen van tevoren',
        'num_walkers': 'Aantal Wandelaars',
        'person_1': '1 Persoon',
        'people_2': '2 Personen',
        'people_3': '3 Personen',
        'people_4': '4+ Personen',
        'based_on_sharing': 'Op basis van 2 personen',
        'no_deposit': 'Geen aanbetaling nodig voor een aanvraag',
        'free_changes': 'Gratis wijzigingen tot 30 dagen voor vertrek',
        'personal_response': 'Persoonlijk antwoord binnen 24 uur',
        'price_match': 'Prijsgarantie',
        'price_match_desc': 'Deze vakantie goedkoper gevonden? Stuur ons de URL en wij matchen de route, diensten en prijs.',
        'your_hosts': 'Uw Persoonlijke Gastheren',
        'host_desc': 'Heeft u een vraag over deze tour? Wij hebben hem tientallen keren gelopen en helpen u graag met de planning.',
        'chat_whatsapp': 'Chat via WhatsApp',
        'what_walkers_say': 'Wat Onze Wandelaars Zeggen',
        'read_all_reviews': 'Alle beoordelingen lezen',
        'faq_title': 'Veelgestelde Vragen',
        'view_all_faqs': 'Alle veelgestelde vragen bekijken',
        'about_destination': 'Over',
        'guide_to_walking': 'Uw gids voor wandelen in deze prachtige regio',
        'quick_facts': 'Wandelgebied in het Kort',
        'walking_tours_in': 'Wandeltochten in',
        'self_guided_desc': 'Zelfgeleide wandelvakanties met accommodatie en bagagetransfer inbegrepen',
        'tailor_made_cta': 'Iets anders in gedachten? Laat ons een wandeling op maat voor u samenstellen',
        'the_landscape': 'Het Landschap',
        'landscape_sub': 'Wat u onderweg kunt verwachten',
        'points_of_interest': 'Bezienswaardigheden',
        'poi_sub': 'Belangrijke hoogtepunten die u ontdekt in',
        'things_to_do': 'Activiteiten in',
        'things_to_do_sub': 'Topactiviteiten en ervaringen in de omgeving',
        'culture_heritage': 'Cultuur & Erfgoed',
        'culture_sub': 'De verhalen en tradities van',
        'where_youll_stay': 'Waar U Verblijft',
        'stay_sub': 'Zorgvuldig geselecteerde accommodatie langs de route',
        'getting_here': 'Bereikbaarheid & Praktische Info',
        'getting_here_sub': 'Alles wat u moet weten voor vertrek',
        'travel_tips': 'Reistips',
        'travel_tips_sub': 'Insider-tips voor uw reis',
        'local_cuisine': 'Lokale Keuken',
        'ready_to_walk': 'Klaar om te Wandelen',
        'ready_to_walk_desc': 'Laat ons uw perfecte zelfgeleide wandelvakantie plannen. Elke tour omvat accommodatie, bagagetransfer, kaarten en 24/7 lokale ondersteuning.',
        'call_us': 'Bel Ons',
        'footer_tagline': "Zelfgeleide wandelvakanties door Ierlands mooiste landschappen sinds 2012. Familiebedrijf van Cliff & Louise.",
        'quick_links': 'Snelkoppelingen',
        'all_rights': 'Walking Holiday Ireland. Alle rechten voorbehouden.',
        'secure_payments': 'Veilige betalingen via Stripe',
        'tailor_made': 'Op Maat Gemaakte Tours',
        'contact': 'Contact',
        'difficulty': 'Moeilijkheidsgraad',
        'duration': 'Duur',
        'best_months': 'Beste Maanden',
        'from_price': 'Vanaf',
        'walking_tour_s': 'Wandeltocht(en)',
        'day': 'Dag',
        'price_promise': 'Prijsgarantie',
        'best_price_guarantee': 'Beste prijsgarantie — zie onze prijsbelofte',
        'tour_grading': 'Moeilijkheidsgraad & Beoordeling',
        'walking': 'Wandelen',
        # Search/filter
        'destination': 'Bestemming',
        'all_walking_areas': 'Alle Wandelgebieden',
        'any_level': 'Alle Niveaus',
        'easy': 'Gemakkelijk',
        'moderate': 'Matig',
        'intermediate': 'Gevorderd',
        'challenging': 'Veeleisend',
        'any': 'Alle',
        'find_tours': 'Zoek Tours',
        '5_days': '5 Dagen',
        '6_days': '6 Dagen',
        '7_days': '7 Dagen',
        '8_10_days': '8-10 Dagen',
        # Homepage CTAs
        'take_fitness_quiz': 'Doe de Fitnessquiz',
        'learn_our_story': 'Ons Verhaal',
        'read_all_reviews': 'Alle 63 beoordelingen lezen →',
        'what_walkers_say': 'Wat Onze Wandelaars Zeggen',
        'based_on_reviews': 'Gebaseerd op 63 geverifieerde beoordelingen',
        'explore_region': 'Ontdek Regio',
        'view_all_areas': 'Alle Wandelgebieden Bekijken',
        'meet_cliff_louise': 'Maak Kennis met Cliff & Louise',
        'stay_updated': 'Blijf Op De Hoogte',
        'subscribe': 'Inschrijven',
        'your_questions': 'Uw Vragen, Beantwoord',
        # FAQ items on homepage
        'faq_lost': 'Wat als ik verdwaal?',
        'faq_luggage': 'Hoe werkt de bagagetransfer?',
        'faq_solo': 'Kan ik alleen wandelen?',
        'faq_weather': 'Hoe is het weer?',
        'faq_accommodation': 'Welke accommodatie gebruikt u?',
        'faq_booking': 'Hoe ver van tevoren moet ik boeken?',
        # Footer
        'privacy_policy': 'Privacybeleid',
        'terms_conditions': 'Algemene Voorwaarden',
        # Navigation dropdown items
        'dingle_peninsula': 'Dingle-schiereiland',
        'county_kerry': 'County Kerry',
        'dublin_wicklow': 'Dublin & Wicklow',
        'burren_clare': 'Burren & Clare',
        'causeway_coast': 'Causeway Coast',
        'cooley_mournes': 'Cooley & Mournes',
        'barrow_valley': 'Barrow Valley',
        # Regions
        'wild_atlantic_way': 'Wild Atlantic Way',
        'irelands_ancient_east': 'Oud-Ierland Oost',
        'northern_ireland': 'Noord-Ierland',
        # Countries
        'united_kingdom': 'Verenigd Koninkrijk',
        'australia': 'Australië',
        'canada': 'Canada',
        'germany': 'Duitsland',
        # About page / stats
        'by_the_numbers': 'In Cijfers',
        'years': 'Jaar',
        'happy_walkers': 'Tevreden Wandelaars',
        'tours_stat': 'Tours',
        'destinations_stat': 'Bestemmingen',
        'countries_served': 'Bediende Landen',
        'the_team': 'Het Team',
        'cofound_ops': 'Mede-oprichter & Operatie',
        'cofound_hosp': 'Mede-oprichter & Gastvrijheid',
        'why_self_guided': 'Waarom Zelfgeleid?',
        'ready_walk_ireland': 'Klaar om Ierland te Bewandelen?',
        'all_rights_reserved': 'Alle rechten voorbehouden.',
        'quick_links_heading': 'Snelkoppelingen',
        # How It Works page
        'step': 'Stap',
        'your_email': 'Uw E-mail',
        'your_name': 'Uw Naam',
        'your_message': 'Uw Bericht',
        'send_message': 'Bericht Versturen',
        'phone': 'Telefoon',
        'email': 'E-mail',
        'address': 'Adres',
    }
}


def log(msg, level='info'):
    """Simple logging with level prefix."""
    levels = {'info': '✓', 'warn': '⚠', 'error': '✗', 'debug': '→'}
    prefix = levels.get(level, '•')
    if level != 'debug' or VERBOSE:
        print(f"{prefix} {msg}")


def fetch_supabase(table, filters=None):
    """Fetch data from Supabase REST API."""
    try:
        query = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
        if filters:
            query += filters

        log(f"  REST API: GET {query[:120]}...")

        req = urllib.request.Request(
            query,
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
            }
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            status = response.status
            body = response.read()
            data = json.loads(body)
            log(f"  REST API response: HTTP {status}, {len(data)} rows, {len(body)} bytes")
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')[:500] if hasattr(e, 'read') else 'no body'
        log(f"HTTP Error fetching {table}: {e.code} {e.reason} — body: {body}", 'error')
        if e.code == 401:
            log("Check SUPABASE_KEY is set correctly", 'warn')
        return []
    except Exception as e:
        log(f"Error fetching {table}: {type(e).__name__}: {e}", 'error')
        return []


def get_safe_text(obj, key, default=''):
    """Safely get text from object, converting paragraph breaks to HTML <p> tags."""
    text = obj.get(key) or default
    if not text:
        return default
    # If text already contains <p> tags, return as-is
    if '<p>' in str(text) or '<p ' in str(text):
        return text
    # Convert double newlines to paragraph breaks
    paragraphs = [p.strip() for p in str(text).split('\n\n') if p.strip()]
    if len(paragraphs) <= 1:
        return f'<p>{text}</p>' if text.strip() else default
    return '\n'.join(f'<p>{p}</p>' for p in paragraphs)


def strip_html_tags(text):
    """Remove HTML tags from text for schema markup."""
    if not text:
        return ''
    return re.sub(r'<[^>]+>', '', str(text))


def t(key, lang='en'):
    """Get translated UI string."""
    return UI_STRINGS.get(lang, UI_STRINGS['en']).get(key, UI_STRINGS['en'].get(key, key))


def fetch_translations(lang):
    """Fetch tour and destination translations for a language."""
    log(f"{'─' * 40}")
    log(f"Fetching translations for language: {lang}")
    log(f"{'─' * 40}")

    # Try filtered fetch first
    log(f"Step 1: Filtered fetch tour_translations where language_code={lang}")
    tour_trans = fetch_supabase('tour_translations', f'&language_code=eq.{lang}')
    log(f"  Result: {len(tour_trans) if tour_trans else 0} rows (type: {type(tour_trans).__name__})")

    # If filtered fetch returns empty, try fetching all and filtering in Python
    if not tour_trans:
        log(f"Step 2: Fallback — unfiltered fetch of ALL tour_translations", 'warn')
        all_tour_trans = fetch_supabase('tour_translations')
        log(f"  Result: {len(all_tour_trans) if all_tour_trans else 0} rows")
        if all_tour_trans:
            langs_found = set(tt.get('language_code') for tt in all_tour_trans)
            log(f"  Languages in table: {langs_found}")
            tour_trans = [tt for tt in all_tour_trans if tt.get('language_code') == lang]
            log(f"  After Python filter for '{lang}': {len(tour_trans)} translations")
        else:
            log(f"  Unfiltered fetch ALSO returned empty — table may not be exposed via REST API!", 'error')

    log(f"Final tour translation count: {len(tour_trans or [])}")

    # Destination translations
    log(f"\nStep 3: Filtered fetch destination_translations where language_code={lang}")
    dest_trans = fetch_supabase('destination_translations', f'&language_code=eq.{lang}')
    log(f"  Result: {len(dest_trans) if dest_trans else 0} rows")
    if not dest_trans:
        log(f"Step 4: Fallback — unfiltered fetch of ALL destination_translations", 'warn')
        all_dest_trans = fetch_supabase('destination_translations')
        if all_dest_trans:
            dest_trans = [dt for dt in all_dest_trans if dt.get('language_code') == lang]
            log(f"  After Python filter for '{lang}': {len(dest_trans)} translations")
    log(f"Final destination translation count: {len(dest_trans or [])}")

    # Build lookup dicts
    tour_dict = {tt['tour_id']: tt for tt in (tour_trans or [])}
    dest_dict = {dt['destination_id']: dt for dt in (dest_trans or [])}

    if tour_dict:
        sample_ids = list(tour_dict.keys())[:3]
        log(f"Tour translation IDs (sample): {sample_ids}")
    else:
        log(f"WARNING: Zero tour translations for {lang} — German pages will NOT be generated!", 'warn')

    # Page translations (for static pages like homepage, about, contact)
    log(f"\nStep 5: Fetch page_translations where language_code={lang}")
    page_trans = fetch_supabase('page_translations', f'&language_code=eq.{lang}')
    log(f"  Result: {len(page_trans) if page_trans else 0} rows")
    if not page_trans:
        log(f"Fallback — unfiltered fetch of ALL page_translations", 'warn')
        all_page_trans = fetch_supabase('page_translations')
        if all_page_trans:
            page_trans = [pt for pt in all_page_trans if pt.get('language_code') == lang]
            log(f"  After Python filter for '{lang}': {len(page_trans)} page translations")
    page_dict = {pt['page_slug']: pt for pt in (page_trans or [])}
    log(f"Final page translation count: {len(page_dict)}")
    if page_dict:
        log(f"  Pages with translations: {list(page_dict.keys())}")

    log(f"{'─' * 40}")
    return {
        'tours': tour_dict,
        'destinations': dest_dict,
        'pages': page_dict,
    }


def apply_tour_translation(tour, translation):
    """Merge translation data over English tour data. Only overrides non-empty fields."""
    if not translation:
        return tour
    merged = dict(tour)
    translatable_fields = ['name', 'subtitle', 'description', 'short_description',
                          'highlights', 'whats_included', 'whats_not_included',
                          'meta_title', 'meta_description']
    for field in translatable_fields:
        val = translation.get(field)
        if val and val.strip():
            merged[field] = val
            if field == 'meta_description':
                merged['seo_description'] = val
    return merged


def apply_dest_translation(destination, translation):
    """Merge translation data over English destination data."""
    if not translation:
        return destination
    merged = dict(destination)
    translatable_fields = ['name', 'short_description', 'overview', 'description',
                          'landscape_description', 'cultural_highlights', 'difficulty_overview',
                          'accommodation_style', 'practical_info', 'who_is_it_for',
                          'best_time_to_visit', 'meta_title', 'meta_description']
    for field in translatable_fields:
        val = translation.get(field)
        if val and val.strip():
            merged[field] = val
            if field == 'meta_description':
                merged['seo_description'] = val
    return merged


def translate_html_ui(html, lang):
    """Post-process HTML to replace English UI strings with translated versions."""
    if lang == 'en':
        return html
    replacements = {
        '>Home<': f'>{t("home", lang)}<',
        '>Walking Tours<': f'>{t("walking_tours", lang)}<',
        '>Walking Holidays<': f'>{t("walking_holidays", lang)}<',
        '>How It Works<': f'>{t("how_it_works", lang)}<',
        '>Tour Grading &amp; Difficulty<': f'>{t("tour_grading", lang)}<',
        '>Tour Grading & Difficulty<': f'>{t("tour_grading", lang)}<',
        '>About Us<': f'>{t("about_us", lang)}<',
        '>Blog<': f'>{t("blog", lang)}<',
        '>Get in Touch<': f'>{t("get_in_touch", lang)}<',
        '>Overview<': f'>{t("overview", lang)}<',
        '>Starting From<': f'>{t("starting_from", lang)}<',
        '>Book Now<': f'>{t("book_now", lang)}<',
        '>per person<': f'>{t("per_person", lang)}<',
        '>Highlights<': f'>{t("highlights", lang)}<',
        '>Tour Itinerary<': f'>{t("tour_itinerary", lang)}<',
        ">What's Included<": f'>{t("whats_included", lang)}<',
        '>Not Included<': f'>{t("not_included", lang)}<',
        '>Best Time to Visit<': f'>{t("best_time_to_visit", lang)}<',
        '>Who Is This For?<': f'>{t("who_is_it_for", lang)}<',
        '>Accommodation<': f'>{t("accommodation", lang)}<',
        ">Similar Walks You'll Love<": f'>{t("similar_walks", lang)}<',
        '>Similar difficulty and nearby destinations<': f'>{t("similar_walks_sub", lang)}<',
        '>Proceed to Booking<': f'>{t("proceed_booking", lang)}<',
        '>Ask a Question<': f'>{t("ask_question", lang)}<',
        '>or call<': f'>{t("or_call", lang)}<',
        '>Preferred Start Date<': f'>{t("preferred_start_date", lang)}<',
        '>Book at least 28 days in advance<': f'>{t("book_advance", lang)}<',
        '>Number of Walkers<': f'>{t("num_walkers", lang)}<',
        '>1 Person<': f'>{t("person_1", lang)}<',
        '>2 People<': f'>{t("people_2", lang)}<',
        '>3 People<': f'>{t("people_3", lang)}<',
        '>4+ People<': f'>{t("people_4", lang)}<',
        '>Based on 2 sharing<': f'>{t("based_on_sharing", lang)}<',
        '>No deposit required to enquire<': f'>{t("no_deposit", lang)}<',
        '>Free changes up to 30 days before<': f'>{t("free_changes", lang)}<',
        '>Personal response within 24 hours<': f'>{t("personal_response", lang)}<',
        '>Price Match Promise<': f'>{t("price_match", lang)}<',
        '>Your Personal Hosts<': f'>{t("your_hosts", lang)}<',
        '>Chat on WhatsApp<': f'>{t("chat_whatsapp", lang)}<',
        '>Get a Free Quote<': f'>{t("get_free_quote", lang)}<',
        '>Walking Area Quick Facts<': f'>{t("quick_facts", lang)}<',
        '>The Landscape<': f'>{t("the_landscape", lang)}<',
        '>What to expect along the way<': f'>{t("landscape_sub", lang)}<',
        '>Points of Interest<': f'>{t("points_of_interest", lang)}<',
        '>Culture & Heritage<': f'>{t("culture_heritage", lang)}<',
        ">Where You'll Stay<": f'>{t("where_youll_stay", lang)}<',
        '>Handpicked accommodation along the route<': f'>{t("stay_sub", lang)}<',
        '>Getting Here & Practical Info<': f'>{t("getting_here", lang)}<',
        '>Everything you need to know before you go<': f'>{t("getting_here_sub", lang)}<',
        '>Travel Tips<': f'>{t("travel_tips", lang)}<',
        '>Insider advice for your trip<': f'>{t("travel_tips_sub", lang)}<',
        '>Local Cuisine<': f'>{t("local_cuisine", lang)}<',
        '>Call Us<': f'>{t("call_us", lang)}<',
        '>Quick Links<': f'>{t("quick_links", lang)}<',
        '>Tailor-Made Tours<': f'>{t("tailor_made", lang)}<',
        '>Contact<': f'>{t("contact", lang)}<',
        '>Secure payments powered by Stripe<': f'>{t("secure_payments", lang)}<',
        '>Difficulty<': f'>{t("difficulty", lang)}<',
        '>Duration<': f'>{t("duration", lang)}<',
        '>Best Months<': f'>{t("best_months", lang)}<',

        # Search/filter section
        '>Destination<': f'>{t("destination", lang)}<',
        '>All Walking Areas<': f'>{t("all_walking_areas", lang)}<',
        '>Any Level<': f'>{t("any_level", lang)}<',
        '>Easy<': f'>{t("easy", lang)}<',
        '>Moderate<': f'>{t("moderate", lang)}<',
        '>Intermediate<': f'>{t("intermediate", lang)}<',
        '>Challenging<': f'>{t("challenging", lang)}<',
        '>Any<': f'>{t("any", lang)}<',
        '>5 Days<': f'>{t("5_days", lang)}<',
        '>6 Days<': f'>{t("6_days", lang)}<',
        '>7 Days<': f'>{t("7_days", lang)}<',
        '>8-10 Days<': f'>{t("8_10_days", lang)}<',
        '>Find Tours<': f'>{t("find_tours", lang)}<',

        # Homepage CTAs & sections
        '>Take the Fitness Quiz<': f'>{t("take_fitness_quiz", lang)}<',
        '>Learn Our Story<': f'>{t("learn_our_story", lang)}<',
        '>Read all 63 reviews →<': f'>{t("read_all_reviews", lang)}<',
        '>What Our Walkers Say<': f'>{t("what_walkers_say", lang)}<',
        '>Based on 63 verified reviews<': f'>{t("based_on_reviews", lang)}<',
        '>Explore Region <': f'>{t("explore_region", lang)} <',
        '>View All Walking Areas<': f'>{t("view_all_areas", lang)}<',
        '>Meet Cliff & Louise<': f'>{t("meet_cliff_louise", lang)}<',
        '>Meet Cliff &amp; Louise<': f'>{t("meet_cliff_louise", lang)}<',
        '>Stay Updated on Walking Ireland<': f'>{t("stay_updated", lang)}<',
        '>Subscribe<': f'>{t("subscribe", lang)}<',
        '>Your Questions, Answered<': f'>{t("your_questions", lang)}<',

        # Homepage FAQ items
        '>What if I get lost?<': f'>{t("faq_lost", lang)}<',
        '>How does luggage transfer work?<': f'>{t("faq_luggage", lang)}<',
        '>Can I walk solo?<': f'>{t("faq_solo", lang)}<',
        ">What's the weather like?<": f'>{t("faq_weather", lang)}<',
        '>What accommodation do you use?<': f'>{t("faq_accommodation", lang)}<',
        '>How far in advance should I book?<': f'>{t("faq_booking", lang)}<',

        # Footer
        '>Privacy Policy<': f'>{t("privacy_policy", lang)}<',
        '>Terms & Conditions<': f'>{t("terms_conditions", lang)}<',
        '>Terms &amp; Conditions<': f'>{t("terms_conditions", lang)}<',

        # Navigation dropdown items
        '>Dingle Peninsula<': f'>{t("dingle_peninsula", lang)}<',
        '>County Kerry<': f'>{t("county_kerry", lang)}<',
        '>Dublin &amp; Wicklow<': f'>{t("dublin_wicklow", lang)}<',
        '>Dublin & Wicklow<': f'>{t("dublin_wicklow", lang)}<',
        '>The Burren &amp; Clare<': f'>{t("burren_clare", lang)}<',
        '>The Burren & Clare<': f'>{t("burren_clare", lang)}<',
        '>Causeway Coast<': f'>{t("causeway_coast", lang)}<',
        '>Cooley &amp; Mournes<': f'>{t("cooley_mournes", lang)}<',
        '>Cooley & Mournes<': f'>{t("cooley_mournes", lang)}<',
        '>The Barrow Valley<': f'>{t("barrow_valley", lang)}<',

        # Region names (on cards etc.)
        '>Wild Atlantic Way<': f'>{t("wild_atlantic_way", lang)}<',
        ">Ireland's Ancient East<": f'>{t("irelands_ancient_east", lang)}<',
        '>Ireland&#x27;s Ancient East<': f'>{t("irelands_ancient_east", lang)}<',
        '>Northern Ireland<': f'>{t("northern_ireland", lang)}<',

        # Countries (reviewer attributions)
        '>United Kingdom<': f'>{t("united_kingdom", lang)}<',
        '>Australia<': f'>{t("australia", lang)}<',
        '>Canada<': f'>{t("canada", lang)}<',
        '>Germany<': f'>{t("germany", lang)}<',

        # Footer tagline
        ">Self-guided walking holidays through Ireland's most stunning landscapes since 2012. Family-run by Cliff & Louise.<": f'>{t("footer_tagline", lang)}<',

        # About page / stats section
        '>By The Numbers<': f'>{t("by_the_numbers", lang)}<',
        '>Years<': f'>{t("years", lang)}<',
        '>Happy Walkers<': f'>{t("happy_walkers", lang)}<',
        '>Countries Served<': f'>{t("countries_served", lang)}<',
        '>The Team<': f'>{t("the_team", lang)}<',
        '>Co-Founder & Operations<': f'>{t("cofound_ops", lang)}<',
        '>Co-Founder &amp; Operations<': f'>{t("cofound_ops", lang)}<',
        '>Co-Founder & Hospitality<': f'>{t("cofound_hosp", lang)}<',
        '>Co-Founder &amp; Hospitality<': f'>{t("cofound_hosp", lang)}<',
        '>Why Self-Guided?<': f'>{t("why_self_guided", lang)}<',
        '>Ready to Walk Ireland?<': f'>{t("ready_walk_ireland", lang)}<',
        '>All rights reserved.<': f'>{t("all_rights_reserved", lang)}<',

        # Contact page
        '>Your Name<': f'>{t("your_name", lang)}<',
        '>Your Email<': f'>{t("your_email", lang)}<',
        '>Your Message<': f'>{t("your_message", lang)}<',
        '>Send Message<': f'>{t("send_message", lang)}<',
        '>Phone<': f'>{t("phone", lang)}<',
        '>Email<': f'>{t("email", lang)}<',
        '>Address<': f'>{t("address", lang)}<',
    }
    for en_text, translated_text in replacements.items():
        html = html.replace(en_text, translated_text)
    return html


def render_accommodation_type_badges(accommodation_type):
    """Render accommodation type badges from a Postgres text array."""
    if not accommodation_type:
        return ''
    labels = {
        'b_and_b': 'B&B / Guesthouse',
        'hotel': 'Hotel',
        'hostel': 'Hostel',
        'self_catering': 'Self-Catering',
    }
    types = accommodation_type if isinstance(accommodation_type, list) else []
    if not types:
        return ''
    badges = []
    for t in types:
        label = labels.get(t, t.replace('_', ' ').title())
        badges.append(f'<span style="display:inline-block;padding:0.375rem 1rem;border-radius:9999px;font-size:0.875rem;font-weight:600;background:rgba(181,141,182,0.15);color:#210747;border:1px solid rgba(181,141,182,0.3);margin-right:0.5rem;margin-bottom:0.5rem;">{label}</span>')
    return f'<div style="margin-bottom:1.5rem;">{"".join(badges)}</div>'


def render_highlights(highlights_text):
    """Convert highlights to POI-style HTML cards (title, description, optional image).

    Supports three data shapes:
    1. JSON array of objects: [{"title": "...", "description": "...", "image_url": "..."}]
    2. JSON array of strings: ["highlight text", ...]
    3. Plain text (newline-separated, optionally with **Title** markdown headers)

    Max 4 highlights rendered in a 2×2 grid.
    """
    if not highlights_text:
        return ""

    # Parse input
    highlights = None
    try:
        parsed = json.loads(highlights_text) if isinstance(highlights_text, str) and highlights_text.strip().startswith('[') else None
        if isinstance(parsed, list):
            highlights = parsed
    except (json.JSONDecodeError, TypeError):
        pass

    if highlights is None:
        # Plain text: try to parse markdown blocks separated by double newlines
        # Supports: "**Title**\nDescription", "- **Title:** Description", plain text
        raw = str(highlights_text)
        blocks = re.split(r'\n{2,}', raw)
        highlights = []
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            # Strip leading bullet markers with regex (preserves ** markers)
            block = re.sub(r'^[-•]\s*', '', block)
            lines = block.split('\n')
            first_line = lines[0].strip()

            # Pattern 1: "**Title**" as its own line, description on following lines
            title_only = re.match(r'^\*\*(?:\d+\.\s*)?(.+?)\*\*\s*$', first_line)
            if title_only and len(lines) > 1:
                title = title_only.group(1).strip()
                desc = ' '.join(l.strip() for l in lines[1:] if l.strip())
                highlights.append({'title': title, 'description': desc})
                continue

            # Pattern 2: "**Title:** Description text" on one line
            bold_split = re.match(r'^\*\*(?:\d+\.\s*)?(.+?)\*\*[:\s]*(.+)$', first_line, re.DOTALL)
            if bold_split:
                title = bold_split.group(1).strip().rstrip(':')
                desc = bold_split.group(2).strip()
                # Append any extra lines
                if len(lines) > 1:
                    desc += ' ' + ' '.join(l.strip() for l in lines[1:] if l.strip())
                highlights.append({'title': title, 'description': desc.strip()})
                continue

            # Pattern 3: Plain text (no markdown)
            plain = re.sub(r'\*\*(.+?)\*\*', r'\1', block)
            if plain.strip():
                highlights.append(plain.strip())

    # Limit to 4 highlights
    highlights = highlights[:4]

    html = ""
    for hl in highlights:
        if not hl:
            continue

        # Normalize: could be a dict (object) or a plain string
        if isinstance(hl, dict):
            title = escape(hl.get('title') or hl.get('name', ''))
            description = escape(hl.get('description', ''))
            image_url = hl.get('image_url') or hl.get('image', '')
        else:
            # Plain string — try to split "**Title:** description" or use as-is
            s = str(hl).strip().lstrip('- ')
            bold_match = re.match(r'^\*\*(.+?)\*\*[:\s]*(.*)$', s, re.DOTALL)
            if bold_match:
                title = escape(bold_match.group(1).strip().lstrip('0123456789. '))
                description = escape(bold_match.group(2).strip())
            else:
                title = escape(re.sub(r'\*\*(.+?)\*\*', r'\1', s))
                description = ''
            image_url = ''

        if not title:
            continue

        if image_url:
            # POI-style card with image
            html += f"""        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                <div class="aspect-[16/10] overflow-hidden">
                    <img src="{escape(image_url)}" alt="{title}" class="w-full h-full object-cover" loading="lazy"/>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-lg mb-2">{title}</h3>
                    <p class="text-slate-600 text-sm leading-relaxed">{description}</p>
                </div>
            </div>
"""
        elif description:
            # Card with title and description but no image
            html += f"""        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all">
                <div class="flex items-start gap-3 mb-3">
                    <span class="material-symbols-outlined text-primary text-2xl shrink-0 mt-0.5">landscape</span>
                    <h3 class="font-bold text-lg leading-tight">{title}</h3>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">{description}</p>
            </div>
"""
        else:
            # Simple text-only card (legacy format)
            html += f"""        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary text-2xl">check_circle</span>
                    <h3 class="font-bold text-lg leading-tight">{title}</h3>
                </div>
            </div>
"""
    return html


def render_gallery(gallery_data):
    """Render an image gallery with masonry layout and lightbox."""
    if not gallery_data:
        return ""

    urls = []
    if isinstance(gallery_data, list):
        urls = gallery_data
    elif isinstance(gallery_data, str):
        # Postgres text[] comes as {url1,url2,...}
        cleaned = gallery_data.strip('{}')
        if cleaned:
            urls = [u.strip('"').strip() for u in cleaned.split(',') if u.strip()]

    if not urls:
        return ""

    html = ""
    for i, url in enumerate(urls):
        url = escape(url)
        if i == 0:
            html += f"""        <div class="md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto rounded-xl overflow-hidden cursor-pointer group" onclick="openLightbox({i})">
            <img src="{url}" alt="Tour gallery image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
        </div>
"""
        else:
            html += f"""        <div class="aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group" onclick="openLightbox({i})">
            <img src="{url}" alt="Tour gallery image" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"/>
        </div>
"""
    return html


def render_included_excluded(whats_included, whats_not_included):
    """Render what's included and not included as two side-by-side lists."""
    def parse_items(text):
        if not text:
            return []
        items = []
        for line in str(text).split('\n'):
            line = line.strip()
            # Strip leading bullet markers
            line = re.sub(r'^[-•*]+\s*', '', line)
            # Strip markdown bold markers like "**Title:** text" → "Title: text"
            line = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
            line = line.strip()
            if line:
                items.append(line)
        return items

    included = parse_items(whats_included)
    excluded = parse_items(whats_not_included)

    if not included and not excluded:
        return ""

    html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-8">'

    if included:
        html += '\n    <div class="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100">'
        html += '\n        <h3 class="text-xl font-bold mb-5 flex items-center gap-2"><span class="material-symbols-outlined text-emerald-600">check_circle</span> What\'s Included</h3>'
        html += '\n        <ul class="space-y-3">'
        for item in included:
            html += f'\n            <li class="flex gap-3 text-slate-700 text-sm"><span class="material-symbols-outlined text-emerald-500 text-lg shrink-0">done</span><span>{escape(item)}</span></li>'
        html += '\n        </ul>'
        html += '\n    </div>'

    if excluded:
        html += '\n    <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200">'
        html += '\n        <h3 class="text-xl font-bold mb-5 flex items-center gap-2"><span class="material-symbols-outlined text-slate-400">block</span> Not Included</h3>'
        html += '\n        <ul class="space-y-3">'
        for item in excluded:
            html += f'\n            <li class="flex gap-3 text-slate-500 text-sm"><span class="material-symbols-outlined text-slate-400 text-lg shrink-0">close</span><span>{escape(item)}</span></li>'
        html += '\n        </ul>'
        html += '\n    </div>'

    html += '\n</div>'
    return html


def render_itinerary(itinerary_data, routes_by_id=None):
    """Convert itinerary JSONB to HTML day cards."""
    if not itinerary_data:
        return ""

    try:
        days = json.loads(itinerary_data) if isinstance(itinerary_data, str) else itinerary_data
    except (json.JSONDecodeError, TypeError):
        return ""

    if not isinstance(days, list):
        return ""

    html = ""
    for idx, day in enumerate(days, 1):
        title = escape(str(day.get('title', f'Day {idx}')))
        description = str(day.get('description', ''))
        distance = day.get('distance', day.get('distance_km', ''))
        ascent = day.get('ascent', day.get('ascent_m', ''))
        terrain = day.get('terrain', '')

        badge_class = "bg-primary/10 text-primary" if idx == 1 else "bg-slate-100 text-slate-500"
        open_attr = "open" if idx == 1 else ""

        # Look up route details for this day — use FIRST route only
        # (additional routes are alternative options, not part of the main itinerary)
        route_ids = day.get('route_ids', [])
        primary_route = None
        if routes_by_id and route_ids:
            for rid in route_ids:
                route = routes_by_id.get(rid)
                if route:
                    primary_route = route
                    break  # Use only the first matching route

        # Stats from the primary route only
        day_distance = (primary_route.get('distance_km', 0) or 0) if primary_route else 0
        day_ascent = (primary_route.get('elevation_gain_m', 0) or 0) if primary_route else 0
        day_descent = (primary_route.get('elevation_loss_m', 0) or 0) if primary_route else 0
        day_duration = (primary_route.get('estimated_duration_hours', 0) or 0) if primary_route else 0
        day_start = primary_route.get('route_startpoint', '') if primary_route else ''
        day_end = primary_route.get('route_endpoint', '') if primary_route else ''

        # Route detail badges
        badges_html = ''
        if primary_route:
            badges_html = '<div class="flex flex-wrap gap-3 mb-4">'
            if day_start and day_end:
                badges_html += f'<span class="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md"><span class="material-symbols-outlined text-[18px]">pin_drop</span> {escape(day_start)} → {escape(day_end)}</span>'
            if day_distance:
                badges_html += f'<span class="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md"><span class="material-symbols-outlined text-[18px]">straighten</span> {day_distance:.1f} km</span>'
            if day_ascent:
                badges_html += f'<span class="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md"><span class="material-symbols-outlined text-[18px]">trending_up</span> ↑{int(day_ascent)}m</span>'
            if day_descent:
                badges_html += f'<span class="flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md"><span class="material-symbols-outlined text-[18px]">trending_down</span> ↓{int(day_descent)}m</span>'
            if day_duration:
                hours = int(day_duration)
                mins = int((day_duration - hours) * 60)
                dur_str = f'{hours}h {mins}m' if mins else f'{hours}h'
                badges_html += f'<span class="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md"><span class="material-symbols-outlined text-[18px]">schedule</span> {dur_str}</span>'
            badges_html += '</div>'

        html += f"""        <details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" {open_attr}>
            <summary class="flex cursor-pointer items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="flex flex-col items-center justify-center w-12 h-12 rounded-lg {badge_class} font-bold">
                        <span class="text-xs uppercase">Day</span>
                        <span class="text-xl leading-none">{idx}</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold">{title}</h3>
                    </div>
                </div>
                <span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform duration-300">expand_more</span>
            </summary>
            <div class="px-6 pb-6 pt-2 border-t border-slate-100">
                {badges_html}
                <div class="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                    {description}
                </div>
            </div>
        </details>
"""

    return html


def render_best_months(best_months):
    """Convert best_months text array to month pill HTML — only shows available months."""
    if not best_months:
        return ""

    # Handle Postgres text array format
    if isinstance(best_months, str):
        # Parse {May,June,September} format from Postgres
        cleaned = best_months.strip('{}')
        best_months_list = [m.strip().strip('"') for m in cleaned.split(',') if m.strip()]
    elif isinstance(best_months, list):
        best_months_list = best_months
    else:
        return ""

    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    full_month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    # Only include months that are in the walking season (best_months list)
    available_months = []
    for month_idx in range(12):
        month_full = full_month_names[month_idx]
        is_available = any(m.lower().startswith(month_full[:3].lower()) for m in best_months_list)
        if is_available:
            available_months.append((month_idx, month_names[month_idx]))

    if not available_months:
        return ""

    # Dynamic grid: use number of available months as column count
    num_months = len(available_months)
    grid_cols = min(num_months, 6)

    html = f"""    <div class="grid grid-cols-1 gap-6">
        <div class="flex flex-wrap justify-center gap-3">
"""

    for month_idx, month_short in available_months:
        html += f"""            <div class="text-center px-5 py-3 rounded-xl bg-primary/10 text-primary border border-primary/30 font-bold text-sm">{month_short}</div>
"""

    html += """        </div>
    </div>
"""

    return html


def compute_review_stats(reviews_list):
    """Compute aggregate review statistics."""
    if not reviews_list:
        return {'total': 0, 'avg': 0, 'breakdown': {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}}

    total = len(reviews_list)
    avg = sum(r.get('rating', 5) for r in reviews_list) / total
    breakdown = {}
    for star in range(5, 0, -1):
        breakdown[star] = sum(1 for r in reviews_list if r.get('rating') == star)

    return {'total': total, 'avg': round(avg, 1), 'breakdown': breakdown}


def render_star_icons(rating, size='text-lg'):
    """Render star rating icons."""
    full_stars = int(rating)
    html = ''
    for i in range(full_stars):
        html += f'<span class="material-symbols-outlined {size} text-primary">star</span>'
    for i in range(5 - full_stars):
        html += f'<span class="material-symbols-outlined {size} text-slate-300">star</span>'
    return html


def render_review_card(review, tour_name='', show_tour=False, prefix=''):
    """Render a single review card."""
    name = escape(review.get('reviewer_name') or 'Guest')
    country = escape(review.get('reviewer_country') or '')
    rating = review.get('rating', 5) or 5
    title = escape(review.get('title') or '')
    content = escape(review.get('review_text_en') or review.get('content') or '')
    travel_period = escape(review.get('travel_period') or '')
    whi_response = review.get('whi_response') or ''

    stars = render_star_icons(rating)
    initial = name[0] if name else 'G'

    # Truncate content for card display (show first 200 chars)
    truncated = content[:200] + '...' if len(content) > 200 else content
    needs_expand = len(content) > 200

    tour_line = ''
    if show_tour and tour_name:
        tour_line = f'<p class="text-sm text-primary font-semibold mt-1">{escape(tour_name)}</p>'

    meta_parts = [country, travel_period]
    meta_text = ' · '.join(p for p in meta_parts if p)

    expand_html = ''
    if needs_expand:
        expand_html = f"""
                <div class="review-full hidden mt-2">
                    <p class="text-slate-600 leading-relaxed">{content}</p>
                </div>
                <button class="review-toggle text-primary font-semibold text-sm mt-2 hover:underline" onclick="this.previousElementSibling.classList.toggle('hidden'); this.textContent = this.textContent === 'Read more' ? 'Show less' : 'Read more'">Read more</button>"""

    response_html = ''
    if whi_response:
        response_html = f"""
                <div class="mt-4 pt-4 border-t border-slate-100">
                    <p class="text-sm font-semibold text-brand-purple mb-1">Walking Holiday Ireland responded:</p>
                    <p class="text-sm text-slate-500 italic">{escape(whi_response)}</p>
                </div>"""

    html = f"""        <div class="review-card bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 flex-shrink-0 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]" data-tour="{escape(review.get('tour_id', ''))}" data-dest="{escape(review.get('destination_id', ''))}" data-rating="{rating}">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">{initial}</div>
                    <div>
                        <h4 class="font-bold text-lg">{name}</h4>
                        <p class="text-sm text-slate-500">{meta_text}</p>{tour_line}
                    </div>
                </div>
                <div class="flex mb-3">{stars}</div>
                <h5 class="font-bold mb-2">{title}</h5>
                <p class="review-truncated text-slate-600 leading-relaxed">{truncated}</p>{expand_html}{response_html}
            </div>
"""
    return html


def render_review_carousel(reviews_list, tours_by_id, carousel_id, heading, show_tour=True, link_url='', link_text='', prefix=''):
    """Render a horizontal review carousel section."""
    if not reviews_list:
        return ""

    # Sort: featured first, then by rating desc, date desc
    sorted_reviews = sorted(reviews_list, key=lambda r: (
        not r.get('featured', False),
        -(r.get('rating', 0)),
        r.get('review_date', '') or ''
    ))

    # Stats
    stats = compute_review_stats(reviews_list)
    stars_html = render_star_icons(stats['avg'])

    # Build carousel cards
    cards_html = ""
    for review in sorted_reviews:
        tour_id = review.get('tour_id')
        tour = tours_by_id.get(tour_id, {})
        tour_name = tour.get('name', '')
        cards_html += render_review_card(review, tour_name=tour_name, show_tour=show_tour, prefix=prefix)

    # Dots (one per "page" of 3 cards)
    num_pages = max(1, -(-len(sorted_reviews) // 3))  # Ceiling division
    dots_html = ''
    for i in range(min(num_pages, 8)):  # Max 8 dots
        active = 'bg-primary' if i == 0 else 'bg-slate-300'
        dots_html += f'<button class="carousel-dot w-2.5 h-2.5 rounded-full {active} transition-colors" data-page="{i}"></button>\n'

    link_html = ''
    if link_url and link_text:
        link_html = f'<a href="{link_url}" class="inline-flex items-center gap-1 text-primary font-semibold hover:underline mt-4">{link_text} <span class="material-symbols-outlined text-lg">arrow_forward</span></a>'

    html = f"""<div id="{carousel_id}" class="review-carousel" data-auto-advance="8000">
        <div class="flex items-center gap-3 mb-2">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">{heading}</h2>
        </div>
        <div class="flex items-center gap-3 mb-8">
            <div class="flex">{stars_html}</div>
            <span class="text-lg font-bold text-slate-700">{stats['avg']}</span>
            <span class="text-slate-500">·</span>
            <span class="text-slate-500">{stats['total']} reviews</span>
        </div>
        <div class="relative">
            <div class="carousel-track flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-4">
{cards_html}            </div>
            <button class="carousel-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors hidden md:flex z-10">
                <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button class="carousel-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors hidden md:flex z-10">
                <span class="material-symbols-outlined">chevron_right</span>
            </button>
        </div>
        <div class="flex items-center justify-center gap-2 mt-6">
{dots_html}        </div>
        <div class="text-center mt-2">
            {link_html}
        </div>
    </div>
"""
    return html


def render_review_stats_bar(stats):
    """Render aggregate review stats with bar chart."""
    if stats['total'] == 0:
        return ""

    stars_html = render_star_icons(stats['avg'], 'text-2xl')
    max_count = max(stats['breakdown'].values()) if stats['breakdown'] else 1

    bars_html = ""
    for star in range(5, 0, -1):
        count = stats['breakdown'].get(star, 0)
        pct = (count / max_count * 100) if max_count > 0 else 0
        bars_html += f"""            <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-slate-600 w-16">{star} star{'s' if star != 1 else ''}</span>
                <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div class="bg-primary h-full rounded-full transition-all" style="width: {pct}%"></div>
                </div>
                <span class="text-sm text-slate-500 w-8 text-right">{count}</span>
            </div>
"""

    html = f"""    <div class="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div class="flex flex-col items-center">
                <span class="text-5xl font-black text-brand-purple">{stats['avg']}</span>
                <div class="flex mt-2">{stars_html}</div>
                <span class="text-slate-500 mt-1">{stats['total']} reviews</span>
            </div>
            <div class="flex-1 space-y-2">
{bars_html}            </div>
        </div>
    </div>
"""
    return html


def render_review_schema(reviews_list, entity_name, entity_description='', schema_type='Product'):
    """Render review structured data (Product or LocalBusiness with AggregateRating)."""
    if not reviews_list:
        return ""

    stats = compute_review_stats(reviews_list)

    # Build individual review items (max 10, featured first)
    sorted_reviews = sorted(reviews_list, key=lambda r: (
        not r.get('featured', False),
        -(r.get('rating', 0))
    ))[:10]

    review_items = []
    for review in sorted_reviews:
        item = {
            "@type": "Review",
            "author": {
                "@type": "Person",
                "name": review.get('reviewer_name', 'Guest')
            },
            "reviewRating": {
                "@type": "Rating",
                "ratingValue": str(review.get('rating', 5)),
                "bestRating": "5"
            },
            "reviewBody": strip_html_tags(review.get('review_text_en') or review.get('content', ''))[:500]
        }
        if review.get('review_date'):
            item["datePublished"] = str(review['review_date'])
        review_items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "name": entity_name,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": str(stats['avg']),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": str(stats['total'])
        },
        "review": review_items
    }

    if entity_description:
        schema["description"] = entity_description

    if schema_type == 'Product':
        schema["brand"] = {
            "@type": "Brand",
            "name": "Walking Holiday Ireland"
        }
    elif schema_type == 'LocalBusiness':
        schema["url"] = "https://walkingholidayireland.com"
        schema["address"] = {
            "@type": "PostalAddress",
            "addressLocality": "Dundalk",
            "addressRegion": "Co. Louth",
            "addressCountry": "IE"
        }

    html = f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'
    return html


def render_tour_review_section(reviews_list, tour, tours_by_id, prefix='../'):
    """Render review carousel section for tour pages."""
    if not reviews_list:
        return ""

    tour_name = escape(tour.get('name', ''))
    heading = f"What Our Walkers Say"

    carousel_html = render_review_carousel(
        reviews_list, tours_by_id,
        carousel_id="tour-reviews",
        heading=heading,
        show_tour=False,
        link_url=f"{prefix}reviews.html",
        link_text=f"Read all {len(reviews_list)} reviews",
        prefix=prefix
    )

    return carousel_html


def render_destination_review_section(reviews_list, destination, tours_by_id, prefix=''):
    """Render review carousel section for destination pages."""
    if not reviews_list:
        return ""

    dest_name = escape(destination.get('name', ''))
    heading = f"What Our Walkers Say"

    carousel_html = render_review_carousel(
        reviews_list, tours_by_id,
        carousel_id="dest-reviews",
        heading=heading,
        show_tour=True,
        link_url=f"{prefix}reviews.html",
        link_text=f"Read all {len(reviews_list)} reviews",
        prefix=prefix
    )

    return carousel_html


def render_tour_cards(tours, prefix='walking-tours/'):
    """Render tour card HTML for destination pages.

    Args:
        tours: List of tour dictionaries
        prefix: URL prefix for links. Use 'walking-tours/' for root pages, '' for tour pages
    """
    if not tours:
        return ""

    html = ""
    for tour in tours:
        slug = tour.get('slug', '')
        name = escape(tour.get('name', ''))
        difficulty = escape(tour.get('difficulty_level', ''))
        days = tour.get('duration_days', 0)
        price = tour.get('price_per_person_eur', 0)
        # Clean up price display (remove trailing .00)
        try:
            price_val = float(price) if price else 0
            price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
        except (ValueError, TypeError):
            price_display = str(price)

        html += f"""            <a href="{prefix}{slug}.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                <div class="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img src="images/routes/{slug}/card.jpg" srcset="images/routes/{slug}/card-400w.jpg 400w, images/routes/{slug}/card-800w.jpg 800w, images/routes/{slug}/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="{name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="1200" height="800" onerror="this.parentElement.style.background='linear-gradient(135deg, #f17e00 0%, #210747 100%)'"/>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-lg mb-1">{name}</h3>
                    <p class="text-sm text-slate-500 mb-3">{difficulty} · {days} Days</p>
                    <span class="text-primary font-bold">From &euro;{price_display} pp &rarr;</span>
                </div>
            </a>
"""

    return html


def render_poi_grid(points_of_interest):
    """Render points of interest grid HTML with optional images."""
    if not points_of_interest:
        return ""

    try:
        pois = json.loads(points_of_interest) if isinstance(points_of_interest, str) else points_of_interest
    except (json.JSONDecodeError, TypeError):
        return ""

    if not isinstance(pois, list):
        return ""

    html = ""
    for poi in pois[:4]:
        title = escape(poi.get('name', ''))
        description = escape(poi.get('description', ''))
        image_url = poi.get('image_url', '') or poi.get('image', '')

        if image_url:
            # Card with image
            html += f"""            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden poi-card">
                <div class="aspect-[16/10] overflow-hidden">
                    <img src="{escape(image_url)}" alt="{title}" class="w-full h-full object-cover" loading="lazy"/>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-lg mb-2">{title}</h3>
                    <p class="text-slate-600 text-sm leading-relaxed">{description}</p>
                </div>
            </div>
"""
        else:
            # Card without image — icon style
            html += f"""            <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all poi-card">
                <div class="flex items-start gap-3 mb-3">
                    <span class="material-symbols-outlined text-primary text-2xl">location_on</span>
                    <h3 class="font-bold text-lg">{title}</h3>
                </div>
                <p class="text-slate-600 text-sm leading-relaxed">{description}</p>
            </div>
"""

    return html


def render_faq_accordion_item(faq):
    """Render a single FAQ as a <details> element."""
    question = escape(faq.get('question', ''))
    answer = faq.get('answer', '')
    section = escape(faq.get('section', ''))

    # Create lowercase plain text versions for search
    question_lower = re.sub(r'<[^>]+>', '', question).lower()
    answer_lower = re.sub(r'<[^>]+>', '', str(answer)).lower()

    html = f"""        <details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow" data-section="{section}" data-question="{question_lower}" data-answer="{answer_lower}">
            <summary class="flex items-center justify-between px-6 py-4 font-semibold text-brand-purple cursor-pointer hover:text-primary transition-colors">
                <span>{question}</span>
                <span class="chevron material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <div class="px-6 pb-4 pt-2 text-slate-600 leading-relaxed">
                {answer}
            </div>
        </details>
"""
    return html


def render_faq_section(section_name, display_name, faqs_in_section):
    """Render a full FAQ section with header and accordion items."""
    accordion_html = ""
    for faq in faqs_in_section:
        accordion_html += render_faq_accordion_item(faq)

    html = f"""    <section id="faq-section-{section_name}" class="faq-section" data-section="{section_name}">
        <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-[1.75rem] font-black text-brand-purple">{escape(display_name)}</h2>
        </div>
        <div class="space-y-3">
{accordion_html}        </div>
    </section>

"""
    return html


def render_all_faq_sections(faqs):
    """Group FAQs by section in display order and render all sections."""
    section_order = [
        ('booking', 'Booking & Payment'),
        ('tours', 'Tours & What\'s Included'),
        ('accommodation', 'Accommodation'),
        ('transport', 'Transport & Transfers'),
        ('general', 'General'),
        ('equipment', 'Gear & Packing'),
        ('weather', 'Weather'),
        ('safety', 'Navigation & Safety'),
        ('insurance', 'Insurance'),
        ('destinations', 'Destinations'),
    ]

    # Group FAQs by section
    faqs_by_section = {}
    for faq in faqs:
        section = faq.get('section', 'general')
        if section not in faqs_by_section:
            faqs_by_section[section] = []
        faqs_by_section[section].append(faq)

    # Render sections in order
    html = ""
    for section_key, display_name in section_order:
        if section_key in faqs_by_section:
            html += render_faq_section(section_key, display_name, faqs_by_section[section_key])

    return html


def render_faq_section_tabs(faqs):
    """Render section filter tabs (pill buttons)."""
    section_order = [
        ('booking', 'Booking'),
        ('tours', 'Tours'),
        ('accommodation', 'Accommodation'),
        ('transport', 'Transport'),
        ('general', 'General'),
        ('equipment', 'Gear & Packing'),
        ('weather', 'Weather'),
        ('safety', 'Safety'),
        ('insurance', 'Insurance'),
        ('destinations', 'Destinations'),
    ]

    # Count FAQs by section
    section_counts = {}
    total = len(faqs)
    for faq in faqs:
        section = faq.get('section', 'general')
        section_counts[section] = section_counts.get(section, 0) + 1

    html = '    <div id="faq-tabs" class="flex flex-wrap gap-2 mb-12">\n'
    html += f'        <button class="faq-tab active px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white transition-all" data-section="all">All ({total})</button>\n'

    for section_key, display_name in section_order:
        if section_key in section_counts:
            count = section_counts[section_key]
            html += f'        <button class="faq-tab px-4 py-2 rounded-full text-sm font-semibold bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary transition-all" data-section="{section_key}">{escape(display_name)} ({count})</button>\n'

    html += '    </div>\n'
    return html


def render_faq_schema(faqs, max_items=10):
    """Render FAQPage JSON-LD schema for Google rich results."""
    if not faqs:
        return ""

    # Prioritize sections: booking and tours first, then others
    section_priority = ['booking', 'tours', 'transport', 'general', 'equipment', 'accommodation', 'weather', 'safety', 'insurance', 'destinations']

    # Sort by section priority, then by sort_order
    sorted_faqs = sorted(faqs, key=lambda x: (
        section_priority.index(x.get('section', 'general')) if x.get('section', 'general') in section_priority else 999,
        x.get('sort_order', 0)
    ))

    # Take first max_items
    faqs_for_schema = sorted_faqs[:max_items]

    # Build FAQ items
    faq_items = []
    for faq in faqs_for_schema:
        question = escape(strip_html_tags(faq.get('question', '')))
        answer = strip_html_tags(faq.get('answer', ''))

        faq_items.append({
            "@type": "Question",
            "name": question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": answer
            }
        })

    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq_items
    }

    html = f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'
    return html


def render_tour_faq_section(tour_id, faqs, tour_name):
    """Render FAQ section for tour pages with curation logic."""
    if not tour_id or not faqs:
        return "", []

    # Filter FAQs for this tour
    tour_faqs = [f for f in faqs if tour_id in f.get('tour_ids', [])]

    if not tour_faqs:
        return "", []

    # Curate max 8: prioritize route-specific FAQs first
    section_order = ['tours', 'transport', 'general', 'equipment', 'accommodation', 'booking', 'safety', 'insurance']

    # Separate route-specific (fewer than 16 tour_ids) and general FAQs
    route_specific = [f for f in tour_faqs if len(f.get('tour_ids', [])) < 16]
    general = [f for f in tour_faqs if len(f.get('tour_ids', [])) >= 16]

    # Sort by section order and sort_order
    def sort_key(faq):
        section = faq.get('section', 'general')
        section_idx = section_order.index(section) if section in section_order else 999
        return (section_idx, faq.get('sort_order', 0))

    route_specific.sort(key=sort_key)
    general.sort(key=sort_key)

    # Combine: route-specific first, then general
    curated_faqs = (route_specific + general)[:8]

    if not curated_faqs:
        return "", []

    # Render accordion items
    accordion_html = ""
    for faq in curated_faqs:
        accordion_html += render_faq_accordion_item(faq)

    # Build section HTML
    html = f"""    <section class="faq-section">
        <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
                <div class="w-1.5 h-8 bg-primary rounded-full"></div>
                <h2 class="text-[1.75rem] font-black text-brand-purple">Frequently Asked Questions</h2>
            </div>
            <div class="flex gap-2">
                <button onclick="this.closest('.faq-section').querySelectorAll('details').forEach(d=>d.open=true)" class="text-sm font-medium text-slate-500 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100">Expand All</button>
                <button onclick="this.closest('.faq-section').querySelectorAll('details').forEach(d=>d.open=false)" class="text-sm font-medium text-slate-500 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100">Collapse All</button>
            </div>
        </div>
        <div class="space-y-3">
{accordion_html}        </div>
        <p class="text-sm text-slate-500 mt-6">Showing {len(curated_faqs)} of {len(tour_faqs)} FAQs · <a href="../faq.html" class="text-primary font-semibold hover:underline">View all FAQs</a></p>
    </section>

"""
    return html, curated_faqs


def render_destination_faq_section(dest_id, faqs, dest_name):
    """Render FAQ section for destination pages with curation logic."""
    if not dest_id or not faqs:
        return "", []

    # Filter FAQs for this destination
    dest_faqs = [f for f in faqs if dest_id in f.get('destination_ids', [])]

    if not dest_faqs:
        return "", []

    # Curate max 8: same logic as tours
    section_order = ['tours', 'transport', 'general', 'equipment', 'accommodation', 'booking', 'safety', 'insurance']

    # Separate route-specific (fewer than 16 destination_ids) and general FAQs
    route_specific = [f for f in dest_faqs if len(f.get('destination_ids', [])) < 16]
    general = [f for f in dest_faqs if len(f.get('destination_ids', [])) >= 16]

    # Sort by section order and sort_order
    def sort_key(faq):
        section = faq.get('section', 'general')
        section_idx = section_order.index(section) if section in section_order else 999
        return (section_idx, faq.get('sort_order', 0))

    route_specific.sort(key=sort_key)
    general.sort(key=sort_key)

    # Combine: route-specific first, then general
    curated_faqs = (route_specific + general)[:8]

    if not curated_faqs:
        return "", []

    # Render accordion items
    accordion_html = ""
    for faq in curated_faqs:
        accordion_html += render_faq_accordion_item(faq)

    # Build section HTML
    html = f"""    <section class="faq-section">
        <div class="flex items-center gap-3 mb-8">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-[1.75rem] font-black text-brand-purple">Frequently Asked Questions</h2>
        </div>
        <div class="space-y-3">
{accordion_html}        </div>
        <p class="text-sm text-slate-500 mt-6">Showing {len(curated_faqs)} of {len(dest_faqs)} FAQs · <a href="faq.html" class="text-primary font-semibold hover:underline">View all FAQs</a></p>
    </section>

"""
    return html, curated_faqs


def generate_booking_data_script(tour, tour_extras_by_tour, payment_settings, lang='en'):
    """Generate the <script> tag that injects booking modal data into the page.

    The booking modal (booking-modal.js) reads:
      - window.__WHI_TOUR: tour info needed for pricing
      - window.__WHI_EXTRAS: optional add-ons for this tour
      - window.__WHI_SETTINGS: payment config (deposit %)
      - window.__WHI_LANG: language code for i18n
    """
    tour_id = tour.get('id', '')
    duration = int(tour.get('duration_days', 0) or 0)
    walking = tour.get('walking_days')
    tour_data = {
        'id': tour_id,
        'slug': tour.get('slug', ''),
        'name': tour.get('name', ''),
        'price_per_person_eur': float(tour.get('price_per_person_eur', 0) or 0),
        'duration_days': duration,
        'walking_days': int(walking) if walking else max(0, duration - 1),
        'extra_day_price_eur': float(tour.get('extra_day_price_eur', 0) or 0),
        'min_walkers': int(tour.get('min_walkers', 1) or 1),
        'max_walkers': int(tour.get('max_walkers', 10) or 10),
        'max_extra_days': int(tour.get('max_extra_days', 3) or 3),
    }

    # Get extras for this tour
    extras = tour_extras_by_tour.get(tour_id, [])
    extras_data = []
    for ex in extras:
        extras_data.append({
            'id': ex.get('id', ''),
            'name': ex.get('name', ''),
            'description': ex.get('description', ''),
            'price_eur': float(ex.get('price_eur', 0) or 0),
            'price_type': ex.get('price_type', 'per_person'),
            'max_quantity': int(ex.get('max_quantity', 1) or 1),
        })

    settings_data = {
        'deposit_percent': payment_settings.get('deposit_percent', 25),
    }

    return f"""<script>
window.__WHI_TOUR = {json.dumps(tour_data)};
window.__WHI_EXTRAS = {json.dumps(extras_data)};
window.__WHI_SETTINGS = {json.dumps(settings_data)};
window.__WHI_LANG = "{lang}";
</script>"""


def render_route_map_data(itinerary_data, routes_by_id):
    """Generate JSON data for Leaflet map with route coordinates and elevation profiles."""
    if not itinerary_data or not routes_by_id:
        return '[]'

    try:
        days = json.loads(itinerary_data) if isinstance(itinerary_data, str) else itinerary_data
    except (json.JSONDecodeError, TypeError):
        return '[]'

    if not isinstance(days, list):
        return '[]'

    map_days = []
    for idx, day in enumerate(days, 1):
        route_ids = day.get('route_ids', [])
        if not route_ids:
            continue

        day_coords = []
        day_elevation = []
        day_distance = 0
        day_ascent = 0
        day_descent = 0
        day_duration = 0
        day_name = day.get('title', f'Day {idx}')

        # Use only the FIRST route per day (others are alternative options)
        primary_route = None
        for rid in route_ids:
            route = routes_by_id.get(rid)
            if route:
                primary_route = route
                break

        if primary_route:
            gpx = primary_route.get('gpx_coordinates', [])
            if isinstance(gpx, str):
                try:
                    gpx = json.loads(gpx)
                except:
                    gpx = []

            if gpx and isinstance(gpx, list):
                for pt in gpx:
                    if isinstance(pt, list) and len(pt) >= 2:
                        day_coords.append([pt[0], pt[1]])
                        if len(pt) >= 3 and pt[2] is not None:
                            try:
                                day_elevation.append(float(pt[2]))
                            except (ValueError, TypeError):
                                pass

            day_distance = primary_route.get('distance_km', 0) or 0
            day_ascent = primary_route.get('elevation_gain_m', 0) or 0
            day_descent = primary_route.get('elevation_loss_m', 0) or 0
            day_duration = primary_route.get('estimated_duration_hours', 0) or 0

        if day_coords:
            map_days.append({
                'day': idx,
                'title': day_name,
                'coords': day_coords,
                'elevation': day_elevation,
                'distance_km': round(day_distance, 1),
                'ascent_m': int(day_ascent),
                'descent_m': int(day_descent),
                'duration_hrs': round(day_duration, 1),
                'start': day_coords[0] if day_coords else None,
                'end': day_coords[-1] if day_coords else None,
            })

    return json.dumps(map_days)


def render_tour_page(tour, destination, related_tours, reviews, faqs, tours_by_id,
                     tour_extras_by_tour=None, payment_settings=None, routes_by_id=None, reviews_by_tour=None, lang='en'):
    """Render a tour page from template."""
    template_path = WEBSITE_DIR / '_templates' / 'tour.html'

    if not template_path.exists():
        log(f"Template not found: {template_path}", 'error')
        return None

    with open(template_path, 'r') as f:
        template = f.read()

    # Prepare data
    highlights_html = render_highlights(tour.get('highlights'))
    itinerary_html = render_itinerary(tour.get('itinerary'), routes_by_id=routes_by_id)
    gallery_html = render_gallery(tour.get('gallery'))
    included_excluded_html = render_included_excluded(
        tour.get('whats_included'), tour.get('whats_not_included'))

    walking_season = tour.get('walking_season_override')
    best_months_data = tour.get('best_months')
    if walking_season and isinstance(walking_season, dict):
        # Convert walking_season_override {start_month, end_month} to month list
        month_names_full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        start = walking_season.get('start_month', 0) or 0
        end = walking_season.get('end_month', 0) or 0
        if start and end:
            if start <= end:
                best_months_data = month_names_full[start-1:end]
            else:
                best_months_data = month_names_full[start-1:] + month_names_full[:end]
    best_months_html = render_best_months(best_months_data)
    reviews_html = render_tour_review_section(reviews, tour, tours_by_id, prefix='../')
    review_schema_html = render_tour_page_schema(tour, reviews)
    # Use empty prefix for tour pages (already in tours/ subdirectory)
    related_html = render_dest_tour_cards_v3(related_tours, prefix='', reviews_by_tour=reviews_by_tour or {})

    # FAQ data
    tour_faq_html, tour_faq_list = render_tour_faq_section(tour.get('id'), faqs, tour.get('name', ''))
    tour_faq_schema = render_faq_schema(tour_faq_list, max_items=8)

    # Route map data
    route_map_json = render_route_map_data(tour.get('itinerary'), routes_by_id)

    # Price display
    price = tour.get('price_per_person_eur', 0)
    try:
        price_val = float(price) if price else 0
        price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
    except (ValueError, TypeError):
        price_display = str(price)

    # Destination info
    dest_name = destination.get('name', '') if destination else ''
    dest_slug = destination.get('slug', '') if destination else ''

    # Hero image URL — handle both absolute URLs and relative paths
    hero_img_raw = tour.get('hero_image') or f'images/routes/{tour.get("slug", "")}/hero.jpg'

    # Build placeholders
    replacements = {
        '{meta_title}': escape(tour.get('meta_title') or tour.get('name', '')),
        '{meta_description}': escape(tour.get('seo_description') or tour.get('short_description', '')),
        '{tour_name}': escape(tour.get('name', '')),
        '{subtitle}': escape(tour.get('subtitle', '')),
        '{hero_image}': escape(tour.get('hero_image') or f'images/routes/{tour.get("slug", "")}/hero.jpg'),
        '{hero_image_url}': escape(hero_img_raw) if hero_img_raw.startswith('http') else f'../{escape(hero_img_raw)}',
        '{difficulty_level}': escape(tour.get('difficulty_level', '')),
        '{duration_days}': str(tour.get('duration_days', 0)),
        '{walking_days}': str(tour.get('walking_days') or max(0, (tour.get('duration_days', 0) or 0) - 1)),
        '{price_per_person_eur}': price_display,
        '{description}': get_safe_text(tour, 'description'),
        '{overview}': get_safe_text(tour, 'description'),
        '{short_description}': get_safe_text(tour, 'short_description'),
        '{highlights}': highlights_html,
        '{who_is_it_for}': get_safe_text(tour, 'who_is_it_for') or get_safe_text(tour, 'description'),
        '{itinerary_html}': itinerary_html,
        '{accommodation_type_badges}': render_accommodation_type_badges(tour.get('accommodation_type')),
        '{accommodation_description}': get_safe_text(tour, 'accommodation_description') or get_safe_text(tour, 'whats_included'),
        '{whats_included}': get_safe_text(tour, 'whats_included'),
        '{whats_not_included}': get_safe_text(tour, 'whats_not_included'),
        '{included_excluded_html}': included_excluded_html,
        '{gallery_html}': gallery_html,
        '{best_months_html}': best_months_html,
        '{best_time_text}': get_safe_text(destination, 'best_time_to_visit') if destination else '',
        '{reviews_html}': reviews_html,
        '{review_schema}': review_schema_html,
        '{related_tours_html}': related_html,
        '{destination_name}': escape(dest_name),
        '{destination_slug}': escape(dest_slug),
        '{tour_slug}': escape(tour.get('slug', '')),
        '{faq_section_html}': tour_faq_html,
        '{faq_schema}': tour_faq_schema,
        '{route_map_json}': route_map_json,
        '{accommodation_image}': tour.get('accommodation_image') or '',
        '{accommodation_image_html}': f'<div class="float-right ml-6 mb-4" style="max-width:300px;"><img src="{escape(tour.get("accommodation_image", ""))}" alt="Accommodation" class="w-full h-auto object-cover rounded-xl" loading="lazy"/></div>' if tour.get('accommodation_image') else '',
        '{sale_banner_html}': '<div class="bg-primary text-white text-center py-2.5 font-bold text-sm tracking-wide uppercase">Special Offer — Save Now!</div>' if tour.get('sale_price') else '',
        '{booking_data_script}': generate_booking_data_script(
            tour,
            tour_extras_by_tour or {},
            payment_settings or {},
            lang
        ),
    }

    # Apply replacements
    html = template
    for key, value in replacements.items():
        html = html.replace(key, str(value))

    return html


def render_dest_quick_stats(destination, tours):
    """Render the quick stats bar below the hero."""
    items = []
    tour_count = len(tours) if tours else 0
    if tour_count:
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">hiking</span><span class="text-sm font-bold text-slate-700">{tour_count} Walking Tour{"s" if tour_count != 1 else ""}</span></div>')

    # Price range
    prices = []
    for t in (tours or []):
        try:
            p = float(t.get('price_per_person_eur', 0))
            if p > 0:
                prices.append(p)
        except (ValueError, TypeError):
            pass
    if prices:
        min_p = int(min(prices))
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">euro</span><span class="text-sm font-bold text-slate-700">From &euro;{min_p} pp</span></div>')

    # Duration range
    durations = [t.get('duration_days', 0) for t in (tours or []) if t.get('duration_days')]
    if durations:
        min_d, max_d = min(durations), max(durations)
        dur_text = f"{min_d}&ndash;{max_d} Days" if min_d != max_d else f"{min_d} Days"
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">calendar_month</span><span class="text-sm font-bold text-slate-700">{dur_text}</span></div>')

    # Difficulty levels
    difficulties = list(set(t.get('difficulty_level', '') for t in (tours or []) if t.get('difficulty_level')))
    if difficulties:
        diff_text = ' &middot; '.join(sorted(difficulties, key=lambda d: ['Easy', 'Moderate', 'Intermediate', 'Challenging'].index(d) if d in ['Easy', 'Moderate', 'Intermediate', 'Challenging'] else 99))
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">speed</span><span class="text-sm font-bold text-slate-700">{diff_text}</span></div>')

    # Best months
    best = destination.get('best_months')
    if best and isinstance(best, list) and len(best) > 0:
        months_text = ', '.join(best[:3])
        if len(best) > 3:
            months_text += f' +{len(best) - 3}'
        items.append(f'<div class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">wb_sunny</span><span class="text-sm font-bold text-slate-700">Best: {months_text}</span></div>')

    return '\n                        '.join(items)


def render_walking_info_panel(destination, tours):
    """Render the sticky walking info panel in the overview sidebar (purple/mauve theme)."""
    items = []

    # Difficulty
    diff = destination.get('difficulty_overview', '')
    difficulties = list(set(t.get('difficulty_level', '') for t in (tours or []) if t.get('difficulty_level')))
    if difficulties:
        diff_badges = ''
        for d in sorted(difficulties, key=lambda x: ['Easy', 'Moderate', 'Intermediate', 'Challenging'].index(x) if x in ['Easy', 'Moderate', 'Intermediate', 'Challenging'] else 99):
            badge_class = 'badge-easy' if d == 'Easy' else ('badge-moderate' if d in ('Moderate', 'Intermediate') else 'badge-challenging')
            diff_badges += f'<span class="inline-block px-3 py-1 rounded-full text-xs font-bold {badge_class}">{escape(d)}</span> '
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon" style="background:rgba(181,141,182,0.25);"><span class="material-symbols-outlined" style="color:#3F0F87;">speed</span></div>
                                        <div><p class="text-xs font-medium mb-1" style="color:#B58DB6;">Difficulty</p><div class="flex flex-wrap gap-1">{diff_badges}</div></div>
                                    </div>''')

    # Duration
    durations = [t.get('duration_days', 0) for t in (tours or []) if t.get('duration_days')]
    if durations:
        min_d, max_d = min(durations), max(durations)
        dur_text = f"{min_d}&ndash;{max_d} days" if min_d != max_d else f"{min_d} days"
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon" style="background:rgba(181,141,182,0.25);"><span class="material-symbols-outlined" style="color:#3F0F87;">calendar_month</span></div>
                                        <div><p class="text-xs font-medium mb-1" style="color:#B58DB6;">Duration</p><p class="text-sm font-bold" style="color:#210747;">{dur_text}</p></div>
                                    </div>''')

    # Best months
    best = destination.get('best_months')
    if best and isinstance(best, list) and len(best) > 0:
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon" style="background:rgba(181,141,182,0.25);"><span class="material-symbols-outlined" style="color:#3F0F87;">wb_sunny</span></div>
                                        <div><p class="text-xs font-medium mb-1" style="color:#B58DB6;">Best Months</p><p class="text-sm font-bold" style="color:#210747;">{', '.join(best)}</p></div>
                                    </div>''')

    # Accommodation
    acc = destination.get('accommodation_style', '')
    if acc:
        acc_short = strip_html_tags(acc)[:80]
        if len(strip_html_tags(acc)) > 80:
            acc_short += '...'
        items.append(f'''<div class="flex items-start gap-3">
                                        <div class="info-icon" style="background:rgba(181,141,182,0.25);"><span class="material-symbols-outlined" style="color:#3F0F87;">hotel</span></div>
                                        <div><p class="text-xs font-medium mb-1" style="color:#B58DB6;">Accommodation</p><p class="text-sm font-bold" style="color:#210747;">{escape(acc_short)}</p></div>
                                    </div>''')

    return '\n                                '.join(items)


def render_dest_landscape_section(destination):
    """Render the landscape section (conditional)."""
    text = destination.get('landscape_description', '')
    if not text or not text.strip():
        return ''
    return f'''<section class="w-full py-16 md:py-24 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">The Landscape</h2>
                            <p class="text-slate-500 mt-1">What to expect along the way</p>
                        </div>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
                        {get_safe_text(destination, "landscape_description")}
                    </div>
                </div>
            </section>'''


def render_dest_poi_section(destination):
    """Render the Points of Interest section (conditional)."""
    poi_html = render_poi_grid(destination.get('points_of_interest'))
    if not poi_html:
        return ''

    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-10">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Points of Interest</h2>
                            <p class="text-slate-500 mt-1">Key highlights you&#39;ll discover in {name}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {poi_html}
                    </div>
                </div>
            </section>'''


def render_dest_activities_section(destination):
    """Render the Top Activities section (conditional)."""
    activities = destination.get('top_activities')
    if not activities:
        return ''

    try:
        acts = json.loads(activities) if isinstance(activities, str) else activities
    except (json.JSONDecodeError, TypeError):
        return ''

    if not isinstance(acts, list) or len(acts) == 0:
        return ''

    # Activity icons mapping
    icon_map = {
        'walking': 'hiking', 'hiking': 'hiking', 'trekking': 'hiking',
        'cycling': 'directions_bike', 'biking': 'directions_bike',
        'kayaking': 'kayaking', 'swimming': 'pool', 'surfing': 'surfing',
        'fishing': 'phishing', 'photography': 'photo_camera',
        'birdwatching': 'visibility', 'wildlife': 'pets',
        'history': 'museum', 'heritage': 'museum', 'castle': 'castle',
        'food': 'restaurant', 'dining': 'restaurant', 'pub': 'local_bar',
        'music': 'music_note', 'festival': 'celebration',
        'beach': 'beach_access', 'garden': 'park', 'golf': 'golf_course',
    }

    cards = ''
    for i, act in enumerate(acts[:4]):
        title = escape(act.get('name', act.get('title', '')))
        desc = escape(act.get('description', ''))
        # Try to match an icon
        icon = 'landscape'
        title_lower = title.lower()
        for keyword, icon_name in icon_map.items():
            if keyword in title_lower:
                icon = icon_name
                break

        cards += f'''<div class="activity-card bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div class="flex items-start gap-4">
                                <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg, #F17E00, #ff9a2e);">
                                    <span class="material-symbols-outlined text-white">{icon}</span>
                                </div>
                                <div>
                                    <h3 class="font-bold text-lg text-slate-900 mb-1">{title}</h3>
                                    <p class="text-slate-600 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        </div>\n'''

    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-10">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Things to Do in {name}</h2>
                            <p class="text-slate-500 mt-1">Top activities and experiences in the area</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cards}
                    </div>
                </div>
            </section>'''


def render_dest_cultural_section(destination):
    """Render the Cultural Highlights section (conditional)."""
    text = destination.get('cultural_highlights', '')
    if not text or not text.strip():
        return ''
    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-24 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Culture &amp; Heritage</h2>
                            <p class="text-slate-500 mt-1">The stories and traditions of {name}</p>
                        </div>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
                        {get_safe_text(destination, "cultural_highlights")}
                    </div>
                </div>
            </section>'''


def render_dest_best_time_section(destination):
    """Render Best Time to Visit + Ideal For as 2-column section."""
    best_months = destination.get('best_months')
    best_text = destination.get('best_time_to_visit', '')
    who_text = destination.get('who_is_it_for', '')

    if (not best_months or not isinstance(best_months, list)) and not best_text and not who_text:
        return ''

    months_html = render_best_months(best_months) if best_months and isinstance(best_months, list) else ''
    best_text_html = get_safe_text(destination, 'best_time_to_visit') if best_text else ''
    who_text_html = get_safe_text(destination, 'who_is_it_for') if who_text else ''

    # If both exist → 2-column layout
    if (best_text or best_months) and who_text:
        return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Best Time to Visit</h2>
                            </div>
                            {months_html}
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4 mt-6">
                                {best_text_html}
                            </div>
                        </div>
                        <div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Who Is It For?</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {who_text_html}
                            </div>
                        </div>
                    </div>
                </div>
            </section>'''

    # Only best time
    if best_text or best_months:
        return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-8">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Best Time to Visit</h2>
                    </div>
                    {months_html}
                    <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4 mt-8">
                        {best_text_html}
                    </div>
                </div>
            </section>'''

    # Only who is it for
    return f'''<section class="w-full py-16 md:py-20 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-3 mb-8">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Who Is It For?</h2>
                    </div>
                    <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                        {who_text_html}
                    </div>
                </div>
            </section>'''


def render_dest_accommodation_section(destination):
    """Render the Accommodation section (conditional)."""
    text = destination.get('accommodation_style', '')
    if not text or not text.strip():
        return ''
    return f'''<section class="w-full py-16 md:py-24 px-6">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Where You&#39;ll Stay</h2>
                            <p class="text-slate-500 mt-1">Handpicked accommodation along the route</p>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-10">
                        <div class="flex items-start gap-4 mb-6">
                            <span class="material-symbols-outlined text-primary text-3xl">hotel</span>
                            <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "accommodation_style")}
                            </div>
                        </div>
                    </div>
                </div>
            </section>'''


def render_dest_practical_section(destination):
    """Render the Practical Info / Getting Here section (conditional)."""
    text = destination.get('practical_info', '')
    if not text or not text.strip():
        return ''
    return f'''<section class="w-full py-16 md:py-24 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-8">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Getting Here &amp; Practical Info</h2>
                            <p class="text-slate-500 mt-1">Everything you need to know before you go</p>
                        </div>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-6">
                        {get_safe_text(destination, "practical_info")}
                    </div>
                </div>
            </section>'''


def render_dest_travel_tips_section(destination):
    """Travel tips are now rendered inside the accommodation/practical section. Return empty."""
    return ''


def render_dest_cuisine_section(destination):
    """Render the Local Cuisine section (conditional)."""
    cuisine = destination.get('local_cuisine')
    if not cuisine:
        return ''
    try:
        items = json.loads(cuisine) if isinstance(cuisine, str) else cuisine
    except (json.JSONDecodeError, TypeError):
        return ''
    if not isinstance(items, list) or len(items) == 0:
        return ''

    cards = ''
    for item in items:
        title = escape(item.get('name', item.get('title', '')))
        desc = escape(item.get('description', ''))
        cards += f'''<div class="cuisine-card bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <div class="flex items-start gap-3 mb-2">
                                <span class="material-symbols-outlined text-primary text-2xl">restaurant</span>
                                <h3 class="font-bold text-lg text-slate-900">{title}</h3>
                            </div>
                            <p class="text-slate-600 text-sm leading-relaxed">{desc}</p>
                        </div>\n'''

    name = escape(destination.get('name', ''))
    return f'''<section class="w-full py-16 md:py-24 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex items-start gap-4 mb-12">
                        <div class="w-1.5 h-10 bg-primary rounded-full flex-shrink-0"></div>
                        <div>
                            <h2 class="text-3xl md:text-4xl font-black text-brand-purple">Local Food &amp; Drink</h2>
                            <p class="text-slate-500 mt-1">Taste the flavours of {name}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cards}
                    </div>
                </div>
            </section>'''


def render_dest_reviews_section(reviews, destination, tours_by_id):
    """Render the reviews section wrapped in its own section element."""
    reviews_html = render_destination_review_section(reviews, destination, tours_by_id, prefix='')
    if not reviews_html or reviews_html.strip() == '':
        return ''
    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    {reviews_html}
                </div>
            </section>'''


def render_dest_tour_cards_v3(tours, prefix='walking-tours/', reviews_by_tour=None, all_dest_reviews=None):
    """Render v3 tour cards for destination pages — matches JS card design in whi-tours.js exactly."""
    if not tours:
        return ""
    if reviews_by_tour is None:
        reviews_by_tour = {}
    if all_dest_reviews is None:
        all_dest_reviews = []

    # Image prefix: when prefix='' we're in walking-tours/ subdir, so need ../ to reach root images
    img_prefix = '../' if prefix == '' else ''

    # Region mappings — must match JS regionLabelMap and regionPageMap
    region_label_map = {
        'Dingle Peninsula': 'Wild Atlantic Way',
        'County Kerry': 'Wild Atlantic Way',
        'Wicklow Mountains': "Ireland's Ancient East",
        'South East Ireland': "Ireland's Ancient East",
        'The Burren': 'Wild Atlantic Way',
        'Causeway Coast': 'Causeway Coastal Route',
        'Cooley Peninsula': "Ireland's Ancient East",
        'Connemara': 'Wild Atlantic Way',
        'Beara Peninsula': 'Wild Atlantic Way',
        'Glens of Antrim': 'Causeway Coastal Route',
        'Mourne Mountains': 'Mourne Heritage Trail',
        'The Sperrins': 'Sperrins Heritage Trail',
    }
    region_page_map = {
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
        'The Sperrins': 'walking-area-the-sperrins.html',
    }

    def get_boot_count(diff):
        return {'Easy': 1, 'Moderate': 2, 'Intermediate': 2, 'Challenging': 3}.get(diff, 1)

    def make_boots(diff):
        filled = get_boot_count(diff)
        boots = ''
        for i in range(3):
            src = f'{img_prefix}images/icons/boot-filled.svg' if i < filled else f'{img_prefix}images/icons/boot-outline.svg'
            boots += f'<img src="{src}" alt="" width="34" height="34" style="display:inline-block;margin-right:-2px;">'
        return boots

    def render_stars_html(avg):
        """Render review stars SVGs — matches JS renderStars()."""
        full = int(avg)
        half = (avg - full) >= 0.3
        html = ''
        for _ in range(full):
            html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="#f59e0b"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>'
        if half:
            html += '<svg width="16" height="16" viewBox="0 0 20 20"><defs><linearGradient id="halfStar"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z" fill="url(#halfStar)"/></svg>'
        remaining = 5 - full - (1 if half else 0)
        for _ in range(remaining):
            html += '<svg width="16" height="16" viewBox="0 0 20 20" fill="#d1d5db"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>'
        return html

    html = ""
    for tour in tours:
        slug = tour.get('slug', '')
        name = escape(tour.get('name', ''))
        difficulty = tour.get('difficulty_level', '')
        days = tour.get('duration_days', 0) or 0
        price = tour.get('price_per_person_eur', 0)
        short_desc = escape(tour.get('subtitle') or tour.get('short_description', '') or '')
        region_name = tour.get('region_name', '')

        try:
            price_val = float(price) if price else 0
            price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
        except (ValueError, TypeError):
            price_display = str(price)

        # Compute per-day stats — use walking_days from DB if set, else days-1
        total_km, total_ascent = compute_tour_distances(tour)
        db_km = tour.get('total_distance_km')
        db_ascent = tour.get('elevation_gain_m')
        actual_km = float(db_km) if db_km else (total_km if total_km else 0)
        actual_ascent = int(db_ascent) if db_ascent else (total_ascent if total_ascent else 0)
        db_walk_days = tour.get('walking_days')
        walk_days = int(db_walk_days) if db_walk_days else (days - 1 if days > 1 else 1)
        km_per_day = round(actual_km / walk_days, 1) if actual_km and walk_days else None
        ascent_per_day = round(actual_ascent / walk_days) if actual_ascent and walk_days else None
        # Descent per day (matches JS)
        db_descent = tour.get('total_descent_m')
        actual_descent = int(db_descent) if db_descent else 0
        descent_per_day = round(actual_descent / walk_days) if actual_descent else None

        # Region label + clickable link (matches JS regionPageMap)
        region_label = region_label_map.get(region_name, region_name)
        region_page = region_page_map.get(region_name, '')
        region_link = ''
        if region_label:
            if region_page:
                region_link = f'<span class="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style="color:#3F0F87;" onclick="event.stopPropagation();event.preventDefault();window.location.href=\'{img_prefix}{region_page}\';"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{escape(region_label)}</span>'
            else:
                region_link = f'<span class="inline-flex items-center gap-1 text-xs font-semibold" style="color:#3F0F87;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{escape(region_label)}</span>'

        # Boot icons
        boots = f'<div class="flex items-center" title="Diff.: {escape(difficulty)}" style="gap:0;">{make_boots(difficulty)}</div>'

        # Review stars + count — fall back to destination reviews if tour has none
        review_html = ''
        tour_reviews = reviews_by_tour.get(tour.get('id'), [])
        use_reviews = tour_reviews if tour_reviews else all_dest_reviews
        if use_reviews:
            ratings = [r.get('rating', 0) for r in use_reviews if r.get('rating')]
            if ratings:
                avg_rating = round(sum(ratings) / len(ratings), 1)
                review_count = len(ratings)
                review_html = f'<div class="flex items-center gap-2"><div class="flex items-center gap-0.5">{render_stars_html(avg_rating)}</div><span class="text-sm font-bold text-slate-700">{avg_rating}</span><span class="text-xs text-slate-400">({review_count})</span></div>'

        # Stats bar (matches JS: days, km/day, ascent/day, descent/day)
        stats = []
        stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span class="text-xs font-bold text-slate-700 mt-1">{days} Days</span></div>')
        if km_per_day:
            stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><img src="{img_prefix}images/icons/distance.svg" alt="" width="20" height="20" style="display:inline-block;"><span class="text-xs font-bold text-slate-700 mt-1">{km_per_day} km</span><span class="text-[9px] text-slate-400">/Day</span></div>')
        if ascent_per_day:
            stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M7 17l5-10 5 10"/><path d="M4 20h16"/></svg><span class="text-xs font-bold text-slate-700 mt-1">&uarr;{ascent_per_day}m</span><span class="text-[9px] text-slate-400">/Day</span></div>')
        if descent_per_day:
            stats.append(f'<div class="flex flex-col items-center" style="min-width:60px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M7 7l5 10 5-10"/><path d="M4 4h16"/></svg><span class="text-xs font-bold text-slate-700 mt-1">&darr;{descent_per_day}m</span><span class="text-[9px] text-slate-400">/Day</span></div>')

        stats_bar = '<div class="flex items-start justify-evenly py-3 px-2 border-t border-slate-100 gap-2">' + ''.join(stats) + '</div>'

        html += f'''<a href="{prefix}{slug}.html" class="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full tour-card" data-region="{escape(region_name)}" data-difficulty="{escape(difficulty)}" data-days="{days}">
                <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="{img_prefix}images/routes/{slug}/card.jpg" srcset="{img_prefix}images/routes/{slug}/card-400w.jpg 400w, {img_prefix}images/routes/{slug}/card-800w.jpg 800w, {img_prefix}images/routes/{slug}/card.jpg 1200w" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" alt="{name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width="1200" height="800" onerror="this.style.display=\'none\'"/>
                    <div class="absolute inset-x-0 bottom-0 pointer-events-none" style="height:40%;background:linear-gradient(to top,rgba(33,7,71,0.55) 0%,rgba(33,7,71,0) 100%);"></div>
                    <h3 class="absolute bottom-3 left-3 right-3 text-white text-lg font-bold leading-snug drop-shadow-lg z-10" style="text-shadow:0 1px 4px rgba(0,0,0,0.5);">{name}</h3>
                    <div class="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2.5 text-center z-20">
                        <span class="block text-xs text-slate-500 font-medium leading-none mb-1">From</span>
                        <span class="block text-2xl font-extrabold leading-tight" style="color:#210747;">&euro;{price_display}</span>
                        <a href="{img_prefix}price-promise.html" class="text-[10px] text-slate-400 hover:text-primary underline" title="Best price guarantee — see our price promise" onclick="event.stopPropagation();">*Price Promise</a>
                    </div>
                </div>
                <div class="flex flex-col justify-between flex-grow p-4 pb-2">
                    <div>
                        <p class="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-2">{short_desc}</p>
                        {region_link}
                    </div>
                    <div class="flex items-center justify-between mt-3 mb-1">
                        {review_html}
                        {boots}
                    </div>
                </div>
                {stats_bar}
            </a>\n'''

    return html


def render_dest_landscape_culture_section(destination):
    """Render Landscape + Cultural Highlights as a 2-column section, or single-col if only one exists."""
    landscape = destination.get('landscape_description', '').strip()
    cultural = destination.get('cultural_highlights', '').strip()
    name = escape(destination.get('name', ''))

    if not landscape and not cultural:
        return ''

    # Both exist → 2-column layout
    if landscape and cultural:
        return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">The Landscape</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "landscape_description")}
                            </div>
                        </div>
                        <div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Culture &amp; Heritage</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "cultural_highlights")}
                            </div>
                        </div>
                    </div>
                </div>
            </section>'''

    # Only one exists → single column
    title = 'The Landscape' if landscape else 'Culture &amp; Heritage'
    field = 'landscape_description' if landscape else 'cultural_highlights'
    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto max-w-4xl">
                    <div class="flex items-start gap-3 mb-6">
                        <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                        <h2 class="text-2xl md:text-3xl font-black text-brand-purple">{title}</h2>
                    </div>
                    <div class="prose prose-lg max-w-none text-slate-700 leading-relaxed space-y-4">
                        {get_safe_text(destination, field)}
                    </div>
                </div>
            </section>'''


def _render_travel_tips_column(destination):
    """Render travel tips as click-to-expand accordions for embedding in a column."""
    tips = destination.get('travel_tips')
    if not tips:
        return ''
    try:
        tips_list = json.loads(tips) if isinstance(tips, str) else tips
    except (json.JSONDecodeError, TypeError):
        return ''
    if not isinstance(tips_list, list) or len(tips_list) == 0:
        return ''

    tip_icons = ['lightbulb', 'backpack', 'checkroom', 'map', 'payments', 'local_taxi', 'restaurant', 'wb_sunny', 'health_and_safety', 'sim_card']
    cards = ''
    for i, tip in enumerate(tips_list[:3]):
        title = escape(tip.get('title', tip.get('name', f'Tip {i+1}')))
        desc = escape(tip.get('tip', tip.get('description', tip.get('content', ''))))
        icon = tip_icons[i % len(tip_icons)]
        cards += f'''<details class="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <summary class="flex items-center gap-3 p-4 cursor-pointer list-none select-none hover:bg-slate-50 transition-colors">
                                    <span class="material-symbols-outlined text-primary text-xl flex-shrink-0">{icon}</span>
                                    <span class="font-semibold text-sm text-slate-900 flex-1">{title}</span>
                                    <span class="material-symbols-outlined text-slate-400 text-lg transition-transform group-open:rotate-180 flex-shrink-0">expand_more</span>
                                </summary>
                                <div class="px-4 pb-4 pl-12">
                                    <p class="text-slate-600 text-sm leading-relaxed">{desc}</p>
                                </div>
                            </details>\n'''
    return cards


def render_dest_accommodation_practical_section(destination):
    """Render Accommodation + Practical Info + Travel Tips as a 3-column section."""
    accommodation = destination.get('accommodation_style', '').strip()
    practical = destination.get('practical_info', '').strip()
    tips_html = _render_travel_tips_column(destination)

    if not accommodation and not practical and not tips_html:
        return ''

    # Build columns
    columns = []
    if accommodation:
        columns.append(f'''<div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Where You&#39;ll Stay</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "accommodation_style")}
                            </div>
                        </div>''')
    if practical:
        columns.append(f'''<div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Getting Here</h2>
                            </div>
                            <div class="prose max-w-none text-slate-700 leading-relaxed space-y-4">
                                {get_safe_text(destination, "practical_info")}
                            </div>
                        </div>''')
    if tips_html:
        columns.append(f'''<div>
                            <div class="flex items-start gap-3 mb-6">
                                <div class="w-1.5 h-8 bg-primary rounded-full flex-shrink-0"></div>
                                <h2 class="text-2xl md:text-3xl font-black text-brand-purple">Travel Tips</h2>
                            </div>
                            <div class="space-y-3">
                                {tips_html}
                            </div>
                        </div>''')

    col_count = len(columns)
    grid_class = f'grid grid-cols-1 lg:grid-cols-{col_count} gap-12'
    columns_html = '\n'.join(columns)

    return f'''<section class="w-full py-16 md:py-20 px-6 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="{grid_class}">
                        {columns_html}
                    </div>
                </div>
            </section>'''


def render_destination_page(destination, tours, reviews, faqs, tours_by_id):
    """Render a destination page from template."""
    template_path = WEBSITE_DIR / '_templates' / 'destination.html'

    if not template_path.exists():
        log(f"Template not found: {template_path}", 'error')
        return None

    with open(template_path, 'r') as f:
        template = f.read()

    dest_name = escape(destination.get('name', ''))
    dest_slug = escape(destination.get('slug', ''))

    # Build reviews lookup per tour for card star ratings
    card_reviews_by_tour = {}
    for review in reviews:
        tour_id = review.get('tour_id')
        if tour_id:
            if tour_id not in card_reviews_by_tour:
                card_reviews_by_tour[tour_id] = []
            card_reviews_by_tour[tour_id].append(review)

    # Generate JSON data for JS tour card rendering (same design as main tours page)
    # Pass all destination reviews as fallback for tours with no direct reviews
    dest_tours_json = render_tours_listing_json(tours, reviews_by_tour=card_reviews_by_tour, all_dest_reviews=reviews)

    # Reviews
    reviews_section_html = render_dest_reviews_section(reviews, destination, tours_by_id)
    review_schema_html = render_destination_page_schema(destination, tours, reviews)

    # FAQs
    dest_faq_html, dest_faq_list = render_destination_faq_section(destination.get('id'), faqs, destination.get('name', ''))
    dest_faq_schema = render_faq_schema(dest_faq_list, max_items=8)

    # Walking info panel
    walking_info_html = render_walking_info_panel(destination, tours)

    # Tour count
    tour_count = len(tours) if tours else 0
    tour_count_html = ''
    if tour_count > 0:
        tour_count_html = f'''<div class="mt-5 pt-4" style="border-top:1px solid rgba(181,141,182,0.3);">
                                    <div class="flex items-center gap-3">
                                        <div class="info-icon" style="background:rgba(181,141,182,0.25);"><span class="material-symbols-outlined" style="color:#3F0F87;">hiking</span></div>
                                        <div><p class="text-xs font-medium mb-1" style="color:#B58DB6;">Walking Tours</p><p class="text-sm font-bold" style="color:#210747;">{tour_count} tour{"s" if tour_count != 1 else ""} available</p></div>
                                    </div>
                                </div>'''

    # Included services from global settings
    included_services_html = ''
    try:
        gs_path = WEBSITE_DIR / '_data' / 'global_settings.json'
        if gs_path.exists():
            with open(gs_path) as f:
                global_settings = json.load(f)
        else:
            global_settings = []
        included_items = []
        for gs in global_settings:
            if gs.get('setting_key') == 'included_services':
                included_items = gs.get('setting_json', [])
                break
        if included_items:
            li_html = ''
            for svc in included_items:
                svc_text = escape(str(svc))
                li_html += f'<li class="flex items-start gap-2 text-xs" style="color:#210747;"><span class="material-symbols-outlined text-sm" style="color:#B58DB6;flex-shrink:0;margin-top:1px;">check_circle</span><span>{svc_text}</span></li>\n'
            included_services_html = f'''<div class="mt-5 pt-4" style="border-top:1px solid rgba(181,141,182,0.3);">
                                    <p class="text-xs font-semibold mb-3" style="color:#B58DB6;">Included in Every Tour</p>
                                    <ul class="space-y-2">
                                        {li_html}
                                    </ul>
                                </div>'''
    except Exception:
        pass

    # Combined 2-column sections
    landscape_culture_section = render_dest_landscape_culture_section(destination)
    accommodation_practical_section = render_dest_accommodation_practical_section(destination)

    # Conditional sections (still standalone)
    poi_section = render_dest_poi_section(destination)
    activities_section = render_dest_activities_section(destination)
    best_time_section = render_dest_best_time_section(destination)
    travel_tips_section = render_dest_travel_tips_section(destination)
    cuisine_section = render_dest_cuisine_section(destination)

    # Region name
    region_name = ''
    for t in (tours or []):
        rn = t.get('region_name', '')
        if rn:
            region_name = rn
            break

    # Tourism brand region mapping
    tourism_brand_map = {
        'Dingle Peninsula': 'Wild Atlantic Way',
        'County Kerry': 'Wild Atlantic Way',
        'Wicklow Mountains': "Ireland's Ancient East",
        'South East Ireland': "Ireland's Ancient East",
        'The Burren': 'Wild Atlantic Way',
        'Causeway Coast': 'Causeway Coastal Route',
        'Cooley Peninsula': "Ireland's Ancient East",
        'Connemara': 'Wild Atlantic Way',
        'Beara Peninsula': 'Wild Atlantic Way',
        'Glens of Antrim': 'Causeway Coastal Route',
        'Mourne Mountains': 'Mourne Heritage Trail',
        'The Sperrins': 'Sperrins Heritage Trail',
    }
    tourism_brand = tourism_brand_map.get(region_name, '')

    # Build placeholders
    replacements = {
        '{meta_title}': escape(destination.get('meta_title') or destination.get('name', '')),
        '{meta_description}': escape(destination.get('seo_description') or destination.get('short_description', '')),
        '{destination_name}': dest_name,
        '{short_description}': escape(destination.get('short_description', '')),
        '{hero_image}': escape(destination.get('hero_image') or f'images/destinations/{destination.get("slug", "")}/hero.jpg'),
        '{region_name}': escape(region_name) if region_name else dest_name,
        '{tourism_brand}': escape(tourism_brand),
        '{description}': get_safe_text(destination, 'description'),
        '{destination_slug}': dest_slug,
        '{destination_schema}': render_destination_page_schema(destination, tours, reviews),
        '{walking_info_panel_html}': walking_info_html,
        '{tour_count_html}': tour_count_html,
        '{included_services_html}': included_services_html,
        '{landscape_culture_section}': landscape_culture_section,
        '{poi_section}': poi_section,
        '{activities_section}': activities_section,
        '{best_time_section}': best_time_section,
        '{dest_tours_json}': dest_tours_json,
        '{accommodation_practical_section}': accommodation_practical_section,
        '{travel_tips_section}': travel_tips_section,
        '{cuisine_section}': cuisine_section,
        '{reviews_section}': reviews_section_html,
        '{review_schema}': review_schema_html,
        '{faq_section_html}': dest_faq_html,
        '{faq_schema}': dest_faq_schema,
    }

    # Apply replacements
    html = template
    for key, value in replacements.items():
        html = html.replace(key, str(value))

    return html


def compute_tour_distances(tour):
    """Compute total distance and elevation from itinerary data."""
    itinerary = tour.get('itinerary')
    if not itinerary:
        return 0, 0

    try:
        days = json.loads(itinerary) if isinstance(itinerary, str) else itinerary
    except (json.JSONDecodeError, TypeError):
        return 0, 0

    if not isinstance(days, list):
        return 0, 0

    total_km = 0
    total_ascent = 0
    for day in days:
        dist = day.get('distance_km')
        if dist:
            try:
                total_km += float(dist)
            except (ValueError, TypeError):
                pass
        asc = day.get('ascent_m')
        if asc:
            try:
                total_ascent += int(float(asc))
            except (ValueError, TypeError):
                pass

    return round(total_km, 1), total_ascent


def render_tours_listing_json(tours, reviews_by_tour=None, all_dest_reviews=None):
    """Build JSON data array for tours listing page client-side rendering."""
    if reviews_by_tour is None:
        reviews_by_tour = {}
    if all_dest_reviews is None:
        all_dest_reviews = []
    items = []
    for tour in tours:
        total_km, total_ascent = compute_tour_distances(tour)
        # Use DB field if populated, otherwise computed value
        db_km = tour.get('total_distance_km')
        db_ascent = tour.get('elevation_gain_m')

        price = tour.get('price_per_person_eur', 0)
        try:
            price_val = float(price) if price else 0
        except (ValueError, TypeError):
            price_val = 0

        # Review stats — fall back to destination reviews if tour has none
        tour_reviews = reviews_by_tour.get(tour.get('id'), [])
        use_reviews = tour_reviews if tour_reviews else all_dest_reviews
        avg_rating = None
        review_count = 0
        if use_reviews:
            ratings = [r.get('rating', 0) for r in use_reviews if r.get('rating')]
            if ratings:
                avg_rating = round(sum(ratings) / len(ratings), 1)
                review_count = len(ratings)

        item = {
            'slug': tour.get('slug', ''),
            'name': tour.get('name', ''),
            'difficulty': tour.get('difficulty_level', ''),
            'days': tour.get('duration_days', 0) or 0,
            'price': price_val,
            'region': tour.get('region_name', ''),
            'short_desc': tour.get('subtitle') or tour.get('short_description', ''),
            'featured': bool(tour.get('featured')),
            'walking_days': int(tour.get('walking_days')) if tour.get('walking_days') else None,
            'total_km': float(db_km) if db_km else (total_km if total_km else None),
            'total_ascent': int(db_ascent) if db_ascent else (total_ascent if total_ascent else None),
            'total_descent': int(tour.get('total_descent_m')) if tour.get('total_descent_m') else None,
        }

        # Promotion / sale price support
        sale_price = tour.get('sale_price_eur')
        if sale_price:
            try:
                sale_val = float(sale_price)
                if sale_val > 0 and sale_val < price_val:
                    item['sale_price'] = sale_val
                    item['discount_pct'] = round((1 - sale_val / price_val) * 100)
            except (ValueError, TypeError):
                pass

        if avg_rating:
            item['avg_rating'] = avg_rating
            item['review_count'] = review_count
        items.append(item)

    return json.dumps(items, indent=2)


def render_tours_listing_schema(tours):
    """Render ItemList JSON-LD schema for tours listing page."""
    items = []
    for idx, tour in enumerate(tours, 1):
        price = tour.get('price_per_person_eur', 0)
        try:
            price_val = float(price) if price else 0
            price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
        except (ValueError, TypeError):
            price_display = str(price)

        total_km, total_ascent = compute_tour_distances(tour)

        item = {
            "@type": "ListItem",
            "position": idx,
            "name": tour.get('name', ''),
            "url": f"https://walkingholidayireland.com/walking-tours/{tour.get('slug', '')}.html",
            "item": {
                "@type": ["TouristTrip", "Product"],
                "name": tour.get('name', ''),
                "description": tour.get('subtitle') or tour.get('short_description', ''),
                "duration": f"P{tour.get('duration_days', 0)}D",
                "touristType": "Walker",
                "offers": {
                    "@type": "Offer",
                    "price": price_display,
                    "priceCurrency": "EUR",
                    "availability": "https://schema.org/InStock"
                }
            }
        }
        if tour.get('region_name'):
            item["item"]["itinerary"] = {
                "@type": "ItemList",
                "description": f"Walking route through {tour.get('region_name')}"
            }
        items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Self-Guided Walking Tours in Ireland",
        "description": f"{len(tours)} self-guided walking tours across Ireland's most stunning landscapes.",
        "numberOfItems": len(tours),
        "itemListElement": items
    }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def render_region_filter_options(tours):
    """Build region filter <option> tags from tour data."""
    regions = {}
    for tour in tours:
        region = tour.get('region_name', '')
        if region:
            regions[region] = regions.get(region, 0) + 1

    html = ''
    for region in sorted(regions.keys()):
        count = regions[region]
        html += f'                    <option value="{escape(region)}">{escape(region)} ({count})</option>\n'
    return html


def render_difficulty_filter_options(tours):
    """Build difficulty filter <option> tags from tour data."""
    order = ['Easy', 'Moderate', 'Intermediate', 'Challenging']
    found = set()
    for tour in tours:
        d = tour.get('difficulty_level', '')
        if d:
            found.add(d)

    html = ''
    for level in order:
        if level in found:
            html += f'                    <option value="{level}">{level}</option>\n'
    return html


REGION_DESCRIPTIONS = {
    'wild-atlantic-way': (
        "Ireland\u2019s west coast is raw, dramatic, and endlessly varied.",
        "Walk the Kerry Way through towering mountain passes and quiet sheep farms. "
        "Stride the Dingle Peninsula along clifftops with nothing ahead but the Atlantic. "
        "Explore the Beara Peninsula \u2014 less-visited, more wild, and unforgettable.",
        "Further north, the Burren offers something completely different: a pale limestone "
        "plateau scattered with ancient dolmens and rare wildflowers. Connemara brings bogland, "
        "glittering loughs, and the Twelve Bens rising sharply from the valley floor. Donegal "
        "closes the chapter with sea stacks, empty beaches, and the highest sea cliffs in Ireland.",
        "This is Ireland at its most elemental.",
    ),
    'irelands-ancient-east': (
        "History runs deep here \u2014 and so do the trails.",
        "The Barrow Way follows one of Ireland\u2019s oldest rivers through lush farmland, "
        "medieval villages, and canal-side towpaths. It\u2019s gentle, green, and deeply restorative.",
        "The Wicklow Way climbs into the Wicklow Mountains \u2014 Ireland\u2019s largest upland area \u2014 "
        "and passes through wild moorland, ancient monastic ruins at Glendalough, and sweeping "
        "valley views. It\u2019s the country\u2019s oldest long-distance trail, and it earns that reputation.",
        "To the north, the Cooley and Mourne Mountains bring legends to life. Walk ridge trails "
        "above Carlingford Lough where Celtic mythology and granite peaks meet in equal measure.",
    ),
    'northern-ireland': (
        "Northern Ireland surprises almost everyone who walks it.",
        "The Antrim Glens roll down to the sea in broad green folds, each one quieter and more "
        "beautiful than the last. At the coast, the Giant\u2019s Causeway stops you in your tracks \u2014 "
        "40,000 hexagonal basalt columns stepping into the sea like something from a geological fever dream.",
        "The Causeway Coast Way strings it all together: clifftop paths, rope bridges, and sweeping "
        "ocean views across to Scotland on a clear day.",
        "Inland, the Sperrin Mountains offer wide open moorland, ancient standing stones, and almost "
        "total solitude. This is Northern Ireland for walkers who want to get properly off the beaten track.",
    ),
}


def render_destinations_by_region(destinations, tours, regions_by_id, reviews_by_dest=None):
    """Render destination cards grouped by region for the listing page."""
    if reviews_by_dest is None:
        reviews_by_dest = {}

    # Group destinations by region
    dests_by_region = {}
    for dest in destinations:
        rid = dest.get('region_id', 'unknown')
        if rid not in dests_by_region:
            dests_by_region[rid] = []
        dests_by_region[rid].append(dest)

    # Build tours count per destination
    tours_per_dest = {}
    min_price_per_dest = {}
    for tour in tours:
        did = tour.get('destination_id')
        if did:
            tours_per_dest[did] = tours_per_dest.get(did, 0) + 1
            price = tour.get('price_per_person_eur', 0)
            try:
                price_val = float(price) if price else 0
            except (ValueError, TypeError):
                price_val = 0
            if price_val > 0:
                if did not in min_price_per_dest or price_val < min_price_per_dest[did]:
                    min_price_per_dest[did] = price_val

    def render_dest_stars_html(avg):
        """Render review stars SVGs for destination cards."""
        full = int(avg)
        half = (avg - full) >= 0.3
        stars = ''
        for _ in range(full):
            stars += '<svg width="14" height="14" viewBox="0 0 20 20" fill="#f59e0b"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>'
        if half:
            stars += '<svg width="14" height="14" viewBox="0 0 20 20"><defs><linearGradient id="halfStarDest"><stop offset="50%" stop-color="#f59e0b"/><stop offset="50%" stop-color="#d1d5db"/></linearGradient></defs><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z" fill="url(#halfStarDest)"/></svg>'
        remaining = 5 - full - (1 if half else 0)
        for _ in range(remaining):
            stars += '<svg width="14" height="14" viewBox="0 0 20 20" fill="#d1d5db"><path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32L2.27 6.69l5.34-.78L10 1z"/></svg>'
        return stars

    # Sort regions by sort_order
    sorted_regions = sorted(regions_by_id.values(), key=lambda r: r.get('sort_order', 999))

    html = ''
    for region in sorted_regions:
        rid = region.get('id')
        region_dests = dests_by_region.get(rid, [])
        if not region_dests:
            continue

        region_name = escape(region.get('name', ''))
        region_slug = escape(region.get('slug', ''))

        # Region description paragraphs
        desc_paras = REGION_DESCRIPTIONS.get(region_slug, ())
        desc_html = ''
        if desc_paras:
            desc_html = '<div class="mb-10 max-w-3xl">'
            for i, para in enumerate(desc_paras):
                if i == 0:
                    desc_html += f'<p class="text-lg font-semibold text-brand-purple mb-3">{escape(para)}</p>'
                else:
                    desc_html += f'<p class="text-slate-600 leading-relaxed mb-3">{escape(para)}</p>'
            desc_html += '</div>'

        html += f"""    <section class="region-section mb-16" data-region="{region_slug}">
        <div class="flex items-center gap-3 mb-4">
            <div class="w-1.5 h-8 bg-primary rounded-full"></div>
            <h2 class="text-2xl md:text-3xl font-black text-brand-purple">{region_name}</h2>
        </div>
        {desc_html}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
"""
        for dest in sorted(region_dests, key=lambda d: d.get('sort_order', 999)):
            dest_slug = dest.get('slug', '')
            dest_name = escape(dest.get('name', ''))
            short_desc = escape(dest.get('short_description', '')[:120])
            if len(dest.get('short_description', '')) > 120:
                short_desc += '...'
            dest_id = dest.get('id')
            tour_count = tours_per_dest.get(dest_id, 0)
            min_price = min_price_per_dest.get(dest_id)

            tour_text = f"{tour_count} tour{'s' if tour_count != 1 else ''}" if tour_count else 'Coming soon'
            price_text = f"From &euro;{min_price:.0f}" if min_price else ''

            # Review stars for this destination
            dest_reviews = reviews_by_dest.get(dest_id, [])
            review_html = ''
            if dest_reviews:
                ratings = [r.get('rating', 0) for r in dest_reviews if r.get('rating')]
                if ratings:
                    avg_rating = round(sum(ratings) / len(ratings), 1)
                    review_count = len(ratings)
                    review_html = f'<div class="flex items-center gap-1.5"><div class="flex items-center gap-0.5">{render_dest_stars_html(avg_rating)}</div><span class="text-sm font-bold text-slate-700">{avg_rating}</span><span class="text-xs text-slate-400">({review_count})</span></div>'

            html += f"""            <a href="destination-{dest_slug}.html" class="dest-card group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col h-full" data-region="{region_slug}">
                <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="images/destinations/{dest_slug}/card.jpg" alt="{dest_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'"/>
                    <div class="absolute inset-x-0 bottom-0 pointer-events-none" style="height:50%;background:linear-gradient(to top,rgba(33,7,71,0.7) 0%,rgba(33,7,71,0) 100%);"></div>
                    <h3 class="absolute bottom-3 left-4 right-4 text-white text-lg font-bold leading-snug drop-shadow-lg z-10" style="text-shadow:0 1px 4px rgba(0,0,0,0.5);">{dest_name}</h3>
                </div>
                <div class="flex flex-col justify-between flex-grow p-5 pb-2">
                    <div>
                        <p class="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">{short_desc}</p>
                    </div>
                    <div class="flex items-center justify-between mt-2 mb-2">
                        {review_html}
                    </div>
                </div>
                <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <span class="text-base font-bold text-slate-700">{tour_text}</span>
                    <span class="text-primary font-extrabold text-lg">{price_text} &rarr;</span>
                </div>
            </a>
"""

        html += """        </div>
    </section>

"""
    return html


def render_region_tabs(regions_by_id, destinations):
    """Render region filter tab buttons."""
    # Count destinations per region
    dests_per_region = {}
    for dest in destinations:
        rid = dest.get('region_id', '')
        dests_per_region[rid] = dests_per_region.get(rid, 0) + 1

    sorted_regions = sorted(regions_by_id.values(), key=lambda r: r.get('sort_order', 999))

    html = ''
    for region in sorted_regions:
        rid = region.get('id')
        count = dests_per_region.get(rid, 0)
        if count == 0:
            continue
        name = escape(region.get('name', ''))
        slug = escape(region.get('slug', ''))
        html += f'        <button class="region-tab px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary transition-all" data-region="{slug}">{name} ({count})</button>\n'

    return html


def render_destinations_listing_json(destinations, tours):
    """Build JSON data for destinations listing page (used by map)."""
    tours_per_dest = {}
    min_price_per_dest = {}
    for tour in tours:
        did = tour.get('destination_id')
        if did:
            tours_per_dest[did] = tours_per_dest.get(did, 0) + 1
            price = tour.get('price_per_person_eur', 0)
            try:
                price_val = float(price) if price else 0
            except (ValueError, TypeError):
                price_val = 0
            if price_val > 0:
                if did not in min_price_per_dest or price_val < min_price_per_dest[did]:
                    min_price_per_dest[did] = price_val

    items = []
    for dest in destinations:
        did = dest.get('id')
        items.append({
            'slug': dest.get('slug', ''),
            'name': dest.get('name', ''),
            'lat': dest.get('map_center_lat'),
            'lng': dest.get('map_center_lng'),
            'region_id': dest.get('region_id', ''),
            'tour_count': tours_per_dest.get(did, 0),
            'min_price': min_price_per_dest.get(did),
        })

    return json.dumps(items, indent=2)


def render_destinations_listing_schema(destinations, tours):
    """Render ItemList JSON-LD schema for destinations listing page."""
    items = []
    for idx, dest in enumerate(destinations, 1):
        item = {
            "@type": "ListItem",
            "position": idx,
            "name": dest.get('name', ''),
            "url": f"https://walkingholidayireland.com/destination-{dest.get('slug', '')}.html",
            "item": {
                "@type": "TouristDestination",
                "name": dest.get('name', ''),
                "description": dest.get('short_description', ''),
                "containedInPlace": {
                    "@type": "Country",
                    "name": "Ireland"
                }
            }
        }
        items.append(item)

    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Walking Holiday Destinations in Ireland",
        "description": f"{len(destinations)} walking holiday destinations across Ireland.",
        "numberOfItems": len(destinations),
        "itemListElement": items
    }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def render_tour_page_schema(tour, reviews_list):
    """Render enhanced TouristTrip + Product schema for individual tour pages."""
    stats = compute_review_stats(reviews_list)
    total_km, total_ascent = compute_tour_distances(tour)
    price = tour.get('price_per_person_eur', 0)
    try:
        price_val = float(price) if price else 0
        price_display = f"{price_val:.0f}" if price_val == int(price_val) else f"{price_val:.2f}"
    except (ValueError, TypeError):
        price_display = str(price)

    schema = {
        "@context": "https://schema.org",
        "@type": ["TouristTrip", "Product"],
        "name": tour.get('name', ''),
        "description": strip_html_tags(tour.get('seo_description') or tour.get('short_description', '')),
        "url": f"https://walkingholidayireland.com/walking-tours/{tour.get('slug', '')}.html",
        "touristType": "Walker",
        "duration": f"P{tour.get('duration_days', 0)}D",
        "provider": {
            "@type": "TourOperator",
            "name": "Walking Holiday Ireland",
            "url": "https://walkingholidayireland.com",
            "telephone": "+353429375983",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Dundalk",
                "addressRegion": "Co. Louth",
                "addressCountry": "IE"
            }
        },
        "offers": {
            "@type": "Offer",
            "price": price_display,
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-01-01",
            "url": f"https://walkingholidayireland.com/walking-tours/{tour.get('slug', '')}.html"
        },
        "brand": {
            "@type": "Brand",
            "name": "Walking Holiday Ireland"
        }
    }

    if total_km:
        schema["distance"] = {
            "@type": "QuantitativeValue",
            "value": total_km,
            "unitCode": "KMT",
            "unitText": "km"
        }

    if tour.get('difficulty_level'):
        schema["additionalProperty"] = [{
            "@type": "PropertyValue",
            "name": "Difficulty",
            "value": tour.get('difficulty_level')
        }]

    if stats['total'] > 0:
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": str(stats['avg']),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": str(stats['total'])
        }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def render_destination_page_schema(destination, tours_for_dest, reviews_list):
    """Render enhanced TouristDestination schema for individual destination pages."""
    stats = compute_review_stats(reviews_list)

    schema = {
        "@context": "https://schema.org",
        "@type": "TouristDestination",
        "name": destination.get('name', ''),
        "description": strip_html_tags(destination.get('seo_description') or destination.get('short_description', '')),
        "url": f"https://walkingholidayireland.com/destination-{destination.get('slug', '')}.html",
        "containedInPlace": {
            "@type": "Country",
            "name": destination.get('country', 'Ireland')
        }
    }

    # Add geo if available
    lat = destination.get('map_center_lat')
    lng = destination.get('map_center_lng')
    if lat and lng:
        schema["geo"] = {
            "@type": "GeoCoordinates",
            "latitude": lat,
            "longitude": lng
        }

    # Add tours as offers
    if tours_for_dest:
        prices = []
        for t in tours_for_dest:
            p = t.get('price_per_person_eur', 0)
            try:
                prices.append(float(p))
            except (ValueError, TypeError):
                pass
        if prices:
            schema["touristType"] = "Walker"

    if stats['total'] > 0:
        schema["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": str(stats['avg']),
            "bestRating": "5",
            "worstRating": "1",
            "reviewCount": str(stats['total'])
        }

    return f'    <script type="application/ld+json">\n{json.dumps(schema, indent=8)}\n    </script>\n'


def build_static_pages(lang, translations):
    """Build translated versions of static HTML pages (homepage, about, contact, etc.)."""
    page_translations = translations.get('pages', {})
    if not page_translations:
        log(f"No page translations found for {lang} — skipping static pages")
        return 0

    lang_label = 'German' if lang == 'de' else 'Dutch' if lang == 'nl' else lang.upper()
    log(f"\nBuilding {lang_label} static pages...")

    # List of static pages that should be translated
    STATIC_PAGES = [
        'index',
        'about',
        'contact',
        'how-it-works',
        'tour-grading',
        'tailor-made',
        'self-guided-walking-holidays-ireland',
        'solo-walking-holidays-ireland',
        'walking-holidays-ireland-over-50s',
        'wild-atlantic-way',
        'northern-ireland',
        'ancient-east',
        'mountains-of-mourne',
        'checkout',
        'privacy-policy',
        'terms-and-conditions',
    ]

    base_dir = WEBSITE_DIR / lang
    base_dir.mkdir(parents=True, exist_ok=True)
    count = 0

    for page_slug in STATIC_PAGES:
        if page_slug not in page_translations:
            continue

        pt = page_translations[page_slug]
        sections = pt.get('sections', {})
        if not sections:
            log(f"  Skipping {page_slug} — no sections defined", 'warn')
            continue

        # Read the English source file
        source_file = WEBSITE_DIR / f'{page_slug}.html'
        if not source_file.exists():
            log(f"  Source file not found: {source_file}", 'warn')
            continue

        with open(source_file, 'r') as f:
            html = f.read()

        # Apply section-by-section text replacement
        replacements_applied = 0
        for section_key, translated_text in sections.items():
            if not translated_text:
                continue

            # The sections dict maps English text → German text
            # Keys prefixed with '__en__' contain the English original to find
            # Keys without prefix are section identifiers with 'en' and 'de' sub-keys
            # We support two formats:
            # Format 1: {"en": "English text", "de": "German text"} — explicit find/replace pairs
            # Format 2: Direct key-value where key is a label and value is {"find": "...", "replace": "..."}

            if isinstance(translated_text, dict):
                find_text = translated_text.get('find', '')
                replace_text = translated_text.get('replace', '')
                if find_text and replace_text and find_text in html:
                    html = html.replace(find_text, replace_text)
                    replacements_applied += 1
            elif isinstance(translated_text, str):
                # Simple string value — look for a matching pattern in sections
                # The convention is: section key maps to the translated text
                # and we look for the English text via a companion _en key
                en_key = f'{section_key}_en'
                en_text = sections.get(en_key, '')
                if en_text and translated_text and en_text in html:
                    html = html.replace(en_text, translated_text, 1)
                    replacements_applied += 1

        # Apply the standard UI translations (header, footer, nav, buttons)
        html = translate_html_ui(html, lang)

        # Update page title if provided
        page_title = pt.get('page_title')
        if page_title:
            html = re.sub(r'<title>.*?</title>', f'<title>{page_title}</title>', html, count=1)

        # Update meta description if provided
        meta_desc = pt.get('meta_description')
        if meta_desc:
            html = re.sub(
                r'<meta\s+name="description"\s+content="[^"]*"',
                f'<meta name="description" content="{meta_desc}"',
                html, count=1
            )

        # Update lang attribute
        html = html.replace('<html lang="en"', f'<html lang="{lang}"')

        # Fix relative paths to absolute paths
        # Files live in /de/ on origin but are served at root on .de domain
        # Using absolute /path ensures they work in both contexts
        html = html.replace('href="css/', 'href="/css/')
        html = html.replace('href="js/', 'href="/js/')
        html = html.replace('src="images/', 'src="/images/')
        html = html.replace('src="js/', 'src="/js/')
        html = html.replace('href="images/', 'href="/images/')
        # Fix page links — use translated filenames at root level
        for ps in STATIC_PAGES:
            if ps in page_translations:
                translated_ps = translate_static_slug(ps, lang)
                html = html.replace(f'href="{ps}.html"', f'href="/{translated_ps}.html"')
        # Fix tour/destination links with translated folder names
        tour_folder = TOUR_FOLDER.get(lang, 'walking-tours')
        html = html.replace('href="walking-tours/', f'href="/{tour_folder}/')
        html = html.replace('href="walking-tours.html"', f'href="/{translate_static_slug("walking-tours", lang)}.html"')
        html = html.replace('href="destinations.html"', f'href="/{translate_static_slug("destinations", lang)}.html"')

        # Add canonical URL for this language
        translated_slug = translate_static_slug(page_slug, lang)
        canonical_url = lang_url(lang, f'{translated_slug}.html')
        # Replace any existing canonical, or add one
        html = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{canonical_url}"', html)
        if 'rel="canonical"' not in html:
            html = html.replace('</head>', f'    <link rel="canonical" href="{canonical_url}"/>\n</head>')

        # Add hreflang tags (all three languages)
        de_slug = translate_static_slug(page_slug, 'de')
        nl_slug = translate_static_slug(page_slug, 'nl')
        hreflang_tags = f'''<link rel="alternate" hreflang="en" href="{lang_url('en', f'{page_slug}.html')}" />
    <link rel="alternate" hreflang="de" href="{lang_url('de', f'{de_slug}.html')}" />
    <link rel="alternate" hreflang="nl" href="{lang_url('nl', f'{nl_slug}.html')}" />'''
        html = html.replace('</head>', f'{hreflang_tags}\n</head>')

        # Add switchLang() function for language switcher
        switchlang_js = """<script>function switchLang(lang){var el=document.querySelector('link[hreflang="'+lang+'"]');if(el)window.location.href=el.getAttribute('href');}</script>"""
        html = html.replace('</body>', f'{switchlang_js}\n</body>')

        # Write the translated page with translated filename
        output_path = base_dir / f'{translated_slug}.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(html)
            log(f"  Generated: {output_path} ({replacements_applied} section replacements)")
        count += 1

    log(f"Generated {count} {lang} static pages")
    return count


def build_language_site(lang, tours, destinations, reviews, faqs, regions, posts,
                        translations, tours_by_id, destinations_by_id, regions_by_id,
                        reviews_by_tour, reviews_by_dest,
                        tour_extras_by_tour=None, payment_settings=None, routes_by_id=None):
    """Build all pages for a specific language."""
    lang_label = 'German' if lang == 'de' else 'Dutch' if lang == 'nl' else lang.upper()
    log(f"\n{'=' * 60}")
    log(f"Building {lang_label} ({lang}) site...")
    log(f"{'=' * 60}")

    if lang == 'en':
        base_dir = WEBSITE_DIR
    else:
        base_dir = WEBSITE_DIR / lang
        base_dir.mkdir(parents=True, exist_ok=True)

    tour_translations = translations.get('tours', {})
    dest_translations = translations.get('destinations', {})

    translated_count = len(tour_translations)
    log(f"Found {translated_count} tour translations for {lang}")
    if tour_translations:
        log(f"Translation tour_ids: {list(tour_translations.keys())}")

    # Build tour pages
    log(f"\nGenerating {lang} tour pages...")
    log(f"Total tours to check: {len(tours)}")
    lang_tour_count = 0
    skipped_no_translation = 0
    for tour in tours:
        slug = tour.get('slug')
        if not slug:
            continue

        tour_id = tour.get('id')

        if lang != 'en' and tour_id not in tour_translations:
            skipped_no_translation += 1
            continue

        log(f"Building {lang} page for tour: {slug} (id: {tour_id})")

        translated_tour = apply_tour_translation(tour, tour_translations.get(tour_id))

        tour_reviews = reviews_by_tour.get(tour_id, [])
        dest_id = tour.get('destination_id')
        destination = destinations_by_id.get(dest_id, {})

        translated_dest = apply_dest_translation(destination, dest_translations.get(dest_id))

        related = [t_item for t_item in tours
                   if t_item.get('destination_id') == dest_id and t_item.get('id') != tour_id
                   and (lang == 'en' or t_item.get('id') in tour_translations)]
        translated_related = [apply_tour_translation(rt, tour_translations.get(rt.get('id'))) for rt in related]

        html = render_tour_page(translated_tour, translated_dest, translated_related, tour_reviews, faqs, tours_by_id,
                                tour_extras_by_tour=tour_extras_by_tour or {},
                                payment_settings=payment_settings or {}, routes_by_id=routes_by_id,
                                reviews_by_tour=reviews_by_tour, lang=lang)

        if html:
            html = translate_html_ui(html, lang)

            if lang != 'en':
                # Convert relative paths to absolute so they work both
                # at /de/wandertouren/ on .de and /nl/wandeltochten/ on .com
                html = html.replace('href="../', 'href="/')
                html = html.replace('src="../', 'src="/')
                html = html.replace('<html lang="en"', f'<html lang="{lang}"')

                # Fix internal links to use translated paths
                tour_folder = TOUR_FOLDER.get(lang, 'walking-tours')
                wa_prefix = WALKING_AREA_PREFIX.get(lang, 'walking-area')
                dest_prefix = DESTINATION_PREFIX.get(lang, 'destination')
                html = html.replace('href="/walking-tours/', f'href="/{tour_folder}/')
                html = html.replace('href="/walking-area-', f'href="/{wa_prefix}-')
                html = html.replace('href="/destination-', f'href="/{dest_prefix}-')
                html = html.replace('href="walking-area-', f'href="/{wa_prefix}-')
                html = html.replace('href="destination-', f'href="/{dest_prefix}-')

                # Canonical URL
                canonical_tour_url = lang_url(lang, f'{tour_folder}/{slug}.html')
                html = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{canonical_tour_url}"', html)
                if 'rel="canonical"' not in html:
                    html = html.replace('</head>', f'    <link rel="canonical" href="{canonical_tour_url}"/>\n</head>')

                # hreflang tags (all three languages)
                en_tour_url = lang_url('en', f'walking-tours/{slug}.html')
                de_tour_url = lang_url('de', f'{TOUR_FOLDER["de"]}/{slug}.html')
                nl_tour_url = lang_url('nl', f'{TOUR_FOLDER["nl"]}/{slug}.html')
                hreflang_tags = f'''<link rel="alternate" hreflang="en" href="{en_tour_url}" />
    <link rel="alternate" hreflang="de" href="{de_tour_url}" />
    <link rel="alternate" hreflang="nl" href="{nl_tour_url}" />'''
                html = html.replace('</head>', f'{hreflang_tags}\n</head>')

                # switchLang() for language switcher
                switchlang_js = """<script>function switchLang(lang){var el=document.querySelector('link[hreflang="'+lang+'"]');if(el)window.location.href=el.getAttribute('href');}</script>"""
                html = html.replace('</body>', f'{switchlang_js}\n</body>')

            tour_folder = TOUR_FOLDER.get(lang, 'walking-tours')
            output_path = base_dir / tour_folder / f'{slug}.html'

            if DRY_RUN:
                log(f"Would generate: {output_path}", 'debug')
            else:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'w') as f:
                    f.write(html)
                log(f"Generated: {output_path}")

            lang_tour_count += 1
        else:
            log(f"Failed to render {lang} tour: {slug}", 'error')

    log(f"Generated {lang_tour_count} {lang} tour pages (skipped {skipped_no_translation} without translation)")

    # Build destination pages
    log(f"\nGenerating {lang} destination pages...")
    lang_dest_count = 0
    for destination in destinations:
        slug = destination.get('slug')
        if not slug:
            continue

        dest_id = destination.get('id')

        if lang != 'en':
            dest_tours_translated = [t_item for t_item in tours
                                    if t_item.get('destination_id') == dest_id
                                    and t_item.get('id') in tour_translations]
            if not dest_tours_translated:
                continue

        translated_dest = apply_dest_translation(destination, dest_translations.get(dest_id))
        dest_tours = [t_item for t_item in tours if t_item.get('destination_id') == dest_id]
        translated_dest_tours = [apply_tour_translation(dt, tour_translations.get(dt.get('id'))) for dt in dest_tours]

        dest_reviews = []
        for dt in dest_tours:
            dest_reviews.extend(reviews_by_tour.get(dt.get('id'), []))

        html = render_destination_page(translated_dest, translated_dest_tours, dest_reviews, faqs, tours_by_id)

        if html:
            html = translate_html_ui(html, lang)

            if lang != 'en':
                html = html.replace('<html lang="en"', f'<html lang="{lang}"')

                # Fix internal links to use translated paths
                tour_folder = TOUR_FOLDER.get(lang, 'walking-tours')
                wa_prefix = WALKING_AREA_PREFIX.get(lang, 'walking-area')
                dest_prefix = DESTINATION_PREFIX.get(lang, 'destination')
                html = html.replace('href="/walking-tours/', f'href="/{tour_folder}/')
                html = html.replace('href="/walking-area-', f'href="/{wa_prefix}-')
                html = html.replace('href="/destination-', f'href="/{dest_prefix}-')
                html = html.replace('href="walking-tours/', f'href="/{tour_folder}/')
                html = html.replace('href="walking-area-', f'href="/{wa_prefix}-')
                html = html.replace('href="destination-', f'href="/{dest_prefix}-')
                html = html.replace('href="../walking-tours/', f'href="/{tour_folder}/')
                html = html.replace('src="../', 'src="/')
                html = html.replace('href="../', 'href="/')

                # Canonical URL
                canonical_dest_url = lang_url(lang, f'{wa_prefix}-{slug}.html')
                html = re.sub(r'<link rel="canonical" href="[^"]*"', f'<link rel="canonical" href="{canonical_dest_url}"', html)
                if 'rel="canonical"' not in html:
                    html = html.replace('</head>', f'    <link rel="canonical" href="{canonical_dest_url}"/>\n</head>')

                # hreflang tags (all three languages)
                en_dest_url = lang_url('en', f'walking-area-{slug}.html')
                de_dest_url = lang_url('de', f'{WALKING_AREA_PREFIX["de"]}-{slug}.html')
                nl_dest_url = lang_url('nl', f'{WALKING_AREA_PREFIX["nl"]}-{slug}.html')
                hreflang_tags = f'''<link rel="alternate" hreflang="en" href="{en_dest_url}" />
    <link rel="alternate" hreflang="de" href="{de_dest_url}" />
    <link rel="alternate" hreflang="nl" href="{nl_dest_url}" />'''
                html = html.replace('</head>', f'{hreflang_tags}\n</head>')

                # switchLang() for language switcher
                switchlang_js = """<script>function switchLang(lang){var el=document.querySelector('link[hreflang="'+lang+'"]');if(el)window.location.href=el.getAttribute('href');}</script>"""
                html = html.replace('</body>', f'{switchlang_js}\n</body>')

            wa_prefix = WALKING_AREA_PREFIX.get(lang, 'walking-area')
            dest_prefix = DESTINATION_PREFIX.get(lang, 'destination')
            output_path = base_dir / f'{wa_prefix}-{slug}.html'
            dest_path = base_dir / f'{dest_prefix}-{slug}.html'

            if not DRY_RUN:
                with open(output_path, 'w') as f:
                    f.write(html)
                with open(dest_path, 'w') as f:
                    f.write(html)
                log(f"Generated: {output_path}")

            lang_dest_count += 1

    log(f"Generated {lang_dest_count} {lang} destination pages")
    return lang_tour_count, lang_dest_count


def main():
    """Main build process."""
    log("=" * 60)
    log("Walking Holiday Ireland — Build System")
    log("=" * 60)

    # Fetch data
    if LOCAL_MODE:
        data_dir = WEBSITE_DIR / '_data'
        log("Using local data files...", 'info')
        with open(data_dir / 'tours.json') as f:
            tours = json.load(f)
        with open(data_dir / 'destinations.json') as f:
            destinations = json.load(f)
        with open(data_dir / 'reviews.json') as f:
            reviews = json.load(f)
        with open(data_dir / 'faqs.json') as f:
            faqs = json.load(f)
        with open(data_dir / 'regions.json') as f:
            regions = json.load(f)
        posts_path = data_dir / 'posts.json'
        if posts_path.exists():
            with open(posts_path) as f:
                posts = json.load(f)
        else:
            posts = []
        # Local mode tour extras and global settings
        te_path = data_dir / 'tour_extras.json'
        tour_extras_list = json.load(open(te_path)) if te_path.exists() else []
        gs_path = data_dir / 'global_settings.json'
        global_settings_list = json.load(open(gs_path)) if gs_path.exists() else []
        # Local mode routes
        routes_path = data_dir / 'routes.json'
        routes = json.load(open(routes_path)) if routes_path.exists() else []
    else:
        log("Fetching tours from Supabase...")
        tours = fetch_supabase('tours', '&status=eq.published&order=sort_order')

        log("Fetching destinations from Supabase...")
        destinations = fetch_supabase('destinations', '&status=eq.published&order=sort_order')

        log("Fetching reviews from Supabase...")
        reviews = fetch_supabase('reviews', '&status=eq.published&order=featured.desc,rating.desc,review_date.desc')

        log("Fetching FAQs from Supabase...")
        faqs = fetch_supabase('faqs', '&status=eq.published&language=eq.en&order=section,sort_order')

        log("Fetching regions from Supabase...")
        regions = fetch_supabase('regions', '&order=sort_order')

        log("Fetching tour extras from Supabase...")
        tour_extras_list = fetch_supabase('tour_extras', '&is_active=eq.true&order=sort_order')

        log("Fetching global settings from Supabase...")
        global_settings_list = fetch_supabase('global_settings', '')

        log("Fetching routes from Supabase...")
        routes = fetch_supabase('routes', '&order=name') or []

        log("Fetching blog posts from Supabase...")
        posts_lower = fetch_supabase('posts', '&status=eq.published&language=eq.en&order=published_date.desc')
        posts_upper = fetch_supabase('posts', '&status=eq.Published&language=eq.en&order=published_date.desc')
        # Combine and deduplicate
        seen_ids = set()
        posts = []
        for p in (posts_lower or []) + (posts_upper or []):
            if p.get('id') not in seen_ids:
                seen_ids.add(p.get('id'))
                posts.append(p)

        # Cache posts locally
        data_dir = WEBSITE_DIR / '_data'
        data_dir.mkdir(exist_ok=True)
        with open(data_dir / 'posts.json', 'w') as f:
            json.dump(posts, f, indent=2)
        log(f"Cached {len(posts)} blog posts to _data/posts.json")

    if not tours and not destinations:
        log("No data fetched. Check Supabase connection and RLS policies.", 'error')
        return

    log(f"Fetched {len(tours)} tours, {len(destinations)} destinations, {len(reviews)} reviews, {len(faqs)} FAQs, {len(regions)} regions, {len(routes)} routes, {len(posts)} blog posts")

    # Build lookups
    destinations_by_id = {d['id']: d for d in destinations}
    tours_by_id = {t['id']: t for t in tours}
    regions_by_id = {r['id']: r for r in regions}
    routes_by_id = {r['id']: r for r in routes}

    # Build tour extras lookup (by tour_id)
    tour_extras_by_tour = {}
    for ex in (tour_extras_list or []):
        tid = ex.get('tour_id')
        if tid:
            tour_extras_by_tour.setdefault(tid, []).append(ex)
    log(f"Tour extras: {sum(len(v) for v in tour_extras_by_tour.values())} extras across {len(tour_extras_by_tour)} tours")

    # Extract payment settings from global_settings
    payment_settings = {'deposit_percent': 25}  # default
    for gs in (global_settings_list or []):
        if gs.get('setting_key') == 'payment_config':
            pc = gs.get('setting_json', {})
            if isinstance(pc, dict):
                payment_settings['deposit_percent'] = pc.get('deposit_percent', 25)
            break
    log(f"Payment settings: deposit = {payment_settings['deposit_percent']}%")

    # Extract company config from global_settings
    company_config = {}
    for gs in (global_settings_list or []):
        if gs.get('setting_key') == 'company_config':
            company_config = gs.get('setting_json', {})
            break
    log(f"Company config loaded: {bool(company_config)}")

    # Group reviews by tour_id
    reviews_by_tour = {}
    for review in reviews:
        tour_id = review.get('tour_id')
        if tour_id:
            if tour_id not in reviews_by_tour:
                reviews_by_tour[tour_id] = []
            reviews_by_tour[tour_id].append(review)

    # Group reviews by destination_id
    reviews_by_dest = {}
    for review in reviews:
        dest_id = review.get('destination_id')
        if dest_id:
            if dest_id not in reviews_by_dest:
                reviews_by_dest[dest_id] = []
            reviews_by_dest[dest_id].append(review)

    # Build tour pages
    log("\nGenerating tour pages...")
    for tour in tours:
        slug = tour.get('slug')
        if not slug:
            log("Tour has no slug, skipping", 'warn')
            continue

        tour_id = tour.get('id')
        tour_reviews = reviews_by_tour.get(tour_id, [])

        # Get destination for this tour
        dest_id = tour.get('destination_id')
        destination = destinations_by_id.get(dest_id, {})

        # Get related tours (same destination, different tour)
        related = [t for t in tours if t.get('destination_id') == dest_id and t.get('id') != tour_id]

        html = render_tour_page(tour, destination, related, tour_reviews, faqs, tours_by_id,
                                tour_extras_by_tour=tour_extras_by_tour,
                                payment_settings=payment_settings, routes_by_id=routes_by_id,
                                reviews_by_tour=reviews_by_tour, lang='en')

        if html:
            output_path = WEBSITE_DIR / 'tours' / f'{slug}.html'

            if DRY_RUN:
                log(f"Would generate: {output_path}", 'debug')
            else:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'w') as f:
                    f.write(html)
                log(f"Generated: {output_path}")

            generated['tours'].append(slug)
        else:
            generated['errors'].append(f"Tour {slug} failed to render")

    # Build destination pages
    log("\nGenerating destination pages...")
    for destination in destinations:
        slug = destination.get('slug')
        if not slug:
            log("Destination has no slug, skipping", 'warn')
            continue

        dest_id = destination.get('id')
        dest_tours = [t for t in tours if t.get('destination_id') == dest_id]
        dest_reviews = []
        for tour in dest_tours:
            dest_reviews.extend(reviews_by_tour.get(tour.get('id'), []))

        html = render_destination_page(destination, dest_tours, dest_reviews, faqs, tours_by_id)

        if html:
            # Write both destination-{slug}.html and walking-area-{slug}.html
            output_path = WEBSITE_DIR / f'destination-{slug}.html'
            walking_area_path = WEBSITE_DIR / f'walking-area-{slug}.html'

            if DRY_RUN:
                log(f"Would generate: {output_path}", 'debug')
            else:
                with open(output_path, 'w') as f:
                    f.write(html)
                with open(walking_area_path, 'w') as f:
                    f.write(html)
                log(f"Generated: {output_path} + walking-area-{slug}.html")

            generated['destinations'].append(slug)
        else:
            generated['errors'].append(f"Destination {slug} failed to render")

    # Save FAQ data cache
    if not LOCAL_MODE:
        data_dir = WEBSITE_DIR / '_data'
        data_dir.mkdir(exist_ok=True)
        with open(data_dir / 'faqs.json', 'w') as f:
            json.dump(faqs, f, indent=2)
        log(f"Cached {len(faqs)} FAQs to _data/faqs.json")

    # Build FAQ page
    log("\nGenerating FAQ page...")
    faq_template_path = WEBSITE_DIR / '_templates' / 'faq.html'
    if faq_template_path.exists():
        with open(faq_template_path, 'r') as f:
            faq_template = f.read()

        faq_sections_html = render_all_faq_sections(faqs)
        faq_tabs_html = render_faq_section_tabs(faqs)
        faq_schema_html = render_faq_schema(faqs, max_items=10)

        faq_html = faq_template
        faq_replacements = {
            '{faq_sections_html}': faq_sections_html,
            '{faq_tabs_html}': faq_tabs_html,
            '{faq_schema}': faq_schema_html,
            '{faq_count}': str(len(faqs)),
        }
        for key, value in faq_replacements.items():
            faq_html = faq_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'faq.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(faq_html)
            log(f"Generated: {output_path}")
    else:
        log("FAQ template not found, skipping", 'warn')

    # Build Reviews page
    log("\nGenerating Reviews page...")
    reviews_template_path = WEBSITE_DIR / '_templates' / 'reviews.html'
    if reviews_template_path.exists():
        with open(reviews_template_path, 'r') as f:
            reviews_template = f.read()

        all_stats = compute_review_stats(reviews)
        stats_bar_html = render_review_stats_bar(all_stats)

        # Build all review cards for the page (featured first)
        sorted_reviews = sorted(reviews, key=lambda r: (
            not r.get('featured', False),
            -(r.get('rating', 0)),
            r.get('review_date', '') or ''
        ))

        all_cards_html = ""
        for review in sorted_reviews:
            tour_id = review.get('tour_id')
            tour = tours_by_id.get(tour_id, {})
            all_cards_html += render_review_card(review, tour_name=tour.get('name', ''), show_tour=True)

        # Build filter options
        tour_options = '<option value="all">All Tours</option>\n'
        for t in sorted(tours, key=lambda x: x.get('name', '')):
            t_id = t.get('id', '')
            t_name = escape(t.get('name', ''))
            t_count = len(reviews_by_tour.get(t_id, []))
            if t_count > 0:
                tour_options += f'            <option value="{t_id}">{t_name} ({t_count})</option>\n'

        dest_options = '<option value="all">All Destinations</option>\n'
        seen_dests = set()
        for d in sorted(destinations, key=lambda x: x.get('name', '')):
            d_id = d.get('id', '')
            d_name = escape(d.get('name', ''))
            d_count = len(reviews_by_dest.get(d_id, []))
            if d_count > 0 and d_id not in seen_dests:
                dest_options += f'            <option value="{d_id}">{d_name} ({d_count})</option>\n'
                seen_dests.add(d_id)

        review_schema_all = render_review_schema(reviews, 'Walking Holiday Ireland', 'Self-guided walking holidays through Ireland', 'LocalBusiness')

        reviews_page_html = reviews_template
        reviews_replacements = {
            '{stats_bar_html}': stats_bar_html,
            '{review_cards_html}': all_cards_html,
            '{tour_filter_options}': tour_options,
            '{destination_filter_options}': dest_options,
            '{review_schema}': review_schema_all,
            '{review_count}': str(len(reviews)),
            '{avg_rating}': str(all_stats['avg']),
        }
        for key, value in reviews_replacements.items():
            reviews_page_html = reviews_page_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'reviews.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(reviews_page_html)
            log(f"Generated: {output_path}")
    else:
        log("Reviews template not found, skipping", 'warn')

    # Save data caches
    if not LOCAL_MODE:
        data_dir = WEBSITE_DIR / '_data'
        data_dir.mkdir(exist_ok=True)
        with open(data_dir / 'reviews.json', 'w') as f:
            json.dump(reviews, f, indent=2)
        log(f"Cached {len(reviews)} reviews to _data/reviews.json")
        with open(data_dir / 'regions.json', 'w') as f:
            json.dump(regions, f, indent=2)
        log(f"Cached {len(regions)} regions to _data/regions.json")

    # Build Tours Listing page
    log("\nGenerating Tours listing page...")
    tours_listing_template_path = WEBSITE_DIR / '_templates' / 'tours-listing.html'
    if tours_listing_template_path.exists():
        with open(tours_listing_template_path, 'r') as f:
            tours_listing_template = f.read()

        tours_json = render_tours_listing_json(tours, reviews_by_tour=reviews_by_tour, all_dest_reviews=reviews)
        tours_schema = render_tours_listing_schema(tours)
        region_options = render_region_filter_options(tours)
        difficulty_options = render_difficulty_filter_options(tours)

        # Compute duration range
        durations = [t.get('duration_days', 0) for t in tours if t.get('duration_days')]
        duration_range = f"{min(durations)} to {max(durations)}" if durations else "5 to 10"

        tours_listing_replacements = {
            '{tours_json_data}': tours_json,
            '{tours_schema}': tours_schema,
            '{region_filter_options}': region_options,
            '{difficulty_filter_options}': difficulty_options,
            '{tour_count}': str(len(tours)),
            '{duration_range}': duration_range,
        }

        tours_listing_html = tours_listing_template
        for key, value in tours_listing_replacements.items():
            tours_listing_html = tours_listing_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'walking-tours.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(tours_listing_html)
            log(f"Generated: {output_path}")
    else:
        log("Tours listing template not found, skipping", 'warn')

    # Build Destinations Listing page
    log("\nGenerating Destinations listing page...")
    dests_listing_template_path = WEBSITE_DIR / '_templates' / 'destinations-listing.html'
    if dests_listing_template_path.exists():
        with open(dests_listing_template_path, 'r') as f:
            dests_listing_template = f.read()

        # Only include destinations that have published tours
        published_dest_ids = set(t.get('destination_id') for t in tours if t.get('destination_id'))
        active_destinations = [d for d in destinations if d.get('id') in published_dest_ids]

        dests_json = render_destinations_listing_json(active_destinations, tours)
        dests_schema = render_destinations_listing_schema(active_destinations, tours)
        region_tabs = render_region_tabs(regions_by_id, active_destinations)
        dests_by_region_html = render_destinations_by_region(active_destinations, tours, regions_by_id, reviews_by_dest)

        # Compute min price across all tours
        all_prices = []
        for t in tours:
            try:
                p = float(t.get('price_per_person_eur', 0))
                if p > 0:
                    all_prices.append(p)
            except (ValueError, TypeError):
                pass
        min_price = f"€{min(all_prices):.0f}" if all_prices else "€495"

        dests_listing_replacements = {
            '{destinations_json_data}': dests_json,
            '{destinations_schema}': dests_schema,
            '{region_tabs_html}': region_tabs,
            '{destinations_by_region_html}': dests_by_region_html,
            '{destination_count}': str(len(active_destinations)),
            '{min_price}': min_price,
        }

        dests_listing_html = dests_listing_template
        for key, value in dests_listing_replacements.items():
            dests_listing_html = dests_listing_html.replace(key, str(value))

        output_path = WEBSITE_DIR / 'destinations.html'
        if not DRY_RUN:
            with open(output_path, 'w') as f:
                f.write(dests_listing_html)
            log(f"Generated: {output_path}")
    else:
        log("Destinations listing template not found, skipping", 'warn')

    # ── Build Blog Pages ──────────────────────────────────────
    log("\nGenerating blog pages...")
    blog_template_path = WEBSITE_DIR / '_templates' / 'blog-article.html'
    blog_dir = WEBSITE_DIR / 'blog'
    blog_dir.mkdir(exist_ok=True)
    generated_blog_slugs = []

    if blog_template_path.exists() and posts:
        with open(blog_template_path, 'r') as f:
            blog_template = f.read()

        # Build sidebar tours widget (top 3 tours by sort_order)
        sidebar_tours_html = ''
        sidebar_tours = sorted(tours, key=lambda t: t.get('sort_order', 999))[:3]
        for st in sidebar_tours:
            st_slug = escape(st.get('slug', ''))
            st_name = escape(st.get('name', ''))
            st_days = st.get('duration_days', 0) or 0
            st_price = st.get('price_per_person_eur', 0)
            try:
                st_price_display = f"From &euro;{float(st_price):.0f}" if st_price else ''
            except (ValueError, TypeError):
                st_price_display = ''
            st_detail = f"{st_price_display} &bull; {st_days} Days" if st_price_display else f"{st_days} Days"
            sidebar_tours_html += f'''<a class="group flex gap-4 items-start" href="../walking-tours/{st_slug}.html">
                    <div class="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-primary/20 to-brand-purple/20">
                        <img src="../images/routes/{st_slug}/card.jpg" alt="{st_name}" class="w-full h-full object-cover transition-transform group-hover:scale-110" loading="lazy" onerror="this.style.display='none'"/>
                    </div>
                    <div>
                        <h4 class="font-bold group-hover:text-primary transition-colors line-clamp-2">{st_name}</h4>
                        <p class="text-sm text-slate-500 mt-1">{st_detail}</p>
                    </div>
                </a>\n'''

        # Build recommended tours cards (3 tours — same card style as blog listing page)
        recommended_tours_html = ''
        rec_tours = sorted(tours, key=lambda t: t.get('sort_order', 999))[:3]
        for rt in rec_tours:
            rt_slug = escape(rt.get('slug', ''))
            rt_name = escape(rt.get('name', ''))
            rt_days = rt.get('duration_days', 0) or 0
            rt_price = rt.get('price_per_person_eur', 0)
            rt_subtitle = escape(rt.get('subtitle', '') or rt.get('short_description', '') or '')
            if len(rt_subtitle) > 40:
                rt_subtitle = rt_subtitle[:37] + '...'
            try:
                rt_price_display = f"&euro;{float(rt_price):.0f}" if rt_price else ''
            except (ValueError, TypeError):
                rt_price_display = ''
            recommended_tours_html += f'''
            <a href="../walking-tours/{rt_slug}.html" class="bg-background-light rounded-xl overflow-hidden shadow-sm border border-primary/10 group hover:shadow-lg transition-all">
                <div class="h-40 overflow-hidden relative bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="../images/routes/{rt_slug}/card.jpg" alt="{rt_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'"/>
                    <span class="absolute top-3 right-3 bg-white/90 text-primary text-[10px] font-bold px-2 py-1 rounded">{rt_days} Days</span>
                </div>
                <div class="p-4">
                    <h4 class="font-bold text-base mb-1 group-hover:text-primary transition-colors">{rt_name}</h4>
                    <p class="text-xs text-slate-500 mb-3">{rt_subtitle}</p>
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-primary">{rt_price_display}</span>
                        <span class="text-xs font-bold underline underline-offset-4">Details</span>
                    </div>
                </div>
            </a>'''

        # Build sidebar categories (unique categories with post counts)
        from collections import Counter
        cat_counter = Counter(p.get('category', 'Blog') or 'Blog' for p in posts if p.get('slug'))
        sidebar_categories_html = ''
        # "All Posts" link first
        sidebar_categories_html += f'<li><a class="flex justify-between items-center text-slate-700 hover:text-primary font-medium transition-colors" href="../blog.html"><span>All Posts</span><span class="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{len(posts)}</span></a></li>\n'
        for cat_name, cat_count in cat_counter.most_common():
            cat_s = (cat_name or 'blog').lower().replace(' ', '-').replace("'", '')
            sidebar_categories_html += f'<li><a class="flex justify-between items-center text-slate-700 hover:text-primary font-medium transition-colors" href="../blog.html?category={escape(cat_s)}"><span>{escape(cat_name)}</span><span class="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{cat_count}</span></a></li>\n'

        # Build sidebar recent posts (5 most recent by published_date)
        sorted_posts = sorted(
            [p for p in posts if p.get('slug')],
            key=lambda p: p.get('published_date') or p.get('published_at', '')[:10] if p.get('published_at') else '',
            reverse=True
        )[:5]
        sidebar_recent_posts_html = ''
        for rp in sorted_posts:
            rp_slug = rp.get('slug', '')
            rp_title = rp.get('title', '')
            rp_date = rp.get('published_date') or (rp.get('published_at', '')[:10] if rp.get('published_at') else '')
            rp_date_display = rp_date
            try:
                from datetime import datetime as _dt
                rp_dt = _dt.strptime(rp_date[:10], '%Y-%m-%d')
                rp_date_display = rp_dt.strftime('%b %d, %Y')
            except (ValueError, TypeError):
                pass
            sidebar_recent_posts_html += f'''<li><a class="group block" href="{escape(rp_slug)}.html">
                    <p class="text-slate-700 group-hover:text-primary font-medium transition-colors line-clamp-2">{escape(rp_title)}</p>
                    <p class="text-xs text-slate-400 mt-1">{rp_date_display}</p>
                </a></li>\n'''

        for post in posts:
            slug = post.get('slug', '')
            if not slug:
                continue

            content = post.get('content', '')
            # Strip WordPress block comments
            import re as _re
            content = _re.sub(r'<!-- /?wp:\w+[^>]* -->', '', content)

            # Auto-embed YouTube links — matches youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
            # Standalone links (on their own line or wrapped in <p> tags alone)
            def _yt_embed(m):
                vid = m.group('id1') or m.group('id2') or m.group('id3')
                if vid:
                    return f'''<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/{vid}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'''
                return m.group(0)

            # Match YouTube URLs that are standalone (in <p> tags, <a> tags wrapping the URL, or bare)
            yt_pattern = r'(?:<p>\s*)?(?:<a[^>]*>)?\s*(?:https?://)?(?:www\.)?(?:youtu\.be/(?P<id1>[\w-]+)|youtube\.com/watch\?v=(?P<id2>[\w-]+)|youtube\.com/embed/(?P<id3>[\w-]+))(?:[^\s<]*)?\s*(?:</a>)?(?:\s*</p>)?'
            content = _re.sub(yt_pattern, _yt_embed, content)

            title = post.get('title', '')
            excerpt = post.get('excerpt', '') or ''
            featured_image = post.get('featured_image', '') or ''
            category = post.get('category', '') or 'Blog'
            meta_title = post.get('meta_title', '') or title
            meta_desc = post.get('meta_description', '') or excerpt[:160]
            published_date = post.get('published_date') or post.get('published_at', '')[:10] if post.get('published_at') else ''
            author = post.get('author') or post.get('author_name') or 'Walking Holiday Ireland'
            read_time = post.get('read_time_minutes') or max(1, len(content.split()) // 200)
            tags = post.get('tags', []) or []

            # Format date for display
            date_display = published_date
            try:
                from datetime import datetime as _dt
                dt = _dt.strptime(published_date[:10], '%Y-%m-%d')
                date_display = dt.strftime('%B %d, %Y')
            except (ValueError, TypeError):
                pass

            # Hero image HTML (with dark caption bar like Stitch design)
            hero_image_html = ''
            if featured_image:
                hero_image_html = f'''<div class="aspect-[16/9] bg-cover bg-center" style="background-image: url('{escape(featured_image)}');"></div>
            <div class="bg-slate-900 text-slate-300 text-xs italic px-4 py-2">Photo: Walking Holiday Ireland</div>'''
            else:
                hero_image_html = '<div class="aspect-[16/9] bg-gradient-to-br from-primary/20 to-brand-purple/20"></div>'

            # Tags HTML (hashtag style)
            tags_html = ''
            if tags and isinstance(tags, list):
                for tag in tags:
                    tags_html += f'<span class="bg-slate-100 px-3 py-1 rounded text-sm font-medium">#{escape(str(tag))}</span>\n'
            else:
                # Generate tags from category
                cat_tag = category.replace(' ', '')
                tags_html = f'''<span class="bg-slate-100 px-3 py-1 rounded text-sm font-medium">#{escape(cat_tag)}</span>
            <span class="bg-slate-100 px-3 py-1 rounded text-sm font-medium">#WalkingHoliday</span>
            <span class="bg-slate-100 px-3 py-1 rounded text-sm font-medium">#Ireland</span>'''

            # Build sidebar related articles (up to 3 other posts as simple links)
            related = [p for p in posts if p.get('slug') != slug][:3]
            sidebar_related_html = ''
            for rp in related:
                rp_slug = rp.get('slug', '')
                rp_title = rp.get('title', '')
                sidebar_related_html += f'<li><a class="text-slate-700 hover:text-primary font-medium transition-colors" href="{escape(rp_slug)}.html">{escape(rp_title)}</a></li>\n'

            replacements = {
                '{meta_title}': escape(meta_title),
                '{meta_description}': escape(meta_desc),
                '{slug}': escape(slug),
                '{category}': escape(category),
                '{read_time}': str(read_time),
                '{article_title}': escape(title),
                '{article_body}': content,
                '{date_display}': date_display,
                '{date_published}': published_date,
                '{hero_image_html}': hero_image_html,
                '{tags_html}': tags_html,
                '{sidebar_categories_html}': sidebar_categories_html,
                '{sidebar_recent_posts_html}': sidebar_recent_posts_html,
                '{sidebar_tours_html}': sidebar_tours_html,
                '{sidebar_related_html}': sidebar_related_html,
                '{recommended_tours_html}': recommended_tours_html,
            }

            html = blog_template
            for key, value in replacements.items():
                html = html.replace(key, str(value))

            output_path = blog_dir / f'{slug}.html'
            if not DRY_RUN:
                with open(output_path, 'w') as f:
                    f.write(html)
            generated_blog_slugs.append(slug)

        log(f"Generated {len(generated_blog_slugs)} blog article pages")
    else:
        if not posts:
            log("No blog posts found, skipping blog generation", 'warn')
        if not blog_template_path.exists():
            log("Blog article template not found, skipping", 'warn')

    # ── Build Blog Listing Page ───────────────────────────────
    log("\nGenerating blog listing page...")
    if posts and generated_blog_slugs:
        from datetime import datetime as _dt
        import re as _re

        # Category slug helper
        def cat_slug(cat):
            return (cat or 'blog').lower().replace(' ', '-').replace("'", '')

        # Build all blog cards in Stitch design style
        grid_cards = ''
        for post in posts:
            ps = post.get('slug', '')
            if ps not in generated_blog_slugs:
                continue
            p_img = post.get('featured_image', '') or ''
            p_cat = post.get('category', '') or 'Walking Routes'
            p_title = post.get('title', '')
            p_excerpt = post.get('excerpt', '') or ''
            if len(p_excerpt) > 160:
                p_excerpt = p_excerpt[:157] + '...'
            p_date = post.get('published_date') or (post.get('published_at', '')[:10] if post.get('published_at') else '')
            try:
                p_date_display = _dt.strptime(p_date[:10], '%Y-%m-%d').strftime('%B %d, %Y')
            except (ValueError, TypeError):
                p_date_display = p_date

            grid_cards += f'''
        <article class="blog-card flex flex-col group cursor-pointer" data-category="{cat_slug(p_cat)}">
            <a href="blog/{escape(ps)}.html" class="flex flex-col h-full">
                <div class="overflow-hidden rounded-xl aspect-[16/10] mb-5 bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="{escape(p_img)}" alt="{escape(p_title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.style.display='none'"/>
                </div>
                <div class="flex items-center gap-3 mb-3">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">{escape(p_cat)}</span>
                    <span class="text-xs text-slate-500">{p_date_display}</span>
                </div>
                <h3 class="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{escape(p_title)}</h3>
                <p class="text-slate-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-grow">{escape(p_excerpt)}</p>
                <span class="mt-auto flex items-center gap-2 text-primary font-bold text-sm">
                    Read Article <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
            </a>
        </article>'''

        # Build recommended tours (pick up to 4 popular tours)
        recommended_html = ''
        featured_tours = sorted(tours, key=lambda t: t.get('sort_order', 999))[:4]
        for tour in featured_tours:
            t_slug = tour.get('slug', '')
            t_name = escape(tour.get('name', ''))
            t_days = tour.get('duration_days', 0) or 0
            t_price = tour.get('price_per_person_eur', 0)
            t_subtitle = escape(tour.get('subtitle', '') or tour.get('short_description', '') or '')
            if len(t_subtitle) > 40:
                t_subtitle = t_subtitle[:37] + '...'
            try:
                t_price_display = f"&euro;{float(t_price):.0f}" if t_price else ''
            except (ValueError, TypeError):
                t_price_display = ''

            recommended_html += f'''
            <a href="walking-tours/{escape(t_slug)}.html" class="bg-background-light rounded-xl overflow-hidden shadow-sm border border-primary/10 group hover:shadow-lg transition-all">
                <div class="h-40 overflow-hidden relative bg-gradient-to-br from-primary/20 to-brand-purple/20">
                    <img src="images/routes/{escape(t_slug)}/card.jpg" alt="{t_name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" onerror="this.style.display='none'"/>
                    <span class="absolute top-3 right-3 bg-white/90 text-primary text-[10px] font-bold px-2 py-1 rounded">{t_days} Days</span>
                </div>
                <div class="p-4">
                    <h4 class="font-bold text-base mb-1 group-hover:text-primary transition-colors">{t_name}</h4>
                    <p class="text-xs text-slate-500 mb-3">{t_subtitle}</p>
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-primary">{t_price_display}</span>
                        <span class="text-xs font-bold underline underline-offset-4">Details</span>
                    </div>
                </div>
            </a>'''

        # Read existing blog.html and replace content between markers
        blog_listing_path = WEBSITE_DIR / 'blog.html'
        if blog_listing_path.exists():
            with open(blog_listing_path, 'r') as f:
                blog_listing = f.read()

            # Inject blog cards into grid
            new_grid_content = f'''<!-- Content Area -->
    <div id="blog-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
{grid_cards}
    </div>'''
            pattern = r'<!-- Content Area -->.*?</div>\s*\n\s*\n\s*<!-- Pagination -->'
            replacement = new_grid_content + '\n\n    <!-- Pagination -->'
            blog_listing_new = _re.sub(pattern, replacement, blog_listing, flags=_re.DOTALL)

            # Inject recommended tours
            rec_pattern = r'(<div[^>]*id="recommended-tours"[^>]*>)\s*<!-- Populated by build\.py -->\s*(</div>)'
            rec_replacement = r'\g<1>' + recommended_html + '\n        ' + r'\g<2>'
            blog_listing_new = _re.sub(rec_pattern, rec_replacement, blog_listing_new, flags=_re.DOTALL)

            if not DRY_RUN:
                with open(blog_listing_path, 'w') as f:
                    f.write(blog_listing_new)
                log(f"Generated blog listing page with {len(generated_blog_slugs)} posts")
        else:
            log("blog.html not found, skipping listing page", 'warn')

    # ── Build Language Sites ─────────────────────────────────
    LANGUAGES_TO_BUILD = ['de']  # Add 'nl', 'es', 'fr' later

    for lang in LANGUAGES_TO_BUILD:
        log(f"\nFetching {lang} translations from Supabase...")
        translations = fetch_translations(lang)

        lang_tours, lang_dests = build_language_site(
            lang=lang,
            tours=tours,
            destinations=destinations,
            reviews=reviews,
            faqs=faqs,
            regions=regions,
            posts=posts,
            translations=translations,
            tours_by_id=tours_by_id,
            destinations_by_id=destinations_by_id,
            regions_by_id=regions_by_id,
            reviews_by_tour=reviews_by_tour,
            reviews_by_dest=reviews_by_dest,
            tour_extras_by_tour=tour_extras_by_tour,
            payment_settings=payment_settings,
            routes_by_id=routes_by_id,
        )

        # Build translated static pages (homepage, about, contact, etc.)
        lang_static = build_static_pages(lang, translations)

        log(f"\n{lang.upper()} site: {lang_tours} tour pages, {lang_dests} destination pages, {lang_static} static pages")

    # Summary
    log("\n" + "=" * 60)
    log(f"Build complete: {len(generated['tours'])} tours, {len(generated['destinations'])} destinations")
    if generated['errors']:
        log(f"Errors: {len(generated['errors'])}", 'error')
        for error in generated['errors']:
            log(f"  - {error}", 'error')
    log("=" * 60)

    # Generate sitemap.xml
    if not DRY_RUN:
        today = datetime.now().strftime('%Y-%m-%d')
        sitemap_urls = []

        # Homepage — highest priority
        sitemap_urls.append(('https://walkingholidayireland.com/', '1.0', 'weekly'))

        # Listing pages — high priority
        sitemap_urls.append(('https://walkingholidayireland.com/walking-tours.html', '0.9', 'weekly'))
        sitemap_urls.append(('https://walkingholidayireland.com/destinations.html', '0.9', 'weekly'))

        # Individual tour pages
        for slug in generated['tours']:
            sitemap_urls.append((f'https://walkingholidayireland.com/walking-tours/{slug}.html', '0.8', 'monthly'))

        # Individual destination / walking area pages (canonical is walking-area-)
        for slug in generated['destinations']:
            sitemap_urls.append((f'https://walkingholidayireland.com/walking-area-{slug}.html', '0.8', 'monthly'))

        # Reviews and FAQ
        sitemap_urls.append(('https://walkingholidayireland.com/reviews.html', '0.7', 'monthly'))
        sitemap_urls.append(('https://walkingholidayireland.com/faq.html', '0.7', 'monthly'))

        # Static pages
        for page in ['about.html', 'contact.html', 'how-it-works.html', 'tailor-made.html', 'tour-grading.html', 'blog.html']:
            if (WEBSITE_DIR / page).exists():
                sitemap_urls.append((f'https://walkingholidayireland.com/{page}', '0.5', 'monthly'))

        # Blog articles (only generated/published posts)
        for blog_slug in generated_blog_slugs:
            sitemap_urls.append((f'https://walkingholidayireland.com/blog/{blog_slug}.html', '0.6', 'monthly'))

        sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        for url, priority, changefreq in sitemap_urls:
            sitemap_xml += f'  <url>\n'
            sitemap_xml += f'    <loc>{url}</loc>\n'
            sitemap_xml += f'    <lastmod>{today}</lastmod>\n'
            sitemap_xml += f'    <changefreq>{changefreq}</changefreq>\n'
            sitemap_xml += f'    <priority>{priority}</priority>\n'
            sitemap_xml += f'  </url>\n'
        sitemap_xml += '</urlset>\n'

        sitemap_path = WEBSITE_DIR / 'sitemap.xml'
        with open(sitemap_path, 'w') as f:
            f.write(sitemap_xml)
        log(f"Sitemap generated: {sitemap_path} ({len(sitemap_urls)} URLs)")

    # Write manifest
    manifest = {
        'generated_at': datetime.now().isoformat(),
        'tours': generated['tours'],
        'destinations': generated['destinations'],
        'errors': generated['errors'],
        'dry_run': DRY_RUN,
    }

    manifest_path = WEBSITE_DIR / '_build_manifest.json'
    if not DRY_RUN:
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        log(f"Manifest written to: {manifest_path}")

    # ── Post-processing: replace hardcoded contact info with DB values ──
    if company_config and not DRY_RUN:
        log("\n" + "=" * 60)
        log("Post-processing: applying company config to generated files...")
        log("=" * 60)
        apply_company_config(WEBSITE_DIR, company_config)


def apply_company_config(website_dir, config):
    """Replace hardcoded contact info in all generated HTML/JS files with values from company_config."""
    import re

    phones = config.get('phone_numbers', {})
    social = config.get('social_media', {})
    email = config.get('company_email', '')
    address = config.get('company_address', '')

    # Build replacement map: old hardcoded value -> new DB value
    replacements = {}

    # ── Phone numbers ──
    landline = phones.get('landline', '')
    mobile = phones.get('mobile', '')
    whatsapp = phones.get('whatsapp', '')

    # Format WhatsApp number for wa.me link (strip spaces, ensure no +)
    wa_number = re.sub(r'[^0-9]', '', whatsapp) if whatsapp else ''

    if landline:
        # Hardcoded landline in various formats
        landline_digits = re.sub(r'[^0-9]', '', landline)
        replacements['+353 42 937 5983'] = landline
        replacements['+353 (0) 42 937 5983'] = landline
        replacements['+353429375983'] = '+' + landline_digits if landline_digits else '+353429375983'
        replacements['tel:+353429375983'] = 'tel:+' + landline_digits if landline_digits else 'tel:+353429375983'
        # Alternate number in FAQ data
        replacements['+353 42 932 3396'] = landline

    if mobile:
        # Hardcoded mobile/personal number in contact.html
        mobile_digits = re.sub(r'[^0-9]', '', mobile)
        replacements['+353 86 123 4567'] = mobile
        replacements['+353861234567'] = '+' + mobile_digits if mobile_digits else '+353861234567'
        replacements['tel:+353861234567'] = 'tel:+' + mobile_digits if mobile_digits else 'tel:+353861234567'

    if wa_number:
        replacements['https://wa.me/353429375983'] = f'https://wa.me/{wa_number}'
        # Also replace personal WhatsApp placeholder in contact.html
        replacements['https://wa.me/353861234567'] = f'https://wa.me/{wa_number}'

    # ── Email ──
    if email:
        replacements['info@walkingholidayireland.com'] = email

    # ── Social media ──
    social_map = {
        'facebook': 'https://www.facebook.com/walkingholidayireland',
        'instagram': 'https://www.instagram.com/walkingholidayireland',
        'youtube': 'https://www.youtube.com/@walkingholidayireland',
    }
    for key, old_url in social_map.items():
        new_url = social.get(key, '')
        if new_url:
            replacements[old_url] = new_url

    if not replacements:
        log("No contact replacements to apply (company_config may not have phone/social data yet)")
        return

    log(f"Applying {len(replacements)} contact info replacements...")
    for old_val, new_val in replacements.items():
        log(f"  {old_val[:40]:40s} -> {new_val[:40]}")

    # Walk all HTML and JS files
    file_count = 0
    change_count = 0
    for ext in ('*.html', '*.js'):
        for filepath in website_dir.rglob(ext):
            # Skip template files and data files
            if '/_templates/' in str(filepath) or '/_data/' in str(filepath):
                continue
            try:
                content = filepath.read_text(encoding='utf-8')
                original = content
                for old_val, new_val in replacements.items():
                    content = content.replace(old_val, new_val)
                if content != original:
                    filepath.write_text(content, encoding='utf-8')
                    change_count += 1
                file_count += 1
            except Exception as e:
                log(f"  Warning: could not process {filepath}: {e}", 'warn')

    log(f"Scanned {file_count} files, updated {change_count} with new contact info")


if __name__ == '__main__':
    main()
