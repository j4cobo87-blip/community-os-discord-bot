// CommunityOS Discord Bot - Auto-Moderation Module
import { EmbedBuilder } from 'discord.js';
import { COLORS, BAD_WORDS, SPAM_SETTINGS, RAID_SETTINGS } from '../config/constants.js';
import { findTextChannelByName } from './channels.js';

// In-memory tracking (consider Redis for production)
const userMessageHistory = new Map();
const recentJoins = [];
let isLockdown = false;

/**
 * Checks message for spam patterns
 */
export function checkSpam(message) {
  const userId = message.author.id;
  const now = Date.now();

  // Get or create user history
  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, {
      messages: [],
      duplicates: [],
      warnings: 0,
    });
  }

  const history = userMessageHistory.get(userId);

  // Clean old messages (older than 1 minute)
  history.messages = history.messages.filter(m => now - m.time < 60000);
  history.duplicates = history.duplicates.filter(m => now - m.time < SPAM_SETTINGS.duplicateTimeWindow);

  // Add current message
  history.messages.push({ time: now, content: message.content });

  // Check message rate
  if (history.messages.length > SPAM_SETTINGS.maxMessagesPerMinute) {
    return {
      isSpam: true,
      reason: 'message_rate',
      details: `${history.messages.length} messages in 1 minute (limit: ${SPAM_SETTINGS.maxMessagesPerMinute})`,
    };
  }

  // Check mention spam
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount > SPAM_SETTINGS.maxMentionsPerMessage) {
    return {
      isSpam: true,
      reason: 'mention_spam',
      details: `${mentionCount} mentions (limit: ${SPAM_SETTINGS.maxMentionsPerMessage})`,
    };
  }

  // Check duplicate messages
  const duplicateCount = history.duplicates.filter(d => d.content === message.content).length;
  history.duplicates.push({ time: now, content: message.content });

  if (duplicateCount >= SPAM_SETTINGS.maxDuplicateMessages) {
    return {
      isSpam: true,
      reason: 'duplicate_messages',
      details: `${duplicateCount + 1} duplicate messages`,
    };
  }

  return { isSpam: false };
}

/**
 * Checks message for prohibited links
 */
export function checkLinks(message) {
  const content = message.content.toLowerCase();

  // List of suspicious patterns
  const suspiciousPatterns = [
    /discord\.gg\/\w+/i,          // Discord invites (except whitelisted)
    /bit\.ly\/\w+/i,              // URL shorteners
    /tinyurl\.com\/\w+/i,
    /t\.co\/\w+/i,
    /free\s*(nitro|discord)/i,    // Free nitro scams
    /claim\s*your\s*prize/i,      // Prize scams
    /steam\s*community\s*login/i, // Phishing
  ];

  // Whitelist of allowed domains
  const whitelist = [
    'youtube.com',
    'youtu.be',
    'twitch.tv',
    'github.com',
    'localhost',
    'communityos.dev',
  ];

  // Check for URL patterns
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  for (const url of urls) {
    // Check whitelist first
    const isWhitelisted = whitelist.some(domain => url.includes(domain));
    if (isWhitelisted) continue;

    // Check suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(content)) {
        return {
          hasProhibitedLinks: true,
          reason: 'suspicious_link',
          url: url.slice(0, 100),
        };
      }
    }
  }

  // Check for Discord invites that aren't whitelisted
  if (/discord\.gg\/\w+/i.test(content)) {
    return {
      hasProhibitedLinks: true,
      reason: 'discord_invite',
      url: content.match(/discord\.gg\/\w+/i)?.[0],
    };
  }

  return { hasProhibitedLinks: false };
}

/**
 * Checks message for bad words
 */
export function checkBadWords(message) {
  const content = message.content.toLowerCase();

  for (const word of BAD_WORDS) {
    if (content.includes(word.toLowerCase())) {
      return {
        hasBadWords: true,
        word: word.replace(/./g, '*'), // Censor the word
      };
    }
  }

  return { hasBadWords: false };
}

/**
 * Checks for raid patterns
 */
export function checkRaid(member) {
  const now = Date.now();

  // Clean old joins
  while (recentJoins.length > 0 && now - recentJoins[0].time > RAID_SETTINGS.timeWindow) {
    recentJoins.shift();
  }

  // Add this join
  recentJoins.push({ time: now, id: member.id });

  // Check threshold
  if (recentJoins.length >= RAID_SETTINGS.joinThreshold) {
    return {
      isRaid: true,
      joinCount: recentJoins.length,
      timeWindow: RAID_SETTINGS.timeWindow / 1000,
    };
  }

  return { isRaid: false };
}

/**
 * Initiates lockdown mode
 */
export async function initiateLockdown(guild, reason) {
  if (isLockdown) return { alreadyLocked: true };

  isLockdown = true;

  // Set verification level to highest
  try {
    await guild.setVerificationLevel(4); // VERY_HIGH
  } catch (err) {
    console.error('Failed to set verification level:', err.message);
  }

  // Log the lockdown
  const logCh = await findTextChannelByName(guild, 'moderation-log') ||
                await findTextChannelByName(guild, 'status');

  if (logCh) {
    const lockdownEmbed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle('LOCKDOWN INITIATED')
      .setDescription(`The server has entered lockdown mode due to: **${reason}**`)
      .addFields(
        { name: 'Action', value: 'Verification level set to highest', inline: true },
        { name: 'Duration', value: `${RAID_SETTINGS.lockdownDuration / 60000} minutes`, inline: true },
      )
      .setFooter({ text: 'CommunityOS Auto-Moderation' })
      .setTimestamp();

    await logCh.send({ content: '@here', embeds: [lockdownEmbed] });
  }

  // Schedule end of lockdown
  setTimeout(async () => {
    await endLockdown(guild);
  }, RAID_SETTINGS.lockdownDuration);

  return { initiated: true };
}

