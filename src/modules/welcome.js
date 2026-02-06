// CommunityOS Discord Bot - Welcome System Module
import { EmbedBuilder } from 'discord.js';
import { COLORS, LINKS } from '../config/constants.js';
import { autoAssignGuestRole } from './roles.js';
import { findTextChannelByName } from './channels.js';

/**
 * Creates the main welcome embed for new members
 */
export function createWelcomeEmbed(member) {
  return new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle('Welcome to CommunityOS!')
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .setDescription(
      `Hey **${member.displayName}**, glad you're here!\n\n` +
      `I'm **Paco**, the orchestrator of this AI-native company. ` +
      `We're building CommunityOS - a full operating system for companies, powered by 22+ AI agents.\n\n` +
      `**What makes us special?**\n` +
      `We run like a real company, but with AI agents handling most operations. You're joining a community that's building the future of work.`
    )
    .addFields(
      { name: 'First Steps', value:
        '1. Read #rules to understand our guidelines\n' +
        '2. Drop a hello in #introductions\n' +
        '3. Explore channels - each team has their own space',
        inline: false
      },
      { name: 'Talk to AI Agents', value:
        '- Use `/ask <agent> <question>` to ask an agent\n' +
        '- Use `/kb <query>` to search our knowledge base\n' +
        '- Mention @Paco for general help',
        inline: false
      },
      { name: 'Join Our Streams', value: `[YouTube](${LINKS.youtube}) | [Twitch](${LINKS.twitch})`, inline: true },
      { name: 'Share Ideas', value: 'Post in #content-ideas', inline: true },
      { name: 'Get Support', value: 'Use `/ticket` in #support', inline: true },
    )
    .setFooter({ text: 'Welcome to the team! - Paco' })
    .setTimestamp();
}

/**
 * Creates the DM welcome message for new members
 */
export function createWelcomeDM(member, guildName) {
  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`Welcome to ${guildName}!`)
    .setDescription(
      `Hey ${member.displayName}!\n\n` +
      `Thanks for joining **${guildName}**. Here's your quick start guide:\n\n` +
      `**Community Guide**\n` +
      `- Be respectful and constructive\n` +
      `- Share your ideas and feedback\n` +
      `- Help others when you can\n` +
      `- Have fun building with us!\n\n` +
      `**Key Commands**\n` +
      `\`/help\` - See all available commands\n` +
      `\`/kb <query>\` - Search our knowledge base\n` +
      `\`/ask paco <question>\` - Ask Paco anything\n` +
      `\`/ticket <description>\` - Create a support ticket\n` +
      `\`/status\` - Check system status\n\n` +
      `**Resources**\n` +
      `- [Paco Hub](${LINKS.pacoHub})\n` +
      `- [YouTube](${LINKS.youtube})\n` +
      `- [Twitch](${LINKS.twitch})`
    )
    .setFooter({ text: 'CommunityOS - AI-Native Company' })
    .setTimestamp();
}

/**
 * Creates member log entry embed
 */
export function createMemberLogEmbed(member, action = 'joined') {
  const isJoin = action === 'joined';

  const embed = new EmbedBuilder()
    .setColor(isJoin ? COLORS.emerald : COLORS.rose)
    .setAuthor({
      name: member.displayName,
      iconURL: member.displayAvatarURL({ size: 64 })
    })
    .setDescription(`**${member.user.tag}** ${isJoin ? 'joined the server' : 'left the server'}`)
    .addFields(
      { name: 'User ID', value: member.id, inline: true },
      { name: 'Account Created', value: member.user.createdAt.toLocaleDateString(), inline: true },
    )
    .setTimestamp();

  if (isJoin) {
    embed.addFields({ name: 'Auto Role', value: 'Guest', inline: true });
  }

  return embed;
}

/**
 * Handles new member join with full welcome sequence
 */
export async function handleMemberJoin(member) {
  const results = {
    guestRole: false,
    welcomeMessage: false,
    introMessage: false,
    memberLog: false,
    dm: false,
  };

  const guild = member.guild;

  // 1. Auto-assign Guest role
  try {
    results.guestRole = await autoAssignGuestRole(member);
  } catch (err) {
    console.error('Guest role error:', err.message);
  }

  // 2. Send welcome message to #welcome or #general
  try {
    const welcomeCh = await findTextChannelByName(guild, 'welcome') ||
                      await findTextChannelByName(guild, 'general');

    if (welcomeCh) {
      const welcomeEmbed = createWelcomeEmbed(member);
      await welcomeCh.send({
        content: `<@${member.id}>`,
        embeds: [welcomeEmbed]
      });
      results.welcomeMessage = true;
    }
  } catch (err) {
    console.error('Welcome message error:', err.message);
  }

  // 3. Send intro notification to #introductions
  try {
    const introCh = await findTextChannelByName(guild, 'introductions');
    if (introCh) {
      const introEmbed = new EmbedBuilder()
        .setColor(COLORS.indigo)
        .setDescription(`**${member.displayName}** just joined CommunityOS! Welcome aboard - drop an intro when you're ready!`)
        .setTimestamp();
      await introCh.send({ embeds: [introEmbed] });
      results.introMessage = true;
    }
  } catch (err) {
    console.error('Intro message error:', err.message);
  }

  // 4. Log to #member-log
  try {
    const logCh = await findTextChannelByName(guild, 'member-log');
    if (logCh) {
      const logEmbed = createMemberLogEmbed(member, 'joined');
      await logCh.send({ embeds: [logEmbed] });
      results.memberLog = true;
    }
  } catch (err) {
    console.error('Member log error:', err.message);
  }

  // 5. Send DM with community guide
  try {
    const dmEmbed = createWelcomeDM(member, guild.name);
    await member.send({ embeds: [dmEmbed] });
    results.dm = true;
  } catch (err) {
    // DMs might be disabled, that's okay
    console.log('Could not DM member:', err.message);
  }

  return results;
}

/**
 * Handles member leave
 */
export async function handleMemberLeave(member) {
  const guild = member.guild;

  try {
    const logCh = await findTextChannelByName(guild, 'member-log');
    if (logCh) {
      const logEmbed = createMemberLogEmbed(member, 'left');
      await logCh.send({ embeds: [logEmbed] });
      return true;
    }
  } catch (err) {
    console.error('Member leave log error:', err.message);
  }

  return false;
}
