// /public/customer/products-data.js
// Catalog data for Browse Products (customer-facing).
// Uses two categories: "paint-20l" (priced per 20 L can) and "service-sqm" (priced per m²).

export const CATEGORIES = {
  PAINT_20L: "paint-20l",
  SERVICE_SQM: "service-sqm",
};

// Standard can sizes you stock (used by calculators to round up)
export const CAN_SIZES_L = [20];

// Global defaults for calculators (can be overridden per product)
export const DEFAULTS = {
  coats: 2,
  paintCoverageSqmPerL: [8, 12], // typical PVA/enamel coverage range per coat
};

// WhatsApp contact numbers for quote requests (customer side)
export const WHATSAPP_NUMBERS = ["+27794071053", "+27615241624"];

/** @typedef {{
 *  id: string,
 *  name: string,
 *  category: "paint-20l" | "service-sqm",
 *  type: "paint" | "service",
 *  unit: "20L" | "m²",
 *  unitPriceZAR?: number,             // omit if "Contact for price"
 *  priceNote?: string,                // e.g., "Contact for price"
 *  finish?: "matt"|"silk"|"gloss",
 *  base?: "water"|"solvent",
 *  interiorExterior?: "interior"|"exterior"|"both",
 *  coverageSqmPerL?: [number, number],// for paints (per coat)
 *  coatsDefault?: number,
 *  surfaces?: string[],
 *  tags?: string[],
 *  features?: string[],
 *  overview?: string,
 *  pairWith?: string[],               // ids of complementary products
 *  care?: string[],                   // bullets in Care & FAQ
 * }} Product */

