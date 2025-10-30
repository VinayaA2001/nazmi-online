"use client";

import Link from "next/link";

export default function OverviewTiles({
  ordersCount,
  wishlistCount,
  deliveredCount,
  continuePath = "/products",
}: {
  ordersCount: number;
  wishlistCount: number;
  deliveredCount: number;
  continuePath?: string;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Account Overview</h2>
          <Link
            href={continuePath}
            className="text-sm px-3 py-2 rounded-lg border hover:border-gray-900"
          >
            Continue shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <Link
            href="/account?tab=orders"
            className="group rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100 outline-none ring-0 focus:ring-2 focus:ring-blue-400 transition"
            aria-label="Go to recent orders"
          >
            <p className="text-blue-700 font-semibold">Recent Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{ordersCount}</p>
            <span className="mt-3 inline-block text-sm text-blue-700 group-hover:underline">
              View recent orders →
            </span>
          </Link>

          {/* Wishlist */}
          <Link
            href="/account?tab=wishlist"
            className="group rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100 outline-none ring-0 focus:ring-2 focus:ring-green-400 transition"
            aria-label="Go to wishlist"
          >
            <p className="text-green-700 font-semibold">Wishlist Items</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{wishlistCount}</p>
            <span className="mt-3 inline-block text-sm text-green-700 group-hover:underline">
              View wishlist →
            </span>
          </Link>

          {/* Delivered */}
          <Link
            href="/account?tab=orders&status=DELIVERED"
            className="group rounded-xl p-6 bg-gradient-to-br from-purple-50 to-purple-100 outline-none ring-0 focus:ring-2 focus:ring-purple-400 transition"
            aria-label="Go to delivered orders"
          >
            <p className="text-purple-700 font-semibold">Delivered</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{deliveredCount}</p>
            <span className="mt-3 inline-block text-sm text-purple-700 group-hover:underline">
              View delivered orders →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
