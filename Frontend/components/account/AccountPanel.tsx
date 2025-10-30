"use client";

import { useEffect } from "react";
import Link from "next/link";

export type AccountPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function AccountPanel({ open, onClose }: AccountPanelProps) {
  // Don’t render anything when closed
  if (!open) return null;

  // Lock body scroll while panel is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <button
        aria-label="Close account panel"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Account panel"
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl
                   translate-x-0 transition-transform duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">My Account</h2>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {/* Quick links (keep panel lightweight; deep actions go to /account) */}
        <div className="p-5 space-y-4">
          <Link href="/account" onClick={onClose} className="block">
            <div className="rounded-xl border p-4 hover:border-black">
              <p className="font-medium">Account Overview</p>
              <p className="text-sm text-gray-500">Orders, wishlist & addresses</p>
            </div>
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/orders" onClick={onClose} className="rounded-xl border p-4 hover:border-black">
              <p className="font-medium">Your Orders</p>
              <p className="text-sm text-gray-500">Track status &amp; history</p>
            </Link>

            <Link href="/wishlist" onClick={onClose} className="rounded-xl border p-4 hover:border-black">
              <p className="font-medium">Wishlist</p>
              <p className="text-sm text-gray-500">Saved items</p>
            </Link>

            <Link href="/account#addresses" onClick={onClose} className="rounded-xl border p-4 hover:border-black">
              <p className="font-medium">Addresses</p>
              <p className="text-sm text-gray-500">Manage delivery details</p>
            </Link>

            <Link href="/login" onClick={onClose} className="rounded-xl border p-4 hover:border-black">
              <p className="font-medium">Sign in</p>
              <p className="text-sm text-gray-500">Access your account</p>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
