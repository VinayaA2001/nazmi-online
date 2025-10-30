// components/sections/NewArrivals.tsx
import ProductCardClient, { CardProduct } from "@/components/commerce/ProductCardClient";
import { fetchNewArrivals } from "@/lib/products";

function isEthnicOrWestern(cat?: string) {
  const c = (cat || "").toLowerCase();
  return c.includes("west") || c.includes("ethnic") || c.includes("tradit"); // "Traditional" fallback
}

export default async function NewArrivals({
  title = "New Arrivals",
  limit = 10,
}: {
  title?: string;
  limit?: number;
}) {
  // fetch a bit more, then filter + slice
  const fetched = await fetchNewArrivals(Math.max(limit * 2, limit));
  const filtered = fetched.filter(p => isEthnicOrWestern(p.category));
  const unique = Array.from(new Map(filtered.map(p => [p._id, p])).values()).slice(0, limit);

  return (
    <section className="py-10 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Latest drop</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              {title} <span className="text-gray-400 text-base align-top">({unique.length})</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
          {unique.map((p) => (
            <ProductCardClient
              key={p._id}
              p={
                {
                  _id: p._id,
                  slug: p.slug,
                  name: p.product_name || p.name || "Untitled",
                  category: p.category,
                  images: p.images || [],
                  minPrice: p.minPrice,
                  maxPrice: p.maxPrice,
                } as CardProduct
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
