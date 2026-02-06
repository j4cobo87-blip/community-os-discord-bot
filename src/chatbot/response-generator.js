// CommunityOS Discord Bot - Response Generator Module
// Uses Anthropic/OpenRouter API for intelligent responses

import { EmbedBuilder } from 'discord.js';
import { COLORS, API_ENDPOINTS, LINKS } from '../config/constants.js';
import { searchKB } from '../modules/integration.js';

// Rate limiting
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

// Response cache for similar questions
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes

/**
 * Rate limit check for a user
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimits.get(userId) || { count: 0, windowStart: now };

  // Reset window if expired
  if (now - userLimits.windowStart > RATE_LIMIT_WINDOW) {
    userLimits.count = 0;
    userLimits.windowStart = now;
  }

  if (userLimits.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: RATE_LIMIT_WINDOW - (now - userLimits.windowStart),
    };
  }

  userLimits.count++;
  rateLimits.set(userId, userLimits);

  return { allowed: true };
}

/**
 * Generate cache key for a request
 */
function getCacheKey(prompt, channelName, agentId) {
  // Simple hash-like key
  const normalized = prompt.toLowerCase().trim().slice(0, 100);
  return `${agentId}:${channelName}:${normalized}`;
}

/**
 * Check response cache
 */
function checkCache(cacheKey) {
  const cached = responseCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    responseCache.delete(cacheKey);
    return null;
  }

  return cached.response;
}

/**
 * Store in response cache
 */
function cacheResponse(cacheKey, response) {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now(),
  });

  // Clean old entries periodically
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        responseCache.delete(key);
      }
    }
  }
}

/**
 * Generates an intelligent response using AI
 */
export async function generateResponse({
  prompt,
  systemPrompt,
  channelName,
  channelContext,
  userContext,
  agentId,
  userId,
  maxTokens = 1000,
}) {
  // Check rate limit
  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: 'rate_limited',
      retryAfter: rateCheck.retryAfter,
      response: `You're sending messages too quickly. Please wait ${Math.ceil(rateCheck.retryAfter / 1000)} seconds.`,
    };
  }

  // Check cache
  const cacheKey = getCacheKey(prompt, channelName, agentId);
  const cachedResponse = checkCache(cacheKey);
  if (cachedResponse) {
    return {
      success: true,
      response: cachedResponse,
      cached: true,
    };
  }

  // Build the full prompt with context
  const fullPrompt = buildFullPrompt({
    prompt,
    channelName,
    channelContext,
    userContext,
  });

  // Try Paco Hub API first (which may use Anthropic/OpenRouter)
  try {
    const hubResponse = await callPacoHubAPI({
      agentId,
      message: fullPrompt,
      systemPrompt,
      userId,
      channelName,
      maxTokens,
    });

    if (hubResponse.success) {
      cacheResponse(cacheKey, hubResponse.response);
      return hubResponse;
    }
  } catch (err) {
    console.error('Paco Hub API error:', err.message);
  }

  // Fallback to direct API call if configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (anthropicKey) {
    try {
      const response = await callAnthropicAPI({
        prompt: fullPrompt,
        systemPrompt,
        maxTokens,
        apiKey: anthropicKey,
      });

      if (response.success) {
        cacheResponse(cacheKey, response.response);
        return response;
      }
    } catch (err) {
      console.error('Anthropic API error:', err.message);
    }
  }

  if (openrouterKey) {
    try {
      const response = await callOpenRouterAPI({
        prompt: fullPrompt,
        systemPrompt,
        maxTokens,
        apiKey: openrouterKey,
      });

      if (response.success) {
        cacheResponse(cacheKey, response.response);
        return response;
      }
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
    }
  }

  // Final fallback - generate a simple response
  return generateFallbackResponse(prompt, agentId);
}

/**
 * Builds the full prompt with context
 */
function buildFullPrompt({ prompt, channelName, channelContext, userContext }) {
  const parts = [];

  if (channelContext) {
    parts.push('## Recent Conversation in #' + channelName);
    parts.push(channelContext);
    parts.push('');
  }

  if (userContext) {
    parts.push('## About this User');
    parts.push(userContext);
    parts.push('');
  }

  parts.push('## User Message');
  parts.push(prompt);

  return parts.join('\n');
}

/**
 * Calls Paco Hub agent interact API
 */
async function callPacoHubAPI({ agentId, message, systemPrompt, userId, channelName, maxTokens }) {
  const res = await fetch(`${API_ENDPOINTS.base}${API_ENDPOINTS.agentInteract}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId,
      message,
      systemPrompt,
      context: {
        source: 'discord-chatbot',
        userId,
        channelName,
        maxTokens,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status}`);
  }

  const data = await res.json();

  return {
    success: true,
    response: data.response || data.message || 'I processed your request.',
    agentName: data.agentName || agentId,
  };
}

/**
 * Calls Anthropic API directly
 */
async function callAnthropicAPI({ prompt, systemPrompt, maxTokens, apiKey }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Use Haiku for fast responses
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Anthropic API error: ${res.status} - ${error}`);
  }

  const data = await res.json();

  return {
    success: true,
    response: data.content?.[0]?.text || 'I processed your request.',
  };
}

/**
 * Calls OpenRouter API
 */
async function callOpenRouterAPI({ prompt, systemPrompt, maxTokens, apiKey }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://communityos.ai',
      'X-Title': 'CommunityOS Discord Bot',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} - ${error}`);
  }

  const data = await res.json();

  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'I processed your request.',
  };
}

