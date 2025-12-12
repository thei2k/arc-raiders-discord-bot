// src/commands/events.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../lib/metaforge");

function fmtIn(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

function fmtTimeRange(e) {
  // Try a handful of likely fields (MetaForge may change these)
  const start =
    e.startTime || e.startsAt || e.start || e.windowStart || e.startUtc || e.startsAtUtc;
  const end =
    e.endTime || e.endsAt || e.end || e.windowEnd || e.endUtc || e.endsAtUtc;

  // If these are ISO strings, show local time
  const toLocal = (v) => {
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", { timeZone: "America/New_York" });
  };

  const sLocal = toLocal(start);
  const eLocal = toLocal(end);
  if (sLocal && eLocal) return `${sLocal} → ${eLocal}`;

  // Sometimes they return "7:00 PM - 8:00 PM" already
  if (typeof start === "string" && typeof end === "string" && !sLocal && !eLocal) {
    return `${start} → ${end}`;
  }

  return null;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
}

function normalizeEvents(jsonData) {
  // Goal: return { active: [], upcoming: [] } no matter what structure comes back
  if (!jsonData) return { active: [], upcoming: [] };

  // Common structure: { active: [...], upcoming: [...] }
  const active1 = pick(jsonData, ["active", "activeEvents", "active_now", "current"]);
  const up1 = pick(jsonData, ["upcoming", "upcomingEvents", "next", "upcoming_next"]);

  if (Array.isArray(active1) || Array.isArray(up1)) {
    return {
      active: Array.isArray(active1) ? active1 : [],
      upcoming: Array.isArray(up1) ? up1 : []
    };
  }

  // If it's an array of events with status fields
  if (Array.isArray(jsonData)) {
    const active = [];
    const upcoming = [];
    for (const e of jsonData) {
      const status = String(pick(e, ["status", "state", "phase"]) ?? "").toLowerCase();
      const isActive = pick(e, ["isActive", "active"]) === true || status.includes("active");
      const isUpcoming = pick(e, ["isUpcoming", "upcoming"]) === true || status.includes("upcoming") || status.includes("soon") || status.includes("next");
      if (isActive) active.push(e);
      else if (isUpcoming) upcoming.push(e);
      else upcoming.push(e); // if unknown, still show it as upcoming
    }
    return { active, upcoming };
  }

  // Sometimes: { events: [...] }
  const events = pick(jsonData, ["events", "timers", "data"]);
  if (Array.isArray(events)) return normalizeEvents(events);

  return { active: [], upcoming: [] };
}

function formatLine(e) {
  const name = pick(e, ["name", "eventName", "title"]) ?? "Unknown Event";
  const map =
    pick(e, ["map", "mapName", "location"]) ??
    (Array.isArray(e.maps) ? e.maps.join(", ") : null);

  const endsIn = fmtIn(pick(e, ["endsIn", "endsInSeconds", "timeRemaining", "remainingSeconds"]));
  const startsIn = fmtIn(pick(e, ["startsIn", "startsInSeconds", "timeUntil", "untilSeconds"]));

  const range = fmtTimeRange(e);

  const bits = [];
  if (map) bits.push(`**${map}**`);
  if (endsIn) bits.push(`ends in ${endsIn}`);
  else if (startsIn) bits.push(`starts in ${startsIn}`);
  if (range) bits.push(range);

  return `• **${name}**${bits.length ? " — " + bits.join(" · ") : ""}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("events")
    .setDescription("Show ARC Raiders event timers (MetaForge)"),

  async execute(interaction) {
    await interaction.deferReply();

    const json = await api.events();
    if (!json?.success) {
      const msg =
        `API error\n` +
        `status: ${json?.status ?? "unknown"}\n` +
        `error: ${json?.error ?? "unknown"}\n` +
        `url: ${json?.url ?? "unknown"}\n` +
        (json?.preview ? `preview: ${json.preview}\n` : "");
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    const { active, upcoming } = normalizeEvents(json.data);

    // If we still couldn't parse it, show a safe preview so we can adapt quickly.
    if (!active.length && !upcoming.length) {
      const preview = JSON.stringify(json.data, null, 2);
      return interaction.editReply(
        "I fetched data but couldn’t recognize the structure. Here’s a preview:\n```json\n" +
          preview.slice(0, 1800) +
          "\n```"
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("ARC Raiders Event Timers")
      .setDescription(
        [
          active.length ? "**Active now**\n" + active.slice(0, 5).map(formatLine).join("\n") : "**Active now**\n• (none)",
          upcoming.length ? "\n**Upcoming next**\n" + upcoming.slice(0, 8).map(formatLine).join("\n") : "\n**Upcoming next**\n• (none)"
        ].join("\n")
      )
      .setFooter({ text: "Data: metaforge.app/arc-raiders (community maintained)" });

    return interaction.editReply({ embeds: [embed] });
  }
};
