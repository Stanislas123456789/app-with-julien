import "@/index.css";

import { useState } from "react";
import { mountWidget, useDisplayMode, useLayout } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

type SortKey = "price" | "rating" | "coverage";

type Offer = {
  id: string;
  name: string;
  logo_emoji: string;
  price_annual: number;
  price_monthly: number;
  rating: number;
  coverage_level: string;
  coverage_tags: string[];
  url: string;
};

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return "★".repeat(full) + "☆".repeat(empty);
}

function rankEmoji(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}.`;
}

function sortOffers(offers: Offer[], key: SortKey): Offer[] {
  return [...offers].sort((a, b) => {
    if (key === "price") return a.price_annual - b.price_annual;
    if (key === "rating") return b.rating - a.rating;
    if (key === "coverage") return b.coverage_tags.length - a.coverage_tags.length;
    return 0;
  });
}

function OfferCard({
  offer,
  rank,
  compact = false,
}: {
  offer: Offer;
  rank: number;
  compact?: boolean;
}) {
  return (
    <div className="facile-offer-card">
      <div className="facile-rank">{rankEmoji(rank)}</div>

      <div className="facile-insurer">
        <div className="facile-insurer-top">
          <span className="facile-insurer-emoji">{offer.logo_emoji}</span>
          <span className="facile-insurer-name">{offer.name}</span>
        </div>
        <div className="facile-stars">
          {renderStars(offer.rating)}{" "}
          <span className="facile-stars-text">{offer.rating.toFixed(1)}</span>
        </div>
        {!compact && (
          <div className="facile-coverage-tags">
            {offer.coverage_tags.map((tag) => (
              <span key={tag} className="facile-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="facile-price-cta">
        <div>
          <span className="facile-price">€{offer.price_annual}</span>
          <span className="facile-price-period">/anno</span>
        </div>
        <div className="facile-price-monthly">€{offer.price_monthly}/mese</div>
        <button
          className="facile-cta-btn"
          onClick={() => window.open(offer.url, "_blank")}
        >
          Vai su Facile.it →
        </button>
      </div>
    </div>
  ); 
}

function FacileComparator() {
  const {  output } = useToolInfo<"compare_rc_auto">();
  const [displayMode, setDisplayMode] = useDisplayMode();
  const { maxHeight, safeArea } = useLayout();
  const [sortKey, setSortKey] = useState<SortKey>("price");

  if (!output) {
    return (
      <div className="facile-inline">
        <div className="facile-header">
          <span className="facile-header-icon">🚗</span>
          <div className="facile-header-info">
            <div className="facile-header-title">RC Auto · Ricerca in corso…</div>
            <div className="facile-header-subtitle">Confronto offerte assicurative</div>
          </div>
        </div>
      </div>
    );
  }

  const { offers, car_summary, avg_market_price, best_deal } = output;
  const savings = avg_market_price - offers[0].price_annual;

  const isFullscreen = displayMode === "fullscreen";

  if (isFullscreen) {
    const sorted = sortOffers(offers, sortKey);
    const { top, right, bottom, left } = safeArea.insets;

    return (
      <div
        className="facile-fullscreen"
        style={{
          maxHeight,
          paddingTop: top,
          paddingRight: right,
          paddingBottom: bottom,
          paddingLeft: left,
        }}
      >
        {/* Fullscreen header */}
        <div className="facile-fullscreen-header">
          <button
            className="facile-back-btn"
            onClick={() => setDisplayMode("inline")}
          >
            ←
          </button>
          <div>
            <div className="facile-fullscreen-title">🚗 RC Auto · {car_summary}</div>
            <div className="facile-fullscreen-subtitle">
              {offers.length} offerte · Media mercato €{avg_market_price}/anno
            </div>
          </div>
        </div>

        {/* Savings banner */}
        <div className="facile-savings-banner">
          Risparmia fino a{" "}
          <span className="facile-savings-amount">€{savings}</span> sulla media
          di mercato con {best_deal}
        </div>

        {/* Sort chips */}
        <div className="facile-sort-bar">
          <span className="facile-sort-label">Ordina:</span>
          {(["price", "rating", "coverage"] as SortKey[]).map((key) => (
            <button
              key={key}
              className={`facile-chip ${sortKey === key ? "active" : ""}`}
              onClick={() => setSortKey(key)}
            >
              {key === "price" && "💰 Prezzo"}
              {key === "rating" && "⭐ Valutazione"}
              {key === "coverage" && "🛡️ Copertura"}
            </button>
          ))}
        </div>

        {/* All 8 offers */}
        <div className="facile-offers-list">
          {sorted.map((offer, i) => (
            <OfferCard key={offer.id} offer={offer} rank={i} />
          ))}
        </div>
      </div>
    );
  }

  // Inline view: top 3 + expand button
  const top3 = sortOffers(offers, "price").slice(0, 3);

  return (
    <div className="facile-inline">
      {/* Header */}
      <div className="facile-header">
        <span className="facile-header-icon">🚗</span>
        <div className="facile-header-info">
          <div className="facile-header-title">RC Auto · {car_summary}</div>
          <div className="facile-header-subtitle">
            Risparmia fino a €{savings} · Media €{avg_market_price}/anno
          </div>
        </div>
      </div>

      {/* Top 3 offers */}
      <div
        className="facile-offers-inline"
        data-llm={`Top 3 offerte RC Auto per ${car_summary}: ${top3.map((o, i) => `${i + 1}. ${o.name} €${o.price_annual}/anno`).join(", ")}`}
      >
        {top3.map((offer, i) => (
          <OfferCard key={offer.id} offer={offer} rank={i} compact />
        ))}
      </div>

      {/* Expand button */}
      <div className="facile-expand-row">
        <button
          className="facile-expand-btn"
          onClick={() => setDisplayMode("fullscreen")}
        >
          Vedi tutte le{" "}
          <span className="facile-count-badge">{offers.length}</span> offerte →
        </button>
      </div>
    </div>
  );
}

export default FacileComparator;

mountWidget(<FacileComparator />);