/**
 * Ends lockdown mode
 */
export async function endLockdown(guild) {
  if (!isLockdown) return;

  isLockdown = false;

  // Reset verification level
  try {
    await guild.setVerificationLevel(1); // LOW
  } catch (err) {
    console.error('Failed to reset verification level:', err.message);
  }

  // Log the end
  const logCh = await findTextChannelByName(guild, 'moderation-log') ||
                await findTextChannelByName(guild, 'status');

  if (logCh) {
    const endEmbed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setTitle('Lockdown Ended')
      .setDescription('Server lockdown has been lifted. Normal operations resumed.')
      .setTimestamp();

    await logCh.send({ embeds: [endEmbed] });
  }
}

/**
 * Logs moderation action
 */
export async function logModerationAction(guild, action) {
  const logCh = await findTextChannelByName(guild, 'moderation-log');
  if (!logCh) return;

  const actionColors = {
    warn: COLORS.amber,
    mute: COLORS.purple,
    kick: COLORS.rose,
    ban: COLORS.rose,
    delete: COLORS.amber,
    spam: COLORS.amber,
    filter: COLORS.amber,
  };

  const embed = new EmbedBuilder()
    .setColor(actionColors[action.type] || COLORS.amber)
    .setTitle(`Moderation: ${action.type.toUpperCase()}`)
    .addFields(
      { name: 'User', value: action.user || 'Unknown', inline: true },
      { name: 'Reason', value: action.reason || 'No reason provided', inline: true },
      { name: 'Channel', value: action.channel || 'N/A', inline: true },
    )
    .setTimestamp();

  if (action.details) {
    embed.addFields({ name: 'Details', value: action.details, inline: false });
  }

  if (action.moderator) {
    embed.setFooter({ text: `Moderator: ${action.moderator}` });
  } else {
    embed.setFooter({ text: 'Auto-Moderation System' });
  }

  await logCh.send({ embeds: [embed] });
}

/**
 * Main moderation handler for messages
 */
export async function handleModeration(message) {
  // Skip bot messages and DMs
  if (message.author.bot || !message.guild) return null;

  // Skip if user has admin or mod permissions
  if (message.member.permissions.has('Administrator') ||
      message.member.permissions.has('ManageMessages')) {
    return null;
  }

  const results = {
    action: null,
    reason: null,
    details: null,
  };

  // Check bad words
  const badWordCheck = checkBadWords(message);
  if (badWordCheck.hasBadWords) {
    results.action = 'delete';
    results.reason = 'bad_word';
    results.details = `Filtered word detected`;

    try {
      await message.delete();
      await logModerationAction(message.guild, {
        type: 'filter',
        user: `${message.author.tag} (${message.author.id})`,
        reason: 'Bad word filter',
        channel: `#${message.channel.name}`,
        details: `Message deleted automatically`,
      });

      // Send warning DM
      try {
        await message.author.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.amber)
              .setTitle('Message Removed')
              .setDescription('Your message was removed because it contained prohibited content. Please review the server rules.')
              .setTimestamp()
          ]
        });
      } catch { /* DMs disabled */ }
    } catch (err) {
      console.error('Failed to delete message:', err.message);
    }

    return results;
  }

  // Check links
  const linkCheck = checkLinks(message);
  if (linkCheck.hasProhibitedLinks) {
    results.action = 'delete';
    results.reason = 'prohibited_link';
    results.details = linkCheck.reason;

    try {
      await message.delete();
      await logModerationAction(message.guild, {
        type: 'filter',
        user: `${message.author.tag} (${message.author.id})`,
        reason: `Prohibited link: ${linkCheck.reason}`,
        channel: `#${message.channel.name}`,
        details: `URL: ${linkCheck.url}`,
      });
    } catch (err) {
      console.error('Failed to delete message:', err.message);
    }

    return results;
  }

  // Check spam
  const spamCheck = checkSpam(message);
  if (spamCheck.isSpam) {
    results.action = SPAM_SETTINGS.warnBeforeMute ? 'warn' : 'mute';
    results.reason = 'spam';
    results.details = spamCheck.details;

    try {
      await message.delete();
      await logModerationAction(message.guild, {
        type: 'spam',
        user: `${message.author.tag} (${message.author.id})`,
        reason: spamCheck.reason,
        channel: `#${message.channel.name}`,
        details: spamCheck.details,
      });

      // Send warning
      const warningEmbed = new EmbedBuilder()
        .setColor(COLORS.amber)
        .setTitle('Slow Down!')
        .setDescription(`${message.author}, please slow down. You're sending messages too quickly.`)
        .setFooter({ text: 'CommunityOS Auto-Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [warningEmbed] });
    } catch (err) {
      console.error('Failed to handle spam:', err.message);
    }

    return results;
  }

  return null;
}

/**
 * Raid protection handler for member joins
 */
export async function handleRaidProtection(member) {
  const raidCheck = checkRaid(member);

  if (raidCheck.isRaid) {
    await initiateLockdown(member.guild, `Potential raid detected: ${raidCheck.joinCount} joins in ${raidCheck.timeWindow} seconds`);
    return true;
  }

  return false;
}
