const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("map")
    .setDescription("Get map data"),
  async execute(interaction) {
    await interaction.deferReply();
    const json = await api.map();
    if (!json?.success) return interaction.editReply("API error");
    await interaction.editReply("Map data retrieved.");
  }
};
