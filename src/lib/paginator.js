const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { clamp } = require("./format");

// In-memory state store for button pagination (no DB required)
const STATE_TTL_MS = 10 * 60 * 1000;
const state = new Map();

function putState(payload) {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  state.set(token, { payload, expires: Date.now() + STATE_TTL_MS });
  return token;
}

function getState(token) {
  const entry = state.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    state.delete(token);
    return null;
  }
  return entry.payload;
}

function buildPagerRow({ token, page, totalPages, includeRefresh = false }) {
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pg:prev:${token}`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(prevDisabled),

    new ButtonBuilder()
      .setCustomId(`pg:next:${token}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(nextDisabled)
  );

  if (includeRefresh) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`pg:refresh:${token}`)
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Primary)
    );
  }

  return row;
}

/**
 * Create pagination state + row for a render function.
 * payload = { kind, q, page, perPage, renderFnName, ...anything }
 */
function createPager(payload, page, totalPages, { includeRefresh = false } = {}) {
  payload.page = clamp(page, 1, totalPages);
  payload.totalPages = totalPages;
  const token = putState(payload);
  return {
    token,
    components: [buildPagerRow({ token, page: payload.page, totalPages, includeRefresh })]
  };
}

/**
 * Dispatcher called from src/index.js for button interactions.
 * Each command registers a "renderFn" in this module via registerRenderer().
 */
const renderers = new Map();

function registerRenderer(name, fn) {
  renderers.set(name, fn);
}

async function handleButton(interaction) {
  const id = interaction.customId || "";
  const [prefix, action, token] = id.split(":");
  if (prefix !== "pg" || !action || !token) return;

  const payload = getState(token);
  if (!payload) {
    return interaction.reply({ content: "That paginator expired. Run the command again.", ephemeral: true });
  }

  const renderFn = renderers.get(payload.renderFnName);
  if (!renderFn) {
    return interaction.reply({ content: "Paginator handler missing. Run the command again.", ephemeral: true });
  }

  // Adjust page or refresh
  let nextPage = payload.page || 1;
  if (action === "prev") nextPage = Math.max(1, nextPage - 1);
  if (action === "next") nextPage = Math.min(payload.totalPages || nextPage + 1, nextPage + 1);
  if (action === "refresh") nextPage = payload.page || 1;

  // Re-render and replace message
  await interaction.deferUpdate();
  await renderFn(interaction, { ...payload, page: nextPage, _refreshed: action === "refresh" });
}

module.exports = { createPager, registerRenderer, handleButton };
