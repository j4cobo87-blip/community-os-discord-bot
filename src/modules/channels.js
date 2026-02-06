// CommunityOS Discord Bot - Channel Management Module
import { EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { COLORS, CHANNEL_STRUCTURE } from '../config/constants.js';

/**
 * Creates the full org channel structure
 */
export async function setupOrgChannels(guild) {
  const created = { categories: [], channels: [] };
  const existing = { categories: [], channels: [] };
  const errors = [];

  for (const category of CHANNEL_STRUCTURE.categories) {
    try {
      // Check if category exists
      let catChannel = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === category.name.toUpperCase()
      );

      if (!catChannel) {
        catChannel = await guild.channels.create({
          name: category.name,
          type: ChannelType.GuildCategory,
          reason: 'CommunityOS org setup',
        });
        created.categories.push(category.name);
      } else {
        existing.categories.push(category.name);
      }

      // Create channels in category
      for (const channel of category.channels) {
        const existingCh = guild.channels.cache.find(
          c => c.name === channel.name && c.parentId === catChannel.id
        );

        if (!existingCh) {
          await guild.channels.create({
            name: channel.name,
            type: ChannelType.GuildText,
            parent: catChannel.id,
            topic: channel.topic,
            reason: 'CommunityOS org setup',
          });
          created.channels.push(channel.name);
        } else {
          existing.channels.push(channel.name);
        }
      }
    } catch (err) {
      errors.push({ category: category.name, error: err.message });
    }
  }

  return { created, existing, errors };
}

/**
 * Creates a team-specific channel
 */
export async function createTeamChannel(guild, teamId, teamName) {
  // Find or create AI AGENTS or BUILD ZONE category
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toUpperCase() === 'AI AGENTS'
  );

  if (!category) {
    category = await guild.channels.create({
      name: 'AI AGENTS',
      type: ChannelType.GuildCategory,
      reason: 'Team channel creation',
    });
  }

  // Check if channel already exists
  const existingChannel = guild.channels.cache.find(c => c.name === teamId);
  if (existingChannel) {
    return { channel: existingChannel, created: false };
  }

  // Create the team channel
  const channel = await guild.channels.create({
    name: teamId,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `Team channel for ${teamName}`,
    reason: 'Team channel creation',
  });

  return { channel, created: true };
}

/**
 * Creates setup complete embed
 */
export function createSetupCompleteEmbed(result) {
  const createdCats = result.created.categories.length;
  const createdChs = result.created.channels.length;
  const existingCats = result.existing.categories.length;
  const existingChs = result.existing.channels.length;
  const hasErrors = result.errors.length > 0;

  const description = [];

  if (createdCats > 0 || createdChs > 0) {
    description.push(`**Created:** ${createdCats} categories, ${createdChs} channels`);
  }
  if (existingCats > 0 || existingChs > 0) {
    description.push(`**Already existed:** ${existingCats} categories, ${existingChs} channels`);
  }
  if (hasErrors) {
    description.push(`**Errors:** ${result.errors.length}`);
  }

  const embed = new EmbedBuilder()
    .setColor(hasErrors ? COLORS.amber : COLORS.emerald)
    .setTitle('Org Setup Complete')
    .setDescription(description.join('\n'))
    .setTimestamp();

  if (result.created.categories.length > 0) {
    embed.addFields({
      name: 'New Categories',
      value: result.created.categories.join(', ') || 'None',
      inline: false,
    });
  }

  if (result.created.channels.length > 0) {
    embed.addFields({
      name: 'New Channels',
      value: result.created.channels.slice(0, 20).join(', ') + (result.created.channels.length > 20 ? '...' : ''),
      inline: false,
    });
  }

  if (hasErrors) {
    embed.addFields({
      name: 'Errors',
      value: result.errors.map(e => `${e.category}: ${e.error}`).join('\n').slice(0, 1000),
      inline: false,
    });
  }

  embed.setFooter({ text: 'CommunityOS Channel Setup' });

  return embed;
}

/**
 * Gets channel by name helper
 */
export async function findTextChannelByName(guild, name) {
  const channels = await guild.channels.fetch();
  return channels.find(
    (c) => c && c.isTextBased && c.isTextBased() && c.name === name
  );
}

/**
 * Creates channel structure overview embed
 */
export function createChannelOverviewEmbed(guild) {
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory);
  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice);

  const categoryList = categories
    .sort((a, b) => a.position - b.position)
    .map(c => {
      const chCount = textChannels.filter(ch => ch.parentId === c.id).size;
      return `**${c.name}** (${chCount} channels)`;
    })
    .join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle('Channel Overview')
    .setDescription('Current channel structure')
    .addFields(
      { name: 'Categories', value: categoryList || 'No categories', inline: false },
      { name: 'Total Text Channels', value: `${textChannels.size}`, inline: true },
      { name: 'Total Voice Channels', value: `${voiceChannels.size}`, inline: true },
    )
    .setFooter({ text: 'Use /setup-org to create missing channels' })
    .setTimestamp();
}
