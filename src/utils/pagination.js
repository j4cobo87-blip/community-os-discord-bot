// CommunityOS Discord Bot - Pagination Utility
// Handles pagination for long lists in Discord embeds

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { COLORS } from '../config/constants.js';

/**
 * Default pagination configuration
 */
const DEFAULT_CONFIG = {
  itemsPerPage: 10,
  timeout: 300000, // 5 minutes
  showPageNumbers: true,
  emptyMessage: 'No items to display.',
};

/**
 * Creates a paginated embed for a list of items
 * @param {Object} options - Pagination options
 * @param {Array} options.items - Array of items to paginate
 * @param {Function} options.formatItem - Function to format each item for display
 * @param {string} options.title - Embed title
 * @param {string} [options.description] - Optional description
 * @param {number} [options.color] - Embed color
 * @param {number} [options.itemsPerPage] - Items per page (default: 10)
 * @param {string} [options.footer] - Footer text
 * @returns {Object} - { embed, components, totalPages, currentPage }
 */
export function createPaginatedEmbed(options, page = 0) {
  const {
    items = [],
    formatItem = (item, index) => `${index + 1}. ${item}`,
    title = 'Results',
    description = '',
    color = COLORS.cyan,
    itemsPerPage = DEFAULT_CONFIG.itemsPerPage,
    footer = '',
    emptyMessage = DEFAULT_CONFIG.emptyMessage,
  } = options;

  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const pageItems = items.slice(startIndex, endIndex);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  if (items.length === 0) {
    embed.setDescription(emptyMessage);
  } else {
    const formattedItems = pageItems.map((item, index) =>
      formatItem(item, startIndex + index)
    );
    const content = formattedItems.join('\n');

    if (embed.data.description) {
      embed.setDescription(`${embed.data.description}\n\n${content}`);
    } else {
      embed.setDescription(content);
    }
  }

  // Page info footer
  const pageInfo = items.length > 0 ? `Page ${currentPage + 1}/${totalPages} | ${items.length} total` : '';
  const footerText = footer ? `${footer} | ${pageInfo}` : pageInfo;
  if (footerText) {
    embed.setFooter({ text: footerText });
  }

  // Create navigation buttons
  const components = [];
  if (totalPages > 1) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`page_first_${Date.now()}`)
          .setLabel('<<')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId(`page_prev_${Date.now()}`)
          .setLabel('<')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId(`page_info_${Date.now()}`)
          .setLabel(`${currentPage + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`page_next_${Date.now()}`)
          .setLabel('>')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId(`page_last_${Date.now()}`)
          .setLabel('>>')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages - 1)
      );
    components.push(row);
  }

  return {
    embed,
    components,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
  };
}

/**
 * Creates an interactive paginated message with collector
 * @param {Interaction} interaction - Discord interaction
 * @param {Object} options - Pagination options (same as createPaginatedEmbed)
 * @param {boolean} [ephemeral=false] - Whether message should be ephemeral
 */
export async function sendPaginatedEmbed(interaction, options, ephemeral = false) {
  const { items = [] } = options;
  const itemsPerPage = options.itemsPerPage || DEFAULT_CONFIG.itemsPerPage;
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

  let currentPage = 0;
  const paginationData = createPaginatedEmbed(options, currentPage);

  const message = await interaction.reply({
    embeds: [paginationData.embed],
    components: paginationData.components,
    ephemeral,
    fetchReply: true,
  });

  // No pagination needed
  if (totalPages <= 1) return message;

  // Create button collector
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: DEFAULT_CONFIG.timeout,
  });

  collector.on('collect', async (buttonInteraction) => {
    const buttonId = buttonInteraction.customId;

    if (buttonId.startsWith('page_first')) {
      currentPage = 0;
    } else if (buttonId.startsWith('page_prev')) {
      currentPage = Math.max(0, currentPage - 1);
    } else if (buttonId.startsWith('page_next')) {
      currentPage = Math.min(totalPages - 1, currentPage + 1);
    } else if (buttonId.startsWith('page_last')) {
      currentPage = totalPages - 1;
    }

    const newData = createPaginatedEmbed(options, currentPage);

    await buttonInteraction.update({
      embeds: [newData.embed],
      components: newData.components,
    });
  });

  collector.on('end', async () => {
    // Remove buttons when collector expires
    try {
      await message.edit({ components: [] });
    } catch {
      // Message might be deleted
    }
  });

  return message;
}

/**
 * Utility to chunk an array into pages
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} - Array of chunks
 */
export function chunkArray(array, size = DEFAULT_CONFIG.itemsPerPage) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Creates a simple text-based pagination for non-interactive contexts
 * @param {Array} items - Items to paginate
 * @param {number} page - Current page (0-indexed)
 * @param {number} itemsPerPage - Items per page
 * @returns {Object} - { items, page, totalPages, hasNext, hasPrev }
 */
export function getPage(items, page = 0, itemsPerPage = DEFAULT_CONFIG.itemsPerPage) {
  const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);

  return {
    items: items.slice(startIndex, endIndex),
    page: currentPage,
    totalPages,
    hasNext: currentPage < totalPages - 1,
    hasPrev: currentPage > 0,
    startIndex,
    endIndex,
    total: items.length,
  };
}
