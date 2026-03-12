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

function formatElectricityPrice(c: ElectricityConsumption): string {
  if (c.tariffType === "Tariffa monoraria") return `€${c.uniquePrice}/kWh`;
  if (c.tariffType === "Tariffa bioraria")
    return `Picco €${c.peakPrice} · Fuori-picco €${c.offPeakPrice}/kWh`;
  return c.uniquePrice;
}

function formatGasPrice(c: GasConsumption): string {
  if (c.tariffType === "Tariffa monoraria") return `€${c.uniquePrice}/Smc`;
  return c.uniquePrice;
}

function OfferBadge({ fixed }: { fixed: boolean }) {
  return (
    <span className={`energy-badge ${fixed ? "energy-badge-fixed" : "energy-badge-indexed"}`}>
      {fixed ? "Prezzo fisso" : "Indicizzato"}
    </span>
  );
}

function OfferCard({
  offer,
  energyType,
  compact = false,
}: {
  offer: EnergyOffer;
  energyType: "electricity" | "gas" | "dual-fuel";
  compact?: boolean;
}) {
  const isFixed = offer.offerType === "Offerta a prezzo fisso";
  const isDual = energyType === "dual-fuel";

  let priceDisplay: string;
  if (isDual) {
    const d = offer as DualFuelOffer;
    priceDisplay =
      `⚡ ${formatElectricityPrice(d.consumptionsComponentPower)}` +
      ` · 🔥 ${formatGasPrice(d.consumptionsComponentGas)}`;
  } else if (energyType === "electricity") {
    priceDisplay = formatElectricityPrice((offer as ElectricityOffer).consumptions);
  } else {
    priceDisplay = formatGasPrice((offer as GasOffer).consumptions);
  }

  return (
    <div className="energy-offer-card">
      <div className="energy-offer-body">
        <div className="energy-offer-header">
          <span className="energy-company">{offer.companyName}</span>
          <OfferBadge fixed={isFixed} />
        </div>
        <div className="energy-offer-name">{offer.offerName}</div>

        <div className="energy-price-row">{priceDisplay}</div>

        {!compact && offer.standingCharge && (
          <div className="energy-detail">Quota fissa: {offer.standingCharge}</div>
        )}
        {!compact && offer.priceLockDuration && (
          <div className="energy-detail">Blocco prezzo: {offer.priceLockDuration}</div>
        )}
        {!compact && offer.advantages && (
          <div className="energy-advantages">{offer.advantages}</div>
        )}
      </div>

      <button
        className="facile-cta-btn energy-cta"
        onClick={() => window.open(offer.offerUrl, "_blank")}
      >
        Vai alle Offerte →
      </button>
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
            <div className="facile-fullscreen-title">{icon} {energy_label} · {city_name}</div>
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
              {f === "fixed" && "Prezzo fisso"}
              {f === "indexed" && "Indicizzato"}
            </button>
          ))}
        </div>

        <div className="facile-offers-list">
          {filtered.map((offer, i) => (
            <OfferCard key={i} offer={offer} energyType={energy_type} />
          ))}
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
          <div className="facile-header-subtitle">{offers.length} offerte disponibili</div>
        </div>
      </div>

      <div className="facile-offers-inline">
        {top3.map((offer, i) => (
          <OfferCard key={i} offer={offer} energyType={energy_type} compact />
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
