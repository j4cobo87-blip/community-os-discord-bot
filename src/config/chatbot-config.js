// CommunityOS Discord Bot - Chatbot Configuration
// Enable/disable chatbot features per channel

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to persisted config
const CONFIG_PATH = join(__dirname, '..', '..', 'data', 'chatbot-config.json');

/**
 * Default chatbot configuration
 */
const DEFAULT_CONFIG = {
  // Global toggle
  enabled: true,

  // Response settings
  responseDelay: 500, // ms delay before responding (feels more natural)
  respondToQuestions: true, // Respond to messages ending with ?
  useKBContext: true, // Include KB search results in context
  suggestAgents: true, // Suggest better-suited agents for topics

  // Random response settings
  randomResponseChance: 0.05, // 5% chance to respond randomly
  randomResponseChannels: ['general', 'stream-chat', 'content-ideas'],

  // Trigger keywords (lowercase)
  triggerKeywords: [
    'paco',
    'help me',
    'anyone know',
    'how do i',
    'what is',
    'can someone',
    'does anyone',
    'bot',
    '@paco',
  ],

  // Channel-specific settings
  channels: {
    // Welcome & General
    'welcome': { enabled: true, behavior: 'welcoming', responsiveness: 'high' },
    'general': { enabled: true, behavior: 'friendly', responsiveness: 'medium' },
    'introductions': { enabled: true, behavior: 'welcoming', responsiveness: 'high' },
    'announcements': { enabled: false, behavior: 'professional', responsiveness: 'low' },
    'rules': { enabled: false, behavior: 'professional', responsiveness: 'low' },

    // Support channels
    'support': { enabled: true, behavior: 'helpful', responsiveness: 'high' },
    'support-tickets': { enabled: true, behavior: 'professional', responsiveness: 'high' },

    // Dev/Build channels
    'dev-chat': { enabled: true, behavior: 'technical', responsiveness: 'high' },
    'platform-eng': { enabled: true, behavior: 'technical', responsiveness: 'medium' },
    'build-swarm': { enabled: true, behavior: 'technical', responsiveness: 'medium' },
    'bug-reports': { enabled: true, behavior: 'helpful', responsiveness: 'high' },
    'feature-requests': { enabled: true, behavior: 'creative', responsiveness: 'medium' },

    // Agent channels
    'agent-logs': { enabled: false, behavior: 'status', responsiveness: 'low' },
    'agent-chat': { enabled: true, behavior: 'friendly', responsiveness: 'high' },
    'agent-general': { enabled: true, behavior: 'friendly', responsiveness: 'high' },
    'agent-reports': { enabled: false, behavior: 'status', responsiveness: 'low' },

    // Knowledge Base
    'kb-search': { enabled: true, behavior: 'informative', responsiveness: 'high' },
    'kb-chat': { enabled: true, behavior: 'informative', responsiveness: 'high' },
    'kb-updates': { enabled: false, behavior: 'informative', responsiveness: 'low' },
    'kb-discussions': { enabled: true, behavior: 'informative', responsiveness: 'medium' },

    // Streaming
    'stream-chat': { enabled: true, behavior: 'entertaining', responsiveness: 'high' },
    'live-chat': { enabled: true, behavior: 'entertaining', responsiveness: 'high' },
    'stream-schedule': { enabled: true, behavior: 'informative', responsiveness: 'medium' },
    'stream-topics': { enabled: true, behavior: 'creative', responsiveness: 'medium' },
    'stream-clips': { enabled: true, behavior: 'entertaining', responsiveness: 'low' },
    'stream-feedback': { enabled: true, behavior: 'helpful', responsiveness: 'medium' },

    // Content
    'content-ideas': { enabled: true, behavior: 'creative', responsiveness: 'medium' },
    'ideas': { enabled: true, behavior: 'creative', responsiveness: 'medium' },
    'social-media': { enabled: true, behavior: 'creative', responsiveness: 'medium' },

    // BIM channels
    'bim-general': { enabled: true, behavior: 'friendly', responsiveness: 'medium' },
    'bim-projects': { enabled: true, behavior: 'creative', responsiveness: 'medium' },
    'bim-showcase': { enabled: true, behavior: 'encouraging', responsiveness: 'medium' },

    // Logs (disabled by default)
    'member-log': { enabled: false, behavior: 'status', responsiveness: 'none' },
    'status': { enabled: false, behavior: 'status', responsiveness: 'none' },
    'moderation-log': { enabled: false, behavior: 'status', responsiveness: 'none' },
    'ship-log': { enabled: false, behavior: 'encouraging', responsiveness: 'low' },
  },

  // Behavior descriptions for system prompts
  behaviors: {
    'welcoming': 'Be warm, friendly, and welcoming to all users. Help them feel at home.',
    'friendly': 'Be helpful and conversational. Keep responses engaging but informative.',
    'technical': 'Focus on technical accuracy. Use code examples when helpful. Be precise.',
    'helpful': 'Prioritize solving user problems. Be patient and thorough.',
    'professional': 'Maintain a professional tone. Be concise and authoritative.',
    'creative': 'Encourage creative thinking. Build on ideas and suggest improvements.',
    'informative': 'Provide accurate information. Cite sources when available.',
    'entertaining': 'Be fun and engaging. Keep the energy high but stay helpful.',
    'encouraging': 'Celebrate achievements. Provide positive reinforcement.',
    'status': 'Provide status updates only. Minimal conversational interaction.',
  },

  // Responsiveness levels
  responsiveness: {
    'high': { responseChance: 1.0, questionResponse: true, keywordResponse: true },
    'medium': { responseChance: 0.7, questionResponse: true, keywordResponse: true },
    'low': { responseChance: 0.3, questionResponse: true, keywordResponse: false },
    'none': { responseChance: 0, questionResponse: false, keywordResponse: false },
  },

  // Personality settings
  personality: {
    humor: 0.3, // 0-1 scale for humor in responses
    formality: 0.5, // 0-1 scale (0 = casual, 1 = formal)
    verbosity: 0.5, // 0-1 scale (0 = brief, 1 = detailed)
    emoji_usage: 0.2, // 0-1 scale for emoji frequency
  },
};

