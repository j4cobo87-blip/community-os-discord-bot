// CommunityOS Discord Bot - Channel Agents Module
// Maps each channel to a specific agent persona from org.json

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';

// Cache for loaded data
let orgData = null;
let personasData = null;
let lastLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Channel to Agent mapping
 * Each channel gets a specific agent persona
 */
export const CHANNEL_AGENT_MAP = {
  // Welcome & General
  'welcome': 'main',
  'general': 'main',
  'introductions': 'community-manager',
  'announcements': 'chief-of-staff',
  'rules': 'security-governance',

  // CommunityOS channels
  'communityos-general': 'main',
  'communityos-announcements': 'chief-of-staff',
  'support': 'support-sheriff',
  'support-tickets': 'support-lead',

  // BIM channels
  'bim-general': 'bim-ceo',
  'bim-projects': 'bim-product-lead',
  'bim-showcase': 'bim-community-mgr',

  // Streaming channels
  'streaming-general': 'streaming-ceo',
  'live-chat': 'chat-host',
  'stream-chat': 'chat-host',
  'stream-schedule': 'stream-coordinator',
  'stream-topics': 'content-director',
  'stream-clips': 'highlight-editor',
  'stream-feedback': 'engagement-analyst',
  'clips': 'social-clipper',

  // Agent Corner
  'agent-logs': 'ops',
  'agent-chat': 'main',
  'agent-general': 'main',
  'swarm-activity': 'coordinator',
  'agent-reports': 'chief-of-staff',

  // Build Zone
  'ship-log': 'release-manager',
  'build-swarm': 'coder',
  'bug-reports': 'qa-guardian',
  'feature-requests': 'product-manager',
  'dev-chat': 'coder',
  'platform-eng': 'coder',

  // Knowledge Base
  'kb-search': 'docs-librarian',
  'kb-updates': 'docs-librarian',
  'kb-discussions': 'researcher',
  'kb-chat': 'docs-librarian',

  // Content
  'content-ideas': 'content-creator',
  'social-media': 'growth-marketer',
  'ideas': 'content-creator',

  // Team channels (matched by team ID)
  'core-ops': 'main',
  'ops-support': 'incident-manager',
  'product-design': 'product-manager',
  'knowledge': 'docs-librarian',
  'growth-team': 'growth-marketer',
  'support-team': 'support-lead',
  'security-finance': 'finance-clerk',
  'creator-ops': 'career-agent',
  'data-team': 'data-analyst',
  'automation-team': 'automation-expert',
  'personal-services': 'life-assistant',

  // BIM teams
  'bim-leadership': 'bim-ceo',
  'bim-product': 'bim-product-lead',
  'bim-engineering': 'bim-tech-lead',
  'bim-growth': 'bim-growth-lead',
  'bim-operations': 'bim-ops-lead',
  'bim-ops-support': 'bim-incident-manager',

  // Streaming teams
  'streaming-leadership': 'streaming-ceo',
  'stream-production': 'stream-producer',
  'content-team': 'content-director',
  'audience-team': 'streaming-community-lead',
  'social-team': 'chat-host',
  'stream-ops': 'stream-incident-manager',
  'content-streamers': 'aria',

  // Logs
  'member-log': 'community-manager',
  'status': 'ops',
  'moderation-log': 'security-governance',
};

/**
 * Loads org.json data with caching
 */
async function loadOrgData() {
  const now = Date.now();

  if (orgData && (now - lastLoadTime) < CACHE_TTL) {
    return orgData;
  }

  try {
    const orgPath = join(CONTROL_CENTER, 'ORG', 'org.json');
    if (existsSync(orgPath)) {
      orgData = JSON.parse(await readFile(orgPath, 'utf-8'));
      lastLoadTime = now;
    }
  } catch (err) {
    console.error('Failed to load org.json:', err.message);
  }

  return orgData;
}

/**
 * Loads personas data with caching
 */
async function loadPersonasData() {
  const now = Date.now();

  if (personasData && (now - lastLoadTime) < CACHE_TTL) {
    return personasData;
  }

  try {
    const personasPath = join(CONTROL_CENTER, 'ORG', 'personas_by_agent.json');
    if (existsSync(personasPath)) {
      personasData = JSON.parse(await readFile(personasPath, 'utf-8'));
      lastLoadTime = now;
    }
  } catch (err) {
    console.error('Failed to load personas:', err.message);
  }

  return personasData;
}

/**
 * Gets the agent ID assigned to a channel
 */
export function getChannelAgent(channelName) {
  const normalizedName = channelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return CHANNEL_AGENT_MAP[normalizedName] || 'main';
}

