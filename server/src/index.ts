import { McpServer } from "skybridge/server";
import { z } from "zod";

// ── RC Auto mock data ────────────────────────────────────────────────────────

const INSURERS = [
  {
    id: "generali",
    name: "Generali",
    logo_emoji: "🦁",
    base: 340,
    stars: 4.2,
    coverage_level: "RC + Assistenza",
    coverage_tags: ["RC", "Assistenza Stradale"],
  },
  {
    id: "unipolsai",
    name: "UnipolSai",
    logo_emoji: "🔵",
    base: 360,
    stars: 4.8,
    coverage_level: "RC + Furto/Incend.",
    coverage_tags: ["RC", "Furto", "Incendio"],
  },
  {
    id: "axa",
    name: "AXA",
    logo_emoji: "🔷",
    base: 390,
    stars: 3.8,
    coverage_level: "RC Completa",
    coverage_tags: ["RC", "Completa"],
  },
  {
    id: "linear",
    name: "Linear",
    logo_emoji: "📐",
    base: 410,
    stars: 4.1,
    coverage_level: "RC + Kasko Parz.",
    coverage_tags: ["RC", "Kasko Parziale"],
  },
  {
    id: "allianz",
    name: "Allianz",
    logo_emoji: "🦅",
    base: 435,
    stars: 3.6,
    coverage_level: "RC Premium",
    coverage_tags: ["RC", "Premium"],
  },
  {
    id: "zurich",
    name: "Zurich",
    logo_emoji: "🏔️",
    base: 450,
    stars: 4.4,
    coverage_level: "RC + Cristalli",
    coverage_tags: ["RC", "Cristalli"],
  },
  {
    id: "directline",
    name: "Direct Line",
    logo_emoji: "📞",
    base: 385,
    stars: 4.0,
    coverage_level: "RC Base",
    coverage_tags: ["RC"],
  },
  {
    id: "sara",
    name: "Sara Ass.",
    logo_emoji: "⚖️",
    base: 420,
    stars: 3.9,
    coverage_level: "RC + Tutela Leg.",
    coverage_tags: ["RC", "Tutela Legale"],
  },
];

const CITY_FACTORS: Record<string, number> = {
  milano: 1.15,
  roma: 1.1,
  napoli: 1.2,
};

function computePrice(
  base: number,
  city: string,
  driverAge: number,
  carYear: number,
  bonusMalus: number
): number {
  const cityFactor = CITY_FACTORS[city.toLowerCase().trim()] ?? 1.0;

  let ageFactor: number;
  if (driverAge < 25) ageFactor = 1.4;
  else if (driverAge < 30) ageFactor = 1.2;
  else if (driverAge <= 55) ageFactor = 1.0;
  else ageFactor = 1.1;

  const carAge = new Date().getFullYear() - carYear;
  let carAgeFactor: number;
  if (carAge > 10) carAgeFactor = 1.1;
  else if (carAge >= 5) carAgeFactor = 1.05;
  else carAgeFactor = 1.0;

  const bmFactor = bonusMalus / 10;

  return Math.round(base * cityFactor * ageFactor * carAgeFactor * bmFactor);
}

// ── Facile.it Energy API ─────────────────────────────────────────────────────

const ENERGY_API_BASE = "https://api.facile.it/energy/v1";