// In-memory config
let config = { ...DEFAULT_CONFIG };

/**
 * Loads configuration from disk
 */
export function loadChatbotConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const savedConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      config = { ...DEFAULT_CONFIG, ...savedConfig };
    }
  } catch (err) {
    console.error('Failed to load chatbot config:', err.message);
  }

  return config;
}

/**
 * Saves configuration to disk
 */
export function saveChatbotConfig() {
  try {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save chatbot config:', err.message);
    return false;
  }
}

/**
 * Gets the current configuration
 */
export function getChatbotConfig() {
  return config;
}

/**
 * Checks if chatbot is enabled for a channel
 */
export function isChannelEnabled(channelName) {
  if (!config.enabled) return false;

  const channelConfig = config.channels[channelName.toLowerCase()];

  // If channel not in config, use default behavior based on channel type
  if (!channelConfig) {
    // Enable for most channels by default, disable for logs
    const disabledPatterns = ['log', 'logs', 'status', 'mod'];
    const isDisabledChannel = disabledPatterns.some(p => channelName.toLowerCase().includes(p));
    return !isDisabledChannel;
  }

  return channelConfig.enabled !== false;
}

/**
 * Enables chatbot for a channel
 */
export function enableChannel(channelName) {
  const normalizedName = channelName.toLowerCase();

  if (!config.channels[normalizedName]) {
    config.channels[normalizedName] = { enabled: true, behavior: 'friendly', responsiveness: 'medium' };
  } else {
    config.channels[normalizedName].enabled = true;
  }

  saveChatbotConfig();
  return true;
}

/**
 * Disables chatbot for a channel
 */
export function disableChannel(channelName) {
  const normalizedName = channelName.toLowerCase();

  if (!config.channels[normalizedName]) {
    config.channels[normalizedName] = { enabled: false, behavior: 'friendly', responsiveness: 'medium' };
  } else {
    config.channels[normalizedName].enabled = false;
  }

  saveChatbotConfig();
  return true;
}

/**
 * Gets channel behavior
 */
export function getChannelBehavior(channelName) {
  const channelConfig = config.channels[channelName.toLowerCase()];
  const behavior = channelConfig?.behavior || 'friendly';
  return config.behaviors[behavior] || config.behaviors.friendly;
}

/**
 * Gets channel responsiveness settings
 */
export function getChannelResponsiveness(channelName) {
  const channelConfig = config.channels[channelName.toLowerCase()];
  const level = channelConfig?.responsiveness || 'medium';
  return config.responsiveness[level] || config.responsiveness.medium;
}

/**
 * Checks if the bot should respond randomly
 */
export function shouldRespondRandomly(channelName) {
  if (!config.randomResponseChannels.includes(channelName.toLowerCase())) {
    return false;
  }

  return Math.random() < config.randomResponseChance;
}

/**
 * Sets channel configuration
 */
export function setChannelConfig(channelName, settings) {
  const normalizedName = channelName.toLowerCase();

  config.channels[normalizedName] = {
    ...config.channels[normalizedName],
    ...settings,
  };

  saveChatbotConfig();
  return config.channels[normalizedName];
}

/**
 * Sets global configuration option
 */
export function setGlobalConfig(key, value) {
  if (key in config && key !== 'channels' && key !== 'behaviors' && key !== 'responsiveness') {
    config[key] = value;
    saveChatbotConfig();
    return true;
  }
  return false;
}

/**
 * Sets personality settings
 */
export function setPersonality(settings) {
  config.personality = {
    ...config.personality,
    ...settings,
  };
  saveChatbotConfig();
  return config.personality;
}

/**
 * Gets personality settings
 */
export function getPersonality() {
  return config.personality;
}

/**
 * Adds a trigger keyword
 */
export function addTriggerKeyword(keyword) {
  const normalizedKeyword = keyword.toLowerCase();
  if (!config.triggerKeywords.includes(normalizedKeyword)) {
    config.triggerKeywords.push(normalizedKeyword);
    saveChatbotConfig();
    return true;
  }
  return false;
}

/**
 * Removes a trigger keyword
 */
export function removeTriggerKeyword(keyword) {
  const normalizedKeyword = keyword.toLowerCase();
  const index = config.triggerKeywords.indexOf(normalizedKeyword);
  if (index !== -1) {
    config.triggerKeywords.splice(index, 1);
    saveChatbotConfig();
    return true;
  }
  return false;
}

/**
 * Resets configuration to defaults
 */
export function resetConfig() {
  config = { ...DEFAULT_CONFIG };
  saveChatbotConfig();
  return config;
}

/**
 * Gets a summary of current configuration
 */
export function getConfigSummary() {
  const enabledChannels = Object.entries(config.channels)
    .filter(([_, cfg]) => cfg.enabled)
    .map(([name, _]) => name);

  const disabledChannels = Object.entries(config.channels)
    .filter(([_, cfg]) => !cfg.enabled)
    .map(([name, _]) => name);

  return {
    globalEnabled: config.enabled,
    enabledChannelCount: enabledChannels.length,
    disabledChannelCount: disabledChannels.length,
    respondToQuestions: config.respondToQuestions,
    useKBContext: config.useKBContext,
    randomResponseChance: config.randomResponseChance,
    triggerKeywordCount: config.triggerKeywords.length,
    personality: config.personality,
  };
}

// Load config on module initialization
loadChatbotConfig();
