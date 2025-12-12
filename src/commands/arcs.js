const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("arcs")
    .setDescription("List ARCs"),
  async execute(interaction) {
    await interaction.deferReply();
    const json = await api.arcs();
    if (!json?.success) return interaction.editReply("API error");
    const arcs = json.data.slice(0, 10).map(a => `• ${a.name}`).join("\n");
    await interaction.editReply(arcs || "No ARCs found");
  }
};
