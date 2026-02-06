// CommunityOS Discord Bot - Embed Builder Utility
// Consistent embed formatting across the bot

import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/constants.js';

/**
 * Creates a success embed
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {Array} [options.fields] - Optional fields array
 * @param {string} [options.footer] - Optional footer text
 * @returns {EmbedBuilder}
 */
export function createSuccessEmbed({ title, description, fields = [], footer = '' }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle(`:white_check_mark: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

/**
 * Creates an error embed
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {Array} [options.fields] - Optional fields array
 * @param {string} [options.footer] - Optional footer text
 * @returns {EmbedBuilder}
 */
export function createErrorEmbed({ title, description, fields = [], footer = '' }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.rose)
    .setTitle(`:x: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

/**
 * Creates a warning embed
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {Array} [options.fields] - Optional fields array
 * @param {string} [options.footer] - Optional footer text
 * @returns {EmbedBuilder}
 */
export function createWarningEmbed({ title, description, fields = [], footer = '' }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.amber)
    .setTitle(`:warning: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

/**
 * Creates an info embed
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {Array} [options.fields] - Optional fields array
 * @param {string} [options.footer] - Optional footer text
 * @returns {EmbedBuilder}
 */
export function createInfoEmbed({ title, description, fields = [], footer = '' }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`:information_source: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

/**
 * Creates a loading/processing embed
 * @param {Object} options - Embed options
 * @param {string} [options.title] - Embed title
 * @param {string} [options.description] - Embed description
 * @returns {EmbedBuilder}
 */
export function createLoadingEmbed({ title = 'Processing', description = 'Please wait...' } = {}) {
  return new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(`:hourglass_flowing_sand: ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Creates an agent response embed
 * @param {Object} options - Embed options
 * @param {string} options.agentName - Name of the agent
 * @param {string} options.agentEmoji - Agent emoji
 * @param {string} options.response - Agent response text
 * @param {string} [options.question] - Original question
 * @param {boolean} [options.cached] - Whether response was cached
 * @param {boolean} [options.fallback] - Whether this is a fallback response
 * @returns {EmbedBuilder}
 */
export function createAgentEmbed({
  agentName,
  agentEmoji = ':robot:',
  response,
  question = '',
  cached = false,
  fallback = false,
}) {
  const color = fallback ? COLORS.amber : COLORS.cyan;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${agentEmoji} ${agentName}` })
    .setDescription(response.slice(0, 4000))
    .setTimestamp();

  if (question) {
    embed.addFields({ name: 'Question', value: question.slice(0, 1000), inline: false });
  }

  let footerText = `${agentName} | CommunityOS AI`;
  if (cached) {
    footerText = 'Quick response from cache';
  } else if (fallback) {
    footerText = 'Fallback Mode - Limited AI available';
  }
  embed.setFooter({ text: footerText });

  return embed;
}

/**
 * Creates a status/system embed
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {Array} [options.fields] - Status fields
 * @param {boolean} [options.healthy] - Overall health status
 * @returns {EmbedBuilder}
 */
export function createStatusEmbed({ title, description, fields = [], healthy = true }) {
  const embed = new EmbedBuilder()
    .setColor(healthy ? COLORS.emerald : COLORS.rose)
    .setTitle(healthy ? `:green_circle: ${title}` : `:red_circle: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  embed.setFooter({ text: 'CommunityOS System Status' });

  return embed;
}

/**
 * Creates a list embed with consistent formatting
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {Array} options.items - Items to list
 * @param {Function} [options.formatItem] - Function to format each item
 * @param {string} [options.emptyMessage] - Message when list is empty
 * @param {number} [options.color] - Embed color
 * @returns {EmbedBuilder}
 */
export function createListEmbed({
  title,
  items = [],
  formatItem = (item, index) => `${index + 1}. ${item}`,
  emptyMessage = 'No items to display.',
  color = COLORS.cyan,
  footer = '',
}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp();

  if (items.length === 0) {
    embed.setDescription(emptyMessage);
  } else {
    const formattedItems = items.map((item, index) => formatItem(item, index));
    embed.setDescription(formattedItems.join('\n').slice(0, 4000));
  }

  if (footer) {
    embed.setFooter({ text: footer });
  } else if (items.length > 0) {
    embed.setFooter({ text: `${items.length} item${items.length === 1 ? '' : 's'}` });
  }

  return embed;
}

/**
 * Creates a confirmation/action embed
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Action description
 * @param {string} [options.confirmText] - Confirmation instructions
 * @returns {EmbedBuilder}
 */
export function createConfirmEmbed({ title, description, confirmText = '' }) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(`:question: ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (confirmText) {
    embed.addFields({ name: 'To Confirm', value: confirmText, inline: false });
  }

  return embed;
}

/**
 * Creates a ticket/support embed
 * @param {Object} options - Embed options
 * @param {string} options.ticketId - Ticket ID
 * @param {string} options.title - Ticket title
 * @param {string} [options.description] - Ticket description
 * @param {string} options.priority - Priority level
 * @param {string} options.status - Ticket status
 * @param {string} [options.submittedBy] - Who submitted the ticket
 * @returns {EmbedBuilder}
 */
export function createTicketEmbed({
  ticketId,
  title,
  description = '',
  priority = 'medium',
  status = 'open',
  submittedBy = '',
}) {
  const priorityColors = {
    critical: COLORS.rose,
    high: COLORS.amber,
    medium: COLORS.cyan,
    low: COLORS.indigo,
  };

  const priorityEmoji = {
    critical: ':bangbang:',
    high: ':exclamation:',
    medium: ':ballot_box_with_check:',
    low: ':white_check_mark:',
  };

  const statusEmoji = {
    open: ':inbox_tray:',
    pending: ':hourglass:',
    in_progress: ':arrow_forward:',
    escalated: ':warning:',
    resolved: ':white_check_mark:',
    closed: ':lock:',
  };

  const embed = new EmbedBuilder()
    .setColor(priorityColors[priority] || COLORS.cyan)
    .setTitle(`Support Ticket: ${title}`)
    .setDescription(description || '_No description provided_')
    .addFields(
      { name: 'Ticket ID', value: `\`${ticketId}\``, inline: true },
      {
        name: 'Priority',
        value: `${priorityEmoji[priority] || ':ballot_box_with_check:'} ${priority.toUpperCase()}`,
        inline: true,
      },
      { name: 'Status', value: `${statusEmoji[status] || ':inbox_tray:'} ${status}`, inline: true }
    )
    .setTimestamp();

  if (submittedBy) {
    embed.addFields({ name: 'Submitted By', value: submittedBy, inline: true });
  }

  embed.setFooter({ text: 'CommunityOS Support | Reply in thread or use Paco Hub' });

  return embed;
}

/**
 * Creates a simple embed with minimal options
 * @param {string} description - Embed description
 * @param {number} [color] - Embed color
 * @returns {EmbedBuilder}
 */
export function createSimpleEmbed(description, color = COLORS.cyan) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Adds standard CommunityOS branding to an embed
 * @param {EmbedBuilder} embed - Embed to brand
 * @param {Object} [options] - Branding options
 * @param {string} [options.footer] - Additional footer text
 * @returns {EmbedBuilder}
 */
export function addBranding(embed, { footer = '' } = {}) {
  const footerText = footer ? `${footer} | CommunityOS` : 'CommunityOS';
  embed.setFooter({ text: footerText });
  return embed;
}
