"use client";

import Link from "next/link";
import type {User} from "@/lib/type"; 

type Props = { user: User | null };

export default function AccountHeader({ user }: Props) {
  const firstLetter = (user?.username?.[0] || "N").toUpperCase();

  const logout = () => {
    try {
      localStorage.removeItem("auth_token");
    } catch {
      // Safe fallback
    }
    window.location.href = "/";
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-6 flex items-center gap-4">
        {/* Profile Icon */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white grid place-items-center font-semibold text-lg">
          {firstLetter}
        </div>

        {/* Greeting */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
            {user ? `Hi, ${user.username}` : "My Account"}
          </h1>
          <p className="text-sm text-gray-500 truncate">
            {user?.email ?? "Sign in to access orders & wishlist"}
          </p>
        </div>

        {/* Auth Buttons */}
        {user ? (
          <button
            onClick={logout}
            className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
          >
            Sign out
          </button>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 rounded-lg border hover:border-black"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
