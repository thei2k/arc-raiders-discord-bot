const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("items")
    .setDescription("List ARC Raiders items"),
  async execute(interaction) {
    await interaction.deferReply();
    const json = await api.items();
    if (!json?.success) return interaction.editReply("API error");
    const items = json.data.slice(0, 10).map(i => `• ${i.name}`).join("\n");
    await interaction.editReply(items || "No items found");
  }
};
