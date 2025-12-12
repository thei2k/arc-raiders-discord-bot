const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../lib/metaforge");
const { pick, safeJsonPreview } = require("../lib/format");

function clampBool(v, fallback) {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
}

function nameOf(x) {
  return pick(x, ["name", "title", "displayName", "itemName", "label", "slug", "id"]) ?? "Item";
}

function idOf(x) {
  return pick(x, ["id", "uuid", "_id", "itemId", "slug"]) ?? null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("item")
    .setDescription("Show full details for an item (supports crafting/components)")
    .addStringOption(o => o.setName("id").setDescription("Specific item ID (best)").setRequired(false))
    .addStringOption(o => o.setName("q").setDescription("Search by name, then show first match").setRequired(false))
    .addBooleanOption(o => o.setName("includecomponents").setDescription("Include crafting components").setRequired(false))
    .addBooleanOption(o => o.setName("minimal").setDescription("Return minimal data").setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const id = interaction.options.getString("id");
    const q = interaction.options.getString("q");

    const includeComponents = clampBool(interaction.options.getBoolean("includecomponents"), true);
    const minimal = clampBool(interaction.options.getBoolean("minimal"), false);

    if (!id && !q) {
      return interaction.editReply("Provide either `id:` (recommended) or `q:`.");
    }

    // If we have an ID, fetch that exact item
    if (id) {
      const json = await api.items({
        id,
        includeComponents,
        minimal
      });

      if (!json?.success) {
        const msg = `API error\nstatus: ${json?.status}\nerror: ${json?.error}\nurl: ${json?.url}`;
        return interaction.editReply("```" + msg.slice(0, 1800) + "```");
      }

      // API might return {data:[...]} or {data:{...}} for id fetch; handle both
      const data = Array.isArray(json.data) ? json.data[0] : json.data;
      if (!data) return interaction.editReply(`No item found for id: **${id}**`);

      const preview = safeJsonPreview(data, 1800);
      return interaction.editReply(`**${nameOf(data)}**  ${idOf(data) ? `\`id:${idOf(data)}\`` : ""}\n\`\`\`json\n${preview}\n\`\`\``);
    }

    // Otherwise: search, then show first match
    const json = await api.items({
      page: 1,
      limit: 10,
      search: q,
      includeComponents,
      minimal
    });

    if (!json?.success) {
      const msg = `API error\nstatus: ${json?.status}\nerror: ${json?.error}\nurl: ${json?.url}`;
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    const list = Array.isArray(json.data) ? json.data : [];
    const hit = list[0];
    if (!hit) return interaction.editReply(`No item found for: **${q}**`);

    const preview = safeJsonPreview(hit, 1800);
    return interaction.editReply(`**${nameOf(hit)}**  ${idOf(hit) ? `\`id:${idOf(hit)}\`` : ""}\n\`\`\`json\n${preview}\n\`\`\``);
  }
};
