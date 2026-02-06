// CommunityOS Discord Bot - Paco Hub Integration Module
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { EmbedBuilder } from 'discord.js';
import { COLORS, API_ENDPOINTS, LINKS } from '../config/constants.js';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const MEMORY_PATH = join(CONTROL_CENTER, 'MEMORY', 'discord_interactions.jsonl');

/**
 * Logs an interaction to CONTROL_CENTER/MEMORY
 */
export async function logInteraction(interaction) {
  try {
    const dir = dirname(MEMORY_PATH);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      source: 'discord',
      ...interaction,
    };

    const line = JSON.stringify(entry) + '\n';
    await writeFile(MEMORY_PATH, line, { flag: 'a' });

    return true;
  } catch (err) {
    console.error('Failed to log interaction:', err.message);
    return false;
  }
}

/**
 * Sends a message to Paco Hub /api/discord/messages
 */
export async function sendToHub(message, type = 'message') {
  try {
    const payload = {
      type,
      timestamp: new Date().toISOString(),
      source: 'discord',
      data: {
        messageId: message.id,
        channelId: message.channel.id,
        channelName: message.channel.name,
        guildId: message.guild?.id,
        guildName: message.guild?.name,
        author: {
          id: message.author.id,
          username: message.author.username,
          displayName: message.author.displayName || message.author.username,
          bot: message.author.bot,
        },
        content: message.content,
        attachments: message.attachments.map(a => ({
          id: a.id,
          name: a.name,
          url: a.url,
          size: a.size,
        })),
      },
    };

    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.messages}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.error('Failed to send to hub:', err.message);
    return false;
  }
}

/**
 * Searches knowledge base via Paco Hub
 */
export async function searchKB(query, limit = 5) {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });

    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.kbSearch}?${params.toString()}`);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('KB search error:', err.message);
    return [];
  }
}

/**
 * Routes a question to a specific agent via orchestrator
 */
export async function askAgent(agentId, question, context = {}) {
  try {
    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.agentInteract}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        message: question,
        context: {
          ...context,
          source: 'discord',
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      response: data.response || data.message,
      agentName: data.agentName || agentId,
      agentId: data.agentId || agentId,
    };
  } catch (err) {
    console.error('Agent interaction error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Creates a support ticket via Paco Hub
 */
export async function createTicket(ticketData) {
  try {
    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.support}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData),
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      ticket: data.ticket,
    };
  } catch (err) {
    console.error('Ticket creation error:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Gets system status from various services
 */
export async function getSystemStatus() {
  const services = [];

  // Check Paco Hub
  try {
    const res = await fetch(`${API_ENDPOINTS.base}/api/health`, { method: 'GET' });
    services.push({
      name: 'Paco Hub',
      status: res.ok ? 'up' : 'down',
      latency: null,
    });
  } catch {
    services.push({ name: 'Paco Hub', status: 'down', latency: null });
  }

  // Check orchestrator
  try {
    const res = await fetch(`${API_ENDPOINTS.base}/api/orchestrator/status`, { method: 'GET' });
    services.push({
      name: 'Orchestrator',
      status: res.ok ? 'up' : 'down',
      latency: null,
    });
  } catch {
    services.push({ name: 'Orchestrator', status: 'down', latency: null });
  }

  // Check KB
  try {
    const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.kbSearch}?q=test`, { method: 'GET' });
    services.push({
      name: 'Knowledge Base',
      status: res.ok ? 'up' : 'down',
      latency: null,
    });
  } catch {
    services.push({ name: 'Knowledge Base', status: 'down', latency: null });
  }

  return services;
}

/**
 * Creates a KB search results embed
 */
export function createKBResultsEmbed(query, results) {
  if (results.length === 0) {
    return new EmbedBuilder()
      .setColor(COLORS.amber)
      .setTitle('No KB Results')
      .setDescription(`No results found for: **${query}**\n\nTry different keywords or ask an agent with \`/ask paco ${query}\``)
      .setFooter({ text: 'CommunityOS Knowledge Base' })
      .setTimestamp();
  }

  const resultLines = results.slice(0, 5).map((r, i) =>
    `**${i + 1}. ${r.title || r.name || 'Untitled'}**\n${(r.summary || r.content || r.excerpt || '').slice(0, 150)}...`
  );

  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`KB: "${query}"`)
    .setDescription(resultLines.join('\n\n'))
    .addFields(
      { name: 'Results', value: `${results.length} found`, inline: true },
      { name: 'Full Search', value: `[Paco Hub KB](${LINKS.pacoHub}/kb?q=${encodeURIComponent(query)})`, inline: true },
    )
    .setFooter({ text: 'CommunityOS Knowledge Base' })
    .setTimestamp();
}

/**
 * Creates an agent response embed
 */
export function createAgentResponseEmbed(agentName, response, question) {
  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setAuthor({ name: agentName })
    .setDescription(response.slice(0, 4000))
    .addFields({ name: 'Your Question', value: question.slice(0, 256), inline: false })
    .setFooter({ text: 'CommunityOS AI Agent' })
    .setTimestamp();
}

/**
 * Creates a ticket created embed
 */
export function createTicketEmbed(ticket) {
  const priorityColors = {
    critical: COLORS.rose,
    high: COLORS.amber,
    medium: COLORS.cyan,
    low: COLORS.indigo,
  };

  return new EmbedBuilder()
    .setColor(priorityColors[ticket.priority] || COLORS.cyan)
    .setTitle('Support Ticket Created')
    .setDescription(`Your ticket has been submitted successfully.`)
    .addFields(
      { name: 'Ticket ID', value: `\`${ticket.id}\``, inline: true },
      { name: 'Priority', value: ticket.priority || 'medium', inline: true },
      { name: 'Status', value: ticket.status || 'open', inline: true },
    )
    .setFooter({ text: 'CommunityOS Support' })
    .setTimestamp();
}
