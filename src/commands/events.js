const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../lib/metaforge");
const { pick, safeJsonPreview } = require("../lib/format");
const { createPager, registerRenderer } = require("../lib/paginator");

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
  const start = pick(e, ["startTime", "startsAt", "start", "windowStart", "startUtc", "startsAtUtc"]);
  const end = pick(e, ["endTime", "endsAt", "end", "windowEnd", "endUtc", "endsAtUtc"]);

  const toLocal = (v) => {
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", { timeZone: "America/New_York" });
  };

  const sLocal = toLocal(start);
  const eLocal = toLocal(end);
  if (sLocal && eLocal) return `${sLocal} → ${eLocal}`;

  if (typeof start === "string" && typeof end === "string" && !sLocal && !eLocal) {
    return `${start} → ${end}`;
  }

  return null;
}

function normalizeEvents(jsonData) {
  if (!jsonData) return { active: [], upcoming: [] };

  const active = pick(jsonData, ["active", "activeEvents", "active_now", "current"]);
  const upcoming = pick(jsonData, ["upcoming", "upcomingEvents", "next", "upcoming_next"]);

  if (Array.isArray(active) || Array.isArray(upcoming)) {
    return { active: Array.isArray(active) ? active : [], upcoming: Array.isArray(upcoming) ? upcoming : [] };
  }

  if (Array.isArray(jsonData)) return { active: [], upcoming: jsonData };

  const events = pick(jsonData, ["events", "timers", "data"]);
  if (Array.isArray(events)) return normalizeEvents(events);

  return { active: [], upcoming: [] };
}

function formatLine(e) {
  const name = pick(e, ["name", "eventName", "title"]) ?? "Unknown Event";
  const map = pick(e, ["map", "mapName", "location"]) ?? (Array.isArray(e.maps) ? e.maps.join(", ") : null);

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

async function render(interaction) {
  const json = await api.events();

  if (!json?.success) {
    const msg =
      `API error\nstatus: ${json?.status ?? "unknown"}\nerror: ${json?.error ?? "unknown"}\nurl: ${json?.url ?? "unknown"}\n` +
      (json?.preview ? `preview: ${json.preview}\n` : "");
    return interaction.editReply("```" + msg.slice(0, 1800) + "```");
  }

  const { active, upcoming } = normalizeEvents(json.data);

  if (!active.length && !upcoming.length) {
    const preview = safeJsonPreview(json.data, 1800);
    return interaction.editReply(
      "Fetched events, but structure was unexpected. Preview:\n```json\n" + preview + "\n```"
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

  const pager = createPager({ renderFnName: "events_render" }, 1, 1, { includeRefresh: true });
  return interaction.editReply({ embeds: [embed], components: pager.components });
}

registerRenderer("events_render", render);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("events")
    .setDescription("Show ARC Raiders event timers (with refresh button)"),

  async execute(interaction) {
    await interaction.deferReply();
    return render(interaction);
  }
};
