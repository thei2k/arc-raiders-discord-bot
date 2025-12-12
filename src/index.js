require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} = require("discord.js");

// Fetch polyfill safety (Railway/runtime)
if (typeof globalThis.fetch !== "function") {
  const { fetch } = require("undici");
  globalThis.fetch = fetch;
}

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load commands
const commands = [];
const commandsPath = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsPath)) {
  if (!file.endsWith(".js")) continue;
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

// Register slash commands
const rest = new REST({ version: "10" }).setToken(TOKEN);
async function registerCommands() {
  console.log("Registering slash commands...");
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log("Registered guild commands");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log("Registered global commands");
    }
  } catch (err) {
    console.error("Command registration failed:", err);
  }
}

client.once("ready", async () => {
  console.log("Node version:", process.version);
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

// Handle slash commands + buttons
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) return;
      await cmd.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      // Buttons are routed through the paginator dispatcher
      const { handleButton } = require("./lib/paginator");
      await handleButton(interaction);
      return;
    }
  } catch (err) {
    console.error("Interaction error:", err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("There was an error handling that interaction.");
      } else {
        await interaction.reply({ content: "There was an error handling that interaction.", ephemeral: true });
      }
    } catch {}
  }
});

client.login(TOKEN);
