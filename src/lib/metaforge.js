// src/lib/metaforge.js
const { get, set } = require("./cache");

const BASE = "https://metaforge.app";
const ARC = `${BASE}/api/arc-raiders`;

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

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ARC-Raiders-DiscordBot/1.0",
      "Accept": "application/json",
      "Referer": "https://metaforge.app/arc-raiders/api",
      "Origin": "https://metaforge.app"
    }
  });

  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();

  // If we got non-JSON (e.g., HTML/WAF), return a helpful error object
  if (!contentType.includes("application/json")) {
    const out = {
      success: false,
      error: `Non-JSON response (status ${res.status}). Content-Type: ${contentType || "unknown"}`,
      status: res.status,
      url
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
      error: `Failed to parse JSON (status ${res.status}).`,
      status: res.status,
      url
    };
    set(url, out, 30 * 1000);
    return out;
  }

  // If server returned an error status but still JSON, preserve it
  if (!res.ok) {
    const out = {
      success: false,
      error: json?.error || json?.message || `HTTP ${res.status}`,
      status: res.status,
      url,
      details: json
    };
    set(url, out, 30 * 1000);
    return out;
  }

  set(url, json, ttlMs);
  return json;
}

module.exports = {
  items: (params = {}) => fetchCachedJson(buildUrl("/api/arc-raiders/items", params), 30 * 60 * 1000),
  arcs: (params = {}) => fetchCachedJson(buildUrl("/api/arc-raiders/arcs", params), 30 * 60 * 1000),
  quests: (params = {}) => fetchCachedJson(buildUrl("/api/arc-raiders/quests", params), 30 * 60 * 1000),
  traders: () => fetchCachedJson(buildUrl("/api/arc-raiders/traders"), 30 * 60 * 1000),
  events: (params = {}) => fetchCachedJson(buildUrl("/api/arc-raiders/event-timers", params), 60 * 1000),

  // Map endpoint is NOT under /api/arc-raiders in the docs
  map: (params = {}) => fetchCachedJson(buildUrl("/api/game-map-data", params), 30 * 60 * 1000)
};
