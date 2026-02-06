// CommunityOS Discord Bot - Conversation Memory Module
// Stores and retrieves conversation context per channel and user

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const MEMORY_BASE = join(CONTROL_CENTER, 'MEMORY', 'discord');

// In-memory cache for fast access
const channelMemory = new Map();
const userMemory = new Map();

// Maximum messages to keep in channel memory
const MAX_CHANNEL_MESSAGES = 20;
const MAX_USER_INTERACTIONS = 50;

/**
 * Channel Message Entry
 * @typedef {Object} ChannelMessage
 * @property {string} id - Message ID
 * @property {string} userId - Author user ID
 * @property {string} userName - Author display name
 * @property {string} content - Message content
 * @property {string} timestamp - ISO timestamp
 * @property {boolean} isBot - Whether message is from a bot
 * @property {string} [replyToId] - ID of message being replied to
 */

/**
 * User Memory Entry
 * @typedef {Object} UserMemory
 * @property {string} userId - User ID
 * @property {string} userName - Display name
 * @property {string} firstSeen - First interaction timestamp
 * @property {string} lastSeen - Last interaction timestamp
 * @property {number} messageCount - Total messages
 * @property {string[]} preferredTopics - Topics user frequently discusses
 * @property {Object} preferences - User preferences
 * @property {string[]} recentChannels - Recently active channels
 * @property {Object[]} interactions - Recent interactions with bot
 */

/**
 * Gets the file path for channel memory
 */
function getChannelMemoryPath(channelId) {
  return join(MEMORY_BASE, 'channels', `${channelId}.json`);
}

/**
 * Gets the file path for user memory
 */
function getUserMemoryPath(userId) {
  return join(MEMORY_BASE, 'users', `${userId}.json`);
}

/**
 * Loads channel memory from disk
 */
export async function loadChannelMemory(channelId) {
  // Check cache first
  if (channelMemory.has(channelId)) {
    return channelMemory.get(channelId);
  }

  const filePath = getChannelMemoryPath(channelId);

  try {
    if (existsSync(filePath)) {
      const data = JSON.parse(await readFile(filePath, 'utf-8'));
      channelMemory.set(channelId, data);
      return data;
    }
  } catch (err) {
    console.error(`Failed to load channel memory for ${channelId}:`, err.message);
  }

  // Initialize empty memory
  const emptyMemory = {
    channelId,
    channelName: '',
    messages: [],
    topics: [],
    lastActivity: null,
    conversationSummary: null,
  };

  channelMemory.set(channelId, emptyMemory);
  return emptyMemory;
}

/**
 * Saves channel memory to disk
 */
export async function saveChannelMemory(channelId) {
  const memory = channelMemory.get(channelId);
  if (!memory) return;

  const filePath = getChannelMemoryPath(channelId);
  const dir = dirname(filePath);

  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePath, JSON.stringify(memory, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save channel memory for ${channelId}:`, err.message);
  }
}

/**
 * Adds a message to channel memory
 */
export async function addChannelMessage(channelId, channelName, message) {
  const memory = await loadChannelMemory(channelId);

  memory.channelName = channelName;
  memory.lastActivity = new Date().toISOString();

  const messageEntry = {
    id: message.id,
    userId: message.author.id,
    userName: message.author.displayName || message.author.username,
    content: message.content,
    timestamp: message.createdAt?.toISOString() || new Date().toISOString(),
    isBot: message.author.bot,
    replyToId: message.reference?.messageId || null,
  };

  memory.messages.push(messageEntry);

  // Keep only the last N messages
  if (memory.messages.length > MAX_CHANNEL_MESSAGES) {
    memory.messages = memory.messages.slice(-MAX_CHANNEL_MESSAGES);
  }

  // Update topics based on content
  updateChannelTopics(memory, message.content);

  channelMemory.set(channelId, memory);

  // Save asynchronously (don't block)
  saveChannelMemory(channelId).catch(err =>
    console.error('Background save failed:', err.message)
  );

  return memory;
}

/**
 * Gets recent messages from channel memory
 */
export async function getRecentMessages(channelId, count = 10) {
  const memory = await loadChannelMemory(channelId);
  return memory.messages.slice(-count);
}

/**
 * Gets conversation context as a formatted string
 */
export async function getConversationContext(channelId, maxMessages = 10) {
  const messages = await getRecentMessages(channelId, maxMessages);

  if (messages.length === 0) {
    return null;
  }

  const contextLines = messages.map(m => {
    const prefix = m.isBot ? '[BOT]' : '';
    return `${prefix}${m.userName}: ${m.content}`;
  });

  return contextLines.join('\n');
}

/**
 * Updates channel topics based on message content
 */
function updateChannelTopics(memory, content) {
  const topicKeywords = {
    'code': ['code', 'function', 'bug', 'error', 'typescript', 'javascript', 'python', 'api', 'database'],
    'support': ['help', 'issue', 'problem', 'fix', 'broken', 'not working', 'error'],
    'ideas': ['idea', 'suggestion', 'what if', 'could we', 'feature', 'improve'],
    'stream': ['stream', 'live', 'youtube', 'twitch', 'broadcast', 'show'],
    'general': ['hey', 'hello', 'hi', 'thanks', 'cool', 'nice'],
    'agent': ['agent', 'paco', 'bot', 'ai', 'assistant'],
    'project': ['project', 'roadmap', 'milestone', 'deadline', 'task'],
  };

  const contentLower = content.toLowerCase();

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => contentLower.includes(kw))) {
      if (!memory.topics.includes(topic)) {
        memory.topics.push(topic);
        // Keep only last 5 topics
        if (memory.topics.length > 5) {
          memory.topics.shift();
        }
      }
    }
  }
}

/**
 * Loads user memory from disk
 */
export async function loadUserMemory(userId) {
  // Check cache first
  if (userMemory.has(userId)) {
    return userMemory.get(userId);
  }

  const filePath = getUserMemoryPath(userId);

  try {
    if (existsSync(filePath)) {
      const data = JSON.parse(await readFile(filePath, 'utf-8'));
      userMemory.set(userId, data);
      return data;
    }
  } catch (err) {
    console.error(`Failed to load user memory for ${userId}:`, err.message);
  }

  // Initialize empty memory
  const emptyMemory = {
    userId,
    userName: '',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    messageCount: 0,
    preferredTopics: [],
    preferences: {
      responseStyle: 'normal', // 'brief', 'normal', 'detailed'
      notifyOnMention: true,
    },
    recentChannels: [],
    interactions: [],
  };

  userMemory.set(userId, emptyMemory);
  return emptyMemory;
}

/**
 * Saves user memory to disk
 */
export async function saveUserMemory(userId) {
  const memory = userMemory.get(userId);
  if (!memory) return;

  const filePath = getUserMemoryPath(userId);
  const dir = dirname(filePath);

  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(filePath, JSON.stringify(memory, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save user memory for ${userId}:`, err.message);
  }
}

