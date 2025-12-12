const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("About this bot and data sources"),
  async execute(interaction) {
    await interaction.reply(
      "ARC Raiders Discord Bot\n" +
      "Data provided by MetaForge (https://metaforge.app/arc-raiders)\n" +
      "Community maintained, not affiliated with Embark."
    );
  }
};
