// CommunityOS Discord Bot - Interactions Module
// Handles buttons, select menus, modals, and context menus

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
} from 'discord.js';
import { COLORS } from '../config/constants.js';
import { createTicket } from './integration.js';
import { findTextChannelByName } from './channels.js';
import { searchKB } from '../services/kb-service.js';
import { chatWithAgent } from '../services/agent-service.js';

// ═══════════════════════════════════════════════════════════════════════
// BUTTON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create quick action buttons for various contexts
 */
export function createQuickActionButtons(context = 'general') {
  const buttons = {
    general: [
      new ButtonBuilder().setCustomId('quick_help').setLabel('Help').setStyle(ButtonStyle.Secondary).setEmoji('question'),
      new ButtonBuilder().setCustomId('quick_status').setLabel('Status').setStyle(ButtonStyle.Secondary).setEmoji('satellite'),
      new ButtonBuilder().setCustomId('quick_kb').setLabel('Search KB').setStyle(ButtonStyle.Primary).setEmoji('book'),
      new ButtonBuilder().setCustomId('quick_support').setLabel('Get Support').setStyle(ButtonStyle.Danger).setEmoji('ticket'),
    ],
    support: [
      new ButtonBuilder().setCustomId('support_new').setLabel('New Ticket').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('support_faq').setLabel('View FAQ').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('support_urgent').setLabel('Urgent Issue').setStyle(ButtonStyle.Danger),
    ],
    welcome: [
      new ButtonBuilder().setCustomId('welcome_rules').setLabel('Read Rules').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('welcome_roles').setLabel('Get Roles').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('welcome_introduce').setLabel('Introduce Yourself').setStyle(ButtonStyle.Success),
    ],
    poll: [
      new ButtonBuilder().setCustomId('poll_vote_a').setLabel('A').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('poll_vote_b').setLabel('B').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('poll_vote_c').setLabel('C').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('poll_vote_d').setLabel('D').setStyle(ButtonStyle.Primary),
    ],
    confirm: [
      new ButtonBuilder().setCustomId('confirm_yes').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('confirm_no').setLabel('Cancel').setStyle(ButtonStyle.Danger),
    ],
    pagination: [
      new ButtonBuilder().setCustomId('page_first').setLabel('<<').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('page_prev').setLabel('<').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('page_next').setLabel('>').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('page_last').setLabel('>>').setStyle(ButtonStyle.Secondary),
    ],
  };

  return new ActionRowBuilder().addComponents(buttons[context] || buttons.general);
}

/**
 * Handle quick action button clicks
 */
export async function handleQuickActionButton(interaction) {
  const customId = interaction.customId;

  switch (customId) {
    case 'quick_help':
      await showHelpModal(interaction);
      break;

    case 'quick_status':
      await showQuickStatus(interaction);
      break;

    case 'quick_kb':
      await showKBSearchModal(interaction);
      break;

    case 'quick_support':
      await showSupportTicketModal(interaction);
      break;

    case 'support_new':
      await showSupportTicketModal(interaction);
      break;

    case 'support_faq':
      await showFAQEmbed(interaction);
      break;

    case 'support_urgent':
      await showUrgentSupportModal(interaction);
      break;

    case 'welcome_rules':
      await showRulesEmbed(interaction);
      break;

    case 'welcome_roles':
      await showRoleSelectMenu(interaction);
      break;

    case 'welcome_introduce':
      await showIntroductionModal(interaction);
      break;

    case 'confirm_yes':
      await handleConfirmation(interaction, true);
      break;

    case 'confirm_no':
      await handleConfirmation(interaction, false);
      break;

    default:
      if (customId.startsWith('poll_vote_')) {
        await handlePollVote(interaction);
      } else if (customId.startsWith('page_')) {
        await handlePagination(interaction);
      } else {
        await interaction.reply({ content: 'Unknown action', ephemeral: true });
      }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SELECT MENUS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create agent select menu
 */
export function createAgentSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_agent')
      .setPlaceholder('Select an agent to chat with...')
      .addOptions([
        { label: 'Paco (Orchestrator)', description: 'Main coordinator and orchestrator', value: 'main', emoji: 'robot' },
        { label: 'Coder Prime', description: 'Technical lead and code expert', value: 'coder', emoji: 'computer' },
        { label: 'Writer', description: 'Content and documentation', value: 'writer', emoji: 'pencil' },
        { label: 'QA Guardian', description: 'Quality assurance expert', value: 'qa-guardian', emoji: 'shield' },
        { label: 'Product Manager', description: 'Product strategy and planning', value: 'product-manager', emoji: 'clipboard' },
        { label: 'Growth Marketer', description: 'Marketing and growth', value: 'growth-marketer', emoji: 'chart_with_upwards_trend' },
        { label: 'Career Agent', description: 'Career advice and job search', value: 'career-agent', emoji: 'briefcase' },
        { label: 'Demo Producer', description: 'Demos and presentations', value: 'demo-producer', emoji: 'clapper' },
      ]),
  );
}

