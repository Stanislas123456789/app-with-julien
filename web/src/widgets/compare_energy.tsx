import "@/index.css";
import "@/energy.css";

import { useState } from "react";
import { mountWidget, useDisplayMode, useLayout } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

type ElectricitySingleRate = { tariffType: "Tariffa monoraria"; uniquePrice: number };
type ElectricityTwoRate = { tariffType: "Tariffa bioraria"; peakPrice: number; offPeakPrice: number };
type ElectricityIndexed = { tariffType: "Tariffa indicizzata"; uniquePrice: string };
type ElectricityConsumption = ElectricitySingleRate | ElectricityTwoRate | ElectricityIndexed;

type GasSingleRate = { tariffType: "Tariffa monoraria"; uniquePrice: number };
type GasIndexed = { tariffType: "Tariffa indicizzata"; uniquePrice: string };
type GasConsumption = GasSingleRate | GasIndexed;

type BaseOffer = {
  offerName: string;
  companyName: string;
  advantages: string | null;
  offerType: "Offerta a prezzo fisso" | "Offerta a prezzo indicizzato";
  availablePaymentMethods: string[];
  standingCharge: string | null;
  priceLockDuration: string | null;
  activationCosts: number | null;
  contractTermsPdfUrls: string[];
  offerUrl: string;
};

type ElectricityOffer = BaseOffer & { consumptions: ElectricityConsumption };
type GasOffer = BaseOffer & { consumptions: GasConsumption };
type DualFuelOffer = BaseOffer & {
  consumptionsComponentPower: ElectricityConsumption;
  consumptionsComponentGas: GasConsumption;
  priceLockDurationComponentPower: string | null;
  priceLockDurationComponentGas: string | null;
  activationCostsComponentPower: number | null;
  activationCostsComponentGas: number | null;
};

type EnergyOffer = ElectricityOffer | GasOffer | DualFuelOffer;

const ENERGY_ICONS: Record<string, string> = {
  electricity: "⚡",
  gas: "🔥",
  "dual-fuel": "⚡🔥",
};

