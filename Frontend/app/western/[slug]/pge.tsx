// app/search/page.tsx
import ProductCardClient, { type CardProduct } from "@/components/commerce/ProductCardClient";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: { q?: string };
};

const imgUrl = (p?: string | null) => {
  if (!p || typeof p !== "string") return "/images/placeholder.jpg";
  if (p.startsWith("http") || p.startsWith("/")) return p;
  return `/images/${p}`;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = (searchParams?.q || "").trim();
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const url = q
    ? `${base}/api/products?search=${encodeURIComponent(q)}`
    : `${base}/api/products`;

  let products: any[] = [];
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    products = Array.isArray(data.productList)
      ? data.productList
      : Array.isArray(data.products)
      ? data.products
      : Array.isArray(data)
      ? data
      : [];
  } catch {
    products = [];
  }

  // Normalize products
  const rows: CardProduct[] = products.map((p: any) => ({
    _id: p._id,
    slug: p.slug,
    name: p.product_name || p.name || "Untitled",
    category: p.category?.toLowerCase() || "general",
    images:
      (Array.isArray(p.images) && p.images.length
        ? p.images
        : p.image
        ? [p.image]
        : []
      ).map(imgUrl),
    minPrice: p.minPrice ?? p.price ?? 0,
    maxPrice: p.maxPrice ?? p.price ?? 0,
  }));

  // 🔹 Group products by category
  const ethnic = rows.filter((p) =>
    p.category.includes("ethnic") || p.name.toLowerCase().includes("ethnic")
  );
  const western = rows.filter((p) =>
    p.category.includes("western") || p.name.toLowerCase().includes("western")
  );
  const sale = rows.filter((p) =>
    p.category.includes("sale") ||
    p.name.toLowerCase().includes("sale") ||
    p.name.toLowerCase().includes("offer")
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Search</h1>
        {q ? (
          <p className="text-sm text-gray-600 mt-1">
            Results for <span className="font-medium">“{q}”</span>
          </p>
        ) : (
          <p className="text-sm text-gray-600 mt-1">
            Browse all collections
          </p>
        )}
      </div>

      {/* ---------- Ethnic Collection ---------- */}
      {ethnic.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            🪷 Ethnic Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ethnic.map((p) => (
              <ProductCardClient key={p._id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Western Collection ---------- */}
      {western.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            👗 Western Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {western.map((p) => (
              <ProductCardClient key={p._id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Sale Section ---------- */}
      {sale.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            💸 Sale Collection
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sale.map((p) => (
              <ProductCardClient key={p._id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- No Products Found ---------- */}
      {ethnic.length === 0 && western.length === 0 && sale.length === 0 && (
        <div className="text-gray-600 text-center py-8">
          No matching products found.
        </div>
      )}
    </div>
  );
}
