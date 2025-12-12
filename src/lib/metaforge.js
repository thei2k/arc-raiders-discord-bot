const { get, set } = require("./cache");

const BASE = "https://metaforge.app";
const ARC = `${BASE}/api/arc-raiders`;

async function fetchCached(url, ttl = 5 * 60 * 1000) {
  const cached = get(url);
  if (cached) return cached;

  const res = await fetch(url, {
    headers: { "User-Agent": "ARC-Raiders-DiscordBot/1.0" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  set(url, json, ttl);
  return json;
}

module.exports = {
  items: () => fetchCached(`${ARC}/items`, 30 * 60 * 1000),
  arcs: () => fetchCached(`${ARC}/arcs`, 30 * 60 * 1000),
  quests: () => fetchCached(`${ARC}/quests`, 30 * 60 * 1000),
  traders: () => fetchCached(`${ARC}/traders`, 30 * 60 * 1000),
  events: () => fetchCached(`${ARC}/event-timers`, 60 * 1000),
  map: () => fetchCached(`${BASE}/api/game-map-data`, 30 * 60 * 1000)
};
