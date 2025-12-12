function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toSearchString(obj) {
  if (!obj || typeof obj !== "object") return "";
  const parts = [];
  for (const k of ["name", "title", "id", "type", "rarity", "category"]) {
    if (obj[k]) parts.push(String(obj[k]));
  }
  return parts.join(" ").toLowerCase();
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
}

function safeJsonPreview(data, maxLen = 1800) {
  const s = JSON.stringify(data, null, 2);
  return s.length > maxLen ? s.slice(0, maxLen) + "\n…(truncated)" : s;
}

module.exports = { clamp, toSearchString, pick, safeJsonPreview };
