const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../lib/metaforge");
const { clamp, toSearchString, pick } = require("../lib/format");
const { createPager, registerRenderer } = require("../lib/paginator");

function filterList(list, q) {
  if (!q) return list;
  const qq = q.toLowerCase();
  return list.filter(x => toSearchString(x).includes(qq));
}

function nameOf(x) {
  return pick(x, ["name", "title"]) ?? "Unknown";
}

async function render(interaction, state) {
  const json = await api.items();
  if (!json?.success) {
    const msg = `API error\nstatus: ${json?.status}\nerror: ${json?.error}\nurl: ${json?.url}`;
    return interaction.editReply("```" + msg.slice(0, 1800) + "```");
  }

  const all = Array.isArray(json.data) ? json.data : [];
  const filtered = filterList(all, state.q);

  const perPage = clamp(state.perPage ?? 10, 5, 20);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const page = clamp(state.page ?? 1, 1, totalPages);

  const start = (page - 1) * perPage;
  const chunk = filtered.slice(start, start + perPage);

  const embed = new EmbedBuilder()
    .setTitle("Items")
    .setDescription(
      chunk.length
        ? chunk.map((it, idx) => `**${start + idx + 1}.** ${nameOf(it)}`).join("\n")
        : "No items found."
    )
    .setFooter({ text: `Query: ${state.q || "(none)"} • Page ${page}/${totalPages} • ${filtered.length} results` });

  const pager = createPager(
    { renderFnName: "items_render", q: state.q || "", perPage },
    page,
    totalPages
  );

  return interaction.editReply({ embeds: [embed], components: pager.components });
}

registerRenderer("items_render", render);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("items")
    .setDescription("Search and browse items")
    .addStringOption(o => o.setName("q").setDescription("Search text").setRequired(false))
    .addIntegerOption(o => o.setName("perpage").setDescription("Items per page (5-20)").setRequired(false))
    .addIntegerOption(o => o.setName("page").setDescription("Page number").setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const q = interaction.options.getString("q") ?? "";
    const perPage = interaction.options.getInteger("perpage") ?? 10;
    const page = interaction.options.getInteger("page") ?? 1;
    return render(interaction, { q, perPage, page });
  }
};
