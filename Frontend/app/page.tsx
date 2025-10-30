// app/page.tsx
import Slomo from "@/components/blocks/slomo";
import Image from "next/image";
import Link from "next/link";

/* ---------- Config ---------- */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ---------- Types ---------- */
type Category = {
  name: string;
  href: string;
  desc: string;
  img: string;
  sale?: boolean;
};

type Product = {
  _id: string;
  slug?: string;
  product_name?: string;
  name?: string;
  category?: string;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  images?: string[];
  image?: string;
};

/* ---------- Mobile Bottom Dock ---------- */
function MobileCategoryDock({ categories }: { categories: Category[] }) {
  const mains = categories.map((c) => ({
    ...c,
    emoji: c.name.toLowerCase().includes("ethnic")
      ? "🪔"
      : c.name.toLowerCase().includes("western")
      ? "👗"
      : "🔥",
  }));

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-gray-200"
      aria-label="Primary categories"
    >
      <ul className="grid grid-cols-3">
        {mains.map((m) => (
          <li key={m.name} className="flex">
            <Link
              href={m.href}
              className="flex-1 py-2.5 px-1.5 flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition"
              aria-label={m.name}
            >
              <span className="text-lg leading-none">{m.emoji}</span>
              <span className="text-[11px] font-medium text-gray-900">{m.name}</span>
              {m.sale ? (
                <span className="text-[10px] font-semibold text-red-600">SALE</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ---------- Category Quick Nav (under hero) ---------- */
function CategoryQuickNav({ categories }: { categories: Category[] }) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={c.href}
              className="inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-full text-sm border border-gray-300 hover:border-gray-900 hover:bg-gray-50 transition-colors"
              aria-label={`Go to ${c.name}`}
            >
              <span className="text-base" aria-hidden>•</span>
              <span className="font-medium">{c.name}</span>
              {c.sale ? (
                <span className="text-[10px] font-semibold text-red-600">SALE</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Data ---------- */
async function fetchNewArrivals(): Promise<Product[]> {
  try {
    const url = `${API_BASE}/api/products?sort=new&limit=40`; // fetch extra; we’ll filter + slice
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    const items: Product[] = Array.isArray(data)
      ? data
      : data.items || data.products || [];
    return items;
  } catch {
    return [];
  }
}

/* ---------- Helpers ---------- */
const isEthnicOrWestern = (c?: string) => {
  const s = (c || "").toLowerCase();
  return s.includes("west") || s.includes("ethnic") || s.includes("tradit"); // "Traditional"
};

const firstImage = (p: Product) =>
  (p.images && p.images[0]) || p.image || "/images/placeholder.png";

const displayName = (p: Product) => p.product_name || p.name || "Untitled";

const displayPrice = (p: Product) => {
  const min = p.minPrice ?? p.price;
  const max = p.maxPrice ?? p.price;
  if (min && max && min !== max)
    return `₹${Number(min).toLocaleString("en-IN")} – ₹${Number(max).toLocaleString("en-IN")}`;
  if (min) return `₹${Number(min).toLocaleString("en-IN")}`;
  return "";
};

const productHref = (p: Product) => {
  const base =
    (p.category || "").toLowerCase().includes("west") ? "/western" : "/Ethnic-Wears";
  const slugOrId = encodeURIComponent(p.slug || p._id);
  return `${base}/${slugOrId}`;
};

/** Deterministic daily shuffle so grid order “changes every day” */
function dailyShuffle<T>(arr: T[], limit: number): T[] {
  const out = [...arr];
  const today = new Date();
  const key = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rand = () => {
    // xorshift32
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) % 10000) / 10000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, limit);
}

/* ---------- Page ---------- */
export default async function HomePage() {
  const categories: Category[] = [
    {
      name: "Ethnic Wears",
      href: "/Ethnic-Wears",
      desc: "Festive Edits • Kurtis • Ethnic Sets",
      img: "images/anarkali2.png",
    },
    {
      name: "Western",
      href: "/western",
      desc: "Tops • Dresses • Officewear",
      img: "images/short top1.png",
    },
    {
      name: "Special Offers",
      href: "/sale",
      desc: "Exclusive Deals • Limited Time",
      img: "images/sales.png",
      sale: true,
    },
  ];

  const testimonials = [
    { quote: "The quality of fabric and stitching is exceptional. Perfect fit every time!", author: "Shamna", role: "Regular Customer", rating: 5 },
    { quote: "Love how they blend traditional designs with modern styles. Always get compliments!", author: "Anjali", role: "Fashion Blogger", rating: 5 },
    { quote: "Fast shipping and excellent customer service. My go-to for ethnic wear!", author: "Shamsiya", role: "Working Professional", rating: 5 },
    { quote: "The attention to detail in every piece is remarkable. Worth every penny!", author: "Lakshmi", role: "Loyal Customer", rating: 5 },
  ];

  // Fetch → filter to Ethnic/Traditional + Western → dedupe by _id → daily shuffle → limit 10
  const raw = await fetchNewArrivals();
  const filtered = raw.filter(p => isEthnicOrWestern(p.category));
  const dedupMap = new Map(filtered.map(p => [p._id, p]));
  const filteredUnique = Array.from(dedupMap.values());
  const newArrivals = dailyShuffle(filteredUnique, 10);

  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      {/* ✅ HERO — tiny gap (0.2 ≈ 2px) below header */}
      <section
        className="relative mt-[2px] h-[65vh] sm:h-[72vh] md:h-[78vh] min-h-[460px] max-h-[760px] bg-black"
        aria-label="Hero"
      >
        <Slomo />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      </section>

      {/* CATEGORY QUICK LINKS */}
      <CategoryQuickNav categories={categories} />

      {/* CATEGORIES GRID */}
      <section className="py-10 sm:py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-3.5 py-1.5 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-full uppercase tracking-wider">
              Collections
            </span>
            <h2 className="mt-4 text-[clamp(20px,3.6vw,36px)] font-bold text-gray-900">
              Curated for Every Occasion
            </h2>
            <p className="mt-2.5 text-gray-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Celebrate heritage with a modern touch — from festive sets to everyday essentials.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-6">
            {categories.map((category, index) => (
              <div key={category.name} className="group relative">
                <Link
                  href={category.href}
                  className="block overflow-hidden bg-white rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                  aria-label={category.name}
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={`/${category.img}`}
                      alt={category.name}
                      fill
                      priority={index === 0}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.06] will-change-transform"
                      sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {category.sale && (
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <span className="bg-red-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-md shadow">
                          SALE
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-5 text-white">
                    <div className="transition-transform duration-300 group-hover:-translate-y-0.5">
                      <h3 className="text-[clamp(14px,2.8vw,22px)] font-semibold">
                        {category.name}
                      </h3>
                      <p className="hidden sm:block text-gray-200 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {category.desc}
                      </p>
                      <div className="w-10 sm:w-12 h-0.5 bg-white mt-2 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🌟 NEW COLLECTION BANNER (updates daily) */}
      <section className="bg-gradient-to-r from-amber-50 to-pink-50 border-y border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest text-amber-700">Updated daily</p>
            <h3 className="text-lg sm:text-xl font-semibold text-amber-900">New Collection</h3>
          </div>
          <div className="text-xs text-amber-800">
            {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </div>
      </section>

      {/* ⭐ NEW ARRIVALS (Ethnic + Western only, 10 items) — above Reviews */}
      {newArrivals.length > 0 && (
        <section className="py-10 sm:py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-12">
              <span className="inline-block px-3.5 py-1.5 bg-amber-50 text-amber-800 text-xs sm:text-sm font-medium rounded-full uppercase tracking-wider">
                New Arrivals
              </span>
              <h2 className="mt-4 text-[clamp(20px,3.6vw,36px)] font-bold text-gray-900">
                Freshly Added Styles
              </h2>
              <p className="mt-2.5 text-gray-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                Latest Ethnic & Western pieces—handpicked for today.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-6">
              {newArrivals.map((p, i) => (
                <Link
                  key={p._id}
                  href={productHref(p)}
                  className="group block overflow-hidden bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-300"
                  aria-label={displayName(p)}
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={firstImage(p)}
                      alt={displayName(p)}
                      fill
                      priority={i < 2}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1200px) 20vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="p-3.5 sm:p-4">
                    <h3 className="text-sm sm:text-[15px] font-semibold text-gray-900 line-clamp-2">
                      {displayName(p)}
                    </h3>
                    <p className="mt-1 text-amber-700 font-semibold text-sm">
                      {displayPrice(p)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS (Reviews) */}
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-900 text-xs sm:text-sm font-medium rounded-full uppercase tracking-wider">
              Customer Reviews
            </span>
            <h2 className="mt-3 text-[clamp(20px,3.6vw,36px)] font-bold text-gray-900">
              Trusted by Fashion Lovers
            </h2>
            <p className="mt-2 text-gray-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              What our customers say about their Nazmi experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
            {testimonials.map((t, i) => (
              <article
                key={i}
                className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="flex justify-center mb-2">
                  {Array.from({ length: t.rating }).map((_, i2) => (
                    <span key={i2} className="text-yellow-400 text-base sm:text-lg">⭐</span>
                  ))}
                </div>
                <blockquote className="text-gray-700 text-sm sm:text-base leading-relaxed text-center flex-1">
                  “{t.quote}”
                </blockquote>
                <div className="text-center border-t border-gray-100 pt-3 mt-4">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">{t.author}</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{t.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE BOTTOM DOCK */}
      <MobileCategoryDock categories={categories} />
    </div>
  );
}
