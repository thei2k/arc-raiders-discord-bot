const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");
const { toSearchString, pick, safeJsonPreview } = require("../lib/format");

function bestMatch(list, q) {
  const qq = q.toLowerCase();
  const exact = list.find(x => String(pick(x, ["name", "title"]) || "").toLowerCase() === qq);
  if (exact) return exact;
  return list.find(x => toSearchString(x).includes(qq)) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("arc")
    .setDescription("Show details for a single ARC")
    .addStringOption(o => o.setName("q").setDescription("ARC name / keyword").setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const q = interaction.options.getString("q", true);
    const json = await api.arcs();

    if (!json?.success) {
      const msg = `API error\nstatus: ${json?.status}\nerror: ${json?.error}\nurl: ${json?.url}`;
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    const list = Array.isArray(json.data) ? json.data : [];
    const hit = bestMatch(list, q);

    if (!hit) return interaction.editReply(`No ARC found for: **${q}**`);

    const name = pick(hit, ["name", "title"]) ?? "ARC";
    const preview = safeJsonPreview(hit, 1800);
    return interaction.editReply(`**${name}**\n\`\`\`json\n${preview}\n\`\`\``);
  }
};
