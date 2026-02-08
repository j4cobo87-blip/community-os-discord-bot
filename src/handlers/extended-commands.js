// CommunityOS Discord Bot - Extended Command Handlers
// Handles all new commands from the extended command set

import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { COLORS, LINKS } from '../config/constants.js';
import { findTextChannelByName } from '../modules/channels.js';
import { logModerationAction } from '../modules/moderation.js';

// Game imports
import {
  startTriviaGame,
  handleTriviaAnswer,
  startWordScramble,
  getWordScrambleHint,
  startHangman,
  startRPS,
  handleRPSChoice,
  startNumberGuess,
  startQuizCompetition,
  getGameLeaderboard,
  createLeaderboardEmbed,
  forceEndTrivia,
  forceEndWordGames,
  forceEndQuickGames,
} from '../games/index.js';

// Paco Hub imports
import {
  linkProfile,
  getLinkedProfile,
  unlinkProfile,
  createProfileEmbed,
  createAgentStatusEmbed,
  createCommunityLinksEmbed,
  createCommunityStatsEmbed,
  createActivityLeaderboardEmbed,
  updateProfileStats,
} from '../modules/paco-hub.js';

// Interaction imports
import {
  showSuggestionModal,
  showReportModal,
  showPollModal,
} from '../modules/interactions.js';

/**
 * Handle extended slash commands
 */
