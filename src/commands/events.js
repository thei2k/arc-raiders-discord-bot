// src/commands/events.js
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
        `API error.\n` +
        `Status: ${json?.status ?? "unknown"}\n` +
        `Error: ${json?.error ?? "unknown"}\n` +
        `URL: ${json?.url ?? "unknown"}`;
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    // Try to display something useful regardless of exact shape:
    const data = json.data;
    const preview =
      Array.isArray(data) ? data.slice(0, 5) :
      data && typeof data === "object" ? Object.keys(data).slice(0, 10) :
      [];

    return interaction.editReply(
      preview.length
        ? `Got event timers. Preview: ${preview.join(", ").slice(0, 1800)}`
        : "Got event timers."
    );
  }
};
