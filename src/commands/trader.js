const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const api = require("../lib/metaforge");
const { pick, safeJsonPreview } = require("../lib/format");

function findTraderKey(keys, q) {
  const qq = q.toLowerCase();
  const exact = keys.find(k => k.toLowerCase() === qq);
  if (exact) return exact;
  return keys.find(k => k.toLowerCase().includes(qq)) || null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trader")
    .setDescription("Show a trader's inventory")
    .addStringOption(o => o.setName("name").setDescription("Trader name").setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    const name = interaction.options.getString("name", true);
    const json = await api.traders();

    if (!json?.success) {
      const msg = `API error\nstatus: ${json?.status}\nerror: ${json?.error}\nurl: ${json?.url}`;
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    const mapping = (json.data && typeof json.data === "object") ? json.data : {};
    const keys = Object.keys(mapping);
    const key = findTraderKey(keys, name);

    if (!key) return interaction.editReply(`No trader found for: **${name}**`);

    const inv = mapping[key];

    if (Array.isArray(inv)) {
      const lines = inv.slice(0, 20).map((it) => `• ${pick(it, ["name", "title"]) ?? "Unknown"}`);
      const embed = new EmbedBuilder()
        .setTitle(`Trader: ${key}`)
        .setDescription(lines.length ? lines.join("\n") : "(empty)")
        .setFooter({ text: "Use /traders to browse" });

      return interaction.editReply({ embeds: [embed] });
    }

    const preview = safeJsonPreview(inv, 1800);
    return interaction.editReply(`**Trader: ${key}**\n\`\`\`json\n${preview}\n\`\`\``);
  }
};
