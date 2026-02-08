// CommunityOS Discord Bot - Main Entry Point
// Comprehensive Discord bot for AI-native company operations

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ─── Environment Variable Validation ───────────────────────────
const requiredEnvVars = ['DISCORD_TOKEN', 'DISCORD_GUILD_ID'];
const optionalEnvVars = ['PACO_HUB_URL', 'ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

for (const envVar of optionalEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Optional environment variable not set: ${envVar}`);
  }
}

// Import modules
import { COLORS, LINKS, API_ENDPOINTS } from './config/constants.js';
import {
  createOrgRoles,
  assignRole,
  getRoleStats,
  createRoleOverviewEmbed,
  createRoleHierarchyEmbed,
  createMemberRolesEmbed,
} from './modules/roles.js';
import {
  setupOrgChannels,
  createTeamChannel,
  createSetupCompleteEmbed,
  createChannelOverviewEmbed,
  findTextChannelByName,
} from './modules/channels.js';
import {
  handleMemberJoin,
  handleMemberLeave,
} from './modules/welcome.js';
import {
  handleAutoResponse,
  handleKBSearch,
  handleAgentChat,
} from './modules/autoResponse.js';
import {
  handleModeration,
  handleRaidProtection,
} from './modules/moderation.js';
import {
  logInteraction,
  searchKB as searchKBIntegration,
  askAgent as askAgentIntegration,
  createTicket,
  getSystemStatus,
  createKBResultsEmbed,
  createAgentResponseEmbed,
  createTicketEmbed,
} from './modules/integration.js';
import {
  searchKB,
  getDocument,
  listDocuments,
  listSections,
  getRandomDocument,
  askKB,
  getKBStats,
  KB_SECTIONS,
} from './services/kb-service.js';
import {
  getAllAgents,
  getAgent,
  filterAgents,
  chatWithAgent,
  assignTask,
  getAgentStatus,
  summonAgent,
  getTeams,
  getSections,
} from './services/agent-service.js';

// Import chatbot modules
import {
  handleChatbotMessage,
  getChatbotStatus,
  clearChannelMemory,
  getMemoryStats,
  assignAgentToChannel,
  getChannelAgent,
  getAgentEmoji,
} from './chatbot/index.js';
import {
  getChatbotConfig,
  isChannelEnabled,
  enableChannel,
  disableChannel,
  setPersonality,
  getPersonality,
  getConfigSummary,
  resetConfig as resetChatbotConfig,
} from './config/chatbot-config.js';

// Import extended handlers for games, interactions, and Paco Hub
import {
  handleExtendedCommand,
  handleExtendedButton,
  shouldProcessAsGameMessage,
  processGameMessage,
  trackUserActivity,
} from './handlers/index.js';

// Import interaction handlers
import {
  handleQuickActionButton,
  handleSelectMenu,
  handleModalSubmit,
  handleContextMenu,
} from './modules/interactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment configuration
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const statusChannelName = process.env.STATUS_CHANNEL_NAME || 'status';
const shipLogChannelName = process.env.SHIP_LOG_CHANNEL_NAME || 'ship-log';
const buildSwarmChannelName = process.env.BUILD_SWARM_CHANNEL_NAME || 'build-swarm';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const OUTBOX_PATH = join(CONTROL_CENTER, 'OUTBOX', 'chat_responses.jsonl');
const CURSOR_PATH = join(__dirname, '..', 'data', 'outbox_cursor.json');

const startTime = Date.now();

// ─── Agent Personas ────────────────────────────────────────────
const channelPersonas = {
  'core-ops': { name: 'Paco', emoji: ':dart:', style: 'Concise and action-oriented. Focuses on clarity and next steps.' },
  'platform-eng': { name: 'Coder Prime', emoji: ':computer:', style: 'Methodical and quality-driven. Design first, then clean implementation.' },
  'product-design': { name: 'Product Manager', emoji: ':clipboard:', style: 'User-centric and analytical. Problem > options > recommendation.' },
  'knowledge-docs': { name: 'Docs Librarian', emoji: ':books:', style: 'Orderly and helpful. Single sources of truth, consistent naming.' },
  'growth-sales': { name: 'Growth Marketer', emoji: ':chart_with_upwards_trend:', style: 'Experimental and audience-aware. Hypothesis > test > learn.' },
  'security-finance': { name: 'Security & Governance', emoji: ':lock:', style: 'Principled and pragmatic. Risk-based guidance with safe defaults.' },
  'creator-ops': { name: 'Career Agent', emoji: ':briefcase:', style: 'Supportive and coach-like. Clear narratives and next-practice steps.' },
  'qa-reviews': { name: 'QA Guardian', emoji: ':shield:', style: 'Skeptical and thorough. Finds risks, tests critical paths.' },
  'agent-general': { name: 'Paco', emoji: ':robot:', style: 'Warm orchestrator. Coordinates across all teams.' },
  'agent-reports': { name: 'Chief of Staff', emoji: ':bar_chart:', style: 'Strategic and organized. Executive summaries with clear owners.' },
  'stream-chat': { name: 'Demo Producer', emoji: ':clapper:', style: 'Energetic and polished. Smooth scripts with backup plans.' },
  'stream-topics': { name: 'Topic Scout', emoji: ':mag:', style: 'Curious and trend-aware. Finds the best content angles.' },
  'content-ideas': { name: 'Writer', emoji: ':pencil:', style: 'Clear-headed and structured. Docs that reduce questions.' },
  'social-media': { name: 'Social Poster', emoji: ':iphone:', style: 'Sharp hooks with honesty. Platform-native copy.' },
  'job-pipeline': { name: 'Career Agent', emoji: ':briefcase:', style: 'Supportive career leverage. Positioning and storytelling.' },
};

// ─── Paco's personality ────────────────────────────────────────
const pacoResponses = {
  greetings: [
    "Hey! Paco here. Your calm operator, ready to ship.",
    "What's up! I'm online and systems are looking good.",
    "Hello! Ready to coordinate. What are we building today?",
    "Paco reporting in. All agents are standing by.",
  ],
  shipReactions: [
    "Nice ship! That's going to move the needle.",
    "Shipped and logged. The team will be stoked.",
    "Clean delivery. Love to see it.",
    "Another one shipped. Momentum is building.",
  ],
  encouragements: [
    "Keep going, the pace is great.",
    "Solid work. Small steps, big outcomes.",
    "This is how you build something real - one ship at a time.",
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function uptime() {
  const ms = Date.now() - startTime;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Admin Rate Limiting ───────────────────────────────────────
const adminRateLimit = new Map();
const ADMIN_RATE_LIMIT = 5; // 5 commands per minute
const ADMIN_RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

/**
 * Check if a user has exceeded the admin command rate limit
 * @param {string} userId - Discord user ID
 * @returns {boolean} - true if allowed, false if rate limited
 */
function checkAdminRateLimit(userId) {
  const now = Date.now();
  const userLimits = adminRateLimit.get(userId) || { count: 0, start: now };

  // Reset if window has passed
  if (now - userLimits.start > ADMIN_RATE_LIMIT_WINDOW) {
    userLimits.count = 0;
    userLimits.start = now;
  }

  // Check if rate limited
  if (userLimits.count >= ADMIN_RATE_LIMIT) {
    return false;
  }

  // Increment count and save
  userLimits.count++;
  adminRateLimit.set(userId, userLimits);
  return true;
}

// Admin commands that should be rate limited
const ADMIN_COMMANDS = [
  'setup-roles', 'setup-org', 'create-team-channel', 'sync-org', 'kb-sync',
  'assign-role', 'clear', 'timeout', 'warn', 'slowmode', 'mod',
];

// ─── Client setup ──────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ─── OUTBOX Polling ────────────────────────────────────────────
const OUTBOX_CHANNEL_MAP = {
  status: 'status',
  report: 'agent-reports',
  social: 'social-media',
};

async function loadOutboxCursor() {
  try {
    const raw = await readFile(CURSOR_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { lastLine: 0 };
  }
}

async function saveOutboxCursor(cursor) {
  const dir = dirname(CURSOR_PATH);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(CURSOR_PATH, JSON.stringify(cursor, null, 2), 'utf-8');
}

async function pollOutbox() {
  if (!guildId) return;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  let lines;
  try {
    const raw = await readFile(OUTBOX_PATH, 'utf-8');
    lines = raw.split('\n').filter(l => l.trim().length > 0);
  } catch {
    return;
  }

  const cursor = await loadOutboxCursor();
  const startIdx = cursor.lastLine || 0;

  if (startIdx >= lines.length) return;

  for (let i = startIdx; i < lines.length; i++) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }

    const kind = (entry.kind || '').toLowerCase();
    const channelName = OUTBOX_CHANNEL_MAP[kind] || 'agent-general';

    const targetCh = await findTextChannelByName(guild, channelName);
    if (!targetCh) continue;

    const embed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle('Incoming Message')
      .setDescription(entry.response || entry.message || entry.text || JSON.stringify(entry))
      .setTimestamp(entry.ts ? new Date(entry.ts) : new Date());

    if (entry.from) embed.setAuthor({ name: entry.from });
    if (entry.to) embed.addFields({ name: 'To', value: entry.to, inline: true });
    if (entry.kind) embed.addFields({ name: 'Kind', value: entry.kind, inline: true });

    embed.setFooter({ text: 'OUTBOX Relay' });

    await targetCh.send({ embeds: [embed] });
  }

  cursor.lastLine = lines.length;
  await saveOutboxCursor(cursor);
}

// ─── Ready event ───────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  if (guildId) {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (guild) {
      const statusCh = await findTextChannelByName(guild, statusChannelName);
      if (statusCh) {
        const readyEmbed = new EmbedBuilder()
          .setColor(COLORS.emerald)
          .setTitle('Paco is Online')
          .setDescription(pick(pacoResponses.greetings))
          .addFields(
            { name: 'Agents', value: '22+ standing by', inline: true },
            { name: 'Teams', value: '8+ active', inline: true },
            { name: 'Features', value: 'Full suite', inline: true },
          )
          .setFooter({ text: 'Use /help for all commands | /status for system health' })
          .setTimestamp();

        await statusCh.send({ embeds: [readyEmbed] });
      }
    }
  }

  // Start OUTBOX polling every 15 seconds
  setInterval(() => {
    pollOutbox().catch(err => console.error('OUTBOX poll error:', err.message));
  }, 15_000);

  pollOutbox().catch(err => console.error('OUTBOX initial poll error:', err.message));
});

// ─── Welcome new members ───────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  // Check for raid protection first
  const isRaid = await handleRaidProtection(member);
  if (isRaid) {
    console.log('Raid protection triggered');
    return;
  }

  // Handle full welcome sequence
  const results = await handleMemberJoin(member);
  console.log(`Welcome sequence for ${member.displayName}:`, results);
});

// ─── Member leave ──────────────────────────────────────────────
client.on('guildMemberRemove', async (member) => {
  await handleMemberLeave(member);
});

// ─── Message handling ──────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Track message for profile stats (sample 10% to reduce load)
  if (Math.random() < 0.1) {
    try {
      await trackUserActivity(message.author.id, 'message');
    } catch {
      // Ignore tracking errors
    }
  }

  // Check moderation first
  const modResult = await handleModeration(message);
  if (modResult) {
    // Message was moderated, stop processing
    return;
  }

  // Check if this is a game input (word scramble, hangman, number guess, quiz)
  const channelId = message.channel.id;
  if (shouldProcessAsGameMessage(channelId)) {
    try {
      const wasGameMessage = await processGameMessage(message);
      if (wasGameMessage) return;
    } catch (err) {
      console.error('Game message processing error:', err.message);
    }
  }

  // Check for auto-response triggers (KB search, !paco commands)
  const handled = await handleAutoResponse(message, client);
  if (handled) return;

  const channelName = message.channel.name;
  const content = message.content.toLowerCase();

  // Auto-react to ship updates
  if (channelName === 'ship-log' && !message.author.bot) {
    try {
      await message.react('rocket');
    } catch { /* emoji not found */ }
    if (Math.random() < 0.3) {
      await message.reply(`${pick(pacoResponses.shipReactions)}`);
    }
  }

  // Auto-react to bug reports
  if (channelName === 'bug-reports' || channelName === 'bugs') {
    try {
      await message.react('bug');
    } catch { /* emoji not found */ }
  }

  // Auto-react to feature requests
  if (channelName === 'feature-requests') {
    try {
      await message.react('bulb');
      await message.react('thumbsup');
    } catch { /* emoji not found */ }
  }

  // Auto-react to content ideas
  if (channelName === 'content-ideas' && content.length > 20) {
    try {
      await message.react('sparkles');
    } catch { /* emoji not found */ }
  }

  // ─── Context-Aware Chatbot System ─────────────────────────────
  // Process through the chatbot engine for intelligent responses
  // The chatbot will only respond when:
  // - Directly mentioned (@bot)
  // - Replied to
  // - Question is asked (ends with ?)
  // - Keyword triggers
  // - Random engagement (configurable)
  try {
    const chatbotResponse = await handleChatbotMessage(message, client);
    if (chatbotResponse) {
      // Chatbot handled the message
      return;
    }
  } catch (err) {
    console.error('Chatbot error:', err.message);
  }

  // Fallback: Team channel awareness (if chatbot didn't respond)
  if (channelPersonas[channelName] && content.includes('help') && !message.mentions.has(client.user)) {
    const p = channelPersonas[channelName];
    // Only respond 30% of the time to avoid being too chatty
    if (Math.random() < 0.3) {
      await message.reply(
        `${p.emoji} **${p.name}** here. How can I help?\n\n` +
        `I watch this channel and can assist with anything related to my domain. ` +
        `Use \`/ask ${p.name.toLowerCase()}\` for a direct question, ` +
        `or just mention me with a question.`
      );
    }
  }
});

