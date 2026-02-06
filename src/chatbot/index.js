// CommunityOS Discord Bot - Chatbot Module Index
// Exports all chatbot functionality

export {
  handleChatbotMessage,
  processMessage,
  sendResponse,
  shouldRespondToMessage,
  detectMessageTopic,
  handleReplyChain,
  getChatbotStatus,
} from './chatbot-engine.js';

export {
  addChannelMessage,
  getConversationContext,
  getRecentMessages,
  loadChannelMemory,
  clearChannelMemory,
  loadUserMemory,
  updateUserMemory,
  recordUserInteraction,
  getUserPreferences,
  setUserPreference,
  getUserSummary,
  generateUserContext,
  getMemoryStats,
} from './conversation-memory.js';

export {
  CHANNEL_AGENT_MAP,
  getChannelAgent,
  getChannelAgentPersona,
  getAgentSkills,
  getAgentTeam,
  generateAgentSystemPrompt,
  getAgentGreeting,
  getAgentEmoji,
  listChannelAgents,
  assignAgentToChannel,
  suggestAgentForTopic,
} from './channel-agents.js';

export {
  generateResponse,
  generateResponseWithKB,
  createResponseEmbed,
  createRateLimitEmbed,
  getRateLimitStatus,
  clearRateLimit,
  clearResponseCache,
} from './response-generator.js';