/**
 * Updates user memory with new interaction
 */
export async function updateUserMemory(userId, userName, channelId, channelName, messageContent) {
  const memory = await loadUserMemory(userId);

  memory.userName = userName;
  memory.lastSeen = new Date().toISOString();
  memory.messageCount++;

  // Track recent channels
  if (!memory.recentChannels.includes(channelName)) {
    memory.recentChannels.unshift(channelName);
    if (memory.recentChannels.length > 5) {
      memory.recentChannels.pop();
    }
  }

  // Extract potential topics from message
  updateUserTopics(memory, messageContent);

  userMemory.set(userId, memory);

  // Save asynchronously
  saveUserMemory(userId).catch(err =>
    console.error('Background user save failed:', err.message)
  );

  return memory;
}

/**
 * Records an interaction with the bot
 */
export async function recordUserInteraction(userId, interaction) {
  const memory = await loadUserMemory(userId);

  memory.interactions.unshift({
    timestamp: new Date().toISOString(),
    ...interaction,
  });

  // Keep only recent interactions
  if (memory.interactions.length > MAX_USER_INTERACTIONS) {
    memory.interactions = memory.interactions.slice(0, MAX_USER_INTERACTIONS);
  }

  userMemory.set(userId, memory);
  saveUserMemory(userId).catch(err =>
    console.error('Background interaction save failed:', err.message)
  );

  return memory;
}

/**
 * Updates user preferred topics
 */
function updateUserTopics(memory, content) {
  const topicIndicators = {
    'development': ['code', 'programming', 'dev', 'build', 'api', 'database'],
    'streaming': ['stream', 'live', 'youtube', 'twitch', 'content'],
    'support': ['help', 'support', 'issue', 'bug', 'problem'],
    'career': ['job', 'career', 'resume', 'cv', 'interview'],
    'product': ['feature', 'product', 'roadmap', 'design', 'ux'],
  };

  const contentLower = content.toLowerCase();

  for (const [topic, indicators] of Object.entries(topicIndicators)) {
    if (indicators.some(ind => contentLower.includes(ind))) {
      if (!memory.preferredTopics.includes(topic)) {
        memory.preferredTopics.push(topic);
        if (memory.preferredTopics.length > 5) {
          memory.preferredTopics.shift();
        }
      }
    }
  }
}

/**
 * Gets user preferences
 */
export async function getUserPreferences(userId) {
  const memory = await loadUserMemory(userId);
  return memory.preferences;
}

/**
 * Sets a user preference
 */
export async function setUserPreference(userId, key, value) {
  const memory = await loadUserMemory(userId);
  memory.preferences[key] = value;
  userMemory.set(userId, memory);
  await saveUserMemory(userId);
  return memory.preferences;
}

/**
 * Clears channel memory
 */
export async function clearChannelMemory(channelId) {
  const memory = await loadChannelMemory(channelId);
  memory.messages = [];
  memory.topics = [];
  memory.conversationSummary = null;
  channelMemory.set(channelId, memory);
  await saveChannelMemory(channelId);
  return true;
}

/**
 * Gets a summary of user's interaction history
 */
export async function getUserSummary(userId) {
  const memory = await loadUserMemory(userId);

  return {
    userName: memory.userName,
    messageCount: memory.messageCount,
    firstSeen: memory.firstSeen,
    lastSeen: memory.lastSeen,
    preferredTopics: memory.preferredTopics,
    recentChannels: memory.recentChannels,
    recentInteractions: memory.interactions.slice(0, 5),
  };
}

/**
 * Generates context string for AI prompts
 */
export async function generateUserContext(userId) {
  const summary = await getUserSummary(userId);

  if (summary.messageCount === 0) {
    return 'New user, no previous interactions.';
  }

  const parts = [];

  if (summary.preferredTopics.length > 0) {
    parts.push(`User often discusses: ${summary.preferredTopics.join(', ')}`);
  }

  if (summary.recentChannels.length > 0) {
    parts.push(`Recently active in: #${summary.recentChannels.join(', #')}`);
  }

  parts.push(`Total messages: ${summary.messageCount}`);

  if (summary.recentInteractions.length > 0) {
    const lastInteraction = summary.recentInteractions[0];
    parts.push(`Last bot interaction: ${lastInteraction.type || 'chat'}`);
  }

  return parts.join('. ');
}

/**
 * Exports memory stats for monitoring
 */
export function getMemoryStats() {
  return {
    cachedChannels: channelMemory.size,
    cachedUsers: userMemory.size,
    timestamp: new Date().toISOString(),
  };
}
