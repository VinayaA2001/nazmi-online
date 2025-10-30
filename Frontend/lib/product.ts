// lib/products.ts
import {
  ALL_PRODUCTS,
  getLocalProduct,
  slugifyName,
  type LocalProduct,
} from "@/app/data/products";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/** ---------- Raw API shapes (distinct from LocalProduct) ---------- */
export type ApiVariant = {
  _id?: string;
  size?: string;
  colour?: string;
  color?: string;
  stock?: number;
  price?: number;
  images?: string[];
};

export type ApiProduct = {
  _id: string;
  slug?: string;
  product_code?: string;
  product_name?: string;
  name?: string;
  material?: string;
  category?: string;
  images?: string[];
  image?: string; // some APIs use single field
  colorImages?: Record<string, string[]>;
  description?: string;
  variants?: ApiVariant[];
  availableSizes?: string[];
  availableColors?: string[];
  totalStock?: number;
  minPrice?: number;
  maxPrice?: number;
  specs?: Record<string, string>;
};

/** ---------- Normalized product your UI can rely on ---------- */
export type NormalizedProduct = {
  _id: string;
  slug?: string;
  product_code?: string;
  product_name?: string;
  name: string;
  material?: string;
  category?: string;
  images: string[];
  colorImages?: Record<string, string[]>;
  description?: string;
  variants?: ApiVariant[];
  availableSizes?: string[];
  availableColors?: string[];
  totalStock?: number;
  minPrice?: number;
  maxPrice?: number;
  specs?: Record<string, string>;
};

/** ---------- Helpers ---------- */
function normalizeFromApi(p: ApiProduct): NormalizedProduct {
  const images =
    Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : p.image
      ? [p.image]
      : [];

  const primaryName = p.product_name || p.name || "Untitled";

  return {
    _id: p._id,
    slug: p.slug || (primaryName ? slugifyName(primaryName) : undefined),
    product_code: p.product_code,
    product_name: p.product_name,
    name: primaryName,
    material: p.material,
    category: p.category,
    images,
    colorImages: p.colorImages,
    description: p.description,
    variants: p.variants,
    availableSizes: p.availableSizes,
    availableColors: p.availableColors,
    totalStock: p.totalStock,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    specs: p.specs,
  };
}

function normalizeFromLocal(p: LocalProduct): NormalizedProduct {
  const name = p.name;
  return {
    _id: p.id,
    slug: slugifyName(name),
    product_code: undefined,
    product_name: name,
    name,
    material: undefined,
    category: p.category,
    images: p.image ? [p.image] : [],
    colorImages: undefined,
    description: p.description,
    variants: [],
    availableSizes: [],
    availableColors: [],
    totalStock: 999, // local seed default
    minPrice: p.price,
    maxPrice: p.mrp ?? p.price,
    specs: undefined,
  };
}

/** ---------- Single product fetch with resilient fallbacks ---------- */
export async function fetchProduct(
  slugOrId: string
): Promise<NormalizedProduct | null> {
  const endpoints = [
    `${API_BASE}/api/products/slug/${encodeURIComponent(slugOrId)}`,
    `${API_BASE}/api/products/${encodeURIComponent(slugOrId)}`,
  ];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        const raw: ApiProduct = (data?.product ?? data) as ApiProduct;
        if (raw && raw._id) return normalizeFromApi(raw);
      }
    } catch {
      // ignore and try next / local
    }
  }

  // Local fallback (matches by id, slug, or name via your helper)
  const local = getLocalProduct(slugOrId);
  if (local) return normalizeFromLocal(local);

  return null;
}

/** ---------- New arrivals (API → local fallback) ---------- */
export async function fetchNewArrivals(
  limit = 10
): Promise<NormalizedProduct[]> {
  const url = `${API_BASE}/api/products?sort=new&limit=${limit}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      const rows: ApiProduct[] = Array.isArray((data as any)?.products)
        ? (data as any).products
        : Array.isArray(data)
        ? (data as any)
        : [];
      return rows.map(normalizeFromApi);
    }
  } catch {
    // ignore -> fallback
  }

  // Fallback to local seed used by Home
  const local = ALL_PRODUCTS.slice(0, limit).map(normalizeFromLocal);
  return local;
}
