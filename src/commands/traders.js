const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("traders")
    .setDescription("Show trader inventories"),
  async execute(interaction) {
    await interaction.deferReply();
    const json = await api.traders();
    if (!json?.success) return interaction.editReply("API error");
    const traders = Object.keys(json.data).slice(0, 10).join(", ");
    await interaction.editReply(traders || "No traders found");
  }
};