/**
 * Generates a fallback response when APIs are unavailable
 */
function generateFallbackResponse(prompt, agentId) {
  const promptLower = prompt.toLowerCase();

  // Check for common patterns and provide helpful responses
  if (promptLower.includes('help') || promptLower.includes('how do i')) {
    return {
      success: true,
      response: `I'd love to help! Here are some options:\n\n` +
        `- Use \`/kb <query>\` to search the knowledge base\n` +
        `- Use \`/ask <agent> <question>\` to ask a specific agent\n` +
        `- Check the [Paco Hub](${LINKS.pacoHub}) for more resources\n\n` +
        `What specifically are you looking for?`,
      fallback: true,
    };
  }

  if (promptLower.includes('bug') || promptLower.includes('error') || promptLower.includes('broken')) {
    return {
      success: true,
      response: `I see you might be experiencing an issue. Here's how to get help:\n\n` +
        `1. Check #bug-reports for similar issues\n` +
        `2. Use \`/ticket <description>\` to create a support ticket\n` +
        `3. Include steps to reproduce, expected behavior, and actual behavior\n\n` +
        `Our QA Guardian will review it!`,
      fallback: true,
    };
  }

  if (promptLower.includes('stream') || promptLower.includes('live')) {
    return {
      success: true,
      response: `Looking for stream info?\n\n` +
        `- Check #stream-schedule for upcoming streams\n` +
        `- Use \`/schedule\` to see the latest schedule\n` +
        `- YouTube: ${LINKS.youtube}\n` +
        `- Twitch: ${LINKS.twitch}`,
      fallback: true,
    };
  }

  // Generic fallback
  return {
    success: true,
    response: `Thanks for your message! I'm currently in fallback mode, but I can still help:\n\n` +
      `- Use \`/kb <query>\` to search knowledge base\n` +
      `- Use \`/ask paco <question>\` for a direct answer\n` +
      `- Check [Paco Hub](${LINKS.pacoHub}) for more options`,
    fallback: true,
  };
}

/**
 * Generates a response with KB context
 */
export async function generateResponseWithKB({
  prompt,
  systemPrompt,
  channelName,
  channelContext,
  userContext,
  agentId,
  userId,
}) {
  // Search KB for relevant content
  const keywords = extractKeywords(prompt);
  let kbContext = '';

  if (keywords.length > 0) {
    const searchQuery = keywords.slice(0, 3).join(' ');
    const kbResults = await searchKB(searchQuery, 3);

    if (kbResults.length > 0) {
      kbContext = '\n\n## Relevant Knowledge Base Content\n';
      kbContext += kbResults.map(r =>
        `### ${r.title || r.name}\n${(r.summary || r.content || '').slice(0, 300)}...`
      ).join('\n\n');
    }
  }

  // Add KB context to the prompt
  const enhancedPrompt = prompt + kbContext;

  return generateResponse({
    prompt: enhancedPrompt,
    systemPrompt,
    channelName,
    channelContext,
    userContext,
    agentId,
    userId,
  });
}

/**
 * Extracts keywords from a prompt
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'i', 'me', 'my', 'myself', 'we', 'our',
    'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they',
    'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
    'those', 'am', 'about', 'any', 'both', 'get', 'got', 'hi', 'hey', 'hello',
  ]);

  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Return unique keywords
  return [...new Set(words)];
}

/**
 * Creates a Discord embed for the response
 */
export function createResponseEmbed(agentName, response, emoji = ':robot:') {
  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setAuthor({ name: `${emoji} ${agentName}` })
    .setDescription(response.slice(0, 4000))
    .setFooter({ text: 'CommunityOS AI Agent' })
    .setTimestamp();
}

/**
 * Creates a rate limit warning embed
 */
export function createRateLimitEmbed(retryAfter) {
  return new EmbedBuilder()
    .setColor(COLORS.amber)
    .setTitle('Slow Down!')
    .setDescription(`You're sending messages too quickly. Please wait ${Math.ceil(retryAfter / 1000)} seconds.`)
    .setFooter({ text: 'CommunityOS Rate Limit' })
    .setTimestamp();
}

/**
 * Gets current rate limit status for a user
 */
export function getRateLimitStatus(userId) {
  const userLimits = rateLimits.get(userId);

  if (!userLimits) {
    return {
      used: 0,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetsIn: RATE_LIMIT_WINDOW,
    };
  }

  const now = Date.now();
  const elapsed = now - userLimits.windowStart;

  if (elapsed > RATE_LIMIT_WINDOW) {
    return {
      used: 0,
      remaining: RATE_LIMIT_MAX_REQUESTS,
      resetsIn: RATE_LIMIT_WINDOW,
    };
  }

  return {
    used: userLimits.count,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - userLimits.count),
    resetsIn: RATE_LIMIT_WINDOW - elapsed,
  };
}

/**
 * Clears rate limit for a user (admin function)
 */
export function clearRateLimit(userId) {
  rateLimits.delete(userId);
  return true;
}

/**
 * Clears the response cache
 */
export function clearResponseCache() {
  responseCache.clear();
  return true;
}
