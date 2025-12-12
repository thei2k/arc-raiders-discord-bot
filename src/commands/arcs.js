// src/commands/arcs.js
const { SlashCommandBuilder } = require("discord.js");
const api = require("../lib/metaforge");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("arcs")
    .setDescription("List ARCs (MetaForge)"),

  async execute(interaction) {
    await interaction.deferReply();

    const json = await api.arcs();

    if (!json?.success) {
      const msg =
        `API error.\n` +
        `Status: ${json?.status ?? "unknown"}\n` +
        `Error: ${json?.error ?? "unknown"}\n` +
        `URL: ${json?.url ?? "unknown"}`;
      return interaction.editReply("```" + msg.slice(0, 1800) + "```");
    }

    const data = json.data;
    const list = Array.isArray(data)
      ? data.slice(0, 10).map(a => `• ${a.name ?? a.title ?? "Unknown"}`).join("\n")
      : (data && typeof data === "object")
        ? Object.keys(data).slice(0, 10).map(k => `• ${k}`).join("\n")
        : "";

    return interaction.editReply(list || "No ARCs found.");
  }
};
