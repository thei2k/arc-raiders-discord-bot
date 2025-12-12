const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../lib/metaforge");
const { clamp, pick } = require("../lib/format");
const { createPager, registerRenderer } = require("../lib/paginator");

function clampInt(n, min, max, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function nameOf(x) {
  return (
    pick(x, ["name", "title", "displayName", "itemName", "label", "slug", "id"]) ??
    "Unknown"
  );
}

async function render(interaction, state) {
  const q = (state.q || "").trim();
  const page = clampInt(state.page, 1, 10_000, 1);
  const limit = clampInt(state.perPage, 1, 100, 10);

  // Use API pagination + search by name
  const json = await api.items({
    page,
    limit,
    search: q || undefined,
    // You can flip these later if you want richer data:
    minimal: true,
    includeComponents: false,
  });

  if (!json?.success) {
    const msg = `API error\nstatus: ${json?.status}\nerror: ${json?.error}\nurl: ${json?.url}`;
    return interaction.editReply("```" + msg.slice(0, 1800) + "```");
  }

  const items = Array.isArray(json.data) ? json.data : [];
  const pag = json.pagination || {};
  const totalPages = clampInt(pag.totalPages, 1, 10_000, 1);
  const total = clampInt(pag.total, 0, 1_000_000, items.length);

  const embed = new EmbedBuilder()
    .setTitle("Items")
    .setDescription(
      items.length
        ? items.map((it, idx) => `**${idx + 1}.** ${nameOf(it)}`).join("\n")
        : "No items found."
    )
    .setFooter({
      text: `Query: ${q || "(none)"} • Page ${page}/${totalPages} • ${total} total`,
    });

  const pager = createPager(
    { renderFnName: "items_render", q, perPage: limit },
    page,
    totalPages
  );

  return interaction.editReply({ embeds: [embed], components: pager.components });
}

registerRenderer("items_render", render);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("items")
    .setDescription("Search and browse items (server-side paging)")
    .addStringOption((o) =>
      o.setName("q").setDescription("Search by item name").setRequired(false)
    )
    .addIntegerOption((o) =>
      o.setName("perpage").setDescription("Items per page (1-100)").setRequired(false)
    )
    .addIntegerOption((o) =>
      o.setName("page").setDescription("Page number").setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const q = interaction.options.getString("q") ?? "";
    const perPage = interaction.options.getInteger("perpage") ?? 10;
    const page = interaction.options.getInteger("page") ?? 1;
    return render(interaction, { q, perPage, page });
  },
};