// ─── Slash commands ────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    try {
      // Handle extended button interactions (games, etc.)
      const handledExtended = await handleExtendedButton(interaction);
      if (handledExtended) return;

      // Handle quick action buttons
      if (interaction.customId.startsWith('quick_') ||
          interaction.customId.startsWith('support_') ||
          interaction.customId.startsWith('welcome_') ||
          interaction.customId.startsWith('poll_') ||
          interaction.customId.startsWith('confirm_') ||
          interaction.customId.startsWith('page_')) {
        await handleQuickActionButton(interaction);
        return;
      }
    } catch (err) {
      console.error('Button interaction error:', err.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    try {
      await handleSelectMenu(interaction);
    } catch (err) {
      console.error('Select menu error:', err.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    try {
      await handleModalSubmit(interaction);
    } catch (err) {
      console.error('Modal submit error:', err.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  // Handle context menu commands
  if (interaction.isContextMenuCommand()) {
    try {
      await handleContextMenu(interaction);
    } catch (err) {
      console.error('Context menu error:', err.message);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  // Handle autocomplete
  if (interaction.isAutocomplete()) {
    // Handle command autocomplete if needed
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild } = interaction;

  // Track command usage for profile stats
  try {
    await trackUserActivity(interaction.user.id, 'command');
  } catch {
    // Ignore tracking errors
  }

  // Try extended commands first (games, admin, etc.)
  try {
    const handledExtended = await handleExtendedCommand(interaction);
    if (handledExtended) return;
  } catch (err) {
    console.error('Extended command error:', err.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true }).catch(() => {});
    }
    return;
  }

  // ─── Admin Rate Limiting Check ─────────────────────────────────
  if (ADMIN_COMMANDS.includes(commandName)) {
    if (!checkAdminRateLimit(interaction.user.id)) {
      const rateLimitEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Rate Limited')
        .setDescription(`You've exceeded the admin command rate limit (${ADMIN_RATE_LIMIT} commands per minute). Please wait before trying again.`)
        .setTimestamp();
      await interaction.reply({ embeds: [rateLimitEmbed], ephemeral: true });
      return;
    }
  }

  // ─── /ping ───────────────────────────────────────────────────
  if (commandName === 'ping') {
    const moods = ['focused', 'energized', 'in flow', 'calm and ready', 'building'];
    const mood = pick(moods);
    const moodEmoji = { focused: ':dart:', energized: ':zap:', 'in flow': ':ocean:', 'calm and ready': ':relieved:', building: ':hammer:' };

    const embed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setTitle('Pong!')
      .setDescription(pick(pacoResponses.greetings))
      .addFields(
        { name: 'Uptime', value: uptime(), inline: true },
        { name: 'Agents', value: '22+ online', inline: true },
        { name: 'Features', value: 'All systems go', inline: true },
        { name: 'Mood', value: `${moodEmoji[mood] || ':dart:'} ${mood}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'CommunityOS Bot' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // ─── /help ───────────────────────────────────────────────────
  if (commandName === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle('CommunityOS Bot Commands')
      .setDescription('Complete command reference organized by category. The bot also responds to @mentions, replies, and questions automatically!')
      .addFields(
        // Core
        { name: ':dart: Core', value: '`/ping` `/status` `/hub` `/daily` `/help`', inline: false },

        // Knowledge Base
        { name: ':books: Knowledge Base', value: '`/kb search <query>` - Search KB documents\n`/kb doc <name>` - Get specific document\n`/kb list [section]` - List all docs or by section\n`/kb random` - Random KB tip\n`/kb ask <question>` - AI answers using KB context', inline: false },

        // Agents
        { name: ':robot: Agents', value: '`/agent chat <id> <message>` - Chat with agent\n`/agent task <id> <task>` - Assign task to agent\n`/agent status` - Get all agent statuses\n`/agent summon <id>` - Bring agent to channel\n`/agent info <id>` - Agent details\n`/ask <agent> <question>` - Quick agent query\n`/list-agents` `/agent-info`', inline: false },

        // Projects
        { name: ':file_folder: Projects', value: '`/project list` - List all projects\n`/project status <name>` - Get project status\n`/project build <name>` - Trigger build\n`/project deploy <name>` - Trigger deployment', inline: false },

        // Utilities
        { name: ':wrench: Utilities', value: '`/remind <time> <message>` - Set reminder\n`/note <text>` - Save note to memory\n`/notes [filter]` - List saved notes\n`/todo add <task>` - Add todo item\n`/todo list` - List todos\n`/todo done <id>` - Mark todo complete', inline: false },

        // Fun
        { name: ':game_die: Fun', value: '`/8ball <question>` - Magic 8 ball\n`/quote` - Inspirational quote\n`/fact` - Random tech fact\n`/meme [topic]` - Generate meme text\n`/fortune` - Daily fortune\n`/trivia [category]` - Trivia game\n`/poll <question> <options>` - Create poll', inline: false },

        // Moderation
        { name: ':shield: Moderation', value: '`/warn <user> <reason>` - Warn user\n`/timeout <user> <duration>` - Timeout user\n`/clear <count>` - Clear messages\n`/slowmode <seconds>` - Set slowmode\n`/mod` - Moderation tools', inline: false },

        // Streaming
        { name: ':clapper: Streaming', value: '`/go-live <title>` - Go live announcement\n`/end-stream` - End stream\n`/schedule <text>` - Post schedule\n`/idea <text>` - Submit content idea', inline: false },

        // Build & Ship
        { name: ':rocket: Build & Ship', value: '`/ship <text>` - Post shipped update\n`/swarm <text>` - Post swarm update\n`/report <team>` - Get team report', inline: false },

        // Organization
        { name: ':office: Organization', value: '`/org [name]` - Org chart overview\n`/orgs` - List all organizations\n`/teams <org>` - List teams\n`/agents <team>` - List team agents', inline: false },

        // Support
        { name: ':ticket: Support', value: '`/ticket <description>` - Create ticket\n`/support new/recent/critical` - Support tools', inline: false },

        // Chatbot
        { name: ':speech_balloon: Chatbot Control', value: '`/chatbot enable/disable` - Toggle per channel\n`/chatbot assign <agent>` - Assign agent\n`/chatbot status` - View status\n`/chatbot clear-memory` - Clear memory\n`/chatbot personality` - Adjust personality', inline: false },

        // Admin
        { name: ':gear: Admin', value: '`/setup-roles` `/setup-org` `/create-team-channel`\n`/channel-overview` `/sync-org` `/kb-sync`\n`/role` `/assign-role`', inline: false },
      )
      .addFields(
        { name: ':keyboard: Text Commands', value: '`?kb <query>` - Quick KB search\n`!paco <question>` - Ask Paco directly\n`@Paco` - Mention for intelligent response', inline: false },
      )
      .setFooter({ text: 'CommunityOS - AI-Native Company | 90+ agents ready to help' })
      .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    return;
  }

  // ─── /setup-roles ────────────────────────────────────────────
  if (commandName === 'setup-roles') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await createOrgRoles(guild);

    const embed = new EmbedBuilder()
      .setColor(result.errors.length > 0 ? COLORS.amber : COLORS.emerald)
      .setTitle('Role Setup Complete')
      .addFields(
        { name: 'Created', value: result.created.join(', ') || 'None', inline: false },
        { name: 'Already Existed', value: result.existing.join(', ') || 'None', inline: false },
      )
      .setTimestamp();

    if (result.errors.length > 0) {
      embed.addFields({ name: 'Errors', value: result.errors.map(e => `${e.name}: ${e.error}`).join('\n'), inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ─── /assign-role ────────────────────────────────────────────
  if (commandName === 'assign-role') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: 'Mod only.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('member', true);
    const roleName = interaction.options.getString('role', true);

    try {
      const member = await guild.members.fetch(targetUser.id);
      const result = await assignRole(member, roleName);

      const embed = new EmbedBuilder()
        .setColor(result.alreadyHas ? COLORS.amber : COLORS.emerald)
        .setDescription(result.alreadyHas
          ? `${targetUser.displayName} already has the **${roleName}** role.`
          : `Assigned **${roleName}** to ${targetUser.displayName}.`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
    return;
  }

  // ─── /role ───────────────────────────────────────────────────
  if (commandName === 'role') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const action = interaction.options.getString('action', true);

    if (action === 'view') {
      const embed = createMemberRolesEmbed(interaction.member);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (action === 'overview') {
      const embed = createRoleOverviewEmbed(guild);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (action === 'hierarchy') {
      const embed = createRoleHierarchyEmbed();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }

  // ─── /setup-org ──────────────────────────────────────────────
  if (commandName === 'setup-org') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const result = await setupOrgChannels(guild);
    const embed = createSetupCompleteEmbed(result);

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ─── /create-team-channel ────────────────────────────────────
  if (commandName === 'create-team-channel') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const teamId = interaction.options.getString('team-id', true);
    const teamName = interaction.options.getString('team-name') || teamId;

    try {
      const result = await createTeamChannel(guild, teamId, teamName);

      const embed = new EmbedBuilder()
        .setColor(result.created ? COLORS.emerald : COLORS.amber)
        .setDescription(result.created
          ? `Created channel #${teamId} for **${teamName}**`
          : `Channel #${teamId} already exists`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
    }
    return;
  }

  // ─── /channel-overview ───────────────────────────────────────
  if (commandName === 'channel-overview') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const embed = createChannelOverviewEmbed(guild);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // ─── /kb ─────────────────────────────────────────────────────
  if (commandName === 'kb') {
    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    const results = await searchKB(query);
    const embed = createKBResultsEmbed(query, results);

    await interaction.editReply({ embeds: [embed] });

    await logInteraction({
      type: 'kb_search',
      query,
      resultCount: results.length,
      userId: interaction.user.id,
      channelId: interaction.channel.id,
    });
    return;
  }

  // ─── /ask ────────────────────────────────────────────────────
  if (commandName === 'ask') {
    const agentId = interaction.options.getString('agent', true);
    const question = interaction.options.getString('question', true);

    await interaction.deferReply();

    const result = await askAgent(agentId, question, {
      userId: interaction.user.id,
      userName: interaction.user.displayName || interaction.user.username,
      channelId: interaction.channel.id,
      channelName: interaction.channel.name,
    });

    if (result.success) {
      const embed = createAgentResponseEmbed(result.agentName, result.response, question);
      await interaction.editReply({ embeds: [embed] });
    } else {
      // Fallback to local persona response
      let persona = null;
      try {
        const raw = await readFile(join(CONTROL_CENTER, 'ORG', 'personas_by_agent.json'), 'utf-8');
        const data = JSON.parse(raw);
        persona = data.personas[agentId];
      } catch { /* ignore */ }

      if (!persona) {
        const notFoundEmbed = new EmbedBuilder()
          .setColor(COLORS.rose)
          .setDescription(`Agent "${agentId}" not found.`)
          .setTimestamp();
        await interaction.editReply({ embeds: [notFoundEmbed] });
        return;
      }

      const fallbackEmbed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setAuthor({ name: persona.displayName })
        .setTitle(`"${persona.tagline}"`)
        .setDescription(
          `**Your question:** *"${question}"*\n\n` +
          `I'd approach this by: ${persona.nowDoingDefault}\n\n` +
          `**My strengths relevant here:** ${persona.strengths.join(', ')}.`
        )
        .setFooter({ text: 'For full AI response, use Paco Hub -> /chat' })
        .setTimestamp();

      await interaction.editReply({ embeds: [fallbackEmbed] });
    }

    await logInteraction({
      type: 'agent_ask',
      agentId,
      question,
      success: result.success,
      userId: interaction.user.id,
      channelId: interaction.channel.id,
    });
    return;
  }

  // ─── /agent ──────────────────────────────────────────────────
  if (commandName === 'agent') {
    const agentId = interaction.options.getString('agent-id', true);
    const message = interaction.options.getString('message', true);

    await interaction.deferReply();

    const result = await askAgent(agentId, message, {
      userId: interaction.user.id,
      userName: interaction.user.displayName || interaction.user.username,
      channelId: interaction.channel.id,
    });

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setAuthor({ name: result.agentName })
        .setDescription(result.response.slice(0, 4000))
        .setFooter({ text: `Agent: ${result.agentId}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setDescription(`Could not reach agent "${agentId}": ${result.error}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
    return;
  }

  // ─── /ticket ─────────────────────────────────────────────────
  if (commandName === 'ticket') {
    const description = interaction.options.getString('description', true);
    const priority = interaction.options.getString('priority') || 'medium';

    await interaction.deferReply();

    const result = await createTicket({
      title: `Discord: ${description.slice(0, 50)}...`,
      description,
      priority,
      category: 'discord',
      customer: {
        name: interaction.user.displayName || interaction.user.username,
        email: `${interaction.user.id}@discord.user`,
        plan: 'community',
      },
      tags: ['discord'],
    });

    if (result.success) {
      const embed = createTicketEmbed(result.ticket);
      await interaction.editReply({ embeds: [embed] });

      // Post to support channel
      const supportCh = await findTextChannelByName(guild, 'support-tickets') ||
                        await findTextChannelByName(guild, 'support');
      if (supportCh) {
        const publicEmbed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle('New Support Ticket')
          .setDescription(description.slice(0, 500))
          .addFields(
            { name: 'Ticket ID', value: `\`${result.ticket.id}\``, inline: true },
            { name: 'Priority', value: priority, inline: true },
            { name: 'From', value: interaction.user.displayName || interaction.user.username, inline: true },
          )
          .setTimestamp();

        await supportCh.send({ embeds: [publicEmbed] });
      }
    } else {
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setDescription(`Could not create ticket: ${result.error}`)
        .addFields({ name: 'Fallback', value: `[Create in Paco Hub](${LINKS.pacoHub}/support-funnel)`, inline: false })
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
    return;
  }

  // ─── /ship ───────────────────────────────────────────────────
  if (commandName === 'ship') {
    const text = interaction.options.getString('text', true);
    const org = interaction.options.getString('org') || 'communityos';
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const shipCh = await findTextChannelByName(guild, shipLogChannelName);
    if (!shipCh) { await interaction.reply({ content: `Can't find #${shipLogChannelName}`, ephemeral: true }); return; }

    const orgColors = { communityos: COLORS.cyan, bim: COLORS.purple, streaming: COLORS.rose };

    const shipEmbed = new EmbedBuilder()
      .setColor(orgColors[org] || COLORS.cyan)
      .setTitle('SHIPPED')
      .setDescription(text)
      .addFields(
        { name: 'Shipped by', value: interaction.user.displayName, inline: true },
        { name: 'Org', value: org.toUpperCase(), inline: true },
      )
      .setFooter({ text: pick(pacoResponses.shipReactions) })
      .setTimestamp();

    await shipCh.send({ embeds: [shipEmbed] });

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setDescription('Shipped and logged!')
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

    await logInteraction({
      type: 'ship',
      text,
      org,
      userId: interaction.user.id,
    });
    return;
  }

  // ─── /swarm ──────────────────────────────────────────────────
  if (commandName === 'swarm') {
    const text = interaction.options.getString('text', true);
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const swarmCh = await findTextChannelByName(guild, buildSwarmChannelName);
    if (!swarmCh) { await interaction.reply({ content: `Can't find #${buildSwarmChannelName}`, ephemeral: true }); return; }

    const swarmEmbed = new EmbedBuilder()
      .setColor(COLORS.indigo)
      .setTitle('Swarm Update')
      .setDescription(text)
      .addFields(
        { name: 'From', value: interaction.user.displayName, inline: true },
      )
      .setTimestamp();

    await swarmCh.send({ embeds: [swarmEmbed] });

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setDescription('Posted to #build-swarm.')
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    return;
  }

  // ─── /go-live ────────────────────────────────────────────────
  if (commandName === 'go-live') {
    const title = interaction.options.getString('title', true);
    const platform = interaction.options.getString('platform') || 'both';
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const liveEmbed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle('LIVE NOW')
      .setDescription(`**${title}**\n\nJoin the stream! The crew is ready.`)
      .setTimestamp();

    if (platform === 'youtube' || platform === 'both') {
      liveEmbed.addFields({ name: 'YouTube', value: `[Watch on YouTube](${LINKS.youtube})`, inline: true });
    }
    if (platform === 'twitch' || platform === 'both') {
      liveEmbed.addFields({ name: 'Twitch', value: `[Watch on Twitch](${LINKS.twitch})`, inline: true });
    }

    liveEmbed.setFooter({ text: `Platform: ${platform}` });

    const announceCh = await findTextChannelByName(guild, 'announcements');
    const streamCh = await findTextChannelByName(guild, 'stream-chat');
    const statusCh = await findTextChannelByName(guild, statusChannelName);

    if (announceCh) await announceCh.send({ embeds: [liveEmbed] });
    if (streamCh) await streamCh.send({ embeds: [liveEmbed] });
    if (statusCh) {
      const statusEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setDescription(`Stream started: **${title}**`)
        .setTimestamp();
      await statusCh.send({ embeds: [statusEmbed] });
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setDescription(`Live announcement posted! Streaming: ${title}`)
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    return;
  }

  // ─── /end-stream ─────────────────────────────────────────────
  if (commandName === 'end-stream') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const streamCh = await findTextChannelByName(guild, 'stream-chat');
    const statusCh = await findTextChannelByName(guild, statusChannelName);
    const clipsCh = await findTextChannelByName(guild, 'stream-clips');
    const feedbackCh = await findTextChannelByName(guild, 'stream-feedback');

    const endEmbed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle('Stream Ended')
      .setDescription('Thanks for watching! See you next time.')
      .setTimestamp()
      .setFooter({ text: 'CommunityOS Streams' });

    if (streamCh) await streamCh.send({ embeds: [endEmbed] });
    if (statusCh) {
      const statusEmbed = new EmbedBuilder()
        .setColor(COLORS.white)
        .setDescription('Stream ended.')
        .setTimestamp();
      await statusCh.send({ embeds: [statusEmbed] });
    }
    if (clipsCh) {
      const clipsEmbed = new EmbedBuilder()
        .setColor(COLORS.amber)
        .setTitle('Clip Time!')
        .setDescription('Stream just ended! Drop any clip timestamps or highlights.')
        .setTimestamp();
      await clipsCh.send({ embeds: [clipsEmbed] });
    }
    if (feedbackCh) {
      const fbEmbed = new EmbedBuilder()
        .setColor(COLORS.indigo)
        .setTitle('Stream Feedback')
        .setDescription('How was today\'s stream? Share your feedback!')
        .setTimestamp();
      await feedbackCh.send({ embeds: [fbEmbed] });
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setDescription('Stream ended announcement posted.')
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    return;
  }

  // ─── /schedule ───────────────────────────────────────────────
  if (commandName === 'schedule') {
    const text = interaction.options.getString('text', true);
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const schedCh = await findTextChannelByName(guild, 'stream-schedule');
    if (!schedCh) { await interaction.reply({ content: "Can't find #stream-schedule", ephemeral: true }); return; }

    const schedEmbed = new EmbedBuilder()
      .setColor(COLORS.amber)
      .setTitle('Upcoming Stream')
      .setDescription(text)
      .addFields(
        { name: 'YouTube', value: `[Watch](${LINKS.youtube})`, inline: true },
        { name: 'Twitch', value: `[Watch](${LINKS.twitch})`, inline: true },
      )
      .setFooter({ text: 'Set a reminder!' })
      .setTimestamp();

    await schedCh.send({ embeds: [schedEmbed] });

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setDescription('Schedule posted.')
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    return;
  }

  // ─── /idea ───────────────────────────────────────────────────
  if (commandName === 'idea') {
    const text = interaction.options.getString('text', true);
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }

    const ideaCh = await findTextChannelByName(guild, 'content-ideas');
    if (!ideaCh) { await interaction.reply({ content: "Can't find #content-ideas", ephemeral: true }); return; }

    const ideaEmbed = new EmbedBuilder()
      .setColor(COLORS.amber)
      .setTitle('New Idea')
      .setDescription(text)
      .addFields(
        { name: 'Submitted by', value: interaction.user.displayName, inline: true },
      )
      .setFooter({ text: 'React with thumbs up if you\'d watch this!' })
      .setTimestamp();

    await ideaCh.send({ embeds: [ideaEmbed] });

    const confirmEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setDescription('Idea posted to #content-ideas!')
      .setTimestamp();

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    return;
  }

  // ─── /jobs ───────────────────────────────────────────────────
  if (commandName === 'jobs') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const jobsDir = join(CONTROL_CENTER, 'CV', 'jobs');
      const files = (await readdir(jobsDir)).filter(f => f.endsWith('.md') && f !== '_schema.md' && f !== 'README.md');

      if (files.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor(COLORS.amber)
          .setTitle('Career Pipeline')
          .setDescription('No job cards found.')
          .setTimestamp();
        await interaction.editReply({ embeds: [emptyEmbed] });
        return;
      }

      const statusCounts = { new: 0, interested: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0 };
      const statusColors = { new: 'blue_circle', interested: 'yellow_circle', applied: 'orange_circle', interviewing: 'purple_circle', offer: 'green_circle', rejected: 'red_circle' };
      const summaries = [];

      for (const file of files.slice(0, 10)) {
        const fileContent = await readFile(join(jobsDir, file), 'utf-8');
        const frontmatter = fileContent.split('---')[1] || '';
        const statusMatch = frontmatter.match(/status:\s*(\w+)/);
        const roleMatch = frontmatter.match(/role:\s*"?([^"\n]+)"?/);
        const companyMatch = frontmatter.match(/company:\s*"?([^"\n]+)"?/);
        const status = statusMatch ? statusMatch[1] : 'new';
        if (statusCounts[status] !== undefined) statusCounts[status]++;
        const icon = statusColors[status] || 'white_circle';
        summaries.push(`:${icon}: **${roleMatch ? roleMatch[1].trim() : file}** at ${companyMatch ? companyMatch[1].trim() : '?'} - \`${status}\``);
      }

      const total = files.length;

      const jobsEmbed = new EmbedBuilder()
        .setColor(COLORS.indigo)
        .setTitle('Career Pipeline')
        .setDescription(summaries.join('\n'))
        .addFields(
          { name: 'Total Jobs', value: `${total}`, inline: true },
          { name: 'New', value: `${statusCounts.new}`, inline: true },
          { name: 'Applied', value: `${statusCounts.applied}`, inline: true },
          { name: 'Interviewing', value: `${statusCounts.interviewing}`, inline: true },
          { name: 'Offers', value: `${statusCounts.offer}`, inline: true },
        )
        .setFooter({ text: 'Manage in Paco Hub -> /career' })
        .setTimestamp();

      await interaction.editReply({ embeds: [jobsEmbed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Error')
        .setDescription(`Error reading jobs: ${err.message}`)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /status ─────────────────────────────────────────────────
  if (commandName === 'status') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const checks = [
        { name: 'Discord Bot (Paco)', port: null, up: true },
      ];

      const ports = [
        { name: 'PostgreSQL', port: 5432 },
        { name: 'Redis', port: 6379 },
        { name: 'CommunityOS API', port: 4001 },
        { name: 'CommunityOS Web', port: 3002 },
        { name: 'Paco Hub', port: 3010 },
        { name: 'n8n', port: 5678 },
        { name: 'OpenClaw Gateway', port: 18789 },
      ];

      for (const p of ports) {
        try {
          execSync(`lsof -i :${p.port} -sTCP:LISTEN`, { timeout: 3000, stdio: 'pipe' });
          checks.push({ name: p.name, port: p.port, up: true });
        } catch {
          checks.push({ name: p.name, port: p.port, up: false });
        }
      }

      const upCount = checks.filter(c => c.up).length;
      const totalCount = checks.length;
      const allUp = upCount === totalCount;

      const serviceLines = checks.map(c => {
        const icon = c.up ? ':green_circle:' : ':red_circle:';
        const label = c.up ? 'UP' : 'DOWN';
        const portStr = c.port ? ` (:${c.port})` : '';
        return `${icon} **${c.name}**${portStr} - ${label}`;
      });

      const statusEmbed = new EmbedBuilder()
        .setColor(allUp ? COLORS.emerald : COLORS.rose)
        .setTitle('System Status')
        .setDescription(serviceLines.join('\n'))
        .addFields(
          { name: 'Services', value: `${upCount}/${totalCount} online`, inline: true },
          { name: 'Uptime', value: uptime(), inline: true },
          { name: 'Agents', value: '22+ across 8+ teams', inline: true },
        )
        .setFooter({ text: 'Full dashboard: Paco Hub -> /status' })
        .setTimestamp();

      await interaction.editReply({ embeds: [statusEmbed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Error')
        .setDescription(err.message)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /org ────────────────────────────────────────────────────
  if (commandName === 'org') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const org = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'org.json'), 'utf-8'));

      const sectionSummaries = [];
      for (const section of org.sections) {
        const teams = org.teams.filter(t => t.sectionId === section.id);
        const teamLines = teams.map(t => `**${t.name}** (${t.agents.length} agents) -> #${t.id}`).join('\n');
        sectionSummaries.push({ name: section.name, value: teamLines || 'No teams', inline: false });
      }

      const orgEmbed = new EmbedBuilder()
        .setColor(COLORS.purple)
        .setTitle('CommunityOS Org Chart')
        .addFields(...sectionSummaries)
        .addFields(
          { name: 'Total', value: `${org.agents.length} agents | ${org.teams.length} teams | ${org.sections.length} sections`, inline: false },
        )
        .setFooter({ text: 'Full org map: Paco Hub -> /org' })
        .setTimestamp();

      await interaction.editReply({ embeds: [orgEmbed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Error')
        .setDescription(err.message)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /hub ────────────────────────────────────────────────────
  if (commandName === 'hub') {
    const hubEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle('Paco Hub')
      .setDescription(`**Local:** ${LINKS.pacoHub}`)
      .addFields(
        { name: 'Home', value: `[Dashboard](${LINKS.pacoHub}/)`, inline: true },
        { name: 'Career', value: `[CV Pipeline](${LINKS.pacoHub}/career)`, inline: true },
        { name: 'Chat', value: `[AI Chat](${LINKS.pacoHub}/chat)`, inline: true },
        { name: 'Org', value: `[Org Map](${LINKS.pacoHub}/org)`, inline: true },
        { name: 'Support', value: `[Tickets](${LINKS.pacoHub}/support-funnel)`, inline: true },
        { name: 'KB', value: `[Knowledge Base](${LINKS.pacoHub}/kb)`, inline: true },
      )
      .setFooter({ text: 'CommunityOS Hub' })
      .setTimestamp();

    await interaction.reply({ embeds: [hubEmbed], ephemeral: true });
    return;
  }

  // ─── /daily ──────────────────────────────────────────────────
  if (commandName === 'daily') {
    await interaction.deferReply({ ephemeral: true });

    const now = new Date();
    const day = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' });

    let jobCount = 0;
    try {
      const files = await readdir(join(CONTROL_CENTER, 'CV', 'jobs'));
      jobCount = files.filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md').length;
    } catch { /* ignore */ }

    const dailyEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle(`Daily Standup - ${day}`)
      .addFields(
        { name: 'System', value: `Bot uptime: ${uptime()}\n22+ agents across 8+ teams\nAll features active`, inline: false },
        { name: 'Pipeline', value: `${jobCount} job cards in CV pipeline\nPrompt analytics running`, inline: false },
        { name: 'Today\'s Focus', value: 'Review and build Paco Hub pages\nExpand agent capabilities\nContent planning for streams', inline: false },
      )
      .setFooter({ text: `Full dashboard: ${LINKS.pacoHub}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [dailyEmbed] });
    return;
  }

  // ─── /report ─────────────────────────────────────────────────
  if (commandName === 'report') {
    const teamId = interaction.options.getString('team', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const org = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'org.json'), 'utf-8'));
      const registry = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'agents_registry.json'), 'utf-8'));
      const team = org.teams.find(t => t.id === teamId);
      const agentMap = {};
      for (const a of registry.agents) agentMap[a.id] = a;

      if (!team) {
        const notFoundEmbed = new EmbedBuilder()
          .setColor(COLORS.rose)
          .setDescription('Team not found.')
          .setTimestamp();
        await interaction.editReply({ embeds: [notFoundEmbed] });
        return;
      }

      const section = org.sections.find(s => s.id === team.sectionId);
      const members = team.agents.map(id => agentMap[id]?.displayName || id).join(', ');
      const lead = agentMap[team.lead]?.displayName || team.lead;

      const sectionColorMap = {
        'operations': COLORS.cyan,
        'engineering': COLORS.emerald,
        'product': COLORS.purple,
        'knowledge': COLORS.indigo,
        'growth': COLORS.amber,
        'creator': COLORS.pink,
      };
      const sectionKey = (section?.id || '').split('-')[0];
      const embedColor = sectionColorMap[sectionKey] || COLORS.cyan;

      const reportEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${team.name} Report`)
        .addFields(
          { name: 'Section', value: section?.name || team.sectionId, inline: true },
          { name: 'Lead', value: lead, inline: true },
          { name: 'Channel', value: `#${team.id}`, inline: true },
          { name: 'Members', value: members || 'None listed', inline: false },
          { name: 'Status', value: 'All agents operational', inline: false },
        )
        .setFooter({ text: 'Detailed reports available in Paco Hub -> /qa-team' })
        .setTimestamp();

      await interaction.editReply({ embeds: [reportEmbed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Error')
        .setDescription(err.message)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /support ────────────────────────────────────────────────
  if (commandName === 'support') {
    const action = interaction.options.getString('action', true);
    await interaction.deferReply({ ephemeral: action !== 'new' });

    const PACO_HUB_API = process.env.PACO_HUB_URL || LINKS.pacoHub;

    try {
      if (action === 'new') {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const priority = interaction.options.getString('priority') || 'medium';

        if (!title) {
          const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.rose)
            .setTitle('Missing Title')
            .setDescription('Please provide a title for the support ticket using the `title` option.')
            .setTimestamp();
          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        const createRes = await fetch(`${PACO_HUB_API}/api/support/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: description || '',
            priority,
            category: 'discord',
            customer: {
              name: interaction.user.displayName || interaction.user.username,
              email: `${interaction.user.id}@discord.user`,
              plan: 'community',
            },
            tags: ['discord', 'community-os'],
          }),
        });

        if (!createRes.ok) {
          throw new Error(`API error: ${createRes.status}`);
        }

        const createData = await createRes.json();
        const ticket = createData.ticket;

        const supportCh = await findTextChannelByName(guild, 'support-tickets') ||
                          await findTextChannelByName(guild, 'support') ||
                          await findTextChannelByName(guild, statusChannelName);

        const priorityColors = { critical: COLORS.rose, high: COLORS.amber, medium: COLORS.cyan, low: COLORS.indigo };
        const priorityEmoji = { critical: ':bangbang:', high: ':exclamation:', medium: ':ballot_box_with_check:', low: ':white_check_mark:' };

        const ticketEmbed = new EmbedBuilder()
          .setColor(priorityColors[priority] || COLORS.cyan)
          .setTitle(`Support Ticket: ${title}`)
          .setDescription(description || '_No description provided_')
          .addFields(
            { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
            { name: 'Priority', value: `${priorityEmoji[priority] || ':ballot_box_with_check:'} ${priority.toUpperCase()}`, inline: true },
            { name: 'Status', value: 'open', inline: true },
            { name: 'Submitted By', value: interaction.user.displayName || interaction.user.username, inline: true },
          )
          .setFooter({ text: 'CommunityOS Support | Reply in thread or use Paco Hub' })
          .setTimestamp();

        if (supportCh) {
          const msg = await supportCh.send({
            content: priority === 'critical' ? '@here New critical support ticket!' : undefined,
            embeds: [ticketEmbed],
          });

          if (msg.startThread) {
            try {
              await msg.startThread({
                name: `${ticket.id}: ${title.slice(0, 90)}`,
                autoArchiveDuration: 1440,
              });
            } catch { /* thread creation failed */ }
          }
        }

        const confirmEmbed = new EmbedBuilder()
          .setColor(COLORS.emerald)
          .setTitle('Ticket Created')
          .setDescription(`Your support ticket has been submitted.`)
          .addFields(
            { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
            { name: 'Priority', value: priority, inline: true },
            { name: 'Track', value: `[Paco Hub Support](${LINKS.pacoHub}/support-funnel)`, inline: true },
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });
        return;
      }

      if (action === 'recent' || action === 'critical') {
        const params = new URLSearchParams();
        if (action === 'critical') {
          params.set('critical', 'true');
        } else {
          params.set('status', 'open,pending,in_progress,escalated');
        }

        const res = await fetch(`${PACO_HUB_API}/api/support/tickets?${params.toString()}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        const tickets = data.tickets.slice(0, 10);

        if (tickets.length === 0) {
          const emptyEmbed = new EmbedBuilder()
            .setColor(COLORS.emerald)
            .setTitle(action === 'critical' ? 'No Critical Issues' : 'No Open Tickets')
            .setDescription(action === 'critical'
              ? 'Great news! There are no critical support issues at the moment.'
              : 'The support queue is clear.')
            .setTimestamp();
          await interaction.editReply({ embeds: [emptyEmbed] });
          return;
        }

        const priorityEmoji = { critical: ':bangbang:', high: ':exclamation:', medium: ':ballot_box_with_check:', low: ':white_check_mark:' };
        const statusEmoji = { open: ':inbox_tray:', pending: ':hourglass:', in_progress: ':arrow_forward:', escalated: ':warning:', resolved: ':white_check_mark:', closed: ':lock:' };

        const ticketLines = tickets.map(t => {
          const pEmoji = priorityEmoji[t.priority] || ':ballot_box_with_check:';
          const sEmoji = statusEmoji[t.status] || ':inbox_tray:';
          return `${pEmoji} \`${t.id}\` ${sEmoji} **${t.title.slice(0, 40)}** - ${t.customer.name}`;
        });

        const listEmbed = new EmbedBuilder()
          .setColor(action === 'critical' ? COLORS.rose : COLORS.cyan)
          .setTitle(action === 'critical' ? 'Critical Support Issues' : 'Recent Support Tickets')
          .setDescription(ticketLines.join('\n'))
          .addFields(
            { name: 'Total', value: `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`, inline: true },
            { name: 'Dashboard', value: `[Paco Hub Support](${LINKS.pacoHub}/support-funnel)`, inline: true },
          )
          .setFooter({ text: 'CommunityOS Support' })
          .setTimestamp();

        await interaction.editReply({ embeds: [listEmbed] });
        return;
      }
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Support Error')
        .setDescription(`Failed to process support request: ${err.message}`)
        .addFields({ name: 'Fallback', value: `Try [Paco Hub Support](${LINKS.pacoHub}/support-funnel)`, inline: false })
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /mod ────────────────────────────────────────────────────
  if (commandName === 'mod') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: 'Mod only.', ephemeral: true });
      return;
    }

    const action = interaction.options.getString('action', true);

    if (action === 'log') {
      const modLogCh = await findTextChannelByName(guild, 'moderation-log');
      if (modLogCh) {
        await interaction.reply({
          content: `View moderation log in <#${modLogCh.id}>`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'No #moderation-log channel found. Use /setup-org to create it.',
          ephemeral: true,
        });
      }
      return;
    }

    if (action === 'clear') {
      const count = interaction.options.getInteger('count') || 10;
      try {
        const deleted = await interaction.channel.bulkDelete(Math.min(count, 100), true);
        await interaction.reply({
          content: `Cleared ${deleted.size} messages.`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({
          content: `Could not clear messages: ${err.message}`,
          ephemeral: true,
        });
      }
      return;
    }

    if (action === 'lockdown') {
      await interaction.reply({
        content: 'Lockdown toggle requires manual intervention. Check #moderation-log for active lockdowns.',
        ephemeral: true,
      });
      return;
    }
  }

  // ─── /sync-org ──────────────────────────────────────────────────
  if (commandName === 'sync-org') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const what = interaction.options.getString('what', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const org = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'org.json'), 'utf-8'));
      const setupConfig = JSON.parse(await readFile(join(CONTROL_CENTER, 'DISCORD', 'discord-setup.json'), 'utf-8'));

      const results = { roles: null, channels: null, teams: null };

      // Dynamic import of setup functions
      const setupModule = await import('file://' + join(CONTROL_CENTER, 'DISCORD', 'setup-discord.js'));

      if (what === 'all' || what === 'roles') {
        results.roles = await setupModule.createRolesFromOrg(guild, org, setupConfig);
      }

      if (what === 'all' || what === 'channels') {
        results.channels = await setupModule.createChannelsFromOrg(guild, org, setupConfig);
      }

      if (what === 'all' || what === 'teams') {
        results.teams = await setupModule.createTeamChannels(guild, org);
      }

      const fields = [];
      if (results.roles) {
        fields.push({
          name: 'Roles',
          value: `Created: ${results.roles.created.length}, Existing: ${results.roles.existing.length}, Errors: ${results.roles.errors.length}`,
          inline: true,
        });
      }
      if (results.channels) {
        const createdCats = results.channels.categories.filter(c => c.action === 'created').length;
        const createdChs = results.channels.channels.filter(c => c.action === 'created').length;
        fields.push({
          name: 'Channels',
          value: `Categories: ${createdCats} new, Channels: ${createdChs} new`,
          inline: true,
        });
      }
      if (results.teams) {
        fields.push({
          name: 'Team Channels',
          value: `Created: ${results.teams.created.length}, Existing: ${results.teams.existing.length}`,
          inline: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.emerald)
        .setTitle('Org Sync Complete')
        .setDescription(`Synced Discord server with org.json structure.`)
        .addFields(fields)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Sync Error')
        .setDescription(`Failed to sync: ${err.message}`)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /list-agents ───────────────────────────────────────────────
  if (commandName === 'list-agents') {
    await interaction.deferReply({ ephemeral: true });

    try {
      const org = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'org.json'), 'utf-8'));
      const filter = interaction.options.getString('filter') || 'all';

      // Build agent list
      const agents = [];
      for (const team of org.teams) {
        const section = org.sections.find(s => s.id === team.sectionId);

        // Apply filter
        if (filter !== 'all') {
          const sectionMapping = {
            communityos: ['ops', 'product', 'eng', 'knowledge', 'growth', 'finance', 'data', 'automation'],
            bim: ['bim'],
            streaming: ['streaming', 'creator'],
            ops: ['ops'],
            eng: ['eng'],
            product: ['product'],
            growth: ['growth'],
          };
          const allowedSections = sectionMapping[filter] || [];
          if (!allowedSections.includes(section?.id)) continue;
        }

        for (const agentId of team.agents) {
          const isLead = team.lead === agentId;
          agents.push({
            id: agentId,
            team: team.name,
            section: section?.name || 'Unknown',
            isLead,
          });
        }
      }

      // Format output
      const agentLines = agents.slice(0, 50).map(a => {
        const leadIcon = a.isLead ? ':star:' : '';
        return `${leadIcon} **${a.id}** - ${a.team}`;
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setTitle(`Agent List (${filter})`)
        .setDescription(agentLines.join('\n') || 'No agents found.')
        .addFields(
          { name: 'Total', value: `${agents.length} agents`, inline: true },
          { name: 'Filter', value: filter, inline: true },
        )
        .setFooter({ text: 'Use /agent-info <id> for details' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Error')
        .setDescription(err.message)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /agent-info ────────────────────────────────────────────────
  if (commandName === 'agent-info') {
    const agentId = interaction.options.getString('agent-id', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      const org = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'org.json'), 'utf-8'));

      // Find agent
      let agentInfo = null;
      for (const team of org.teams) {
        if (team.agents.includes(agentId)) {
          const section = org.sections.find(s => s.id === team.sectionId);
          const skills = org.agentSkills?.[agentId] || [];
          const geminiSkills = org.agentGeminiSkills?.[agentId] || [];
          const projects = org.projects.filter(p =>
            p.teams?.includes(team.id) || p.owner === agentId
          );

          agentInfo = {
            id: agentId,
            team: team.name,
            teamId: team.id,
            section: section?.name || 'Unknown',
            sectionId: section?.id || 'unknown',
            isLead: team.lead === agentId,
            skills,
            geminiSkills,
            projects,
          };
          break;
        }
      }

      if (!agentInfo) {
        const notFoundEmbed = new EmbedBuilder()
          .setColor(COLORS.rose)
          .setDescription(`Agent "${agentId}" not found.`)
          .setTimestamp();
        await interaction.editReply({ embeds: [notFoundEmbed] });
        return;
      }

      // Try to load persona
      let persona = null;
      try {
        const personasData = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'personas_by_agent.json'), 'utf-8'));
        persona = personasData.personas[agentId];
      } catch { /* ignore */ }

      const embed = new EmbedBuilder()
        .setColor(agentInfo.isLead ? COLORS.purple : COLORS.cyan)
        .setTitle(`${persona?.displayName || agentId}${agentInfo.isLead ? ' :star:' : ''}`)
        .setDescription(persona?.tagline || `Agent in ${agentInfo.team}`);

      embed.addFields(
        { name: 'Team', value: `${agentInfo.team} (#${agentInfo.teamId})`, inline: true },
        { name: 'Section', value: agentInfo.section, inline: true },
        { name: 'Role', value: agentInfo.isLead ? 'Team Lead' : 'Agent', inline: true },
      );

      if (agentInfo.skills.length > 0) {
        embed.addFields({
          name: 'Skills',
          value: agentInfo.skills.map(s => `\`${s}\``).join(', '),
          inline: false,
        });
      }

      if (agentInfo.geminiSkills.length > 0) {
        embed.addFields({
          name: 'Gemini Skills',
          value: agentInfo.geminiSkills.map(s => `\`${s}\``).join(', '),
          inline: false,
        });
      }

      if (agentInfo.projects.length > 0) {
        const projectLines = agentInfo.projects.map(p =>
          `${p.owner === agentId ? ':bust_in_silhouette:' : ''} **${p.name}** (${p.status})`
        );
        embed.addFields({
          name: 'Projects',
          value: projectLines.join('\n'),
          inline: false,
        });
      }

      if (persona?.strengths) {
        embed.addFields({
          name: 'Strengths',
          value: persona.strengths.join(', '),
          inline: false,
        });
      }

      embed.setFooter({ text: `Agent ID: ${agentId}` });
      embed.setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Error')
        .setDescription(err.message)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /kb-sync ───────────────────────────────────────────────────
  if (commandName === 'kb-sync') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const action = interaction.options.getString('action', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      // Dynamic import of KB sync module
      const kbSyncModule = await import('file://' + join(CONTROL_CENTER, 'DISCORD', 'kb-sync.js'));

      if (action === 'full') {
        const results = await kbSyncModule.syncKBToDiscord(guild);

        const embed = new EmbedBuilder()
          .setColor(COLORS.emerald)
          .setTitle('KB Sync Complete')
          .addFields(
            { name: 'Created', value: `${results.created.length} docs`, inline: true },
            { name: 'Updated', value: `${results.updated.length} docs`, inline: true },
            { name: 'Skipped', value: `${results.skipped.length} docs`, inline: true },
            { name: 'Errors', value: `${results.errors.length}`, inline: true },
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else if (action === 'index') {
        await kbSyncModule.postKBIndex(guild);

        const embed = new EmbedBuilder()
          .setColor(COLORS.emerald)
          .setDescription('KB index posted to #kb-updates')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else if (action === 'status') {
        const state = await kbSyncModule.loadSyncState();
        const docCount = Object.keys(state.documents || {}).length;

        const embed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle('KB Sync Status')
          .addFields(
            { name: 'Last Sync', value: state.lastSync || 'Never', inline: true },
            { name: 'Synced Docs', value: `${docCount}`, inline: true },
          )
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('KB Sync Error')
        .setDescription(`Failed: ${err.message}`)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ─── /chatbot ───────────────────────────────────────────────────
  if (commandName === 'chatbot') {
    const action = interaction.options.getString('action', true);
    const targetChannel = interaction.options.getChannel('channel');
    const agentId = interaction.options.getString('agent');
    const setting = interaction.options.getString('setting');

    // Most actions require mod permissions
    const isModAction = ['enable', 'disable', 'assign', 'clear-memory', 'personality'].includes(action);
    if (isModAction && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'You need Manage Channels permission for this action.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      switch (action) {
        case 'enable': {
          const channelName = targetChannel?.name || interaction.channel.name;
          enableChannel(channelName);
          const embed = new EmbedBuilder()
            .setColor(COLORS.emerald)
            .setTitle('Chatbot Enabled')
            .setDescription(`Chatbot is now enabled in **#${channelName}**`)
            .addFields(
              { name: 'Agent', value: getChannelAgent(channelName), inline: true },
            )
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'disable': {
          const channelName = targetChannel?.name || interaction.channel.name;
          disableChannel(channelName);
          const embed = new EmbedBuilder()
            .setColor(COLORS.amber)
            .setTitle('Chatbot Disabled')
            .setDescription(`Chatbot is now disabled in **#${channelName}**`)
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'assign': {
          if (!agentId) {
            await interaction.editReply({ content: 'Please specify an agent to assign.', ephemeral: true });
            return;
          }
          const channelName = targetChannel?.name || interaction.channel.name;
          assignAgentToChannel(channelName, agentId);
          const emoji = getAgentEmoji(agentId);
          const embed = new EmbedBuilder()
            .setColor(COLORS.purple)
            .setTitle('Agent Assigned')
            .setDescription(`${emoji} **${agentId}** is now assigned to **#${channelName}**`)
            .setFooter({ text: 'This agent will respond in this channel' })
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'clear-memory': {
          const channelId = targetChannel?.id || interaction.channel.id;
          const channelName = targetChannel?.name || interaction.channel.name;
          await clearChannelMemory(channelId);
          const embed = new EmbedBuilder()
            .setColor(COLORS.amber)
            .setTitle('Memory Cleared')
            .setDescription(`Conversation memory for **#${channelName}** has been cleared.`)
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'status': {
          const status = getChatbotStatus();
          const memStats = getMemoryStats();
          const configSummary = getConfigSummary();

          const embed = new EmbedBuilder()
            .setColor(status.enabled ? COLORS.emerald : COLORS.rose)
            .setTitle('Chatbot Status')
            .addFields(
              { name: 'Status', value: status.enabled ? ':green_circle: Enabled' : ':red_circle: Disabled', inline: true },
              { name: 'Active Channels', value: `${configSummary.enabledChannelCount}`, inline: true },
              { name: 'Disabled Channels', value: `${configSummary.disabledChannelCount}`, inline: true },
              { name: 'Cached Channels', value: `${memStats.cachedChannels}`, inline: true },
              { name: 'Cached Users', value: `${memStats.cachedUsers}`, inline: true },
              { name: 'KB Context', value: configSummary.useKBContext ? 'Yes' : 'No', inline: true },
              { name: 'Respond to Questions', value: configSummary.respondToQuestions ? 'Yes' : 'No', inline: true },
              { name: 'Random Response Chance', value: `${(configSummary.randomResponseChance * 100).toFixed(0)}%`, inline: true },
              { name: 'Trigger Keywords', value: `${configSummary.triggerKeywordCount}`, inline: true },
            )
            .setFooter({ text: 'CommunityOS Chatbot System' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'personality': {
          if (!setting) {
            // Show current personality
            const personality = getPersonality();
            const embed = new EmbedBuilder()
              .setColor(COLORS.purple)
              .setTitle('Chatbot Personality')
              .addFields(
                { name: 'Humor', value: `${(personality.humor * 100).toFixed(0)}%`, inline: true },
                { name: 'Formality', value: `${(personality.formality * 100).toFixed(0)}%`, inline: true },
                { name: 'Verbosity', value: `${(personality.verbosity * 100).toFixed(0)}%`, inline: true },
                { name: 'Emoji Usage', value: `${(personality.emoji_usage * 100).toFixed(0)}%`, inline: true },
              )
              .setFooter({ text: 'Use /chatbot personality [setting] to adjust' })
              .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            break;
          }

          const personality = getPersonality();
          const STEP = 0.15;

          switch (setting) {
            case 'humor-up':
              setPersonality({ humor: Math.min(1, personality.humor + STEP) });
              break;
            case 'humor-down':
              setPersonality({ humor: Math.max(0, personality.humor - STEP) });
              break;
            case 'formal-up':
              setPersonality({ formality: Math.min(1, personality.formality + STEP) });
              break;
            case 'formal-down':
              setPersonality({ formality: Math.max(0, personality.formality - STEP) });
              break;
            case 'verbose-up':
              setPersonality({ verbosity: Math.min(1, personality.verbosity + STEP) });
              break;
            case 'verbose-down':
              setPersonality({ verbosity: Math.max(0, personality.verbosity - STEP) });
              break;
            case 'reset':
              resetChatbotConfig();
              break;
          }

          const updatedPersonality = getPersonality();
          const embed = new EmbedBuilder()
            .setColor(COLORS.emerald)
            .setTitle('Personality Updated')
            .addFields(
              { name: 'Humor', value: `${(updatedPersonality.humor * 100).toFixed(0)}%`, inline: true },
              { name: 'Formality', value: `${(updatedPersonality.formality * 100).toFixed(0)}%`, inline: true },
              { name: 'Verbosity', value: `${(updatedPersonality.verbosity * 100).toFixed(0)}%`, inline: true },
              { name: 'Emoji Usage', value: `${(updatedPersonality.emoji_usage * 100).toFixed(0)}%`, inline: true },
            )
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          break;
        }

        default:
          await interaction.editReply({ content: 'Unknown action.', ephemeral: true });
      }
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Chatbot Error')
        .setDescription(`Failed: ${err.message}`)
        .setTimestamp();
      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // KB SUBCOMMANDS
  // ═══════════════════════════════════════════════════════════════
  if (commandName === 'kb') {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply();

    try {
      // /kb search <query>
      if (subcommand === 'search') {
        const query = interaction.options.getString('query', true);
        const results = await searchKB(query, { limit: 5 });

        if (results.length === 0) {
          const noResultsEmbed = new EmbedBuilder()
            .setColor(COLORS.amber)
            .setTitle('No Results Found')
            .setDescription(`No KB documents matched: **${query}**\n\nTry different keywords or use \`/kb ask ${query}\` for AI-powered search.`)
            .setFooter({ text: 'CommunityOS Knowledge Base' })
            .setTimestamp();

          await interaction.editReply({ embeds: [noResultsEmbed] });
          return;
        }

        const resultLines = results.map((doc, i) => {
          const score = doc.score > 80 ? ':green_circle:' : doc.score > 50 ? ':yellow_circle:' : ':orange_circle:';
          return `${score} **${i + 1}. ${doc.title}**\n${doc.summary?.slice(0, 150) || 'No summary'}...\n*Section: ${doc.sectionName}*`;
        });

        const embed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle(`KB Search: "${query}"`)
          .setDescription(resultLines.join('\n\n'))
          .addFields(
            { name: 'Results', value: `${results.length} found`, inline: true },
            { name: 'Best Match', value: results[0].title, inline: true },
          )
          .setFooter({ text: 'Use /kb doc <name> to view full document' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /kb doc <name>
      if (subcommand === 'doc') {
        const name = interaction.options.getString('name', true);
        const doc = await getDocument(name);

        if (!doc) {
          const notFoundEmbed = new EmbedBuilder()
            .setColor(COLORS.rose)
            .setTitle('Document Not Found')
            .setDescription(`Could not find document: **${name}**\n\nTry \`/kb search ${name}\` to find similar documents.`)
            .setTimestamp();

          await interaction.editReply({ embeds: [notFoundEmbed] });
          return;
        }

        const content = doc.content.slice(0, 3500);
        const isTruncated = doc.content.length > 3500;

        const embed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle(doc.title)
          .setDescription(content + (isTruncated ? '\n\n*...content truncated*' : ''))
          .addFields(
            { name: 'Section', value: doc.sectionName, inline: true },
            { name: 'File', value: doc.filename, inline: true },
          )
          .setFooter({ text: `Full doc: ${doc.relativePath}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /kb list [section]
      if (subcommand === 'list') {
        const section = interaction.options.getString('section');

        if (section) {
          const docs = await listDocuments(section);

          if (docs.length === 0) {
            const emptyEmbed = new EmbedBuilder()
              .setColor(COLORS.amber)
              .setTitle(`No Documents in ${KB_SECTIONS[section]?.name || section}`)
              .setDescription('This section has no documents yet.')
              .setTimestamp();

            await interaction.editReply({ embeds: [emptyEmbed] });
            return;
          }

          const docLines = docs.slice(0, 20).map((d, i) => `**${i + 1}.** ${d.title}`);

          const embed = new EmbedBuilder()
            .setColor(COLORS.cyan)
            .setTitle(`KB: ${KB_SECTIONS[section]?.name || section}`)
            .setDescription(docLines.join('\n'))
            .addFields({ name: 'Total', value: `${docs.length} documents`, inline: true })
            .setFooter({ text: 'Use /kb doc <name> to view a document' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        } else {
          const sections = await listSections();

          const sectionLines = sections.map(s => `:file_folder: **${s.name}** - ${s.docCount} docs`);

          const embed = new EmbedBuilder()
            .setColor(COLORS.cyan)
            .setTitle('Knowledge Base Sections')
            .setDescription(sectionLines.join('\n'))
            .addFields({ name: 'Total', value: `${sections.reduce((sum, s) => sum + s.docCount, 0)} documents`, inline: true })
            .setFooter({ text: 'Use /kb list <section> to see documents in a section' })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
        }
        return;
      }

      // /kb random
      if (subcommand === 'random') {
        const doc = await getRandomDocument();

        if (!doc) {
          const emptyEmbed = new EmbedBuilder()
            .setColor(COLORS.amber)
            .setTitle('No Documents')
            .setDescription('The knowledge base is empty.')
            .setTimestamp();

          await interaction.editReply({ embeds: [emptyEmbed] });
          return;
        }

        const excerpt = doc.content.slice(0, 1000);

        const embed = new EmbedBuilder()
          .setColor(COLORS.purple)
          .setTitle(`:bulb: KB Tip: ${doc.title}`)
          .setDescription(excerpt + (doc.content.length > 1000 ? '\n\n*...read more with /kb doc*' : ''))
          .addFields(
            { name: 'Section', value: doc.sectionName, inline: true },
            { name: 'File', value: doc.name, inline: true },
          )
          .setFooter({ text: 'Random tip from the knowledge base' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /kb ask <question>
      if (subcommand === 'ask') {
        const question = interaction.options.getString('question', true);
        const result = await askKB(question);

        const embed = new EmbedBuilder()
          .setColor(result.success ? COLORS.cyan : COLORS.amber)
          .setAuthor({ name: result.agentName || 'Docs Librarian' })
          .setTitle('KB Answer')
          .setDescription(result.answer.slice(0, 4000));

        if (result.sources && result.sources.length > 0) {
          const sourceLines = result.sources.map(s => `- ${s.title} (${s.section})`);
          embed.addFields({ name: 'Sources', value: sourceLines.join('\n'), inline: false });
        }

        embed.setFooter({ text: 'AI-powered answer from Knowledge Base' });
        embed.setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('KB Error')
        .setDescription(`Error: ${err.message}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // AGENT SUBCOMMANDS (enhanced)
  // ═══════════════════════════════════════════════════════════════
  if (commandName === 'agent' && interaction.options.getSubcommand) {
    try {
      const subcommand = interaction.options.getSubcommand();
      await interaction.deferReply();

      // /agent chat <agent-id> <message>
      if (subcommand === 'chat') {
        const agentId = interaction.options.getString('agent-id', true);
        const message = interaction.options.getString('message', true);

        const result = await chatWithAgent(agentId, message, {
          userId: interaction.user.id,
          userName: interaction.user.displayName || interaction.user.username,
          channelId: interaction.channel.id,
          channelName: interaction.channel.name,
        });

        if (!result.success) {
          const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.rose)
            .setDescription(result.error || 'Agent not found')
            .setTimestamp();
          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(result.isFallback ? COLORS.amber : COLORS.cyan)
          .setAuthor({ name: result.agentName })
          .setDescription(result.response.slice(0, 4000))
          .addFields({ name: 'Team', value: result.team, inline: true })
          .setFooter({ text: result.isFallback ? 'Offline mode - limited response' : `Agent: ${result.agentId}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /agent task <agent-id> <task>
      if (subcommand === 'task') {
        const agentId = interaction.options.getString('agent-id', true);
        const task = interaction.options.getString('task', true);
        const priority = interaction.options.getString('priority') || 'medium';

        const result = await assignTask(agentId, task, {
          priority,
          userId: interaction.user.id,
          userName: interaction.user.displayName || interaction.user.username,
        });

        if (!result.success) {
          const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.rose)
            .setDescription(result.error || 'Failed to assign task')
            .setTimestamp();
          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        const priorityColors = { high: COLORS.rose, medium: COLORS.amber, low: COLORS.indigo };

        const embed = new EmbedBuilder()
          .setColor(priorityColors[priority] || COLORS.cyan)
          .setTitle('Task Assigned')
          .setDescription(result.message)
          .addFields(
            { name: 'Task ID', value: `\`${result.task.id}\``, inline: true },
            { name: 'Assigned To', value: result.agentName, inline: true },
            { name: 'Priority', value: priority.toUpperCase(), inline: true },
            { name: 'Description', value: task.slice(0, 256), inline: false },
          )
          .setFooter({ text: result.isOffline ? 'Queued offline - will process when agent available' : 'Task submitted to agent' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /agent status
      if (subcommand === 'status') {
        const status = await getAgentStatus();

        const teamLines = Object.entries(status.byTeam).slice(0, 10).map(([team, agents]) => {
          const agentList = agents.slice(0, 5).map(a => {
            const icon = a.isLead ? ':star:' : ':small_blue_diamond:';
            return `${icon} ${a.name}`;
          }).join(', ');
          return `**${team}** (${agents.length})\n${agentList}`;
        });

        const embed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle('Agent Status')
          .setDescription(teamLines.join('\n\n'))
          .addFields(
            { name: 'Total Agents', value: `${status.totalAgents}`, inline: true },
            { name: 'Teams', value: `${status.teams}`, inline: true },
            { name: 'Status', value: ':green_circle: All Online', inline: true },
          )
          .setFooter({ text: 'Use /agent chat <id> to interact with an agent' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /agent summon <agent-id>
      if (subcommand === 'summon') {
        const agentId = interaction.options.getString('agent-id', true);
        const result = await summonAgent(agentId);

        if (!result.success) {
          const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.rose)
            .setDescription(result.error || 'Agent not found')
            .setTimestamp();
          await interaction.editReply({ embeds: [errorEmbed] });
          return;
        }

        const agent = result.agent;
        const embed = new EmbedBuilder()
          .setColor(COLORS.purple)
          .setTitle(`:robot: ${agent.displayName} has been summoned!`)
          .setDescription(`*"${agent.tagline}"*\n\n${agent.introduction}`)
          .addFields(
            { name: 'Team', value: agent.team, inline: true },
            { name: 'Section', value: agent.section, inline: true },
          );

        if (agent.skills.length > 0) {
          embed.addFields({ name: 'Skills', value: agent.skills.slice(0, 5).map(s => `\`${s}\``).join(', '), inline: false });
        }

        if (agent.strengths.length > 0) {
          embed.addFields({ name: 'Strengths', value: agent.strengths.slice(0, 3).join(', '), inline: false });
        }

        embed.setFooter({ text: `Use /agent chat ${agentId} <message> to talk to me!` });
        embed.setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // /agent info <agent-id>
      if (subcommand === 'info') {
        const agentId = interaction.options.getString('agent-id', true);
        const agent = await getAgent(agentId);

        if (!agent) {
          const notFoundEmbed = new EmbedBuilder()
            .setColor(COLORS.rose)
            .setDescription(`Agent "${agentId}" not found.`)
            .setTimestamp();
          await interaction.editReply({ embeds: [notFoundEmbed] });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(agent.isLead ? COLORS.purple : COLORS.cyan)
          .setTitle(`${agent.displayName}${agent.isLead ? ' :star:' : ''}`)
          .setDescription(agent.tagline || `Agent in ${agent.team}`)
          .addFields(
            { name: 'Team', value: agent.team, inline: true },
            { name: 'Section', value: agent.section, inline: true },
            { name: 'Role', value: agent.isLead ? 'Team Lead' : 'Agent', inline: true },
          );

        if (agent.skills.length > 0) {
          embed.addFields({ name: 'Skills', value: agent.skills.map(s => `\`${s}\``).join(', '), inline: false });
        }

        if (agent.strengths.length > 0) {
          embed.addFields({ name: 'Strengths', value: agent.strengths.join(', '), inline: false });
        }

        if (agent.nowDoingDefault) {
          embed.addFields({ name: 'Currently', value: agent.nowDoingDefault, inline: false });
        }

        embed.setFooter({ text: `Agent ID: ${agent.id}` });
        embed.setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err) {
      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle('Agent Error')
        .setDescription(`Error: ${err.message}`)
        .setTimestamp();

      await interaction.editReply({ embeds: [errEmbed] });
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROJECT COMMANDS
  // ═══════════════════════════════════════════════════════════════
  if (commandName === 'project') {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      const org = JSON.parse(await readFile(join(CONTROL_CENTER, 'ORG', 'org.json'), 'utf-8'));

      if (subcommand === 'list') {
        const statusIcons = { active: ':green_circle:', building: ':yellow_circle:', planning: ':orange_circle:', standby: ':white_circle:' };
        const projectLines = org.projects.map(p => {
          const icon = statusIcons[p.status] || ':white_circle:';
          return `${icon} **${p.name}** - ${p.status}\n${p.description?.slice(0, 80) || 'No description'}`;
        });

        const embed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle('Projects')
          .setDescription(projectLines.join('\n\n'))
          .addFields({ name: 'Total', value: `${org.projects.length} projects`, inline: true })
          .setFooter({ text: 'Use /project status <name> for details' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'status') {
        const name = interaction.options.getString('name', true);
        const project = org.projects.find(p => p.id === name);

        if (!project) {
          await interaction.editReply({ content: `Project "${name}" not found.` });
          return;
        }

        const statusColors = { active: COLORS.emerald, building: COLORS.amber, planning: COLORS.purple, standby: COLORS.darkGray };
        const embed = new EmbedBuilder()
          .setColor(statusColors[project.status] || COLORS.cyan)
          .setTitle(project.name)
          .setDescription(project.description || 'No description')
          .addFields(
            { name: 'Status', value: project.status.toUpperCase(), inline: true },
            { name: 'Owner', value: project.owner || 'Unassigned', inline: true },
          );

        if (project.teams?.length > 0) embed.addFields({ name: 'Teams', value: project.teams.join(', '), inline: false });
        if (project.ports?.length > 0) embed.addFields({ name: 'Ports', value: project.ports.join(', '), inline: true });
        if (project.repo) embed.addFields({ name: 'Repo', value: `\`${project.repo}\``, inline: false });

        embed.setFooter({ text: `Project ID: ${project.id}` }).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === 'build' || subcommand === 'deploy') {
        const name = interaction.options.getString('name', true);
        const environment = interaction.options.getString('environment') || 'dev';

        const embed = new EmbedBuilder()
          .setColor(subcommand === 'build' ? COLORS.amber : COLORS.purple)
          .setTitle(subcommand === 'build' ? 'Build Triggered' : 'Deployment Triggered')
          .setDescription(`${subcommand === 'build' ? 'Build' : 'Deployment'} request for **${name}**${subcommand === 'deploy' ? ` to **${environment}**` : ''} has been queued.`)
          .addFields(
            { name: 'Project', value: name, inline: true },
            { name: 'Requested By', value: interaction.user.displayName || interaction.user.username, inline: true },
          )
          .setFooter({ text: 'Check #build-swarm for updates' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        const buildCh = await findTextChannelByName(guild, 'build-swarm');
        if (buildCh) {
          const logEmbed = new EmbedBuilder()
            .setColor(subcommand === 'build' ? COLORS.amber : COLORS.purple)
            .setTitle(subcommand === 'build' ? ':hammer: Build Request' : ':rocket: Deployment Request')
            .setDescription(`**${name}** ${subcommand} requested by ${interaction.user.displayName || interaction.user.username}`)
            .setTimestamp();
          await buildCh.send({ embeds: [logEmbed] });
        }
        return;
      }
    } catch (err) {
      await interaction.editReply({ content: `Error: ${err.message}` });
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY COMMANDS
  // ═══════════════════════════════════════════════════════════════

  // /remind <time> <message>
  if (commandName === 'remind') {
    const timeStr = interaction.options.getString('time', true);
    const message = interaction.options.getString('message', true);

    const timeMatch = timeStr.match(/^(\d+)(m|h|d)$/i);
    if (!timeMatch) {
      await interaction.reply({ content: 'Invalid time format. Use format like "30m", "2h", or "1d".', ephemeral: true });
      return;
    }

    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    let ms;
    switch (unit) {
      case 'm': ms = value * 60 * 1000; break;
      case 'h': ms = value * 60 * 60 * 1000; break;
      case 'd': ms = value * 24 * 60 * 60 * 1000; break;
      default: ms = value * 60 * 1000;
    }

    if (ms > 7 * 24 * 60 * 60 * 1000) {
      await interaction.reply({ content: 'Reminder cannot be more than 7 days.', ephemeral: true });
      return;
    }

    const reminderTime = new Date(Date.now() + ms);
    setTimeout(async () => {
      try {
        await interaction.user.send({
          embeds: [new EmbedBuilder().setColor(COLORS.amber).setTitle(':bell: Reminder!').setDescription(message).setTimestamp()],
        });
      } catch {
        const channel = await client.channels.fetch(interaction.channelId).catch(() => null);
        if (channel) {
          await channel.send({ content: `<@${interaction.user.id}>`, embeds: [new EmbedBuilder().setColor(COLORS.amber).setTitle(':bell: Reminder!').setDescription(message).setTimestamp()] });
        }
      }
    }, ms);

    const embed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setTitle(':bell: Reminder Set')
      .setDescription(`I'll remind you: **${message}**`)
      .addFields({ name: 'When', value: `<t:${Math.floor(reminderTime.getTime() / 1000)}:R>`, inline: true })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // /note <text>
  if (commandName === 'note') {
    const text = interaction.options.getString('text', true);
    const tags = interaction.options.getString('tags');

    const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const note = { id: noteId, userId: interaction.user.id, userName: interaction.user.displayName || interaction.user.username, text, tags: tags ? tags.split(',').map(t => t.trim()) : [], createdAt: new Date().toISOString(), source: 'discord' };

    const notesFile = join(CONTROL_CENTER, 'MEMORY', 'discord_notes.jsonl');
    const notesDir = dirname(notesFile);
    if (!existsSync(notesDir)) await mkdir(notesDir, { recursive: true });
    await writeFile(notesFile, JSON.stringify(note) + '\n', { flag: 'a' });

    const embed = new EmbedBuilder().setColor(COLORS.emerald).setTitle(':memo: Note Saved').setDescription(text.slice(0, 500)).addFields({ name: 'Note ID', value: `\`${noteId}\``, inline: true });
    if (note.tags.length > 0) embed.addFields({ name: 'Tags', value: note.tags.map(t => `\`${t}\``).join(', '), inline: true });
    embed.setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  // /notes [filter]
  if (commandName === 'notes') {
    const filter = interaction.options.getString('filter');
    await interaction.deferReply({ ephemeral: true });

    const notesFile = join(CONTROL_CENTER, 'MEMORY', 'discord_notes.jsonl');
    if (!existsSync(notesFile)) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.amber).setTitle('No Notes').setDescription('You have no saved notes. Use `/note <text>` to save one.').setTimestamp()] });
      return;
    }

    const content = await readFile(notesFile, 'utf-8');
    let notes = content.trim().split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(n => n && n.userId === interaction.user.id);

    if (filter) {
      const filterLower = filter.toLowerCase();
      notes = notes.filter(n => n.text.toLowerCase().includes(filterLower) || n.tags.some(t => t.toLowerCase().includes(filterLower)));
    }

    if (notes.length === 0) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.amber).setTitle('No Notes Found').setDescription(filter ? `No notes matching: **${filter}**` : 'You have no saved notes.').setTimestamp()] });
      return;
    }

    const noteLines = notes.slice(-10).reverse().map((n, i) => `**${i + 1}.** ${n.text.slice(0, 100)}${n.text.length > 100 ? '...' : ''}\n*${new Date(n.createdAt).toLocaleDateString()}*`);
    const embed = new EmbedBuilder().setColor(COLORS.cyan).setTitle(':memo: Your Notes').setDescription(noteLines.join('\n\n')).addFields({ name: 'Total', value: `${notes.length} notes`, inline: true }).setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // /todo
  if (commandName === 'todo') {
    const subcommand = interaction.options.getSubcommand();
    const todosFile = join(CONTROL_CENTER, 'MEMORY', 'discord_todos.jsonl');
    const todosDir = dirname(todosFile);
    if (!existsSync(todosDir)) await mkdir(todosDir, { recursive: true });

    if (subcommand === 'add') {
      const task = interaction.options.getString('task', true);
      const priority = interaction.options.getString('priority') || 'medium';
      const todoId = `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const todo = { id: todoId, userId: interaction.user.id, task, priority, completed: false, createdAt: new Date().toISOString() };
      await writeFile(todosFile, JSON.stringify(todo) + '\n', { flag: 'a' });

      const priorityColors = { high: COLORS.rose, medium: COLORS.amber, low: COLORS.indigo };
      const embed = new EmbedBuilder().setColor(priorityColors[priority] || COLORS.cyan).setTitle(':white_check_mark: Todo Added').setDescription(task).addFields({ name: 'ID', value: `\`${todoId}\``, inline: true }, { name: 'Priority', value: priority.toUpperCase(), inline: true }).setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (subcommand === 'list') {
      await interaction.deferReply({ ephemeral: true });
      if (!existsSync(todosFile)) {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.emerald).setTitle(':clipboard: All Done!').setDescription('You have no todos.').setTimestamp()] });
        return;
      }
      const content = await readFile(todosFile, 'utf-8');
      const todos = content.trim().split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(t => t && t.userId === interaction.user.id && !t.completed);

      if (todos.length === 0) {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.emerald).setTitle(':clipboard: All Done!').setDescription('You have no open todos.').setTimestamp()] });
        return;
      }

      const priorityEmoji = { high: ':red_circle:', medium: ':yellow_circle:', low: ':white_circle:' };
      const todoLines = todos.slice(0, 15).map((t, i) => `${priorityEmoji[t.priority] || ':white_circle:'} **${i + 1}.** ${t.task.slice(0, 80)}\n*ID: \`${t.id}\`*`);
      const embed = new EmbedBuilder().setColor(COLORS.cyan).setTitle(':clipboard: Your Todos').setDescription(todoLines.join('\n\n')).addFields({ name: 'Open', value: `${todos.length} todos`, inline: true }).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'done') {
      const id = interaction.options.getString('id', true);
      await interaction.deferReply({ ephemeral: true });

      if (!existsSync(todosFile)) {
        await interaction.editReply({ content: 'Todo not found.' });
        return;
      }

      const content = await readFile(todosFile, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      let found = false;
      const updatedLines = lines.map(line => {
        try {
          const todo = JSON.parse(line);
          if (todo.id === id && todo.userId === interaction.user.id) {
            todo.completed = true;
            todo.completedAt = new Date().toISOString();
            found = true;
          }
          return JSON.stringify(todo);
        } catch { return line; }
      });

      if (!found) {
        await interaction.editReply({ content: `Todo \`${id}\` not found.` });
        return;
      }

      await writeFile(todosFile, updatedLines.join('\n') + '\n');
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.emerald).setTitle(':tada: Todo Completed!').setDescription(`Marked \`${id}\` as done.`).setTimestamp()] });
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FUN COMMANDS
  // ═══════════════════════════════════════════════════════════════

  if (commandName === '8ball') {
    const question = interaction.options.getString('question', true);
    const responses = ['It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes - definitely.', 'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.', "Don't count on it.", 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'];
    const response = responses[Math.floor(Math.random() * responses.length)];
    const embed = new EmbedBuilder().setColor(COLORS.purple).setTitle(':8ball: Magic 8 Ball').addFields({ name: 'Question', value: question, inline: false }, { name: 'Answer', value: `**${response}**`, inline: false }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'quote') {
    const quotes = [
      { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
      { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
      { text: "Code is like humor. When you have to explain it, it's bad.", author: 'Cory House' },
      { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
      { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
      { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const embed = new EmbedBuilder().setColor(COLORS.indigo).setTitle(':bulb: Quote of the Moment').setDescription(`*"${quote.text}"*`).setFooter({ text: `- ${quote.author}` }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'fact') {
    const facts = ['The first computer bug was an actual bug - a moth found in a Harvard Mark II computer in 1947.', 'The first 1GB hard drive was announced in 1980 and weighed about 550 pounds.', 'The QWERTY keyboard was designed to slow typists down to prevent typewriter jams.', 'Email is older than the World Wide Web.', 'The first webcam was created at Cambridge University to monitor a coffee pot.'];
    const fact = facts[Math.floor(Math.random() * facts.length)];
    const embed = new EmbedBuilder().setColor(COLORS.cyan).setTitle(':brain: Tech Fact').setDescription(fact).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'meme') {
    const topic = interaction.options.getString('topic') || 'coding';
    const memeTemplates = {
      coding: [{ top: 'Me: This code is perfect', bottom: 'Compiler: 47 errors' }, { top: 'Works on my machine', bottom: '*Deploys to production*' }, { top: 'Just one small change', bottom: '500 files modified' }],
      ai: [{ top: 'AI will replace programmers', bottom: 'AI: *generates hello world incorrectly*' }, { top: 'Me: Write me a simple script', bottom: 'ChatGPT: *writes entire operating system*' }],
      general: [{ top: "It's not a bug", bottom: "It's a feature" }, { top: "I'll fix it tomorrow", bottom: 'Tomorrow never comes' }],
    };
    const topicMemes = memeTemplates[topic] || memeTemplates.general;
    const meme = topicMemes[Math.floor(Math.random() * topicMemes.length)];
    const embed = new EmbedBuilder().setColor(COLORS.amber).setTitle(':joy: Meme Generator').setDescription(`**${meme.top}**\n\n${meme.bottom}`).setFooter({ text: `Topic: ${topic}` }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'fortune') {
    const fortunes = ['Your code will compile on the first try today.', 'Today is a good day to ship something.', 'Your hard work will soon pay off.', 'The bug you\'ve been hunting is in the last place you\'d look.', 'Good things come to those who commit often.', 'Trust your instincts - except when picking variable names.'];
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    const luckyNumber = Math.floor(Math.random() * 100);
    const embed = new EmbedBuilder().setColor(COLORS.purple).setTitle(':crystal_ball: Your Fortune').setDescription(`*${fortune}*`).addFields({ name: 'Lucky Number', value: `${luckyNumber}`, inline: true }, { name: 'Lucky Language', value: ['JavaScript', 'Python', 'Rust', 'Go', 'TypeScript'][Math.floor(Math.random() * 5)], inline: true }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // MODERATION COMMANDS
  // ═══════════════════════════════════════════════════════════════

  if (commandName === 'warn') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: 'You need Moderate Members permission.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    const modLogFile = join(CONTROL_CENTER, 'MEMORY', 'discord_modlog.jsonl');
    if (!existsSync(dirname(modLogFile))) await mkdir(dirname(modLogFile), { recursive: true });
    await writeFile(modLogFile, JSON.stringify({ type: 'warning', userId: targetUser.id, reason, moderatorId: interaction.user.id, timestamp: new Date().toISOString() }) + '\n', { flag: 'a' });

    try { await targetUser.send({ embeds: [new EmbedBuilder().setColor(COLORS.amber).setTitle(':warning: Warning').setDescription(`You have been warned in **${guild.name}**`).addFields({ name: 'Reason', value: reason }).setTimestamp()] }); } catch { }

    const modLogCh = await findTextChannelByName(guild, 'moderation-log');
    if (modLogCh) await modLogCh.send({ embeds: [new EmbedBuilder().setColor(COLORS.amber).setTitle(':warning: Warning Issued').addFields({ name: 'User', value: `<@${targetUser.id}>`, inline: true }, { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true }, { name: 'Reason', value: reason }).setTimestamp()] });

    await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.emerald).setTitle('Warning Issued').setDescription(`Warned <@${targetUser.id}> for: ${reason}`).setTimestamp()], ephemeral: true });
    return;
  }

  if (commandName === 'timeout') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: 'You need Moderate Members permission.', ephemeral: true });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const durationStr = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const durationMatch = durationStr.match(/^(\d+)(m|h|d)$/i);
    if (!durationMatch) {
      await interaction.reply({ content: 'Invalid duration. Use format like "10m", "1h", or "1d".', ephemeral: true });
      return;
    }

    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    let ms;
    switch (unit) {
      case 'm': ms = value * 60 * 1000; break;
      case 'h': ms = value * 60 * 60 * 1000; break;
      case 'd': ms = value * 24 * 60 * 60 * 1000; break;
    }

    if (ms > 28 * 24 * 60 * 60 * 1000) {
      await interaction.reply({ content: 'Timeout cannot exceed 28 days.', ephemeral: true });
      return;
    }

    try {
      const member = await guild.members.fetch(targetUser.id);
      await member.timeout(ms, reason);

      const modLogCh = await findTextChannelByName(guild, 'moderation-log');
      if (modLogCh) await modLogCh.send({ embeds: [new EmbedBuilder().setColor(COLORS.rose).setTitle(':mute: Timeout Applied').addFields({ name: 'User', value: `<@${targetUser.id}>`, inline: true }, { name: 'Duration', value: durationStr, inline: true }, { name: 'Reason', value: reason }).setTimestamp()] });

      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.emerald).setTitle('Timeout Applied').setDescription(`Timed out <@${targetUser.id}> for ${durationStr}`).addFields({ name: 'Reason', value: reason }).setTimestamp()], ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `Failed to timeout user: ${err.message}`, ephemeral: true });
    }
    return;
  }

  if (commandName === 'clear') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: 'You need Manage Messages permission.', ephemeral: true });
      return;
    }

    const count = interaction.options.getInteger('count', true);
    const targetUser = interaction.options.getUser('user');

    if (count < 1 || count > 100) {
      await interaction.reply({ content: 'Count must be between 1 and 100.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      let deleted;
      if (targetUser) {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const userMessages = messages.filter(m => m.author.id === targetUser.id).first(count);
        deleted = await interaction.channel.bulkDelete(userMessages, true);
      } else {
        deleted = await interaction.channel.bulkDelete(count, true);
      }

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.emerald).setTitle(':broom: Messages Cleared').setDescription(`Deleted ${deleted.size} messages${targetUser ? ` from <@${targetUser.id}>` : ''}`).setTimestamp()] });

      const modLogCh = await findTextChannelByName(guild, 'moderation-log');
      if (modLogCh) await modLogCh.send({ embeds: [new EmbedBuilder().setColor(COLORS.indigo).setTitle(':broom: Messages Purged').addFields({ name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true }, { name: 'Count', value: `${deleted.size}`, inline: true }, { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true }).setTimestamp()] });
    } catch (err) {
      await interaction.editReply({ content: `Failed to clear messages: ${err.message}` });
    }
    return;
  }

  if (commandName === 'slowmode') {
    if (!guild) { await interaction.reply({ content: 'Server only.', ephemeral: true }); return; }
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: 'You need Manage Channels permission.', ephemeral: true });
      return;
    }

    const seconds = interaction.options.getInteger('seconds', true);
    if (seconds < 0 || seconds > 21600) {
      await interaction.reply({ content: 'Slowmode must be between 0 and 21600 seconds (6 hours).', ephemeral: true });
      return;
    }

    try {
      await interaction.channel.setRateLimitPerUser(seconds);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(seconds > 0 ? COLORS.amber : COLORS.emerald).setTitle(seconds > 0 ? ':hourglass: Slowmode Enabled' : ':hourglass: Slowmode Disabled').setDescription(seconds > 0 ? `Users can now send one message every ${seconds} seconds.` : 'Slowmode has been disabled.').setTimestamp()] });
    } catch (err) {
      await interaction.reply({ content: `Failed to set slowmode: ${err.message}`, ephemeral: true });
    }
    return;
  }

  // /trivia and /poll
  if (commandName === 'trivia') {
    const category = interaction.options.getString('category') || 'tech';
    const triviaQuestions = {
      tech: [{ q: 'What does CPU stand for?', a: 'Central Processing Unit', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit', 'Central Protocol Unit'] }],
      ai: [{ q: 'What company created ChatGPT?', a: 'OpenAI', options: ['Google', 'OpenAI', 'Microsoft', 'Meta'] }],
      general: [{ q: 'What is the smallest country in the world?', a: 'Vatican City', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'] }],
    };
    const questions = triviaQuestions[category] || triviaQuestions.tech;
    const question = questions[Math.floor(Math.random() * questions.length)];
    const shuffled = [...question.options].sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(question.a);
    const optionEmojis = [':one:', ':two:', ':three:', ':four:'];
    const optionLines = shuffled.map((opt, i) => `${optionEmojis[i]} ${opt}`);
    const embed = new EmbedBuilder().setColor(COLORS.indigo).setTitle(':brain: Trivia Time!').setDescription(`**${question.q}**\n\n${optionLines.join('\n')}`).addFields({ name: 'Category', value: category, inline: true }).setFooter({ text: `Answer with the number (1-4) | Correct: ${correctIndex + 1}` }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'poll') {
    const question = interaction.options.getString('question', true);
    const optionsStr = interaction.options.getString('options', true);
    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);

    if (options.length < 2 || options.length > 10) {
      await interaction.reply({ content: 'Please provide 2-10 options, separated by commas.', ephemeral: true });
      return;
    }

    const numberEmojis = ['1\u20e3', '2\u20e3', '3\u20e3', '4\u20e3', '5\u20e3', '6\u20e3', '7\u20e3', '8\u20e3', '9\u20e3', '\ud83d\udd1f'];
    const optionLines = options.map((opt, i) => `${numberEmojis[i]} ${opt}`);
    const embed = new EmbedBuilder().setColor(COLORS.purple).setTitle(':bar_chart: Poll').setDescription(`**${question}**\n\n${optionLines.join('\n')}`).addFields({ name: 'Created by', value: interaction.user.displayName || interaction.user.username, inline: true }).setFooter({ text: 'React with the number to vote!' }).setTimestamp();
    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i++) await msg.react(numberEmojis[i]);
    return;
  }
});

// ─── Graceful Shutdown ─────────────────────────────────────────
async function shutdown() {
  console.log('Shutting down gracefully...');

  // Save pending memory if needed
  try {
    const { saveAllMemory } = await import('./chatbot/conversation-memory.js');
    if (typeof saveAllMemory === 'function') {
      await saveAllMemory();
      console.log('Memory saved successfully');
    }
  } catch (err) {
    console.warn('Could not save memory on shutdown:', err.message);
  }

  // Destroy Discord client
  client.destroy();
  console.log('Client destroyed, exiting...');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

client.login(token);
