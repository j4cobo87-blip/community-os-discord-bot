// CommunityOS Discord Bot - Chatbot Engine
// Context-aware conversation handling per channel

import { EmbedBuilder } from 'discord.js';
import { COLORS, LINKS } from '../config/constants.js';
import {
  addChannelMessage,
  getConversationContext,
  updateUserMemory,
  recordUserInteraction,
  generateUserContext,
} from './conversation-memory.js';
import {
  getChannelAgentPersona,
  generateAgentSystemPrompt,
  getAgentEmoji,
  getAgentGreeting,
  suggestAgentForTopic,
} from './channel-agents.js';
import {
  generateResponse,
  generateResponseWithKB,
  createResponseEmbed,
  createRateLimitEmbed,
} from './response-generator.js';
import { getChatbotConfig, isChannelEnabled, shouldRespondRandomly } from '../config/chatbot-config.js';

/**
 * Determines if the bot should respond to a message
 * @param {Message} message - Discord message
 * @param {Client} client - Discord client
 * @returns {Object} - { shouldRespond: boolean, reason: string }
 */
export function shouldRespondToMessage(message, client) {
  const config = getChatbotConfig();
  const channelName = message.channel.name;

  // Check if chatbot is enabled for this channel
  if (!isChannelEnabled(channelName)) {
    return { shouldRespond: false, reason: 'channel_disabled' };
  }

  // 1. Direct mention of the bot
  if (message.mentions.has(client.user)) {
    return { shouldRespond: true, reason: 'mentioned' };
  }

  // 2. Reply to a bot message
  if (message.reference) {
    // We'll check if the referenced message is from our bot
    return { shouldRespond: true, reason: 'reply_chain' };
  }

  // 3. Question detection (ends with ?)
  if (message.content.trim().endsWith('?')) {
    // Only respond to questions if configured
    if (config.respondToQuestions) {
      return { shouldRespond: true, reason: 'question' };
    }
  }

  // 4. Keyword triggers
  const triggerKeywords = config.triggerKeywords || ['paco', 'help me', 'anyone know', 'how do i'];
  const contentLower = message.content.toLowerCase();

  for (const keyword of triggerKeywords) {
    if (contentLower.includes(keyword)) {
      return { shouldRespond: true, reason: 'keyword', keyword };
    }
  }

  // 5. Random response (for engagement)
  if (shouldRespondRandomly(channelName)) {
    return { shouldRespond: true, reason: 'random' };
  }

  return { shouldRespond: false, reason: 'no_trigger' };
}

/**
 * Detects the topic of a message for context
 */
export function detectMessageTopic(content) {
  const topicPatterns = {
    'code': /\b(code|function|bug|error|api|database|typescript|javascript|python|react|node)\b/i,
    'support': /\b(help|issue|problem|not working|broken|fix|stuck)\b/i,
    'feature': /\b(feature|idea|suggestion|would be nice|could we|what if)\b/i,
    'streaming': /\b(stream|live|youtube|twitch|broadcast|content)\b/i,
    'career': /\b(job|career|resume|cv|interview|application)\b/i,
    'product': /\b(product|roadmap|milestone|priority|requirement)\b/i,
    'general': /\b(hello|hi|hey|thanks|cool|nice|great|gm)\b/i,
  };

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(content)) {
      return topic;
    }
  }

  return 'general';
}

/**
 * Processes a message and generates a response
 */
export async function processMessage(message, client, options = {}) {
  const channelName = message.channel.name;
  const channelId = message.channel.id;
  const userId = message.author.id;
  const userName = message.author.displayName || message.author.username;

  // Store message in memory
  await addChannelMessage(channelId, channelName, message);
  await updateUserMemory(userId, userName, channelId, channelName, message.content);

  // Check if we should respond
  const responseCheck = shouldRespondToMessage(message, client);

  if (!responseCheck.shouldRespond) {
    return null;
  }

  // Start typing indicator while generating response
  let typingInterval;
  try {
    await message.channel.sendTyping();
    // Keep typing indicator active (Discord stops after 10s, so refresh every 8s)
    typingInterval = setInterval(() => {
      message.channel.sendTyping().catch(() => {});
    }, 8000);
  } catch (err) {
    // Typing indicator failed, continue without it
    console.warn('Could not send typing indicator:', err.message);
  }

  // Check if this is a reply to a bot message
  let isReplyToBot = false;
  if (message.reference) {
    try {
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      isReplyToBot = referencedMessage.author.id === client.user.id;
    } catch {
      // Message might be deleted
    }
  }

  // Skip if not reply to bot and it's a reply chain
  if (responseCheck.reason === 'reply_chain' && !isReplyToBot) {
    return null;
  }

  // Get agent persona for this channel
  const persona = await getChannelAgentPersona(channelName);
  const agentEmoji = getAgentEmoji(persona.agentId);

  // Generate system prompt
  const systemPrompt = await generateAgentSystemPrompt(
    channelName,
    message.channel.topic || ''
  );

  // Get conversation context
  const conversationContext = await getConversationContext(channelId, 10);

  // Get user context
  const userContext = await generateUserContext(userId);

  // Extract the actual question (remove bot mention if present)
  let prompt = message.content.replace(/<@!?\d+>/g, '').trim();

  // If it's empty after removing mentions, use a greeting
  if (!prompt) {
    // Clear typing indicator for greeting
    if (typingInterval) {
      clearInterval(typingInterval);
    }
    const greeting = await getAgentGreeting(channelName);
    return {
      type: 'greeting',
      content: greeting,
      persona,
      emoji: agentEmoji,
    };
  }

  // Detect topic
  const topic = detectMessageTopic(prompt);

  // Check if another agent might be better suited
  const suggestedAgent = suggestAgentForTopic(prompt);
  const config = getChatbotConfig();

  // Generate response
  let response;

  if (config.useKBContext && ['support', 'code', 'product'].includes(topic)) {
    // Use KB-enhanced response for relevant topics
    response = await generateResponseWithKB({
      prompt,
      systemPrompt,
      channelName,
      channelContext: conversationContext,
      userContext,
      agentId: persona.agentId,
      userId,
    });
  } else {
    response = await generateResponse({
      prompt,
      systemPrompt,
      channelName,
      channelContext: conversationContext,
      userContext,
      agentId: persona.agentId,
      userId,
    });
  }

  // Record the interaction
  await recordUserInteraction(userId, {
    type: 'chat',
    channel: channelName,
    topic,
    agentId: persona.agentId,
    trigger: responseCheck.reason,
    success: response.success,
  });

  // Clear typing indicator
  if (typingInterval) {
    clearInterval(typingInterval);
  }

  // Handle rate limit
  if (response.error === 'rate_limited') {
    return {
      type: 'rate_limit',
      retryAfter: response.retryAfter,
    };
  }

  // Check if we should suggest a different agent
  let agentSuggestion = null;
  if (suggestedAgent !== persona.agentId && suggestedAgent !== 'main') {
    agentSuggestion = suggestedAgent;
  }

  return {
    type: 'response',
    content: response.response,
    persona,
    emoji: agentEmoji,
    topic,
    trigger: responseCheck.reason,
    cached: response.cached,
    fallback: response.fallback,
    agentSuggestion,
  };
}