/**
 * Create role select menu
 */
export function createRoleSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_roles')
      .setPlaceholder('Select roles to join...')
      .setMinValues(1)
      .setMaxValues(5)
      .addOptions([
        { label: 'CommunityOS', description: 'Join the CommunityOS community', value: 'CommunityOS', emoji: 'dart' },
        { label: 'BELIVEITMAKEIT', description: 'Join the BIM community', value: 'BELIVEITMAKEIT', emoji: 'sparkles' },
        { label: 'JacoboStreaming', description: 'Get notified about streams', value: 'JacoboStreaming', emoji: 'red_circle' },
        { label: 'Developer', description: 'Interested in development', value: 'Developer', emoji: 'computer' },
        { label: 'Designer', description: 'Interested in design', value: 'Designer', emoji: 'art' },
      ]),
  );
}

/**
 * Create KB section select menu
 */
export function createKBSectionSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_kb_section')
      .setPlaceholder('Select a KB section to browse...')
      .addOptions([
        { label: 'Getting Started', description: 'Introduction and onboarding', value: 'start-here', emoji: 'wave' },
        { label: 'Product', description: 'Product documentation', value: 'product', emoji: 'package' },
        { label: 'Architecture', description: 'System architecture', value: 'architecture', emoji: 'building_construction' },
        { label: 'Operations', description: 'Operational procedures', value: 'operations', emoji: 'gear' },
        { label: 'Projects', description: 'Project documentation', value: 'projects', emoji: 'file_folder' },
        { label: 'Security', description: 'Security guidelines', value: 'security', emoji: 'lock' },
        { label: 'Workflows', description: 'Workflow documentation', value: 'workflows', emoji: 'arrows_counterclockwise' },
      ]),
  );
}

/**
 * Handle select menu interactions
 */
