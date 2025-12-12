const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("events")
    .setDescription("Show event timers"),
  async execute(interaction) {
    await interaction.deferReply();
    const json = await api.events();
    if (!json?.success) return interaction.editReply("API error");
    await interaction.editReply("Event timers retrieved.");
  }
};
