// CommunityOS Discord Bot - Auto-Response Bots Module
import { EmbedBuilder } from 'discord.js';
import { COLORS, FAQ_RESPONSES, LINKS, API_ENDPOINTS } from '../config/constants.js';
import { findTextChannelByName } from './channels.js';
import { logInteraction } from './integration.js';

/**
 * KB Search Bot - Responds to ?kb <query> or /kb commands
 */
export async function handleKBSearch(message, query) {
  if (!query || query.trim().length === 0) {
    const helpEmbed = new EmbedBuilder()
      .setColor(COLORS.amber)
      .setTitle('Knowledge Base Search')
      .setDescription('Usage: `?kb <query>` or `/kb <query>`\n\nExample: `?kb how to create an agent`')
      .setFooter({ text: 'CommunityOS Knowledge Base' })
      .setTimestamp();

    return message.reply({ embeds: [helpEmbed] });
  }

  // Show searching indicator
  const searchingEmbed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setDescription(`Searching knowledge base for: **${query}**...`)
    .setTimestamp();

  const reply = await message.reply({ embeds: [searchingEmbed] });

  try {
    // Call Paco Hub KB search API
    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.kbSearch}?q=${encodeURIComponent(query)}`);

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      const noResultsEmbed = new EmbedBuilder()
        .setColor(COLORS.amber)
        .setTitle('No Results Found')
        .setDescription(`No knowledge base entries found for: **${query}**\n\nTry different keywords or ask an agent with \`/ask paco ${query}\``)
        .setFooter({ text: 'CommunityOS KB' })
        .setTimestamp();

      await reply.edit({ embeds: [noResultsEmbed] });
      return;
    }

    const resultLines = results.slice(0, 5).map((r, i) =>
      `**${i + 1}. ${r.title || r.name || 'Untitled'}**\n${(r.summary || r.content || '').slice(0, 100)}...`
    );

    const resultsEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle(`KB Results: "${query}"`)
      .setDescription(resultLines.join('\n\n'))
      .addFields(
        { name: 'Total Results', value: `${results.length}`, inline: true },
        { name: 'Full Search', value: `[View in Paco Hub](${LINKS.pacoHub}/kb?q=${encodeURIComponent(query)})`, inline: true },
      )
      .setFooter({ text: 'CommunityOS Knowledge Base' })
      .setTimestamp();

    await reply.edit({ embeds: [resultsEmbed] });

    // Log the interaction
    await logInteraction({
      type: 'kb_search',
      query,
      resultCount: results.length,
      userId: message.author.id,
      channelId: message.channel.id,
    });

  } catch (err) {
    console.error('KB search error:', err.message);

    const errorEmbed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle('KB Search Error')
      .setDescription(`Could not search knowledge base: ${err.message}\n\nTry the [Paco Hub](${LINKS.pacoHub}/kb) directly.`)
      .setTimestamp();

    await reply.edit({ embeds: [errorEmbed] });
  }
}

/**
 * Agent Chat Bot - Responds to @Paco or !paco messages
 */
export async function handleAgentChat(message, agentId = 'main', question) {
  if (!question || question.trim().length === 0) {
    const helpEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setDescription('Hey! I\'m Paco. Ask me anything by mentioning me or using `!paco <question>`')
      .setFooter({ text: 'CommunityOS Orchestrator' })
      .setTimestamp();

    return message.reply({ embeds: [helpEmbed] });
  }

  // Show thinking indicator
  const thinkingEmbed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setDescription(`Paco is thinking about: **${question.slice(0, 100)}**...`)
    .setTimestamp();

  const reply = await message.reply({ embeds: [thinkingEmbed] });

  try {
    // Call Paco Hub agent interact API
    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.agentInteract}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        message: question,
        context: {
          source: 'discord',
          userId: message.author.id,
          userName: message.author.displayName || message.author.username,
          channelId: message.channel.id,
          channelName: message.channel.name,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }

    const data = await res.json();
    const response = data.response || data.message || 'I processed your request but have no specific response.';

    const responseEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setAuthor({ name: data.agentName || 'Paco' })
      .setDescription(response.slice(0, 4000))
      .setFooter({ text: 'CommunityOS AI Agent' })
      .setTimestamp();

    await reply.edit({ embeds: [responseEmbed] });

    // Log the interaction
    await logInteraction({
      type: 'agent_chat',
      agentId,
      question,
      response: response.slice(0, 500),
      userId: message.author.id,
      channelId: message.channel.id,
    });

  } catch (err) {
    console.error('Agent chat error:', err.message);

    // Fallback to local persona response
    const fallbackEmbed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setAuthor({ name: 'Paco' })
      .setDescription(
        `I'm having trouble connecting to my full brain right now, but I can still help!\n\n` +
        `**Your question:** *"${question.slice(0, 200)}"*\n\n` +
        `Try:\n` +
        `- Using \`/ask paco ${question.slice(0, 50)}\` for a direct command\n` +
        `- Checking the [Paco Hub](${LINKS.pacoHub}/chat) for full AI chat\n` +
        `- Searching the KB with \`?kb ${question.split(' ').slice(0, 3).join(' ')}\``
      )
      .setFooter({ text: 'CommunityOS - Fallback Mode' })
      .setTimestamp();

    await reply.edit({ embeds: [fallbackEmbed] });
  }
}