/**
 * Sends the response to Discord
 */
export async function sendResponse(message, responseData) {
  if (!responseData) return null;

  const config = getChatbotConfig();

  // Apply response delay
  const delay = config.responseDelay || 0;
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  switch (responseData.type) {
    case 'greeting': {
      return message.reply(
        `${responseData.emoji} **${responseData.persona.displayName}** here!\n\n${responseData.content}`
      );
    }

    case 'rate_limit': {
      const embed = createRateLimitEmbed(responseData.retryAfter);
      return message.reply({ embeds: [embed], ephemeral: true });
    }

    case 'response': {
      const embed = new EmbedBuilder()
        .setColor(COLORS.cyan)
        .setAuthor({ name: `${responseData.emoji} ${responseData.persona.displayName}` });

      // Add response content
      let description = responseData.content;

      // Add agent suggestion if applicable
      if (responseData.agentSuggestion && config.suggestAgents) {
        description += `\n\n_For more specialized help on this topic, try: \`/ask ${responseData.agentSuggestion} <your question>\`_`;
      }

      embed.setDescription(description.slice(0, 4000));

      // Add footer based on response type
      if (responseData.fallback) {
        embed.setFooter({ text: 'Fallback Mode - Limited AI available' });
        embed.setColor(COLORS.amber);
      } else if (responseData.cached) {
        embed.setFooter({ text: 'Quick response from cache' });
      } else {
        embed.setFooter({ text: `${responseData.persona.displayName} | CommunityOS AI` });
      }

      embed.setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    default:
      return null;
  }
}

/**
 * Main handler for chatbot messages
 */
export async function handleChatbotMessage(message, client) {
  try {
    const responseData = await processMessage(message, client);
    return await sendResponse(message, responseData);
  } catch (err) {
    console.error('Chatbot error:', err.message);

    // Send a friendly error message
    try {
      const errorEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setDescription("I'm having a bit of trouble right now. Please try again in a moment or use `/ask paco` for a direct command.")
        .setFooter({ text: 'CommunityOS Bot Error' })
        .setTimestamp();

      return message.reply({ embeds: [errorEmbed] });
    } catch {
      // Can't even send error message
      return null;
    }
  }
}

/**
 * Handles a reply chain conversation
 */
export async function handleReplyChain(message, client) {
  // Get the thread of messages
  const thread = [];
  let currentMessage = message;

  while (currentMessage.reference && thread.length < 10) {
    try {
      const referencedMessage = await message.channel.messages.fetch(
        currentMessage.reference.messageId
      );
      thread.unshift({
        author: referencedMessage.author.displayName || referencedMessage.author.username,
        content: referencedMessage.content,
        isBot: referencedMessage.author.bot,
      });
      currentMessage = referencedMessage;
    } catch {
      break;
    }
  }

  // Add current message
  thread.push({
    author: message.author.displayName || message.author.username,
    content: message.content,
    isBot: false,
  });

  // Build context from thread
  const threadContext = thread
    .map(m => `${m.isBot ? '[BOT] ' : ''}${m.author}: ${m.content}`)
    .join('\n');

  // Process with thread context
  const persona = await getChannelAgentPersona(message.channel.name);
  const systemPrompt = await generateAgentSystemPrompt(message.channel.name);

  const response = await generateResponse({
    prompt: message.content,
    systemPrompt: systemPrompt + '\n\n## Conversation Thread\n' + threadContext,
    channelName: message.channel.name,
    agentId: persona.agentId,
    userId: message.author.id,
  });

  if (response.success) {
    const embed = createResponseEmbed(
      persona.displayName,
      response.response,
      getAgentEmoji(persona.agentId)
    );
    return message.reply({ embeds: [embed] });
  }

  return null;
}

/**
 * Generates a status report for the chatbot
 */
export function getChatbotStatus() {
  const config = getChatbotConfig();

  return {
    enabled: config.enabled,
    channelCount: Object.keys(config.channels || {}).filter(
      ch => config.channels[ch].enabled
    ).length,
    features: {
      respondToQuestions: config.respondToQuestions,
      useKBContext: config.useKBContext,
      suggestAgents: config.suggestAgents,
      randomResponses: config.randomResponseChance > 0,
    },
  };
}