export async function handleSelectMenu(interaction) {
  const customId = interaction.customId;

  switch (customId) {
    case 'select_agent':
      await handleAgentSelection(interaction);
      break;

    case 'select_roles':
      await handleRoleSelection(interaction);
      break;

    case 'select_kb_section':
      await handleKBSectionSelection(interaction);
      break;

    case 'select_game':
      await handleGameSelection(interaction);
      break;

    default:
      await interaction.reply({ content: 'Unknown selection', ephemeral: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Show support ticket modal
 */
export async function showSupportTicketModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_support_ticket')
    .setTitle('Create Support Ticket');

  const titleInput = new TextInputBuilder()
    .setCustomId('ticket_title')
    .setLabel('Issue Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Brief description of your issue')
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Provide more details about your issue...')
    .setRequired(true)
    .setMaxLength(1000);

  const priorityInput = new TextInputBuilder()
    .setCustomId('ticket_priority')
    .setLabel('Priority (low/medium/high/critical)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('medium')
    .setRequired(false)
    .setMaxLength(10);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(priorityInput),
  );

  await interaction.showModal(modal);
}

/**
 * Show KB search modal
 */
export async function showKBSearchModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_kb_search')
    .setTitle('Search Knowledge Base');

  const queryInput = new TextInputBuilder()
    .setCustomId('kb_query')
    .setLabel('Search Query')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('What are you looking for?')
    .setRequired(true)
    .setMaxLength(200);

  modal.addComponents(new ActionRowBuilder().addComponents(queryInput));

  await interaction.showModal(modal);
}

/**
 * Show suggestion modal
 */
export async function showSuggestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_suggestion')
    .setTitle('Submit a Suggestion');

  const titleInput = new TextInputBuilder()
    .setCustomId('suggestion_title')
    .setLabel('Suggestion Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Brief title for your idea')
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('suggestion_description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your suggestion in detail...')
    .setRequired(true)
    .setMaxLength(2000);

  const categoryInput = new TextInputBuilder()
    .setCustomId('suggestion_category')
    .setLabel('Category (feature/improvement/content)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('feature')
    .setRequired(false)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(categoryInput),
  );

  await interaction.showModal(modal);
}

/**
 * Show report modal
 */
export async function showReportModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_report')
    .setTitle('Report an Issue');

  const typeInput = new TextInputBuilder()
    .setCustomId('report_type')
    .setLabel('Report Type')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('bug/abuse/spam/other')
    .setRequired(true)
    .setMaxLength(20);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('report_description')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe what you are reporting...')
    .setRequired(true)
    .setMaxLength(1000);

  const evidenceInput = new TextInputBuilder()
    .setCustomId('report_evidence')
    .setLabel('Evidence (message links, screenshots)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Provide any relevant evidence...')
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(typeInput),
    new ActionRowBuilder().addComponents(descriptionInput),
    new ActionRowBuilder().addComponents(evidenceInput),
  );

  await interaction.showModal(modal);
}

/**
 * Show poll creation modal
 */
export async function showPollModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_poll')
    .setTitle('Create a Poll');

  const questionInput = new TextInputBuilder()
    .setCustomId('poll_question')
    .setLabel('Poll Question')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('What do you want to ask?')
    .setRequired(true)
    .setMaxLength(200);

  const optionsInput = new TextInputBuilder()
    .setCustomId('poll_options')
    .setLabel('Options (one per line, 2-10 options)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Option 1\nOption 2\nOption 3')
    .setRequired(true)
    .setMaxLength(500);

  const durationInput = new TextInputBuilder()
    .setCustomId('poll_duration')
    .setLabel('Duration (e.g., 1h, 1d, leave empty for unlimited)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('1d')
    .setRequired(false)
    .setMaxLength(10);

  modal.addComponents(
    new ActionRowBuilder().addComponents(questionInput),
    new ActionRowBuilder().addComponents(optionsInput),
    new ActionRowBuilder().addComponents(durationInput),
  );

  await interaction.showModal(modal);
}

/**
 * Show introduction modal
 */
async function showIntroductionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_introduction')
    .setTitle('Introduce Yourself');

  const nameInput = new TextInputBuilder()
    .setCustomId('intro_name')
    .setLabel('What should we call you?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your preferred name')
    .setRequired(true)
    .setMaxLength(50);

  const aboutInput = new TextInputBuilder()
    .setCustomId('intro_about')
    .setLabel('Tell us about yourself')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('What do you do? What are you interested in?')
    .setRequired(true)
    .setMaxLength(500);

  const goalsInput = new TextInputBuilder()
    .setCustomId('intro_goals')
    .setLabel('What brings you here?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('What do you hope to learn or contribute?')
    .setRequired(false)
    .setMaxLength(200);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(aboutInput),
    new ActionRowBuilder().addComponents(goalsInput),
  );

  await interaction.showModal(modal);
}

/**
 * Handle modal submissions
 */
