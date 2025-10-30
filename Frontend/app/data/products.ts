// data/products.ts
export type LocalProduct = {
  id: string;
  name: string;
  image: string;      // single image in your seed data
  price: number;
  mrp?: number;
  rating?: number;
  category?: string;
  description?: string;
};

export const ALL_PRODUCTS: LocalProduct[] = [
  { id: "p-01", name: "Premium Satin Wrap Dress", image: "/products/lastchance-wrap-dress.jpg", price: 1099, mrp: 1899, rating: 4.8, category: "Western", description: "Soft satin wrap silhouette for day-to-evening." },
  { id: "p-02", name: "Embroidered Designer Kurti", image: "/products/lastchance-embro-kurti.jpg", price: 999, mrp: 1499, rating: 4.6, category: "Traditional", description: "Hand-embroidered kurti with breathable fabric." },
  { id: "p-03", name: "Elegant Pleated Midi Skirt", image: "/products/lastchance-pleated-midi.jpg", price: 899, mrp: 1299, rating: 4.7, category: "Western", description: "Flowy pleated midi skirt—dress up or down." },
  { id: "p-04", name: "Chiffon Ruffle Blouse", image: "/images/top1.png", price: 749, mrp: 1099, rating: 4.5, category: "Western", description: "Lightweight chiffon with subtle ruffles." },
  { id: "p-05", name: "Bohemian Maxi Dress", image: "/products/lastchance-boho-maxi.jpg", price: 1199, mrp: 1999, rating: 4.9, category: "Western", description: "Airy boho dress with tiered design." },
  { id: "p-06", name: "Designer Denim Shirt Dress", image: "/products/lastchance-denim-shirt.jpg", price: 999, mrp: 1599, rating: 4.4, category: "Western", description: "Structured denim shirt dress—everyday essential." },
  { id: "p-07", name: "Anarkali Set – Hand Embroidered", image: "/images/anarkali2.png", price: 1499, mrp: 2199, rating: 4.7, category: "Traditional", description: "Classic Anarkali with delicate embroidery." },
  { id: "p-08", name: "Officewear Top – Minimal Fit", image: "/images/short top1.png", price: 699, mrp: 999, rating: 4.3, category: "Western", description: "Clean lines, minimal cut—perfect for work." },
  { id: "p-09", name: "Sale Special – Mixed Set", image: "/images/sales.png", price: 599, mrp: 899, rating: 4.1, category: "Special Offers", description: "Value set curated for everyday styling." },
];

export function getProductById(id: string) {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

/** Optional: slug generator to allow name-based lookup if needed later */
export function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Local fallback by id (primary) or by slugified name (secondary) */
export function getLocalProduct(slugOrId: string) {
  const byId = getProductById(slugOrId);
  if (byId) return byId;

  const match = ALL_PRODUCTS.find((p) => slugifyName(p.name) === slugOrId);
  return match || null;
}