/** @type {Product[]} */
export const PRODUCTS = [
  /* ===================== 20L PAINTS & SPECIAL COATINGS ===================== */
  {
    id: "gamazine-20l",
    name: "Gamazine (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    unitPriceZAR: 300, // from PDF text layer
    finish: "matt",
    base: "water",
    interiorExterior: "both",
    coverageSqmPerL: [2, 4], // textured finish; heavier consumption
    coatsDefault: 1,
    surfaces: ["plaster", "feature walls", "exterior"],
    tags: ["textured", "decorative", "feature"],
    features: ["Textured decorative finish", "Low odour", "Custom colours"],
    overview:
      "A textured decorative wall finish ideal for feature walls and durable exterior surfaces.",
    pairWith: [],
    care: [
      "Clean with mild soap and water.",
      "Avoid aggressive scrubbing to preserve texture.",
    ],
  },
  {
    id: "glamour-coat-20l",
    name: "Glamour Coat (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    unitPriceZAR: 380, // from PDF text layer
    finish: "silk",
    base: "water",
    interiorExterior: "both",
    coverageSqmPerL: [4, 6], // lightly textured decorative
    coatsDefault: 1,
    surfaces: ["plaster", "feature walls", "exterior"],
    tags: ["decorative", "sparkle", "feature"],
    features: ["Decorative sparkle effect", "Water-based", "Low odour"],
    overview:
      "A lightly textured, decorative coating with a subtle sparkle — great for statement walls.",
    care: ["Wipe gently with a damp cloth.", "Do not use abrasive cleaners."],
  },
  {
    id: "prochem-all-wall-20l",
    name: "PRO-CHEM All Wall (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    unitPriceZAR: 1400, // from PDF text layer
    finish: "matt",
    base: "water",
    interiorExterior: "both",
    coverageSqmPerL: [8, 12],
    coatsDefault: 2,
    surfaces: ["plaster", "brick", "previously painted walls"],
    tags: ["premium", "washable", "low odour"],
    features: ["High hiding power", "Washable", "Low VOC"],
    overview:
      "Premium wall coating for high-traffic interiors and durable exterior walls.",
    pairWith: ["plaster-primer-20l"],
    care: ["Allow full cure before washing (≈7 days)."],
  },
  {
    id: "prochem-pva-20l",
    name: "PRO-CHEM PVA (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    unitPriceZAR: 580, // from PDF text layer
    finish: "matt",
    base: "water",
    interiorExterior: "interior",
    coverageSqmPerL: [8, 12],
    coatsDefault: 2,
    surfaces: ["plaster", "ceiling", "drywall"],
    tags: ["pva", "budget", "interior"],
    features: ["Good coverage", "Low odour"],
    overview:
      "Cost-effective interior PVA ideal for ceilings and standard interior walls.",
    pairWith: ["plaster-primer-20l"],
    care: ["Dust regularly; spot clean with mild soap."],
  },
  {
    id: "prochem-water-enamel-20l",
    name: "PRO-CHEM Water-Based Enamel (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    unitPriceZAR: 1750, // from PDF text snippet
    finish: "gloss",
    base: "water",
    interiorExterior: "both",
    coverageSqmPerL: [10, 12],
    coatsDefault: 2,
    surfaces: ["doors", "trim", "kitchens", "bathrooms"],
    tags: ["enamel", "gloss", "washable"],
    features: ["Hard-wearing", "Washable", "Low odour vs solvent enamel"],
    overview:
      "Durable water-based enamel for doors, trim and high-moisture rooms.",
    pairWith: ["universal-primer-20l"],
    care: ["Wipe with non-abrasive cleaner; avoid harsh solvents."],
  },
  {
    id: "prochem-marmorino-20l",
    name: "PRO-CHEM Marmorino Plaster (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    unitPriceZAR: 2000, // from PDF text layer
    finish: "silk",
    base: "water",
    interiorExterior: "interior",
    coverageSqmPerL: [1.5, 3], // Venetian plaster style; high build
    coatsDefault: 2,
    surfaces: ["feature walls", "interior plaster"],
    tags: ["decorative", "venetian", "plaster"],
    features: ["Smooth polished effect", "Premium decorative finish"],
    overview:
      "Decorative marmorino plaster for luxurious polished interior finishes.",
    care: ["Clean gently; avoid abrasive pads."],
  },

  // (Optional placeholder primers if you want links to 'pairWith')
  {
    id: "plaster-primer-20l",
    name: "Plaster Primer (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    priceNote: "Contact for price",
    finish: "matt",
    base: "water",
    interiorExterior: "both",
    coverageSqmPerL: [8, 12],
    coatsDefault: 1,
    surfaces: ["new plaster", "powdery surfaces"],
    tags: ["primer", "sealer"],
    features: ["Seals new plaster", "Improves adhesion"],
    overview: "Primer for new or powdery plaster surfaces.",
    care: [],
  },
  {
    id: "universal-primer-20l",
    name: "Universal Primer (20L)",
    category: CATEGORIES.PAINT_20L,
    type: "paint",
    unit: "20L",
    priceNote: "Contact for price",
    finish: "matt",
    base: "water",
    interiorExterior: "both",
    coverageSqmPerL: [8, 12],
    coatsDefault: 1,
    surfaces: ["previously painted", "wood/metal (as specified)"],
    tags: ["primer"],
    features: ["Adhesion promoter", "Stain blocking (light)"],
    overview: "General-purpose primer for difficult or previously painted areas.",
    care: [],
  },

  /* ===================== SERVICES PRICED PER SQUARE METRE ===================== */
  {
    id: "tar-glamour-sqm",
    name: "Tar Glamour (per m²)",
    category: CATEGORIES.SERVICE_SQM,
    type: "service",
    unit: "m²",
    unitPriceZAR: 400, // per PDF
    surfaces: ["exterior walls", "feature"],
    tags: ["service", "application", "decorative"],
    features: ["Professional application included"],
    overview:
      "Supply & apply Tar Glamour decorative finish. Price per square metre.",
    care: ["Avoid high-pressure washing on fresh coatings."],
  },
  {
    id: "epoxy-flooring-sqm",
    name: "Epoxy Flooring (per m²)",
    category: CATEGORIES.SERVICE_SQM,
    type: "service",
    unit: "m²",
    unitPriceZAR: 400, // per PDF
    surfaces: ["floors", "garages", "industrial"],
    tags: ["service", "floor", "epoxy"],
    features: ["Durable, chemical-resistant finish"],
    overview: "Supply & apply epoxy floor system. Price per square metre.",
    care: ["Use neutral cleaners; avoid acids on cured surface."],
  },
  {
    id: "marmorino-plaster-sqm",
    name: "Marmorino Plaster (per m²)",
    category: CATEGORIES.SERVICE_SQM,
    type: "service",
    unit: "m²",
    unitPriceZAR: 400, // per PDF
    surfaces: ["feature walls", "interior"],
    tags: ["service", "decorative", "venetian"],
    features: ["Polished decorative plaster finish"],
    overview:
      "Supply & apply marmorino/venetian plaster. Price per square metre.",
    care: ["Clean gently; avoid abrasion."],
  },
  {
    id: "paint-application-sqm",
    name: "Paint (per m²)",
    category: CATEGORIES.SERVICE_SQM,
    type: "service",
    unit: "m²",
    unitPriceZAR: 75, // per PDF
    surfaces: ["interior walls", "exterior walls"],
    tags: ["service", "painting"],
    features: ["Standard wall painting"],
    overview: "Supply & apply wall paint. Price per square metre.",
    care: ["Allow proper dry time between coats."],
  },
  {
    id: "ceiling-paint-sqm",
    name: "Ceiling (per m²)",
    category: CATEGORIES.SERVICE_SQM,
    type: "service",
    unit: "m²",
    unitPriceZAR: 65, // per PDF
    surfaces: ["ceilings"],
    tags: ["service", "ceiling"],
    features: ["Ceiling coating"],
    overview: "Supply & apply ceiling paint. Price per square metre.",
    care: ["Minimise condensation during cure."],
  },
  {
    id: "pavement-coating-sqm",
    name: "Pavement (per m²)",
    category: CATEGORIES.SERVICE_SQM,
    type: "service",
    unit: "m²",
    unitPriceZAR: 75, // per PDF
    surfaces: ["paving", "driveways"],
    tags: ["service", "pavement"],
    features: ["Pavement/driveway coating"],
    overview:
      "Supply & apply pavement coating. Price per square metre.",
    care: ["Avoid heavy traffic until fully cured."],
  },
];

// Optional simple lookups you might use in products.js
export const PRODUCT_INDEX = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
export const CATEGORY_ORDER = [CATEGORIES.PAINT_20L, CATEGORIES.SERVICE_SQM];

// Helpful text you can surface in the UI footer or detail dialog
export const NOTES = {
  vatIncluded: "All prices are VAT inclusive.",
  estimates:
    "Coverage and service estimates are guides only. Final quotes are confirmed after site inspection.",
  labourNotes: [
    // Kept as internal notes if you don’t want to display them directly:
    "Labour for Gamazine & Glamour Coat is R180 per 20L (from price sheet).",
    "Labour for paint is R900 per 20L (from price sheet).",
  ],
};