export async function handleExtendedCommand(interaction) {
  const { commandName, guild } = interaction;

  // ═══════════════════════════════════════════════════════════════════════
  // STATS COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'stats') {
    const type = interaction.options.getString('type') || 'community';
    await interaction.deferReply();

    try {
      if (type === 'community' || type === 'server') {
        const embed = await createCommunityStatsEmbed();

        if (type === 'server' && guild) {
          embed.addFields(
            { name: 'Server Members', value: `${guild.memberCount}`, inline: true },
            { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
            { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
          );
        }

        await interaction.editReply({ embeds: [embed] });
      } else if (type === 'personal') {
        const embed = await createProfileEmbed(interaction.user, interaction.member);
        await interaction.editReply({ embeds: [embed] });
      } else if (type === 'agents') {
        const embed = await createAgentStatusEmbed();
        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      await interaction.editReply({ content: `Error: ${err.message}` });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEADERBOARD COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'leaderboard') {
    const type = interaction.options.getString('type') || 'activity';
    const limit = interaction.options.getInteger('limit') || 10;
    await interaction.deferReply();

    try {
      let embed;
      if (type === 'activity') {
        embed = await createActivityLeaderboardEmbed(limit);
      } else if (type === 'games') {
        embed = await createLeaderboardEmbed('all', limit);
      } else {
        embed = await createLeaderboardEmbed(type, limit);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${err.message}` });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROFILE COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'profile') {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = guild ? await guild.members.fetch(targetUser.id).catch(() => null) : null;

    await interaction.deferReply();

    try {
      const embed = await createProfileEmbed(targetUser, member);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${err.message}` });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GAME COMMANDS
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'trivia') {
    const category = interaction.options.getString('category') || 'tech';
    const rounds = Math.min(10, Math.max(1, interaction.options.getInteger('rounds') || 5));
    await startTriviaGame(interaction, category, rounds);
    await updateProfileStats(interaction.user.id, { commandsUsed: 1, gamesPlayed: 1 });
    return true;
  }

  if (commandName === 'wordscramble') {
    const category = interaction.options.getString('category') || 'tech';
    const difficulty = interaction.options.getString('difficulty') || 'medium';
    await startWordScramble(interaction, category, difficulty);
    await updateProfileStats(interaction.user.id, { commandsUsed: 1, gamesPlayed: 1 });
    return true;
  }

  if (commandName === 'hangman') {
    const category = interaction.options.getString('category') || 'tech';
    await startHangman(interaction, category);
    await updateProfileStats(interaction.user.id, { commandsUsed: 1, gamesPlayed: 1 });
    return true;
  }

  if (commandName === 'rps') {
    const opponent = interaction.options.getUser('opponent');
    const extended = interaction.options.getBoolean('extended') || false;
    await startRPS(interaction, opponent, extended);
    await updateProfileStats(interaction.user.id, { commandsUsed: 1, gamesPlayed: 1 });
    return true;
  }

  if (commandName === 'numberguess') {
    const max = Math.min(1000, Math.max(10, interaction.options.getInteger('max') || 100));
    const attempts = Math.min(20, Math.max(3, interaction.options.getInteger('attempts') || 7));
    await startNumberGuess(interaction, max, attempts);
    await updateProfileStats(interaction.user.id, { commandsUsed: 1, gamesPlayed: 1 });
    return true;
  }

  if (commandName === 'quiz') {
    const rounds = Math.min(10, Math.max(1, interaction.options.getInteger('rounds') || 5));
    await startQuizCompetition(interaction, rounds);
    await updateProfileStats(interaction.user.id, { commandsUsed: 1, gamesPlayed: 1 });
    return true;
  }

  if (commandName === 'hint') {
    await getWordScrambleHint(interaction);
    return true;
  }

  if (commandName === 'endgame') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: 'You need Manage Messages permission.', ephemeral: true });
      return true;
    }

    const channelId = interaction.channel.id;
    const endedTrivia = forceEndTrivia(channelId);
    const endedWord = forceEndWordGames(channelId);
    const endedQuick = forceEndQuickGames(channelId);

    if (endedTrivia || endedWord || endedQuick) {
      await interaction.reply({ content: ':stop_sign: Game ended by moderator.', ephemeral: false });
    } else {
      await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUGGESTION COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'suggest') {
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const category = interaction.options.getString('category') || 'feature';

    const embed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle(`:bulb: ${title}`)
      .setDescription(description)
      .addFields(
        { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
        { name: 'Submitted By', value: interaction.user.displayName || interaction.user.username, inline: true },
      )
      .setFooter({ text: 'React to show your support!' })
      .setTimestamp();

    // Find suggestion channel
    const suggestionCh = await findTextChannelByName(guild, 'suggestions') ||
                         await findTextChannelByName(guild, 'feature-requests') ||
                         await findTextChannelByName(guild, 'content-ideas');

    if (suggestionCh) {
      const msg = await suggestionCh.send({ embeds: [embed] });
      await msg.react(':thumbsup:');
      await msg.react(':thumbsdown:');

      await interaction.reply({
        content: `:white_check_mark: Suggestion posted to ${suggestionCh}!`,
        ephemeral: true,
      });

      await updateProfileStats(interaction.user.id, { commandsUsed: 1, ideasSubmitted: 1 });
    } else {
      await interaction.reply({
        content: ':x: Could not find a suggestion channel.',
        ephemeral: true,
      });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REPORT COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'report') {
    const type = interaction.options.getString('type', true);
    const description = interaction.options.getString('description', true);
    const evidence = interaction.options.getString('evidence') || 'None provided';

    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle(':warning: New Report')
      .setDescription(description)
      .addFields(
        { name: 'Type', value: type, inline: true },
        { name: 'Reporter', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Channel', value: `<#${interaction.channel.id}>`, inline: true },
        { name: 'Evidence', value: evidence.slice(0, 500), inline: false },
      )
      .setTimestamp();

    const modLogCh = await findTextChannelByName(guild, 'moderation-log');
    if (modLogCh) {
      await modLogCh.send({ embeds: [embed] });
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.emerald)
          .setTitle(':white_check_mark: Report Submitted')
          .setDescription('Thank you for your report. Our moderation team will review it.')
          .setTimestamp(),
      ],
    });
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN COMMANDS
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'admin') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return true;
    }

    const subcommand = interaction.options.getSubcommand();

    // /admin stats
    if (subcommand === 'stats') {
      await interaction.deferReply({ ephemeral: true });

      const memberCount = guild.memberCount;
      const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
      const channelCount = guild.channels.cache.size;
      const roleCount = guild.roles.cache.size;
      const boostLevel = guild.premiumTier;
      const boostCount = guild.premiumSubscriptionCount;

      const embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setTitle(':bar_chart: Server Analytics')
        .addFields(
          { name: 'Members', value: `${memberCount} total`, inline: true },
          { name: 'Online', value: `${onlineCount}`, inline: true },
          { name: 'Channels', value: `${channelCount}`, inline: true },
          { name: 'Roles', value: `${roleCount}`, inline: true },
          { name: 'Boost Level', value: `${boostLevel}`, inline: true },
          { name: 'Boosts', value: `${boostCount}`, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return true;
    }

    // /admin announce
    if (subcommand === 'announce') {
      const channel = interaction.options.getChannel('channel', true);
      const message = interaction.options.getString('message', true);
      const mention = interaction.options.getString('mention') || 'none';

      const embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setTitle(':mega: Announcement')
        .setDescription(message)
        .setFooter({ text: `Announced by ${interaction.user.displayName || interaction.user.username}` })
        .setTimestamp();

      let content;
      if (mention === 'here') content = '@here';
      else if (mention === 'everyone') content = '@everyone';

      try {
        await channel.send({ content, embeds: [embed] });
        await interaction.reply({ content: `:white_check_mark: Announcement sent to ${channel}!`, ephemeral: true });
      } catch (err) {
        await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
      }
      return true;
    }

    // /admin role
    if (subcommand === 'role') {
      const action = interaction.options.getString('action', true);
      const targetUser = interaction.options.getUser('user', true);
      const role = interaction.options.getRole('role', true);

      try {
        const member = await guild.members.fetch(targetUser.id);

        if (action === 'add') {
          await member.roles.add(role);
          await interaction.reply({
            content: `:white_check_mark: Added **${role.name}** to ${targetUser}`,
            ephemeral: true,
          });
        } else {
          await member.roles.remove(role);
          await interaction.reply({
            content: `:white_check_mark: Removed **${role.name}** from ${targetUser}`,
            ephemeral: true,
          });
        }

        await logModerationAction(guild, {
          type: action === 'add' ? 'role_add' : 'role_remove',
          user: `${targetUser.tag} (${targetUser.id})`,
          reason: `Role: ${role.name}`,
          moderator: interaction.user.tag,
        });
      } catch (err) {
        await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
      }
      return true;
    }

    // /admin warn
    if (subcommand === 'warn') {
      const targetUser = interaction.options.getUser('user', true);
      const reason = interaction.options.getString('reason', true);

      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.amber)
              .setTitle(':warning: Warning')
              .setDescription(`You have been warned in **${guild.name}**`)
              .addFields({ name: 'Reason', value: reason })
              .setTimestamp(),
          ],
        });
      } catch {
        // DMs disabled
      }

      await logModerationAction(guild, {
        type: 'warn',
        user: `${targetUser.tag} (${targetUser.id})`,
        reason,
        moderator: interaction.user.tag,
      });

      await interaction.reply({
        content: `:white_check_mark: Warned ${targetUser} for: ${reason}`,
        ephemeral: true,
      });
      return true;
    }

    // /admin mute
    if (subcommand === 'mute') {
      const targetUser = interaction.options.getUser('user', true);
      const durationStr = interaction.options.getString('duration', true);
      const reason = interaction.options.getString('reason') || 'No reason provided';

      const durationMatch = durationStr.match(/^(\d+)(m|h|d)$/i);
      if (!durationMatch) {
        await interaction.reply({ content: 'Invalid duration format.', ephemeral: true });
        return true;
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
        await interaction.reply({ content: 'Mute cannot exceed 28 days.', ephemeral: true });
        return true;
      }

      try {
        const member = await guild.members.fetch(targetUser.id);
        await member.timeout(ms, reason);

        await logModerationAction(guild, {
          type: 'mute',
          user: `${targetUser.tag} (${targetUser.id})`,
          reason,
          details: `Duration: ${durationStr}`,
          moderator: interaction.user.tag,
        });

        await interaction.reply({
          content: `:white_check_mark: Muted ${targetUser} for ${durationStr}`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
      }
      return true;
    }

    // /admin clean
    if (subcommand === 'clean') {
      const count = Math.min(100, Math.max(1, interaction.options.getInteger('count', true)));
      const targetUser = interaction.options.getUser('user');
      const filter = interaction.options.getString('filter') || 'all';

      await interaction.deferReply({ ephemeral: true });

      try {
        let messages = await interaction.channel.messages.fetch({ limit: 100 });

        // Apply filters
        if (targetUser) {
          messages = messages.filter(m => m.author.id === targetUser.id);
        }
        if (filter === 'bots') {
          messages = messages.filter(m => m.author.bot);
        } else if (filter === 'humans') {
          messages = messages.filter(m => !m.author.bot);
        } else if (filter === 'links') {
          messages = messages.filter(m => /https?:\/\//.test(m.content));
        } else if (filter === 'attachments') {
          messages = messages.filter(m => m.attachments.size > 0);
        }

        const toDelete = messages.first(count);
        const deleted = await interaction.channel.bulkDelete(toDelete, true);

        await logModerationAction(guild, {
          type: 'delete',
          channel: `#${interaction.channel.name}`,
          reason: `Bulk delete: ${deleted.size} messages`,
          moderator: interaction.user.tag,
        });

        await interaction.editReply({
          content: `:white_check_mark: Deleted ${deleted.size} messages.`,
        });
      } catch (err) {
        await interaction.editReply({ content: `Error: ${err.message}` });
      }
      return true;
    }

    // /admin lockdown
    if (subcommand === 'lockdown') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'Channel lockdown';

      try {
        const everyone = guild.roles.everyone;
        const currentPerms = channel.permissionsFor(everyone);
        const isLocked = !currentPerms.has('SendMessages');

        if (isLocked) {
          // Unlock
          await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
          await interaction.reply({
            content: `:unlock: Channel ${channel} has been unlocked.`,
            ephemeral: true,
          });
        } else {
          // Lock
          await channel.permissionOverwrites.edit(everyone, { SendMessages: false });
          await interaction.reply({
            content: `:lock: Channel ${channel} has been locked.`,
            ephemeral: true,
          });

          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(COLORS.rose)
                .setTitle(':lock: Channel Locked')
                .setDescription(`This channel has been locked by a moderator.\n\n**Reason:** ${reason}`)
                .setTimestamp(),
            ],
          });
        }

        await logModerationAction(guild, {
          type: isLocked ? 'unlock' : 'lockdown',
          channel: `#${channel.name}`,
          reason,
          moderator: interaction.user.tag,
        });
      } catch (err) {
        await interaction.reply({ content: `Error: ${err.message}`, ephemeral: true });
      }
      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LINK COMMAND (Paco Hub)
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'link') {
    const action = interaction.options.getString('action', true);
    await interaction.deferReply({ ephemeral: true });

    try {
      if (action === 'create') {
        const profile = await linkProfile(interaction.user);
        const embed = new EmbedBuilder()
          .setColor(COLORS.emerald)
          .setTitle(':link: Profile Linked')
          .setDescription('Your Discord account has been linked!')
          .addFields(
            { name: 'Synced with Hub', value: profile.syncedWithHub ? 'Yes' : 'Local only', inline: true },
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else if (action === 'status') {
        const profile = await getLinkedProfile(interaction.user.id);
        if (!profile) {
          await interaction.editReply({ content: 'Profile not linked. Use `/link create` to link.' });
        } else {
          const embed = await createProfileEmbed(interaction.user, interaction.member);
          await interaction.editReply({ embeds: [embed] });
        }
      } else if (action === 'unlink') {
        const result = await unlinkProfile(interaction.user.id);
        if (result.success) {
          await interaction.editReply({ content: ':white_check_mark: Profile unlinked.' });
        } else {
          await interaction.editReply({ content: result.error });
        }
      } else if (action === 'sync') {
        const profile = await linkProfile(interaction.user);
        await interaction.editReply({ content: ':arrows_counterclockwise: Profile synced!' });
      }
    } catch (err) {
      await interaction.editReply({ content: `Error: ${err.message}` });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COMMUNITY COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'community') {
    const view = interaction.options.getString('view') || 'links';
    await interaction.deferReply();

    try {
      let embed;
      if (view === 'links') {
        embed = createCommunityLinksEmbed();
      } else if (view === 'stats') {
        embed = await createCommunityStatsEmbed();
      } else if (view === 'agents') {
        embed = await createAgentStatusEmbed();
      } else if (view === 'streaming') {
        embed = new EmbedBuilder()
          .setColor(COLORS.rose)
          .setTitle(':red_circle: Streaming Info')
          .setDescription('Join our live streams!')
          .addFields(
            { name: 'YouTube', value: `[Watch](${LINKS.youtube})`, inline: true },
            { name: 'Twitch', value: `[Watch](${LINKS.twitch})`, inline: true },
            { name: 'Schedule', value: 'Check #stream-schedule', inline: true },
          )
          .setTimestamp();
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${err.message}` });
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPME COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'helpme') {
    const command = interaction.options.getString('command');
    const category = interaction.options.getString('category');

    const commandHelp = {
      trivia: { description: 'Start a trivia game with multiple categories and compete for points!', usage: '/trivia [category] [rounds]', examples: ['/trivia ai 5', '/trivia programming'] },
      rps: { description: 'Play Rock Paper Scissors against the bot or challenge another user!', usage: '/rps [opponent] [extended]', examples: ['/rps', '/rps @user', '/rps extended:true'] },
      profile: { description: 'View your or another user\'s profile with badges and stats.', usage: '/profile [user]', examples: ['/profile', '/profile @user'] },
      suggest: { description: 'Submit a suggestion or idea to the community.', usage: '/suggest <title> <description> [category]', examples: ['/suggest "New feature" "Add dark mode"'] },
    };

    const categoryHelp = {
      core: { title: 'Core Commands', commands: ['/ping', '/status', '/hub', '/daily', '/help'] },
      agents: { title: 'Agent Commands', commands: ['/ask', '/agent chat', '/agent status', '/agent summon'] },
      kb: { title: 'Knowledge Base', commands: ['/kb search', '/kb doc', '/kb list', '/kb ask'] },
      games: { title: 'Games', commands: ['/trivia', '/rps', '/hangman', '/wordscramble', '/numberguess', '/quiz'] },
      moderation: { title: 'Moderation', commands: ['/warn', '/timeout', '/clear', '/slowmode'] },
      streaming: { title: 'Streaming', commands: ['/go-live', '/end-stream', '/schedule', '/idea'] },
      utilities: { title: 'Utilities', commands: ['/remind', '/note', '/notes', '/todo', '/poll'] },
      admin: { title: 'Admin', commands: ['/admin stats', '/admin announce', '/admin role', '/admin mute', '/admin clean'] },
    };

    let embed;

    if (command && commandHelp[command]) {
      const help = commandHelp[command];
      embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setTitle(`:book: /${command}`)
        .setDescription(help.description)
        .addFields(
          { name: 'Usage', value: `\`${help.usage}\``, inline: false },
          { name: 'Examples', value: help.examples.map(e => `\`${e}\``).join('\n'), inline: false },
        )
        .setTimestamp();
    } else if (category && categoryHelp[category]) {
      const help = categoryHelp[category];
      embed = new EmbedBuilder()
        .setColor(COLORS.purple)
        .setTitle(`:book: ${help.title}`)
        .setDescription(help.commands.map(c => `\`${c}\``).join('\n'))
        .setTimestamp();
    } else {
      embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setTitle(':book: Command Help')
        .setDescription('Use `/helpme command:<name>` for specific command help\nUse `/helpme category:<name>` to browse by category\n\nOr use `/help` for the full command list!')
        .addFields(
          { name: 'Categories', value: Object.keys(categoryHelp).map(c => `\`${c}\``).join(', '), inline: false },
        )
        .setTimestamp();
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // QUICK POLL COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'quickpoll') {
    const question = interaction.options.getString('question', true);

    const embed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle(':bar_chart: Quick Poll')
      .setDescription(`**${question}**\n\n:thumbsup: Yes\n:thumbsdown: No`)
      .addFields({ name: 'Created by', value: interaction.user.displayName || interaction.user.username, inline: true })
      .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await msg.react(':thumbsup:');
    await msg.react(':thumbsdown:');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEEDBACK COMMAND
  // ═══════════════════════════════════════════════════════════════════════
  if (commandName === 'feedback') {
    const type = interaction.options.getString('type', true);
    const message = interaction.options.getString('message', true);

    const colorMap = {
      positive: COLORS.emerald,
      bug: COLORS.rose,
      suggestion: COLORS.purple,
      question: COLORS.cyan,
    };

    const emojiMap = {
      positive: ':star:',
      bug: ':bug:',
      suggestion: ':bulb:',
      question: ':question:',
    };

    const embed = new EmbedBuilder()
      .setColor(colorMap[type] || COLORS.cyan)
      .setTitle(`${emojiMap[type]} ${type.charAt(0).toUpperCase() + type.slice(1)} Feedback`)
      .setDescription(message)
      .addFields({ name: 'From', value: interaction.user.displayName || interaction.user.username, inline: true })
      .setTimestamp();

    // Find feedback channel
    const feedbackCh = await findTextChannelByName(guild, 'feedback') ||
                       await findTextChannelByName(guild, 'suggestions');

    if (feedbackCh) {
      await feedbackCh.send({ embeds: [embed] });
      await interaction.reply({
        content: ':white_check_mark: Feedback submitted!',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }
    return true;
  }

  return false; // Command not handled
}

/**
 * Handle button interactions for extended commands
 */
export async function handleExtendedButton(interaction) {
  const customId = interaction.customId;

  // Trivia answer buttons
  if (customId.startsWith('trivia_')) {
    await handleTriviaAnswer(interaction);
    return true;
  }

  // RPS buttons
  if (customId.startsWith('rps_')) {
    await handleRPSChoice(interaction);
    return true;
  }

  return false;
}

/**
 * Handle context menu commands
 */
export async function handleExtendedContextMenu(interaction) {
  const { commandName } = interaction;

  // These are handled by the interactions module
  return false;
}
