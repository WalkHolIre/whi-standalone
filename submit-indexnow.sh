#!/bin/bash
# ============================================================
# IndexNow URL Submission Script for Walking Holiday Ireland
# ============================================================
# Submits all page URLs from all 3 sites to IndexNow after
# a new build is deployed. Run automatically via publish.yml
# or manually after deployments.
#
# Usage:
#   ./submit-indexnow.sh              # Submit all sites
#   ./submit-indexnow.sh en           # Submit .com only
#   ./submit-indexnow.sh de           # Submit .de only
#   ./submit-indexnow.sh nl           # Submit .nl only
#
# Requirements: curl, bash
# ============================================================

INDEXNOW_KEY="5f1a1ac2b2d941ecaf64396d8d7d6f49"
INDEXNOW_ENDPOINT="https://api.indexnow.org/indexnow"

# --- English (.com) URLs ---
EN_HOST="https://walkingholidayireland.com"
EN_URLS=(
  "/"
  "/about"
  "/destinations"
  "/walking-tours"
  "/how-it-works"
  "/contact"
  "/faq"
  "/reviews"
  "/blog"
  "/tour-grading"
  "/tailor-made"
  "/self-guided-walking-holidays-ireland"
  "/solo-walking-holidays-ireland"
  "/hiking-ireland"
  "/best-hiking-trails-ireland"
  "/checkout"
  "/wild-atlantic-way"
  "/ancient-east"
  "/northern-ireland"
  "/mountains-of-mourne"
  "/walking-holidays-ireland-over-50s"
  "/walking-area-dingle-way"
  "/walking-area-kerry-way"
  "/walking-area-wicklow-way"
  "/walking-area-burren-way"
  "/walking-area-causeway-coast"
  "/walking-area-causeway-glens"
  "/walking-area-cooley-mournes"
  "/walking-area-cooley-peninsula"
  "/walking-area-barrow-way"
  "/walking-area-beara-way"
  "/walking-area-sheeps-head-way"
  "/walking-area-dublin-wicklow"
  "/walking-tours/kerry-way"
  "/walking-tours/dingle-way"
  "/walking-tours/dingle-way-walking-tour-8d"
  "/walking-tours/wicklow-way"
  "/walking-tours/wicklow-way-5-days"
  "/walking-tours/wicklow-way-7-days"
  "/walking-tours/wicklow-way-10-days"
  "/walking-tours/burren-way"
  "/walking-tours/burren-5-days"
  "/walking-tours/burren-6-days"
  "/walking-tours/burren-7-days"
  "/walking-tours/causeway-coast"
  "/walking-tours/causeway-coast-5-days"
  "/walking-tours/cooley-mournes"
  "/walking-tours/cooley-peninsula-5-days"
  "/walking-tours/barrow-way"
  "/walking-tours/barrow-way-5-days"
  "/walking-tours/barrow-way-5-days-easy"
  "/walking-tours/full-barrow-way-walking"
)

# --- German (.de) URLs ---
DE_HOST="https://walkingholidayireland.de"
DE_URLS=(
  "/"
  "/ueber-uns"
  "/wanderziele-irland"
  "/wandertouren"
  "/so-funktioniert-es"
  "/kontakt"
  "/faq"
  "/bewertungen"
  "/blog"
  "/tourbewertung"
  "/massgeschneidert"
  "/individuelle-wanderferien-irland"
  "/solo-wanderurlaub-irland"
  "/wandern-irland"
  "/beste-wanderwege-irland"
  "/buchung"
  "/wild-atlantic-way"
  "/ancient-east"
  "/nordirland"
  "/mourne-mountains"
  "/wanderurlaub-irland-50-plus"
  "/datenschutz"
  "/agb"
  "/wandergebiet-dingle-way"
  "/wandergebiet-kerry-way"
  "/wandergebiet-wicklow-way"
  "/wandergebiet-burren-way"
  "/wandergebiet-causeway-coast"
  "/wandergebiet-causeway-glens"
  "/wandergebiet-cooley-mournes"
  "/wandergebiet-cooley-peninsula"
  "/wandergebiet-barrow-way"
  "/wandergebiet-beara-way"
  "/wandergebiet-sheeps-head-way"
  "/wandertouren/kerry-way"
  "/wandertouren/dingle-way-walking-tour-8d"
  "/wandertouren/wicklow-way"
  "/wandertouren/wicklow-way-5-days"
  "/wandertouren/wicklow-way-7-days"
  "/wandertouren/wicklow-way-10-days"
  "/wandertouren/burren-5-days"
  "/wandertouren/burren-6-days"
  "/wandertouren/burren-7-days"
  "/wandertouren/causeway-coast"
  "/wandertouren/causeway-coast-5-days"
  "/wandertouren/cooley-mournes"
  "/wandertouren/cooley-peninsula-5-days"
  "/wandertouren/barrow-way-5-days-easy"
  "/wandertouren/full-barrow-way-walking"
)

