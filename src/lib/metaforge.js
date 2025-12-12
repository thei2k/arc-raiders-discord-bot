const { get, set } = require("./cache");

const BASE = "https://metaforge.app";

function buildUrl(path, params = {}) {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function fetchCachedJson(url, ttlMs = 5 * 60 * 1000) {
  const cached = get(url);
  if (cached) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ARC-Raiders-DiscordBot/1.2",
        Accept: "application/json",
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const raw = await res.text();

    if (!contentType.includes("application/json")) {
      const out = {
        success: false,
        status: res.status,
        url,
        error: `Non-JSON response. Content-Type: ${contentType || "unknown"}`,
        preview: raw.slice(0, 300),
      };
      set(url, out, 30 * 1000);
      return out;
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      const out = {
        success: false,
        status: res.status,
        url,
        error: "Failed to parse JSON.",
        preview: raw.slice(0, 300),
      };
      set(url, out, 30 * 1000);
      return out;
    }

    if (!res.ok) {
      const out = {
        success: false,
        status: res.status,
        url,
        error: json?.error || json?.message || `HTTP ${res.status}`,
        details: json,
      };
      set(url, out, 30 * 1000);
      return out;
    }

    if (typeof json.success !== "boolean") json.success = true;

    set(url, json, ttlMs);
    return json;
  } catch (err) {
    const out = {
      success: false,
      status: "fetch_failed",
      url,
      error: err?.message || String(err),
    };
    set(url, out, 30 * 1000);
    return out;
  }
}

module.exports = {
  // ✅ Items now supports server-side pagination + search (and later filters)
  // GET /api/arc-raiders/items  (base URL in docs) :contentReference[oaicite:1]{index=1}
  items: (params = {}) =>
    fetchCachedJson(buildUrl("/api/arc-raiders/items", params), 2 * 60 * 1000),

  arcs: () => fetchCachedJson(buildUrl("/api/arc-raiders/arcs"), 30 * 60 * 1000),
  quests: () => fetchCachedJson(buildUrl("/api/arc-raiders/quests"), 30 * 60 * 1000),
  traders: () => fetchCachedJson(buildUrl("/api/arc-raiders/traders"), 30 * 60 * 1000),
  events: () => fetchCachedJson(buildUrl("/api/arc-raiders/event-timers"), 60 * 1000),
  map: () => fetchCachedJson(buildUrl("/api/game-map-data"), 30 * 60 * 1000),
};