/**
 * Gets the full agent persona for a channel
 */
export async function getChannelAgentPersona(channelName) {
  const agentId = getChannelAgent(channelName);
  const personas = await loadPersonasData();

  if (!personas?.personas?.[agentId]) {
    // Return default Paco persona
    return {
      agentId: 'main',
      displayName: 'Paco',
      tagline: 'Your calm operator: turns messy asks into shipped outcomes.',
      personality: ['decisive', 'warm', 'systems-minded'],
      communicationStyle: 'Concise, action-first summaries with explicit next steps and safety checks.',
      strengths: ['orchestration', 'fast triage', 'end-to-end delivery'],
    };
  }

  return {
    agentId,
    ...personas.personas[agentId],
  };
}

/**
 * Gets agent skills from org.json
 */
export async function getAgentSkills(agentId) {
  const org = await loadOrgData();

  if (!org?.agentSkills?.[agentId]) {
    return [];
  }

  return org.agentSkills[agentId];
}

/**
 * Gets the team info for an agent
 */
export async function getAgentTeam(agentId) {
  const org = await loadOrgData();

  if (!org?.teams) {
    return null;
  }

  for (const team of org.teams) {
    if (team.agents.includes(agentId)) {
      const section = org.sections.find(s => s.id === team.sectionId);
      return {
        teamId: team.id,
        teamName: team.name,
        sectionId: section?.id,
        sectionName: section?.name,
        isLead: team.lead === agentId,
      };
    }
  }

  return null;
}

/**
 * Generates a system prompt for an agent based on channel context
 */
export async function generateAgentSystemPrompt(channelName, channelTopic = '') {
  const persona = await getChannelAgentPersona(channelName);
  const skills = await getAgentSkills(persona.agentId);
  const team = await getAgentTeam(persona.agentId);

  const parts = [
    `You are ${persona.displayName}, an AI agent in the CommunityOS Discord server.`,
    ``,
    `## Your Identity`,
    `- Tagline: "${persona.tagline}"`,
    `- Personality traits: ${persona.personality?.join(', ') || 'helpful, professional'}`,
    `- Communication style: ${persona.communicationStyle || 'Clear and helpful'}`,
    `- Strengths: ${persona.strengths?.join(', ') || 'general assistance'}`,
    ``,
    `## Your Channel`,
    `- You are the designated agent for #${channelName}`,
    channelTopic ? `- Channel purpose: ${channelTopic}` : '',
    ``,
    `## Your Skills`,
    skills.length > 0 ? `- ${skills.join(', ')}` : '- General assistance',
    ``,
  ];

  if (team) {
    parts.push(
      `## Your Team`,
      `- Team: ${team.teamName}`,
      `- Section: ${team.sectionName}`,
      team.isLead ? '- You are the team lead' : '',
      ``
    );
  }

  parts.push(
    `## Guidelines`,
    `- Stay in character as ${persona.displayName}`,
    `- Be helpful but concise`,
    `- Use your expertise to provide relevant answers`,
    `- If a question is outside your domain, suggest the appropriate agent`,
    `- Never pretend to have capabilities you don't have`,
    `- Use Discord formatting (bold, code blocks) when appropriate`,
    `- Remember context from the conversation`,
    ``
  );

  return parts.filter(p => p !== '').join('\n');
}

/**
 * Gets a greeting message appropriate for the channel agent
 */
export async function getAgentGreeting(channelName) {
  const persona = await getChannelAgentPersona(channelName);

  const greetings = {
    'main': [
      "Hey! Paco here. What can I help you with today?",
      "Paco reporting in. Ready to coordinate and ship.",
      "What's up? Let's turn ideas into outcomes.",
    ],
    'coder': [
      "Coder Prime here. What are we building?",
      "Ready to write some clean code. What's the spec?",
      "Let's solve this problem. Show me what you're working with.",
    ],
    'support-sheriff': [
      "Support Sheriff here. How can I help you today?",
      "I'm here to help resolve your issue. What's going on?",
      "Let's get you unblocked. What seems to be the problem?",
    ],
    'docs-librarian': [
      "Docs Librarian here. Looking for something in the knowledge base?",
      "Let me help you find what you need. What topic?",
      "I can point you to the right documentation. What are you looking for?",
    ],
    'product-manager': [
      "Product Manager here. Let's talk about features and priorities.",
      "What user problem are we solving today?",
      "Ready to scope and ship. What's the requirement?",
    ],
    'growth-marketer': [
      "Growth Marketer here. Let's make it spread!",
      "What experiment are we running today?",
      "Ready to find the right audience. What's the message?",
    ],
    'chat-host': [
      "Hey! Chat Host here. Welcome to the stream chat!",
      "Great to have you here! What's on your mind?",
      "The vibe is good! Let's chat.",
    ],
    'streaming-ceo': [
      "STEFANO here. Ready to produce some amazing content!",
      "Let's make this stream legendary. What's the plan?",
      "Content is king. What story are we telling today?",
    ],
    'bim-ceo': [
      "MAXIMUS here. Believe it, make it, ship it!",
      "Ready to empower creators. What's the vision?",
      "Let's build something amazing together.",
    ],
    'chief-of-staff': [
      "MUFASA here. Let's align on priorities.",
      "Chief of Staff reporting. What needs coordination?",
      "Ready to turn strategy into action. What's the goal?",
    ],
  };

  const agentGreetings = greetings[persona.agentId] || [
    `${persona.displayName} here. How can I help?`,
    `Hey! ${persona.displayName} reporting in.`,
    `What can I assist you with today?`,
  ];

  return agentGreetings[Math.floor(Math.random() * agentGreetings.length)];
}

