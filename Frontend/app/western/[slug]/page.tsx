"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  X,
  Check,
  CreditCard,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";

/* ========= Config ========= */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const RZP_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

// Shipping rules
const SHIPPING_THRESHOLD = 2000;
const SHIPPING_FEE = 60;

/* ========= Types ========= */
type Variant = {
  _id: string;
  size: string;
  colour: string;
  stock: number;
  price: number;
  images?: string[];
};

type Product = {
  _id: string;
  slug?: string;
  product_code: string;
  product_name?: string;
  material: string;
  category: string;
  images: string[];
  colorImages?: Record<string, string[]>;
  description: string;
  variants: Variant[];
  availableSizes: string[];
  availableColors: string[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
};

type ShippingInfo = {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

type PaymentMethod = "upi" | "card" | "netbanking";

/* ========= Utils ========= */
const MAX_OPTIONS = 10;

const imgUrl = (p?: string | null) => {
  if (!p || typeof p !== "string") return "/images/placeholder.jpg";
  if (p.startsWith("http") || p.startsWith("/")) return p;
  return `/images/${p}`;
};

const makeSlug = (p: Product) => {
  const base = p.slug || p.product_name || `${p.material || ""}-${p.category || ""}`.trim();
  const code = p.product_code ? `-${p.product_code}` : "";
  return (base + code)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

const displayName = (p: Product) => p.product_name || `${p.material} ${p.category}`;
const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const norm = (s?: string) => (s ?? "").trim().toLowerCase();
const same = (a?: string, b?: string) => norm(a) === norm(b);

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/* ========= Lazy-load Razorpay ========= */
async function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ========= Small Card for Related Section ========= */
function ProductTile({ p }: { p: Product }) {
  const cover = (p.images?.[0] ?? "/images/placeholder.jpg") as string;
  const href = `/western/${makeSlug(p)}`;
  return (
    <Link
      href={href}
      className="group block rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-shadow hover:shadow-sm"
    >
      <div className="relative w-full aspect-[3/4] bg-gray-100">
        <Image
          src={imgUrl(cover)}
          alt={displayName(p)}
          fill
          sizes="(max-width: 768px) 50vw, 300px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-3">
        <p className="text-sm text-gray-900 line-clamp-1">{displayName(p)}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.category}</p>
        <p className="text-sm font-semibold mt-1">
          {p.minPrice === p.maxPrice ? inr(p.minPrice) : `${inr(p.minPrice)} – ${inr(p.maxPrice)}`}
        </p>
      </div>
    </Link>
  );
}

/* ========= Page ========= */
export default function ProductDetailPage() {
  const params = useParams();
  const slugParamRaw = ((): string => {
    const v: unknown = (params as any)?.slug;
    if (Array.isArray(v)) return v[0] ?? "";
    if (typeof v === "string") return v;
    return "";
  })();

  const search = useSearchParams();
  const router = useRouter();

  /* Data */
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  /* Related (Western) */
  const [related, setRelated] = useState<Product[]>([]);

  /* Variant/UI state */
  const [color, setColor] = useState<string>(search.get("color") || "");
  const [size, setSize] = useState<string>(search.get("size") || "");
  const [imgIndex, setImgIndex] = useState(0);
  const [qty, setQty] = useState(1);

  /* Wishlist/Cart/Order state */
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [showCartToast, setShowCartToast] = useState(false);
  const [addedName, setAddedName] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [shipping, setShipping] = useState<ShippingInfo>({
    name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [showAllColors, setShowAllColors] = useState(false);
  const [showAllSizes, setShowAllSizes] = useState(false);

  /* ========= Fetch Product ========= */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setProduct(null);
      try {
        const slugParam = decodeURIComponent(String(slugParamRaw || "")).toLowerCase();

        // Try API: /api/products/[slug]
        const one = await fetch(`/api/products/${slugParam}`, { cache: "no-store" });
        if (one.ok) {
          const p: Product = await one.json();
          p.images = (p.images?.length ? p.images : ["/images/placeholder.jpg"]).map(imgUrl);
          if (p.colorImages)
            Object.keys(p.colorImages).forEach((c) => {
              p.colorImages![c] = (p.colorImages![c] || []).map(imgUrl);
            });
          setProduct(p);
          return;
        }

        // Fallback: load all and match locally
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load products");
        const list: Product[] = await res.json();

        list.forEach((p: any) => {
          p.images = (Array.isArray(p.images) && p.images.length ? p.images : ["/images/placeholder.jpg"]).map(imgUrl);
          if (p.colorImages) {
            Object.keys(p.colorImages).forEach((c) => {
              p.colorImages[c] = (p.colorImages[c] || []).map(imgUrl);
            });
          }
        });

        const found =
          list.find((p) => (p.slug || "").toLowerCase() === slugParam) ||
          list.find((p) => makeSlug(p) === slugParam) ||
          list.find((p) => (p._id as any)?.toLowerCase?.() === slugParam) ||
          list.find((p) => (p.product_code || "").toLowerCase() === slugParam) ||
          null;

        setProduct(found);
      } catch (e) {
        console.error("[Detail] fetch error:", e);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slugParamRaw]);

  /* ========= Fetch Related Western Products ========= */
  useEffect(() => {
    (async () => {
      try {
        // Load all products (or if you have a category API, replace with that)
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) return;

        const list: Product[] = await res.json();

        // Normalize images
        list.forEach((p: any) => {
          p.images = (Array.isArray(p.images) && p.images.length ? p.images : ["/images/placeholder.jpg"]).map(imgUrl);
        });

        // Filter: only "western" category (case-insensitive), exclude current product
        const westerns = list.filter((p) => norm(p.category).includes("western"));
        const filtered = product ? westerns.filter((p) => p._id !== product._id) : westerns;

        // Shuffle randomly and pick first N
        const N = 8;
        for (let i = filtered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        setRelated(filtered.slice(0, N));
      } catch (err) {
        console.error("[Related] load error:", err);
      }
    })();
  }, [product?._id]); // refetch when product changes

  /* ========= Full options ========= */
  const fullColors = useMemo(() => {
    if (!product) return [] as string[];
    const fromBackend = (product.availableColors || []).filter(Boolean);
    const fromVariants = Array.from(new Set(product.variants.map((v) => v.colour).filter(Boolean)));
    const base = fromBackend.length ? fromBackend : fromVariants;
    const seen = new Set<string>(), out: string[] = [];
    for (const c of base) {
      const k = norm(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
    return out;
  }, [product]);

  const fullSizes = useMemo(() => {
    if (!product) return [] as string[];
    const fromBackend = (product.availableSizes || []).filter(Boolean);
    const fromVariants = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)));
    const base = fromBackend.length ? fromBackend : fromVariants;
    const seen = new Set<string>(), out: string[] = [];
    for (const s of base) {
      const k = norm(s);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(s);
      }
    }
    return out;
  }, [product]);

  /* ========= Init defaults & sync URL ========= */
  useEffect(() => {
    if (!product) return;
    const colors = fullColors;
    const sizes = fullSizes;
    const firstInStock = product.variants.find((v) => v.stock > 0) || product.variants[0];
    const c = color || firstInStock?.colour || colors[0] || "";
    const s = size || firstInStock?.size || sizes[0] || "";

    if (c && !same(c, color)) setColor(c);
    if (s && !same(s, size)) setSize(s);

    const q = new URLSearchParams(search.toString());
    let changed = false;
    if (c && q.get("color") !== c) {
      q.set("color", c);
      changed = true;
    }
    if (s && q.get("size") !== s) {
      q.set("size", s);
      changed = true;
    }
    if (changed) {
      router.replace(`/western/${slugParamRaw}?${q.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, fullColors.length, fullSizes.length]);

  /* ========= Variant helpers ========= */
  const variant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find(
        (v) => (!color || same(v.colour, color)) && (!size || same(v.size, size))
      ) || null
    );
  }, [product, color, size]);

  const gallery = useMemo(() => {
    if (!product) return ["/images/placeholder.jpg"];
    if (variant?.images?.length) return variant.images.map(imgUrl);
    if (product.colorImages?.[color]?.length) return product.colorImages[color]!.map(imgUrl);
    return product.images;
  }, [product, variant, color]);

  // Reset visible index when gallery changes
  const galleryKey = useMemo(() => gallery.join("|"), [gallery]);
  useEffect(() => setImgIndex(0), [galleryKey]);

  const price = variant ? variant.price : product?.minPrice || 0;
  const stock = variant ? variant.stock : product?.totalStock || 0;

  // Shipping calculations
  const unitPrice = Number(variant?.price ?? 0);
  const subtotal = unitPrice * qty;
  const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = subtotal + shippingFee;

  /* Render-limited lists with toggles */
  const colorsAvail = showAllColors ? fullColors : fullColors.slice(0, MAX_OPTIONS);
  const sizesAvail = showAllSizes ? fullSizes : fullSizes.slice(0, MAX_OPTIONS);

  const pickColor = (c: string) => {
    if (!product) return;
    setColor(c);
    const hasPair =
      size && product.variants.some((v) => same(v.colour, c) && same(v.size, size) && v.stock > 0);
    const nextSize =
      hasPair
        ? size
        : fullSizes.find((s) => product.variants.some((v) => same(v.colour, c) && same(v.size, s) && v.stock > 0)) ||
          "";
    if (nextSize !== size) setSize(nextSize);
    const q = new URLSearchParams(search.toString());
    if (c) q.set("color", c);
    if (nextSize) q.set("size", nextSize);
    router.replace(`/western/${slugParamRaw}?${q.toString()}`);
  };

  const pickSize = (s: string) => {
    if (!product) return;
    setSize(s);
    const hasPair =
      color && product.variants.some((v) => same(v.size, s) && same(v.colour, color) && v.stock > 0);
    const nextColor =
      hasPair
        ? color
        : fullColors.find((c) => product.variants.some((v) => same(v.size, s) && same(v.colour, c) && v.stock > 0)) ||
          "";
    if (nextColor !== color) setColor(nextColor);
    const q = new URLSearchParams(search.toString());
    if (nextColor) q.set("color", nextColor);
    if (s) q.set("size", s);
    router.replace(`/western/${slugParamRaw}?${q.toString()}`);
  };

  /* ========= Wishlist ========= */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const w = localStorage.getItem("wishlist");
      if (w) {
        const arr = JSON.parse(w);
        setWishlistIds(new Set(arr.map((i: any) => i.id)));
      }
    } catch {}
  }, []);
  const inWishlist = (pid: string) => wishlistIds.has(pid);

  const toggleWishlist = () => {
    if (!product) return;
    const id = product._id;
    const item = {
      id,
      productId: id,
      name: displayName(product),
      price: product.minPrice,
      image: (gallery[0] || product.images[0]) ?? "/images/placeholder.jpg",
      productCode: product.product_code,
    };
    let existing: any[] = [];
    try {
      const data = localStorage.getItem("wishlist");
      if (data) existing = JSON.parse(data);
    } catch {}
    const has = existing.find((x: any) => x.id === id);
    const updated = has ? existing.filter((x: any) => x.id !== id) : [...existing, item];
    localStorage.setItem("wishlist", JSON.stringify(updated));
    setWishlistIds(new Set(updated.map((i: any) => i.id)));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("wishlist-updated"));
  };

  /* ========= Cart ========= */
  const addToCart = () => {
    if (!product || !variant) {
      alert("Please select available options.");
      return;
    }
    const item = {
      id: `${product._id}-${variant.size}-${variant.colour}`,
      productId: product._id,
      variantId: variant._id,
      name: displayName(product),
      price: variant.price,
      image: (gallery[0] || product.images[0]) ?? "/images/placeholder.jpg",
      quantity: qty,
      size: variant.size,
      color: variant.colour,
      productCode: product.product_code,
      material: product.material,
      category: product.category,
      maxStock: variant.stock,
    };
    if (qty > variant.stock) {
      alert(`Only ${variant.stock} available.`);
      return;
    }
    let existing: any[] = [];
    try {
      const d = localStorage.getItem("cart");
      if (d) existing = JSON.parse(d);
    } catch {}
    const idx = existing.findIndex((i: any) => i.id === item.id);
    if (idx > -1) {
      const newQty = existing[idx].quantity + qty;
      if (newQty > item.maxStock) {
        alert(`Only ${item.maxStock} available. You already have ${existing[idx].quantity} in cart.`);
        return;
      }
      existing[idx] = { ...existing[idx], quantity: newQty };
    } else {
      existing.push(item);
    }
    localStorage.setItem("cart", JSON.stringify(existing));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("cart-updated"));
    setAddedName(displayName(product));
    setShowCartToast(true);
    setTimeout(() => setShowCartToast(false), 2500);
  };

  /* ========= Lightbox / Zoom ========= */
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setLightboxOpen(true);
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const zoomIn = () => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const onWheelZoom: React.WheelEventHandler = (e) => {
    if (!lightboxOpen) return;
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const onMouseDown: React.MouseEventHandler = (e) => {
    if (zoom === 1) return;
    setPanning(true);
    startRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove: React.MouseEventHandler = (e) => {
    if (!panning || !startRef.current) return;
    setOffset({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };
  const onMouseUp = () => setPanning(false);
  const onMouseLeave = () => setPanning(false);

  // Basic touch support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart: React.TouchEventHandler = (e) => {
    if (zoom === 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX - offset.x, y: t.clientY - offset.y };
  };
  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!touchStartRef.current || zoom === 1) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - touchStartRef.current.x, y: t.clientY - touchStartRef.current.y });
  };

  /* ========= Render ========= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700">Product not found.</p>
      </div>
    );
  }

  const wishActive = inWishlist(product._id);

  return (
    <div className="min-h-screen bg-white">
      {/* Cart toast */}
      {showCartToast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <Check className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Added to Cart</p>
            <p className="text-xs opacity-90">{addedName}</p>
          </div>
          <button onClick={() => setShowCartToast(false)} className="ml-2 hover:bg-green-600 rounded-full p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Product details */}
      <div className="container mx-auto px-4 pb-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* LEFT: Gallery */}
          <div>
            <button
              type="button"
              onClick={() => openLightbox(imgIndex)}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 w-full"
              aria-label="Open image viewer"
            >
              <Image
                src={imgUrl(gallery[imgIndex])}
                alt={displayName(product)}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                className="object-cover"
              />
            </button>

            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    onDoubleClick={() => openLightbox(i)}
                    className={`relative aspect-square rounded border-2 overflow-hidden ${
                      imgIndex === i ? "border-black" : "border-transparent"
                    }`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <Image
                      src={imgUrl(g)}
                      alt={`${displayName(product)} view ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 25vw, 120px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">Tip: double-click a thumbnail to open fullscreen.</p>
          </div>

          {/* RIGHT: Essentials */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-light text-gray-900">{displayName(product)}</h1>
                {product.product_code && (
                  <p className="text-sm text-gray-500 mt-1">Product Code: {product.product_code}</p>
                )}
              </div>
              <button
                onClick={toggleWishlist}
                className={`w-10 h-10 rounded-full border flex items-center justify-center ${
                  wishActive ? "border-red-500 text-red-500" : "border-gray-300 text-gray-600 hover:text-red-500"
                }`}
                aria-label="Wishlist"
                title={wishActive ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart className={`w-5 h-5 ${wishActive ? "fill-current" : ""}`} />
              </button>
            </div>

            <div className="mt-4 space-y-1 text-sm">
              <p>
                <span className="text-gray-500">Material:</span>{" "}
                <span className="font-medium text-gray-900">{product.material}</span>
              </p>
              <p>
                <span className="text-gray-500">Price:</span>{" "}
                <span className="font-medium text-gray-900">{inr(price)}</span>
              </p>
              <p>
                <span className="text-gray-500">Color:</span>{" "}
                <span className="font-medium text-gray-900">{color || "—"}</span>
              </p>
              <p>
                <span className="text-gray-500">Size:</span>{" "}
                <span className="font-medium text-gray-900">{size || "—"}</span>
              </p>
            </div>

            {/* Price + shipping note */}
            <div className="mt-4">
              <span className="text-3xl font-light text-gray-900">{inr(price)}</span>
              {product.minPrice !== product.maxPrice && (
                <span className="ml-2 text-sm text-gray-500">
                  (range {inr(product.minPrice)}–{inr(product.maxPrice)})
                </span>
              )}
              <div className="mt-2 text-xs text-gray-600">
                {subtotal >= SHIPPING_THRESHOLD ? (
                  <span className="text-green-700 font-medium">✅ Free Shipping on this order</span>
                ) : (
                  <span>🚚 Shipping: {inr(SHIPPING_FEE)} (free above {inr(SHIPPING_THRESHOLD)})</span>
                )}
              </div>
            </div>

            {/* Color picker */}
            {fullColors.length > 0 && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select Color {color && `: ${color}`}
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorsAvail.map((c) => {
                    const disabled = !product.variants.some(
                      (v) => same(v.colour, c) && (!size || same(v.size, size)) && v.stock > 0
                    );
                    return (
                      <button
                        key={c}
                        onClick={() => !disabled && pickColor(c)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                          same(color, c) ? "border-black bg-black text-white" : "border-gray-300 hover:border-gray-400"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={disabled}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {fullColors.length > MAX_OPTIONS && (
                  <button
                    onClick={() => setShowAllColors((s) => !s)}
                    className="mt-2 text-xs underline text-gray-600 hover:text-gray-900"
                  >
                    {showAllColors ? "Show fewer colors" : `Show all colors (+${fullColors.length - MAX_OPTIONS})`}
                  </button>
                )}
              </div>
            )}

            {/* Size picker */}
            {fullSizes.length > 0 && (
              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select Size {size && `: ${size}`}
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizesAvail.map((s) => {
                    const disabled = !product.variants.some(
                      (v) => same(v.size, s) && (!color || same(v.colour, color)) && v.stock > 0
                    );
                    return (
                      <button
                        key={s}
                        onClick={() => !disabled && pickSize(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                          same(size, s) ? "border-black bg-black text-white" : "border-gray-300 hover:border-gray-400"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={disabled}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {fullSizes.length > MAX_OPTIONS && (
                  <button
                    onClick={() => setShowAllSizes((s) => !s)}
                    className="mt-2 text-xs underline text-gray-600 hover:text-gray-900"
                  >
                    {showAllSizes ? "Show fewer sizes" : `Show all sizes (+${fullSizes.length - MAX_OPTIONS})`}
                  </button>
                )}
              </div>
            )}

            {/* Stock + Qty */}
            <div className="mt-6 flex items-center gap-4">
              <p
                className={`text-sm font-medium ${
                  stock > 5 ? "text-green-600" : stock > 0 ? "text-yellow-700" : "text-red-600"
                }`}
              >
                {stock > 0 ? `${stock} in stock` : "Out of stock"}
              </p>
              {stock > 0 && (
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 hover:bg-gray-100" aria-label="Decrease quantity">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(stock, q + 1))} className="w-10 h-10 hover:bg-gray-100" aria-label="Increase quantity">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                disabled={!variant || stock === 0}
                onClick={addToCart}
                className={`flex-1 bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors font-medium inline-flex items-center justify-center gap-2 ${
                  !variant || stock === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
              <button
                disabled={!variant || stock === 0}
                onClick={() => setShowPaymentModal(true)}
                className={`flex-1 border py-3 px-6 rounded-lg transition-colors font-medium ${
                  !variant || stock === 0
                    ? "border-gray-300 text-gray-400 cursor-not-allowed"
                    : "border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                Order Now
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">Secure online payment • Easy returns • Fast shipping in Kerala</div>
          </div>
        </div>
      </div>

      {/* ===== Western Wears — Random Picks ===== */}
      {related.length > 0 && (
        <div className="container mx-auto px-4 pb-12">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Explore More Western Wear</h2>
            <span className="text-xs text-gray-500">{related.length} picks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductTile key={p._id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && product && variant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setShowPaymentModal(false)} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-4 h-4" />
                  Back to product
                </button>
                <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {orderSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Order Placed Successfully!</h3>
                  <p className="text-gray-600 mb-1">We'll contact you at <b>{shipping.phone}</b> with delivery details.</p>
                  <p className="text-sm text-gray-500">Redirecting to My Orders…</p>
                </div>
              ) : (
                <OrderPane
                  product={product}
                  variant={variant}
                  color={color}
                  size={size}
                  qty={qty}
                  subtotal={subtotal}
                  shippingFee={shippingFee}
                  grandTotal={grandTotal}
                  shipping={shipping}
                  setShipping={setShipping}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  orderProcessing={orderProcessing}
                  setOrderProcessing={setOrderProcessing}
                  setOrderSuccess={setOrderSuccess}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox with Zoom */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[60] bg-black/90 text-white flex flex-col" onWheel={onWheelZoom} role="dialog" aria-modal="true">
          {/* Top bar */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="text-sm opacity-80">{displayName(product)} • {lightboxIndex + 1}/{gallery.length}</div>
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Zoom out">
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Zoom in">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={resetZoom} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Reset zoom">
                <RefreshCw className="w-5 h-5" />
              </button>
              <button onClick={closeLightbox} className="ml-2 px-2 py-1 rounded hover:bg-white/10" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image area */}
          <LightboxCanvas
            src={imgUrl(gallery[lightboxIndex])}
            zoom={zoom}
            setZoom={setZoom}
            offset={offset}
            setOffset={setOffset}
            panning={panning}
            setPanning={setPanning}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onDoubleClick={() => (zoom === 1 ? zoomIn() : resetZoom())}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
          />

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="p-3 border-t border-white/10 overflow-x-auto">
              <div className="flex gap-2">
                {gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setLightboxIndex(i);
                      resetZoom();
                    }}
                    className={`relative w-16 h-16 rounded overflow-hidden border ${i === lightboxIndex ? "border-white" : "border-white/20"}`}
                    aria-label={`Open image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl(g)} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Extracted pieces used in the modal/lightbox to keep the main component tidy ===== */
function OrderPane(props: {
  product: Product;
  variant: Variant;
  color: string;
  size: string;
  qty: number;
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  shipping: ShippingInfo;
  setShipping: React.Dispatch<React.SetStateAction<ShippingInfo>>;
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  orderProcessing: boolean;
  setOrderProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setOrderSuccess: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    product,
    variant,
    color,
    size,
    qty,
    subtotal,
    shippingFee,
    grandTotal,
    shipping,
    setShipping,
    paymentMethod,
    setPaymentMethod,
    orderProcessing,
    setOrderProcessing,
    setOrderSuccess,
  } = props;

  const inr = (n: number | string) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const handlePay = async () => {
    if (!RZP_KEY_ID) {
      alert("Razorpay key is not configured.");
      return;
    }

    // Validate shipping
    const required: (keyof ShippingInfo)[] = [
      "name",
      "email",
      "phone",
      "address1",
      "city",
      "state",
      "pincode",
      "country",
    ];
    for (const k of required) {
      const v = shipping[k];
      if (!v || String(v).trim() === "") {
        alert(`Please enter ${k.toUpperCase()}.`);
        return;
      }
    }

    setOrderProcessing(true);
    try {
      // 1) Create internal order (pending)
      const orderBody = {
        items: [
          {
            product_id: product._id,
            variant_id: variant._id,
            quantity: qty,
            price: variant.price,
            size: variant.size,
            color: variant.colour,
            product_code: product.product_code,
          },
        ],
        customer_name: shipping.name,
        customer_email: shipping.email,
        customer_phone: shipping.phone,
        shipping_address: `${shipping.address1}${shipping.address2 ? ", " + shipping.address2 : ""}, ${shipping.city}, ${shipping.state} - ${shipping.pincode}, ${shipping.country}`,
        shipping: { ...shipping },
        subtotal,
        shipping_fee: shippingFee,
        total_amount: grandTotal,
        payment_method: paymentMethod,
        status: "pending",
      } as const;

      const createOrderRes = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""}`,
        },
        body: JSON.stringify(orderBody),
      });
      if (!createOrderRes.ok) {
        const err = await createOrderRes.json().catch(() => ({}));
        throw new Error(err.message || `Order create failed (${createOrderRes.status})`);
      }
      const orderJson = await createOrderRes.json();
      const internalOrderId = orderJson?.order_id || orderJson?._id || orderJson?.id;

      // 2) Create Razorpay order in backend
      const payRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(grandTotal * 100), currency: "INR", receipt: String(internalOrderId) }),
      });
      if (!payRes.ok) {
        const err = await payRes.json().catch(() => ({}));
        throw new Error(err.message || `Payment create failed (${payRes.status})`);
      }
      const payJson = await payRes.json();
      const rzpOrderId = payJson?.order_id || payJson?.id;

      // 3) Open Razorpay
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        throw new Error("Failed to load Razorpay SDK");
      }

      const rzp = new (window as any).Razorpay({
        key: RZP_KEY_ID,
        order_id: rzpOrderId,
        amount: Math.round(grandTotal * 100),
        currency: "INR",
        name: "Nazmi Boutique",
        description: product.product_name || `${product.material} ${product.category}`,
        image: "/images/logo.png",
        prefill: { name: shipping.name, email: shipping.email, contact: shipping.phone },
        notes: { internal_order_id: String(internalOrderId), product_code: product.product_code || "" },
        theme: { color: "#000000" },
        handler: async (response: any) => {
          try {
            await fetch(`/api/orders/${internalOrderId}/paid`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gateway: "razorpay",
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
          } catch {}
          setOrderSuccess(true);
          setTimeout(() => {
            window.location.href = "/account/my-orders";
          }, 1400);
        },
        modal: { ondismiss: () => { setOrderProcessing(false); } },
        config: { display: {} },
      });

      rzp.open();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Payment failed. Please try again.");
    } finally {
      setOrderProcessing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* LEFT: shipping form */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Shipping Details</h4>
        <div className="space-y-3">
          <input type="text" placeholder="Full Name" value={shipping.name} onChange={(e) => props.setShipping((s) => ({ ...s, name: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          <input type="email" placeholder="Email Address" value={shipping.email} onChange={(e) => props.setShipping((s) => ({ ...s, email: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          <input type="tel" placeholder="Phone Number" value={shipping.phone} onChange={(e) => props.setShipping((s) => ({ ...s, phone: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          <input type="text" placeholder="Address Line 1" value={shipping.address1} onChange={(e) => props.setShipping((s) => ({ ...s, address1: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          <input type="text" placeholder="Address Line 2 (optional)" value={shipping.address2} onChange={(e) => props.setShipping((s) => ({ ...s, address2: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="City" value={shipping.city} onChange={(e) => props.setShipping((s) => ({ ...s, city: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
            <input type="text" placeholder="State" value={shipping.state} onChange={(e) => props.setShipping((s) => ({ ...s, state: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Pincode" value={shipping.pincode} onChange={(e) => props.setShipping((s) => ({ ...s, pincode: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
            <input type="text" placeholder="Country" value={shipping.country} onChange={(e) => props.setShipping((s) => ({ ...s, country: e.target.value }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* RIGHT: summary + pay */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
              <Image
                src={(product.images?.[0] || "/images/placeholder.jpg")}
                alt={product.product_name || `${product.material} ${product.category}`}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{product.product_name || `${product.material} ${product.category}`}</p>
              <p className="text-xs text-gray-500">
                {size && `Size: ${size}`} {size && color && " • "} {color && `Color: ${color}`}
              </p>
              <p className="text-xs text-gray-500">Qty: {qty}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{inr(subtotal)}</p>
            </div>
          </div>

          <div className="border-t pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">{inr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className={`font-medium ${shippingFee === 0 ? "text-green-700" : "text-gray-900"}`}>
                {shippingFee === 0 ? "FREE" : inr(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-lg font-semibold text-gray-900">{inr(props.grandTotal)}</span>
            </div>
            {shippingFee > 0 && (
              <p className="text-xs text-gray-500 pt-1">Add items worth {inr(SHIPPING_THRESHOLD - subtotal)} more to get <b>Free Shipping</b>.</p>
            )}
          </div>
        </div>

        {/* Payment method */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900 mb-2">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {(["upi", "card", "netbanking"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => props.setPaymentMethod(m)}
                className={`py-2 px-3 border rounded-lg text-sm capitalize ${
                  props.paymentMethod === m ? "border-black bg-black text-white" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {m === "card" ? "Debit/Credit Card" : m}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">You'll complete payment securely via Razorpay.</p>
        </div>

        <button
          onClick={handlePay}
          disabled={
            props.orderProcessing ||
            !shipping.name ||
            !shipping.email ||
            !shipping.phone ||
            !shipping.address1 ||
            !shipping.city ||
            !shipping.state ||
            !shipping.pincode ||
            !shipping.country
          }
          className="w-full bg-black text-white py-4 px-6 rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {props.orderProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay Online ({props.paymentMethod === "card" ? "Card" : props.paymentMethod})
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function LightboxCanvas(props: {
  src: string;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  offset: { x: number; y: number };
  setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  panning: boolean;
  setPanning: React.Dispatch<React.SetStateAction<boolean>>;
  onMouseDown: React.MouseEventHandler;
  onMouseMove: React.MouseEventHandler;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onDoubleClick: () => void;
  onTouchStart: React.TouchEventHandler;
  onTouchMove: React.TouchEventHandler;
}) {
  return (
    <div
      className="flex-1 relative overflow-hidden"
      onMouseMove={props.onMouseMove}
      onMouseDown={props.onMouseDown}
      onMouseUp={props.onMouseUp}
      onMouseLeave={props.onMouseLeave}
      onDoubleClick={props.onDoubleClick}
      onTouchStart={props.onTouchStart}
      onTouchMove={props.onTouchMove}
      style={{ cursor: props.zoom > 1 ? (props.panning ? "grabbing" : "grab") : "zoom-in" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.src}
          alt="Zoom"
          className="object-contain select-none"
          draggable={false}
          style={{
            maxHeight: "90vh",
            maxWidth: "92vw",
            transform: `translate(${props.offset.x}px, ${props.offset.y}px) scale(${props.zoom})`,
            transition: props.panning ? "none" : "transform 120ms ease-out",
          }}
        />
      </div>
    </div>
  );
}