# --- Dutch (.nl) URLs ---
NL_HOST="https://wandelvakantieierland.nl"
NL_URLS=(
  "/"
  "/over-ons"
  "/wandelbestemmingen"
  "/wandeltochten"
  "/hoe-het-werkt"
  "/contact"
  "/faq"
  "/beoordelingen"
  "/blog"
  "/moeilijkheidsgraad"
  "/op-maat"
  "/wandelvakantie-ierland-op-eigen-houtje"
  "/solo-wandelvakantie-ierland"
  "/wandelen-ierland"
  "/beste-wandelpaden-ierland"
  "/boeken"
  "/wild-atlantic-way"
  "/ancient-east"
  "/noord-ierland"
  "/mourne-mountains"
  "/wandelvakantie-ierland-50-plus"
  "/privacybeleid"
  "/algemene-voorwaarden"
  "/wandelgebied-dingle-way"
  "/wandelgebied-kerry-way"
  "/wandelgebied-wicklow-way"
  "/wandelgebied-burren-way"
  "/wandelgebied-causeway-coast"
  "/wandelgebied-causeway-glens"
  "/wandelgebied-cooley-mournes"
  "/wandelgebied-cooley-peninsula"
  "/wandelgebied-barrow-way"
  "/wandelgebied-beara-way"
  "/wandelgebied-sheeps-head-way"
  "/wandeltochten/kerry-way"
  "/wandeltochten/dingle-way-walking-tour-8d"
  "/wandeltochten/wicklow-way"
  "/wandeltochten/wicklow-way-5-days"
  "/wandeltochten/wicklow-way-7-days"
  "/wandeltochten/wicklow-way-10-days"
  "/wandeltochten/burren-5-days"
  "/wandeltochten/burren-6-days"
  "/wandeltochten/burren-7-days"
  "/wandeltochten/causeway-coast"
  "/wandeltochten/causeway-coast-5-days"
  "/wandeltochten/cooley-mournes"
  "/wandeltochten/cooley-peninsula-5-days"
  "/wandeltochten/barrow-way-5-days-easy"
  "/wandeltochten/full-barrow-way-walking"
)

submit_urls() {
  local host=$1
  shift
  local urls=("$@")
  local full_urls=()

  for url in "${urls[@]}"; do
    full_urls+=("\"${host}${url}\"")
  done

  # Build the JSON array
  local url_list=$(IFS=,; echo "${full_urls[*]}")

  echo ""
  echo "Submitting ${#urls[@]} URLs for ${host}..."

  response=$(curl -s -w "\n%{http_code}" -X POST "$INDEXNOW_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{
      \"host\": \"${host#https://}\",
      \"key\": \"${INDEXNOW_KEY}\",
      \"keyLocation\": \"${host}/${INDEXNOW_KEY}.txt\",
      \"urlList\": [${url_list}]
    }")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "202" ]; then
    echo "  SUCCESS (HTTP ${http_code}) - ${#urls[@]} URLs submitted"
  else
    echo "  FAILED (HTTP ${http_code})"
    echo "  Response: ${body}"
  fi
}

echo "============================================"
echo " IndexNow URL Submission"
echo " Key: ${INDEXNOW_KEY}"
echo " Date: $(date)"
echo "============================================"

SITE="${1:-all}"

if [ "$SITE" = "en" ] || [ "$SITE" = "all" ]; then
  submit_urls "$EN_HOST" "${EN_URLS[@]}"
fi

if [ "$SITE" = "de" ] || [ "$SITE" = "all" ]; then
  submit_urls "$DE_HOST" "${DE_URLS[@]}"
fi

if [ "$SITE" = "nl" ] || [ "$SITE" = "all" ]; then
  submit_urls "$NL_HOST" "${NL_URLS[@]}"
fi

echo ""
echo "============================================"
echo " Done! URLs submitted to IndexNow."
echo " Bing, Yandex, and others will re-crawl soon."
echo "============================================"
