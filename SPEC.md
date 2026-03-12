# Facile.it RC Auto Comparatore

## Value Proposition

Compare RC Auto insurance conversationally. Target: facile.it demo for sales pitch.
Pain: today's flow = multi-step web form. With ChatGPT: one sentence → instant results.

**Core actions**: Compare RC Auto offers, view details, redirect to facile.it.

## Why LLM?

**Conversational win**: "Confronta RC auto per la mia Fiat Panda 2019, Milano, 35 anni" = zero clicks vs. 6-step form.
**LLM adds**: Extracts car/driver details from natural language, answers follow-up questions, explains coverage differences.
**What LLM lacks**: Real-time pricing data, facile.it's actual quote engine.

## UI Overview

**First view**: Car summary header + top 3 ranked offers inline.
**Fullscreen**: All 8 offers with sort by price/rating/coverage.
**End state**: User clicks "Vai su Facile.it" → redirected to complete quote.

## Product Context

- **Data**: Realistic mock data (demo), 8 Italian insurers
- **Auth**: None required
- **Language**: Italian
- **Brand**: Facile.it red (#E20714), white, clean financial design

## UX Flows

Compare RC Auto:
1. User describes their car + city + age in natural language
2. LLM invokes widget with extracted parameters
3. Widget shows ranked offers (inline: top 3, fullscreen: all 8)
4. User selects offer → redirected to facile.it

## Tools and Widgets

**Widget: compare_rc_auto**
- **Input**: `{ car_brand, car_model, year, city, driver_age, bonus_malus? }`
- **Output**: `{ offers[], car_summary, avg_market_price, best_deal }`
- **Views**: inline (top 3 + expand), fullscreen (all 8 + sort)
- **Behavior**: sort client-side, CTA opens facile.it RC auto page
