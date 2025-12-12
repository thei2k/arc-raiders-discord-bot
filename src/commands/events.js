const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("events")
    .setDescription("Show event timers (MetaForge)"),

  async execute(interaction) {
    await interaction.deferReply();

    const json = await api.events();

    if (!json?.success) {
      const msg =
        `API error\n` +
        `status: ${json?.status ?? "unknown"}\n` +
        `error: ${json?.error ?? "unknown"}\n` +
        `url: ${json?.url ?? "unknown"}\n` +
        (json?.preview ? `preview: ${json.preview}\n` : "");
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    return interaction.editReply("✅ Event timers fetched successfully.");
  }
};