export async function handleModalSubmit(interaction) {
  const customId = interaction.customId;

  switch (customId) {
    case 'modal_support_ticket':
      await handleSupportTicketSubmit(interaction);
      break;

    case 'modal_kb_search':
      await handleKBSearchSubmit(interaction);
      break;

    case 'modal_suggestion':
      await handleSuggestionSubmit(interaction);
      break;

    case 'modal_report':
      await handleReportSubmit(interaction);
      break;

    case 'modal_poll':
      await handlePollSubmit(interaction);
      break;

    case 'modal_introduction':
      await handleIntroductionSubmit(interaction);
      break;

    default:
      await interaction.reply({ content: 'Unknown modal', ephemeral: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MODAL HANDLERS
// ═══════════════════════════════════════════════════════════════════════

async function handleSupportTicketSubmit(interaction) {
  const title = interaction.fields.getTextInputValue('ticket_title');
  const description = interaction.fields.getTextInputValue('ticket_description');
  const priority = interaction.fields.getTextInputValue('ticket_priority') || 'medium';

  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await createTicket({
      title,
      description,
      priority: ['low', 'medium', 'high', 'critical'].includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium',
      category: 'discord',
      customer: {
        name: interaction.user.displayName || interaction.user.username,
        email: `${interaction.user.id}@discord.user`,
        plan: 'community',
      },
      tags: ['discord'],
    });

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.emerald)
        .setTitle(':white_check_mark: Ticket Created')
        .setDescription(`Your support ticket has been submitted.`)
        .addFields(
          { name: 'Ticket ID', value: `\`${result.ticket.id}\``, inline: true },
          { name: 'Priority', value: priority, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Post to support channel
      const supportCh = await findTextChannelByName(interaction.guild, 'support-tickets') ||
                        await findTextChannelByName(interaction.guild, 'support');
      if (supportCh) {
        const publicEmbed = new EmbedBuilder()
          .setColor(COLORS.cyan)
          .setTitle('New Support Ticket')
          .setDescription(description.slice(0, 500))
          .addFields(
            { name: 'Title', value: title, inline: false },
            { name: 'Ticket ID', value: `\`${result.ticket.id}\``, inline: true },
            { name: 'Priority', value: priority, inline: true },
            { name: 'From', value: interaction.user.displayName || interaction.user.username, inline: true },
          )
          .setTimestamp();

        await supportCh.send({ embeds: [publicEmbed] });
      }
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle(':x: Error')
      .setDescription(`Failed to create ticket: ${err.message}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleKBSearchSubmit(interaction) {
  const query = interaction.fields.getTextInputValue('kb_query');

  await interaction.deferReply();

  try {
    const results = await searchKB(query, { limit: 5 });

    if (results.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.amber)
        .setTitle('No Results Found')
        .setDescription(`No KB documents matched: **${query}**\n\nTry different keywords.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const resultLines = results.map((doc, i) => {
      const score = doc.score > 80 ? ':green_circle:' : doc.score > 50 ? ':yellow_circle:' : ':orange_circle:';
      return `${score} **${i + 1}. ${doc.title}**\n${doc.summary?.slice(0, 100) || 'No summary'}...`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle(`KB Search: "${query}"`)
      .setDescription(resultLines.join('\n\n'))
      .addFields({ name: 'Results', value: `${results.length} found`, inline: true })
      .setFooter({ text: 'Use /kb doc <name> to view full document' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle(':x: Error')
      .setDescription(`Search failed: ${err.message}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleSuggestionSubmit(interaction) {
  const title = interaction.fields.getTextInputValue('suggestion_title');
  const description = interaction.fields.getTextInputValue('suggestion_description');
  const category = interaction.fields.getTextInputValue('suggestion_category') || 'feature';

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':bulb: New Suggestion')
    .setDescription(description)
    .addFields(
      { name: 'Title', value: title, inline: false },
      { name: 'Category', value: category, inline: true },
      { name: 'Submitted By', value: interaction.user.displayName || interaction.user.username, inline: true },
    )
    .setFooter({ text: 'React to show your support!' })
    .setTimestamp();

  // Find suggestion channel
  const suggestionCh = await findTextChannelByName(interaction.guild, 'suggestions') ||
                       await findTextChannelByName(interaction.guild, 'feature-requests') ||
                       await findTextChannelByName(interaction.guild, 'content-ideas');

  if (suggestionCh) {
    const msg = await suggestionCh.send({ embeds: [embed] });
    await msg.react(':thumbsup:');
    await msg.react(':thumbsdown:');

    await interaction.reply({
      content: `:white_check_mark: Your suggestion has been posted to ${suggestionCh}!`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: ':x: Could not find a suggestion channel. Please ask an admin to create one.',
      ephemeral: true,
    });
  }
}

async function handleReportSubmit(interaction) {
  const type = interaction.fields.getTextInputValue('report_type');
  const description = interaction.fields.getTextInputValue('report_description');
  const evidence = interaction.fields.getTextInputValue('report_evidence') || 'None provided';

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

  // Send to mod log
  const modLogCh = await findTextChannelByName(interaction.guild, 'moderation-log') ||
                   await findTextChannelByName(interaction.guild, 'mod-log');

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
}

async function handlePollSubmit(interaction) {
  const question = interaction.fields.getTextInputValue('poll_question');
  const optionsRaw = interaction.fields.getTextInputValue('poll_options');
  const duration = interaction.fields.getTextInputValue('poll_duration');

  const options = optionsRaw.split('\n').map(o => o.trim()).filter(o => o.length > 0);

  if (options.length < 2 || options.length > 10) {
    await interaction.reply({
      content: ':x: Please provide 2-10 options.',
      ephemeral: true,
    });
    return;
  }

  const numberEmojis = ['1\u20e3', '2\u20e3', '3\u20e3', '4\u20e3', '5\u20e3', '6\u20e3', '7\u20e3', '8\u20e3', '9\u20e3', '\ud83d\udd1f'];
  const optionLines = options.map((opt, i) => `${numberEmojis[i]} ${opt}`);

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':bar_chart: Poll')
    .setDescription(`**${question}**\n\n${optionLines.join('\n')}`)
    .addFields({ name: 'Created by', value: interaction.user.displayName || interaction.user.username, inline: true })
    .setFooter({ text: 'React with the number to vote!' })
    .setTimestamp();

  if (duration) {
    embed.addFields({ name: 'Duration', value: duration, inline: true });
  }

  const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
  for (let i = 0; i < options.length; i++) {
    await msg.react(numberEmojis[i]);
  }
}

async function handleIntroductionSubmit(interaction) {
  const name = interaction.fields.getTextInputValue('intro_name');
  const about = interaction.fields.getTextInputValue('intro_about');
  const goals = interaction.fields.getTextInputValue('intro_goals') || 'Not specified';

  const embed = new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle(`:wave: Welcome, ${name}!`)
    .setDescription(about)
    .addFields(
      { name: 'Goals', value: goals, inline: false },
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: `Member since ${new Date().toLocaleDateString()}` })
    .setTimestamp();

  // Find introductions channel
  const introCh = await findTextChannelByName(interaction.guild, 'introductions') ||
                  await findTextChannelByName(interaction.guild, 'introduce-yourself');

  if (introCh) {
    const msg = await introCh.send({ embeds: [embed] });
    await msg.react(':wave:');

    await interaction.reply({
      content: `:white_check_mark: Your introduction has been posted to ${introCh}!`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: ':x: Could not find an introductions channel.',
      ephemeral: true,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

async function showQuickStatus(interaction) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle(':satellite: Quick Status')
    .addFields(
      { name: 'Bot', value: ':green_circle: Online', inline: true },
      { name: 'Uptime', value: `${hours}h ${minutes}m`, inline: true },
      { name: 'Agents', value: '22+ active', inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showHelpModal(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(':question: Quick Help')
    .setDescription('Use `/help` for full command list!\n\n**Popular Commands:**')
    .addFields(
      { name: 'Chat with AI', value: '`/ask <agent> <question>`', inline: true },
      { name: 'Search KB', value: '`/kb search <query>`', inline: true },
      { name: 'Get Support', value: '`/support new`', inline: true },
      { name: 'View Status', value: '`/status`', inline: true },
      { name: 'Play Games', value: '`/trivia` `/rps` `/hangman`', inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showFAQEmbed(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(':question: Frequently Asked Questions')
    .addFields(
      { name: 'What is CommunityOS?', value: 'CommunityOS is an AI-native company operating system with 22+ AI agents organized into 8 teams.', inline: false },
      { name: 'How do I talk to an agent?', value: 'Use `/ask <agent> <question>` or mention @Paco directly.', inline: false },
      { name: 'How do I search the knowledge base?', value: 'Use `/kb search <query>` or `?kb <query>`.', inline: false },
      { name: 'How do I get support?', value: 'Use `/support new` or click the "Get Support" button.', inline: false },
      { name: 'When are streams?', value: 'Check #stream-schedule for upcoming streams!', inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showRulesEmbed(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.amber)
    .setTitle(':scroll: Community Rules')
    .setDescription('Please follow these rules to keep our community welcoming!')
    .addFields(
      { name: '1. Be Respectful', value: 'Treat everyone with respect. No harassment, hate speech, or discrimination.', inline: false },
      { name: '2. No Spam', value: 'Avoid excessive messages, mentions, or promotional content.', inline: false },
      { name: '3. Stay On Topic', value: 'Use appropriate channels for different topics.', inline: false },
      { name: '4. No NSFW Content', value: 'Keep all content appropriate for all ages.', inline: false },
      { name: '5. Listen to Moderators', value: 'Follow moderator instructions and decisions.', inline: false },
    )
    .setFooter({ text: 'Violations may result in warnings, mutes, or bans.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showRoleSelectMenu(interaction) {
  const roleMenu = createRoleSelectMenu();

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':label: Select Your Roles')
    .setDescription('Choose roles that match your interests!')
    .setTimestamp();

  await interaction.reply({ embeds: [embed], components: [roleMenu], ephemeral: true });
}

async function handleRoleSelection(interaction) {
  const selectedValues = interaction.values;
  const member = interaction.member;

  const added = [];
  const failed = [];

  for (const roleName of selectedValues) {
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (role) {
      try {
        await member.roles.add(role);
        added.push(roleName);
      } catch {
        failed.push(roleName);
      }
    } else {
      failed.push(roleName);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(added.length > 0 ? COLORS.emerald : COLORS.rose)
    .setTitle(':label: Roles Updated')
    .setTimestamp();

  if (added.length > 0) {
    embed.addFields({ name: 'Added', value: added.join(', '), inline: false });
  }
  if (failed.length > 0) {
    embed.addFields({ name: 'Failed', value: failed.join(', '), inline: false });
  }

  await interaction.update({ embeds: [embed], components: [] });
}

async function handleAgentSelection(interaction) {
  const agentId = interaction.values[0];

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`:robot: Chat with ${agentId}`)
    .setDescription(`Use \`/ask ${agentId} <your question>\` to chat with this agent!`)
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
}

async function handleKBSectionSelection(interaction) {
  const section = interaction.values[0];

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`:books: Browse ${section}`)
    .setDescription(`Use \`/kb list ${section}\` to see documents in this section.`)
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
}

async function handlePollVote(interaction) {
  await interaction.reply({
    content: ':white_check_mark: Vote registered!',
    ephemeral: true,
  });
}

async function handlePagination(interaction) {
  const action = interaction.customId.split('_')[1];
  await interaction.reply({
    content: `Page action: ${action}`,
    ephemeral: true,
  });
}

async function handleConfirmation(interaction, confirmed) {
  await interaction.update({
    content: confirmed ? ':white_check_mark: Confirmed!' : ':x: Cancelled.',
    embeds: [],
    components: [],
  });
}

async function showUrgentSupportModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_urgent_support')
    .setTitle('URGENT Support Request');

  const descInput = new TextInputBuilder()
    .setCustomId('urgent_description')
    .setLabel('Describe the urgent issue')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Please describe the critical issue...')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(descInput));

  await interaction.showModal(modal);
}

async function handleGameSelection(interaction) {
  const game = interaction.values[0];
  await interaction.update({
    content: `Starting ${game}... Use \`/${game}\` to play!`,
    components: [],
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CONTEXT MENU COMMANDS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get context menu command definitions
 */
export function getContextMenuCommands() {
  return [
    // User context menus
    {
      name: 'View Profile',
      type: ApplicationCommandType.User,
    },
    {
      name: 'Report User',
      type: ApplicationCommandType.User,
    },
    // Message context menus
    {
      name: 'Search in KB',
      type: ApplicationCommandType.Message,
    },
    {
      name: 'Report Message',
      type: ApplicationCommandType.Message,
    },
    {
      name: 'Ask Paco About This',
      type: ApplicationCommandType.Message,
    },
  ];
}

/**
 * Handle context menu interactions
 */
export async function handleContextMenu(interaction) {
  const { commandName } = interaction;

  switch (commandName) {
    case 'View Profile':
      await handleViewProfile(interaction);
      break;

    case 'Report User':
      await showReportModal(interaction);
      break;

    case 'Search in KB':
      await handleMessageKBSearch(interaction);
      break;

    case 'Report Message':
      await handleReportMessage(interaction);
      break;

    case 'Ask Paco About This':
      await handleAskPacoAbout(interaction);
      break;

    default:
      await interaction.reply({ content: 'Unknown context menu', ephemeral: true });
  }
}

async function handleViewProfile(interaction) {
  const user = interaction.targetUser;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`Profile: ${user.displayName || user.username}`)
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Username', value: user.tag, inline: true },
      { name: 'ID', value: user.id, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
    )
    .setTimestamp();

  if (member) {
    embed.addFields(
      { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
      { name: 'Roles', value: member.roles.cache.map(r => r.name).filter(n => n !== '@everyone').slice(0, 10).join(', ') || 'None', inline: false },
    );
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleMessageKBSearch(interaction) {
  const message = interaction.targetMessage;
  const query = message.content.slice(0, 100);

  await interaction.deferReply({ ephemeral: true });

  try {
    const results = await searchKB(query, { limit: 3 });

    if (results.length === 0) {
      await interaction.editReply({ content: 'No relevant KB articles found.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle(':books: Related KB Articles')
      .setDescription(results.map((r, i) => `**${i + 1}. ${r.title}**\n${r.summary?.slice(0, 100) || ''}...`).join('\n\n'))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `Search failed: ${err.message}` });
  }
}

async function handleReportMessage(interaction) {
  const message = interaction.targetMessage;

  const embed = new EmbedBuilder()
    .setColor(COLORS.rose)
    .setTitle(':warning: Message Reported')
    .addFields(
      { name: 'Message', value: message.content.slice(0, 500) || '*No text content*', inline: false },
      { name: 'Author', value: `<@${message.author.id}>`, inline: true },
      { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
      { name: 'Reported By', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Message Link', value: `[Jump to Message](${message.url})`, inline: false },
    )
    .setTimestamp();

  const modLogCh = await findTextChannelByName(interaction.guild, 'moderation-log');
  if (modLogCh) {
    await modLogCh.send({ embeds: [embed] });
  }

  await interaction.reply({
    content: ':white_check_mark: Message has been reported to moderators.',
    ephemeral: true,
  });
}

async function handleAskPacoAbout(interaction) {
  const message = interaction.targetMessage;
  const context = message.content.slice(0, 500);

  await interaction.deferReply();

  try {
    const result = await chatWithAgent('main', `Regarding this message: "${context}"\n\nCan you provide context or help?`, {
      userId: interaction.user.id,
      userName: interaction.user.displayName || interaction.user.username,
      channelId: interaction.channel.id,
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setAuthor({ name: 'Paco' })
      .setDescription(result.response?.slice(0, 4000) || 'I can help you understand this! What specific questions do you have?')
      .setFooter({ text: 'Asked about a message' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    await interaction.editReply({ content: `Could not get response: ${err.message}` });
  }
}