/**
 * Gets appropriate emoji for an agent
 */
export function getAgentEmoji(agentId) {
  const emojiMap = {
    'main': ':dart:',
    'chief-of-staff': ':crown:',
    'coder': ':computer:',
    'qa-guardian': ':shield:',
    'product-manager': ':clipboard:',
    'docs-librarian': ':books:',
    'researcher': ':mag:',
    'writer': ':pencil:',
    'growth-marketer': ':chart_with_upwards_trend:',
    'sales-engine': ':handshake:',
    'support-sheriff': ':star:',
    'support-lead': ':headphones:',
    'career-agent': ':briefcase:',
    'demo-producer': ':clapper:',
    'security-governance': ':lock:',
    'finance-clerk': ':money_with_wings:',
    'ops': ':gear:',
    'release-manager': ':rocket:',
    'automation-engineer': ':robot:',
    'ux-friend': ':art:',
    'community-manager': ':people_holding_hands:',
    'content-creator': ':sparkles:',
    'streaming-ceo': ':movie_camera:',
    'stream-producer': ':red_circle:',
    'chat-host': ':microphone:',
    'bim-ceo': ':crown:',
    'data-analyst': ':bar_chart:',
    'incident-manager': ':rotating_light:',
    'coordinator': ':link:',
    'aria': ':crystal_ball:',
    'blaze': ':fire:',
    'kira': ':brain:',
    'myla': ':crescent_moon:',
    'trix': ':zany_face:',
  };

  return emojiMap[agentId] || ':robot:';
}

/**
 * Lists all available agents with their channel assignments
 */
export async function listChannelAgents() {
  const personas = await loadPersonasData();
  const assignments = [];

  for (const [channel, agentId] of Object.entries(CHANNEL_AGENT_MAP)) {
    const persona = personas?.personas?.[agentId];
    assignments.push({
      channel,
      agentId,
      displayName: persona?.displayName || agentId,
      tagline: persona?.tagline || '',
    });
  }

  return assignments;
}

/**
 * Assigns an agent to a channel (runtime only, doesn't persist)
 */
export function assignAgentToChannel(channelName, agentId) {
  const normalizedName = channelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  CHANNEL_AGENT_MAP[normalizedName] = agentId;
  return true;
}

/**
 * Gets suggested agent for a topic
 */
export function suggestAgentForTopic(topic) {
  const topicAgentMap = {
    'code': 'coder',
    'programming': 'coder',
    'bug': 'qa-guardian',
    'test': 'qa-guardian',
    'documentation': 'docs-librarian',
    'docs': 'docs-librarian',
    'feature': 'product-manager',
    'product': 'product-manager',
    'design': 'ux-friend',
    'ux': 'ux-friend',
    'marketing': 'growth-marketer',
    'growth': 'growth-marketer',
    'support': 'support-sheriff',
    'help': 'support-sheriff',
    'career': 'career-agent',
    'resume': 'career-agent',
    'stream': 'streaming-ceo',
    'content': 'content-creator',
    'security': 'security-governance',
    'finance': 'finance-clerk',
    'automation': 'automation-engineer',
    'workflow': 'automation-expert',
    'data': 'data-analyst',
    'analytics': 'data-analyst',
  };

  const topicLower = topic.toLowerCase();

  for (const [keyword, agentId] of Object.entries(topicAgentMap)) {
    if (topicLower.includes(keyword)) {
      return agentId;
    }
  }

  return 'main'; // Default to Paco
}
