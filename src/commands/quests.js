const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quests")
    .setDescription("List quests"),
  async execute(interaction) {
    await interaction.deferReply();
    const json = await api.quests();
    if (!json?.success) return interaction.editReply("API error");
    const quests = json.data.slice(0, 10).map(q => `• ${q.name}`).join("\n");
    await interaction.editReply(quests || "No quests found");
  }
};