async function energyFetch(path: string, params: Record<string, string>) {
  const apiKey = process.env.FACILE_ENERGY_API_KEY ?? "";
  const url = new URL(`${ENERGY_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`Energy API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

const ENERGY_TYPE_LABELS: Record<string, string> = {
  electricity: "Luce",
  gas: "Gas",
  "dual-fuel": "Luce & Gas",
};

const ENERGY_ENDPOINTS: Record<string, string> = {
  electricity: "/offers/electricity",
  gas: "/offers/gas",
  "dual-fuel": "/offers/dual-fuel",
};

// ── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer(
  { name: "alpic-openai-app", version: "0.0.1" },
  { capabilities: {} }
)
  .registerWidget(
    "compare_rc_auto",
    {
      description: "Comparatore RC Auto — trova le migliori offerte assicurative",
    },
    {
      description:
        "Confronta le offerte RC Auto di 8 assicuratori italiani in base a veicolo, città e profilo guidatore. Estrai i parametri dalla richiesta dell'utente in linguaggio naturale.",
      inputSchema: {
        car_brand: z.string().describe("Marca dell'auto, es. Fiat"),
        car_model: z.string().describe("Modello dell'auto, es. Panda"),
        year: z.number().int().describe("Anno di immatricolazione, es. 2019"),
        city: z.string().describe("Città di residenza, es. Milano"),
        driver_age: z.number().int().describe("Età del guidatore principale"),
        bonus_malus: z
          .number()
          .int()
          .min(1)
          .max(18)
          .optional()
          .describe("Classe bonus/malus (1–18). Default: 14"),
      },
    },
    async ({ car_brand, car_model, year, city, driver_age, bonus_malus }) => {
      try {
        const bm = bonus_malus ?? 14;

        const offers = INSURERS.map((insurer) => {
          const price_annual = computePrice(
            insurer.base,
            city,
            driver_age,
            year,
            bm
          );
          return {
            id: insurer.id,
            name: insurer.name,
            logo_emoji: insurer.logo_emoji,
            price_annual,
            price_monthly: Math.round(price_annual / 12),
            rating: insurer.stars,
            coverage_level: insurer.coverage_level,
            coverage_tags: insurer.coverage_tags,
            url: "https://www.facile.it/assicurazioni/rc-auto/",
          };
        }).sort((a, b) => a.price_annual - b.price_annual);

        const avg_market_price = Math.round(
          offers.reduce((sum, o) => sum + o.price_annual, 0) / offers.length
        );
        const best = offers[0];
        const savings = avg_market_price - best.price_annual;
        const car_summary = `${car_brand} ${car_model} ${year} – ${city}`;
        const best_deal = `${best.name} a €${best.price_annual}/anno`;

        const summaryText =
          `Ho trovato 8 offerte RC Auto per la tua ${car_brand} ${car_model} ${year} a ${city} (${driver_age} anni, classe BM ${bm}).\n\n` +
          `🏆 Offerta migliore: **${best_deal}** — risparmi **€${savings}** rispetto alla media di mercato (€${avg_market_price}/anno).\n\n` +
          `Clicca "Vai su Facile.it" per completare il preventivo e attivare la polizza.`;

        return {
          structuredContent: { offers, car_summary, avg_market_price, best_deal },
          content: [{ type: "text" as const, text: summaryText }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Errore: ${error}` }],
          isError: true,
        };
      }
    }
  )
  .registerWidget(
    "compare_tariffe_energia",
    {
      description: "Comparatore Tariffe Energia — confronta offerte luce, gas e dual fuel",
    },
    {
      description:
        "Confronta le tariffe energia (luce, gas o luce+gas) disponibili in una città italiana usando l'API reale di Facile.it. Estrai città e tipo di energia dalla richiesta dell'utente.",
      inputSchema: {
        city: z.string().describe("Città italiana dove si trova l'utenza, es. Milano"),
        energy_type: z
          .enum(["electricity", "gas", "dual-fuel"])
          .describe("Tipo di offerta: electricity (luce), gas, dual-fuel (luce e gas)"),
      },
    },
    async ({ city, energy_type }) => {
      try {
        // 1. Resolve city → ISTAT code
        const citiesData = await energyFetch("/cities", { name: city }) as {
          cities: Array<{ name: string; istatCode: string }>;
        };
        if (!citiesData.cities?.length) {
          throw new Error(`Città non trovata: ${city}`);
        }
        const { istatCode, name: cityName } = citiesData.cities[0];

        // 2. Fetch offers
        const offersData = await energyFetch(ENERGY_ENDPOINTS[energy_type], {
          istatCode,
        }) as { offers: unknown[] };

        const offers = offersData.offers ?? [];
        const label = ENERGY_TYPE_LABELS[energy_type];

        const summaryText =
          `Ho trovato ${offers.length} offerte ${label} per ${cityName}.\n\n` +
          `Confronta prezzi, tariffe e vantaggi di ogni operatore e clicca "Vai alle Offerte" per procedere con il contratto su Facile.it.`;

        return {
          structuredContent: {
            offers,
            city_name: cityName,
            istat_code: istatCode,
            energy_type,
            energy_label: label,
            total: offers.length,
          },
          content: [{ type: "text" as const, text: summaryText }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Errore: ${error}` }],
          isError: true,
        };
      }
    }
  );

server.run();

export type AppType = typeof server;