/**
 * FAQ Bot - Auto-responds to common questions
 */
export function handleFAQ(message) {
  const content = message.content.toLowerCase();

  for (const [trigger, response] of Object.entries(FAQ_RESPONSES)) {
    if (content.includes(trigger)) {
      const embed = new EmbedBuilder()
        .setColor(response.color || COLORS.cyan)
        .setTitle(response.title)
        .setDescription(response.description)
        .setFooter({ text: 'CommunityOS FAQ' })
        .setTimestamp();

      message.reply({ embeds: [embed] });
      return true;
    }
  }

  return false;
}

/**
 * Support Ticket Bot - Creates tickets from #support messages
 */
export async function handleSupportMessage(message) {
  // Skip if the message is too short or a command
  if (message.content.length < 20 || message.content.startsWith('/') || message.content.startsWith('!')) {
    return false;
  }

  // Create a support ticket
  try {
    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.support}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Discord Support: ${message.content.slice(0, 50)}...`,
        description: message.content,
        priority: 'medium',
        category: 'discord-support',
        customer: {
          name: message.author.displayName || message.author.username,
          email: `${message.author.id}@discord.user`,
          plan: 'community',
        },
        tags: ['discord', 'auto-created'],
        source: {
          type: 'discord',
          channelId: message.channel.id,
          messageId: message.id,
          userId: message.author.id,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const ticket = data.ticket;

      const ticketEmbed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setTitle('Support Ticket Created')
        .setDescription(`I've created a support ticket for you!`)
        .addFields(
          { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
          { name: 'Status', value: 'Open', inline: true },
        )
        .setFooter({ text: 'Our team will respond soon!' })
        .setTimestamp();

      await message.reply({ embeds: [ticketEmbed] });

      // Start a thread for the ticket discussion
      try {
        await message.startThread({
          name: `Ticket: ${ticket.id}`,
          autoArchiveDuration: 1440,
        });
      } catch (err) {
        // Thread creation might fail, that's okay
      }

      return true;
    }
  } catch (err) {
    console.error('Support ticket creation error:', err.message);
  }

  return false;
}

/**
 * Main auto-response handler
 */
export async function handleAutoResponse(message, client) {
  const content = message.content;
  const channelName = message.channel.name;

  // KB Search: ?kb <query>
  if (content.startsWith('?kb ')) {
    const query = content.slice(4).trim();
    await handleKBSearch(message, query);
    return true;
  }

  // Agent Chat: !paco <question> or @Paco mention
  if (content.startsWith('!paco ')) {
    const question = content.slice(6).trim();
    await handleAgentChat(message, 'main', question);
    return true;
  }

  // @Paco mention
  if (message.mentions.has(client.user)) {
    const question = content.replace(/<@!?\d+>/g, '').trim();
    if (question.length > 0) {
      await handleAgentChat(message, 'main', question);
      return true;
    }
  }

  // FAQ check (only in general/community channels)
  if (['general', 'community-chat', 'support'].includes(channelName)) {
    if (handleFAQ(message)) {
      return true;
    }
  }

  // Support channel auto-ticket (only for substantial messages)
  if (channelName === 'support' && content.length >= 50) {
    await handleSupportMessage(message);
    return true;
  }

  return false;
}
