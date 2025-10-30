// C:\Users\Admin\OneDrive\Desktop\NAZMI-123\Frontend\lib\api.ts
import type { Address, Order, ProductLite, User } from "./type";

/** Base URL for your backend API */
export const API: string =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000/api";

/** Build Authorization header from localStorage token, if present */
const authHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const token = window.localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

/** Fetch the currently logged-in user's profile */
export async function getProfile(): Promise<User | null> {
  try {
    const r = await fetch(`${API}/user/profile`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    return r.ok ? ((await r.json()) as User) : null;
  } catch {
    return null;
  }
}

/** Fetch the user's orders */
export async function getOrders(): Promise<Order[]> {
  try {
    const r = await fetch(`${API}/orders/my`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    return r.ok ? ((await r.json()) as Order[]) : [];
  } catch {
    return [];
  }
}

/** Fetch the user's saved address (if any) */
export async function getAddress(): Promise<Partial<Address> | null> {
  try {
    const r = await fetch(`${API}/user/address`, {
      headers: { ...authHeaders() },
      cache: "no-store",
    });
    return r.ok ? ((await r.json()) as Partial<Address>) : null;
  } catch {
    return null;
  }
}

/**
 * Save address with graceful fallbacks:
 * - Tries current payload (your keys) via PUT
 * - If 400/422, tries alternate key names (name/address1/address2) via PUT
 * - If 405 Method Not Allowed, tries POST with both shapes
 * - Logs server response text to help you debug real reason of failure
 *
 * Returns boolean (true on success) to avoid breaking your existing code.
 */
export async function saveAddress(addr: Address): Promise<boolean> {
  // Normalize/trim values to reduce backend validation failures
  const v1 = {
    fullName: addr.fullName?.trim() ?? "",
    phone: String(addr.phone ?? "").trim(),
    line1: addr.line1?.trim() ?? "",
    line2: (addr.line2 ?? "").trim(),
    city: addr.city?.trim() ?? "",
    state: addr.state?.trim() ?? "",
    pincode: String(addr.pincode ?? "").trim(),
  };

  // Common alternative naming some Flask/Express backends use
  const v2 = {
    name: v1.fullName,
    phone: v1.phone,
    address1: v1.line1,
    address2: v1.line2,
    city: v1.city,
    state: v1.state,
    pincode: v1.pincode,
  };

  const hit = async (method: "PUT" | "POST", body: Record<string, any>) =>
    fetch(`${API}/user/address`, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });

  try {
    // 1) PUT with your current keys
    let r = await hit("PUT", v1);
    if (r.ok) return true;

    // Helpful logging
    await logFailure("PUT v1", r);

    // 2) Validation hints → try alt keys with PUT
    if (r.status === 400 || r.status === 422) {
      r = await hit("PUT", v2);
      if (r.ok) return true;

      await logFailure("PUT v2", r);

      // If method not allowed for PUT, try POST v2
      if (r.status === 405) {
        const r2 = await hit("POST", v2);
        if (r2.ok) return true;
        await logFailure("POST v2", r2);
        return false;
      }
      return false;
    }

    // 3) If method not allowed for PUT, try POST (v1 then v2)
    if (r.status === 405) {
      let r2 = await hit("POST", v1);
      if (r2.ok) return true;
      await logFailure("POST v1", r2);

      r2 = await hit("POST", v2);
      if (r2.ok) return true;
      await logFailure("POST v2", r2);
      return false;
    }

    // 4) Unauthorized hints
    if (r.status === 401 || r.status === 403) {
      console.warn(
        "[saveAddress] Unauthorized: missing/invalid token. Ensure you are logged in and localStorage contains 'auth_token'."
      );
      return false;
    }

    // 5) Other errors
    return false;
  } catch (err) {
    console.error("[saveAddress] Network/Unexpected error:", err);
    return false;
  }
}

/** Rehydrate a set of product IDs into lightweight product cards */
export async function rehydrateProducts(
  ids: string[]
): Promise<Record<string, ProductLite>> {
  if (!ids?.length) return {};
  const qs = encodeURIComponent(ids.join(","));
  try {
    const r = await fetch(`${API}/products/mini?ids=${qs}`, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
      cache: "no-store",
    });
    if (!r.ok) return {};
    const list = (await r.json()) as any[];
    const map: Record<string, ProductLite> = {};
    for (const x of list) {
      const img =
        Array.isArray(x?.images) && x.images.length > 0
          ? String(x.images[0])
          : "/images/placeholder.jpg";
      map[String(x._id)] = {
        _id: String(x._id),
        slug: x?.slug ? String(x.slug) : undefined,
        name: String(x?.product_name ?? x?.name ?? ""),
        price: Number(x?.minPrice ?? x?.price ?? 0),
        image: img,
        inStock: Number(x?.totalStock ?? x?.stock ?? 0) > 0,
      };
    }
    return map;
  } catch {
    return {};
  }
}

/* -------------------- helpers -------------------- */

async function logFailure(label: string, r: Response) {
  const text = await safeText(r);
  console.warn(
    `[saveAddress] ${label} failed → status=${r.status} ${r.statusText} | response=`,
    text
  );
}

async function safeText(r: Response) {
  try {
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await r.json().catch(() => null);
      if (j && typeof j === "object") {
        return j.message || j.error || JSON.stringify(j);
      }
    }
    return await r.text();
  } catch {
    return "";
  }
}