function rankEmoji(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}.`;
}

function formatElectricityPrice(c: ElectricityConsumption): { main: string; sub?: string } {
  if (c.tariffType === "Tariffa monoraria") return { main: `€${c.uniquePrice}`, sub: "/kWh" };
  if (c.tariffType === "Tariffa bioraria")
    return { main: `€${c.peakPrice}`, sub: "/kWh picco" };
  return { main: c.uniquePrice };
}

function formatGasPrice(c: GasConsumption): { main: string; sub?: string } {
  if (c.tariffType === "Tariffa monoraria") return { main: `€${c.uniquePrice}`, sub: "/Smc" };
  return { main: c.uniquePrice };
}

function getPriceDisplay(
  offer: EnergyOffer,
  energyType: "electricity" | "gas" | "dual-fuel"
): { main: string; sub?: string; extra?: string } {
  if (energyType === "dual-fuel") {
    const d = offer as DualFuelOffer;
    const p = formatElectricityPrice(d.consumptionsComponentPower);
    const g = formatGasPrice(d.consumptionsComponentGas);
    return { main: p.main, sub: p.sub, extra: `Gas ${g.main}${g.sub ?? ""}` };
  }
  if (energyType === "electricity") {
    return formatElectricityPrice((offer as ElectricityOffer).consumptions);
  }
  return formatGasPrice((offer as GasOffer).consumptions);
}

function OfferCard({
  offer,
  rank,
  energyType,
  compact = false,
}: {
  offer: EnergyOffer;
  rank: number;
  energyType: "electricity" | "gas" | "dual-fuel";
  compact?: boolean;
}) {
  const isFixed = offer.offerType === "Offerta a prezzo fisso";
  const price = getPriceDisplay(offer, energyType);
  const isTop = rank === 0;

  return (
    <div className={`energy-offer-card${isTop && !compact ? " energy-offer-top" : ""}`}>
      <div className="facile-rank">{rankEmoji(rank)}</div>

      <div className="energy-offer-body">
        <div className="energy-offer-header">
          <span className="energy-company">{offer.companyName}</span>
          <span className={`energy-badge ${isFixed ? "energy-badge-fixed" : "energy-badge-indexed"}`}>
            {isFixed ? "Prezzo fisso" : "Indicizzato"}
          </span>
          {isTop && !compact && (
            <span className="energy-badge energy-badge-top">Consigliato</span>
          )}
        </div>

        <div className="energy-offer-name">{offer.offerName}</div>

        {!compact && offer.advantages && (
          <div className="energy-advantages">✓ {offer.advantages}</div>
        )}

        {!compact && (offer.standingCharge || offer.priceLockDuration) && (
          <div className="energy-details-row">
            {offer.standingCharge && (
              <span className="energy-detail">📋 {offer.standingCharge}</span>
            )}
            {offer.priceLockDuration && (
              <span className="energy-detail">🔒 {offer.priceLockDuration}</span>
            )}
          </div>
        )}

        {!compact && offer.availablePaymentMethods.length > 0 && (
          <div className="energy-payments">
            {offer.availablePaymentMethods.map((m) => (
              <span key={m} className="energy-payment-chip">{m}</span>
            ))}
          </div>
        )}
      </div>

      <div className="energy-price-cta">
        <div className="energy-price-block">
          <span className="energy-price-main">{price.main}</span>
          {price.sub && <span className="energy-price-sub">{price.sub}</span>}
          {price.extra && <div className="energy-price-extra">{price.extra}</div>}
        </div>
        <button
          className="facile-cta-btn"
          onClick={() => window.open(offer.offerUrl, "_blank")}
        >
          Vai alle Offerte →
        </button>
      </div>
    </div>
  );
}

function EmptyFilter() {
  return (
    <div className="energy-empty">
      <div className="energy-empty-icon">🔍</div>
      <div className="energy-empty-text">Nessuna offerta per questo filtro</div>
    </div>
  );
}

function EnergyComparator() {
  const { output } = useToolInfo<"compare_tariffe_energia">();
  const [displayMode, setDisplayMode] = useDisplayMode();
  const { maxHeight, safeArea } = useLayout();
  const [filter, setFilter] = useState<"all" | "fixed" | "indexed">("all");

  if (!output) {
    return (
      <div className="facile-inline">
        <div className="facile-header">
          <span className="facile-header-icon">⚡</span>
          <div className="facile-header-info">
            <div className="facile-header-title">Tariffe Energia · Ricerca in corso…</div>
            <div className="facile-header-subtitle">Confronto offerte luce e gas</div>
          </div>
        </div>
        <div className="energy-skeleton">
          {[1, 2, 3].map((i) => <div key={i} className="energy-skeleton-row" />)}
        </div>
      </div>
    );
  }

  const offers = output.offers as EnergyOffer[];
  const city_name = output.city_name as string;
  const energy_type = output.energy_type as "electricity" | "gas" | "dual-fuel";
  const energy_label = output.energy_label as string;
  const icon = ENERGY_ICONS[energy_type];

  const filtered =
    filter === "fixed"
      ? offers.filter((o) => o.offerType === "Offerta a prezzo fisso")
      : filter === "indexed"
      ? offers.filter((o) => o.offerType === "Offerta a prezzo indicizzato")
      : offers;

  const isFullscreen = displayMode === "fullscreen";

  if (isFullscreen) {
    const { top, right, bottom, left } = safeArea.insets;
    return (
      <div
        className="facile-fullscreen"
        style={{ maxHeight, paddingTop: top, paddingRight: right, paddingBottom: bottom, paddingLeft: left }}
      >
        <div className="facile-fullscreen-header">
          <button className="facile-back-btn" onClick={() => setDisplayMode("inline")}>←</button>
          <div>
            <div className="facile-fullscreen-title">{icon} Tariffe {energy_label} · {city_name}</div>
            <div className="facile-fullscreen-subtitle">{offers.length} offerte disponibili</div>
          </div>
        </div>

        <div className="facile-sort-bar">
          <span className="facile-sort-label">Filtra:</span>
          {(["all", "fixed", "indexed"] as const).map((f) => (
            <button
              key={f}
              className={`facile-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" && "Tutte"}
              {f === "fixed" && "🔒 Prezzo fisso"}
              {f === "indexed" && "📈 Indicizzato"}
            </button>
          ))}
        </div>

        <div className="facile-offers-list">
          {filtered.length === 0 ? (
            <EmptyFilter />
          ) : (
            filtered.map((offer, i) => (
              <OfferCard key={i} offer={offer} rank={i} energyType={energy_type} />
            ))
          )}
        </div>
      </div>
    );
  }

  // Inline: top 3 + expand
  const top3 = offers.slice(0, 3);

  return (
    <div className="facile-inline">
      <div className="facile-header">
        <span className="facile-header-icon">{icon}</span>
        <div className="facile-header-info">
          <div className="facile-header-title">Tariffe {energy_label} · {city_name}</div>
          <div className="facile-header-subtitle">{offers.length} offerte · dal più conveniente</div>
        </div>
      </div>

      <div className="facile-offers-inline">
        {top3.map((offer, i) => (
          <OfferCard key={i} offer={offer} rank={i} energyType={energy_type} compact />
        ))}
      </div>

      <div className="facile-expand-row">
        <button className="facile-expand-btn" onClick={() => setDisplayMode("fullscreen")}>
          Vedi tutte le{" "}
          <span className="facile-count-badge">{offers.length}</span> offerte →
        </button>
      </div>
    </div>
  );
}

export default EnergyComparator;

mountWidget(<EnergyComparator />);
