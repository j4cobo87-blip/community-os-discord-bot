// CommunityOS Discord Bot - Constants and Configuration
// Color scheme: Cyan (#22d3ee) and Purple (#a855f7)

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';

export const COLORS = {
  cyan: 0x22d3ee,
  purple: 0xa855f7,
  emerald: 0x34d399,
  amber: 0xfbbf24,
  rose: 0xf43f5e,
  indigo: 0x6366f1,
  pink: 0xec4899,
  white: 0xffffff,
  darkGray: 0x374151,
};

// Role definitions matching org hierarchy
export const ROLES = {
  // Leadership hierarchy
  hierarchy: [
    { name: 'Founder', color: 0xFFD700, hoist: true, permissions: ['Administrator'] },
    { name: 'CEO', color: COLORS.cyan, hoist: true, permissions: ['Administrator'] },
    { name: 'Team Lead', color: COLORS.purple, hoist: true, permissions: ['ManageChannels', 'ManageMessages', 'MentionEveryone'] },
    { name: 'Agent', color: COLORS.emerald, hoist: true, permissions: ['SendMessages', 'EmbedLinks', 'AttachFiles'] },
    { name: 'Member', color: COLORS.indigo, hoist: false, permissions: ['SendMessages', 'ReadMessageHistory'] },
    { name: 'Guest', color: COLORS.darkGray, hoist: false, permissions: ['ViewChannel', 'ReadMessageHistory'] },
  ],
  // Organization roles
  orgs: [
    { name: 'CommunityOS', color: COLORS.cyan, hoist: false },
    { name: 'BELIVEITMAKEIT', color: COLORS.purple, hoist: false },
    { name: 'JacoboStreaming', color: COLORS.rose, hoist: false },
  ],
  // Membership roles
  membership: [
    { name: 'Verified', color: COLORS.emerald, hoist: false },
    { name: 'VIP', color: COLORS.amber, hoist: true },
    { name: 'Subscriber', color: COLORS.pink, hoist: false },
  ],
};

// Channel structure for org setup
export const CHANNEL_STRUCTURE = {
  categories: [
    {
      name: 'WELCOME',
      channels: [
        { name: 'welcome', topic: 'Welcome to CommunityOS - your AI-native company platform' },
        { name: 'rules', topic: 'Community guidelines and rules' },
        { name: 'introductions', topic: 'Introduce yourself to the community' },
        { name: 'announcements', topic: 'Official announcements from the team' },
      ],
    },
    {
      name: 'COMMUNITYOS',
      channels: [
        { name: 'general', topic: 'CommunityOS general discussion' },
        { name: 'announcements', topic: 'CommunityOS announcements' },
        { name: 'support', topic: 'Get help with CommunityOS' },
      ],
    },
    {
      name: 'BELIVEITMAKEIT',
      channels: [
        { name: 'bim-general', topic: 'BELIVEITMAKEIT general discussion' },
        { name: 'bim-projects', topic: 'Share your projects and get feedback' },
        { name: 'bim-showcase', topic: 'Show off your completed work' },
      ],
    },
    {
      name: 'JACOBO STREAMING',
      channels: [
        { name: 'streaming-general', topic: 'Jacobo Streaming community chat' },
        { name: 'live-chat', topic: 'Chat during live streams' },
        { name: 'clips', topic: 'Share stream clips and highlights' },
      ],
    },
    {
      name: 'AGENT CORNER',
      channels: [
        { name: 'agent-logs', topic: 'Automated agent activity logs' },
        { name: 'agent-chat', topic: 'Chat with AI agents - use @Paco or /ask' },
        { name: 'swarm-activity', topic: 'Multi-agent swarm task updates' },
        { name: 'agent-reports', topic: 'Automated agent reports' },
      ],
    },
    {
      name: 'BUILD ZONE',
      channels: [
        { name: 'ship-log', topic: 'Log your shipped features and updates' },
        { name: 'build-swarm', topic: 'Collaborative building and coding sessions' },
        { name: 'bug-reports', topic: 'Report bugs and issues' },
        { name: 'feature-requests', topic: 'Request new features' },
      ],
    },
    {
      name: 'STREAMING',
      channels: [
        { name: 'stream-chat', topic: 'Live stream chat and discussion' },
        { name: 'stream-schedule', topic: 'Upcoming stream schedule' },
        { name: 'stream-topics', topic: 'Suggest topics for streams' },
        { name: 'stream-clips', topic: 'Share clips from streams' },
        { name: 'stream-feedback', topic: 'Feedback on streams' },
      ],
    },
    {
      name: 'KNOWLEDGE BASE',
      channels: [
        { name: 'kb-search', topic: 'Search the knowledge base - use /kb <query>' },
        { name: 'kb-updates', topic: 'Knowledge base updates and new docs' },
        { name: 'kb-discussions', topic: 'Discuss KB content and improvements' },
      ],
    },
    {
      name: 'CONTENT',
      channels: [
        { name: 'content-ideas', topic: 'Submit content ideas and suggestions' },
        { name: 'social-media', topic: 'Social media updates and coordination' },
      ],
    },
    {
      name: 'LOGS',
      channels: [
        { name: 'member-log', topic: 'Member join/leave notifications' },
        { name: 'status', topic: 'Bot and system status updates' },
        { name: 'moderation-log', topic: 'Moderation actions log' },
      ],
    },
  ],
};

// FAQ responses for common questions
export const FAQ_RESPONSES = {
  'what is communityos': {
    title: 'What is CommunityOS?',
    description: 'CommunityOS is an AI-native company operating system. We have 22+ AI agents organized into 8 teams that help run a full company stack - from engineering to marketing to support.',
    color: COLORS.cyan,
  },
  'how do i get started': {
    title: 'Getting Started with CommunityOS',
    description: 'Welcome! Here\'s how to get started:\n\n1. Introduce yourself in #introductions\n2. Use `/kb <query>` to search our knowledge base\n3. Ask questions to agents with `/ask <agent> <question>`\n4. Join our streams at YouTube/Twitch\n5. Share ideas in #content-ideas',
    color: COLORS.emerald,
  },
  'who is paco': {
    title: 'Meet Paco - The Orchestrator',
    description: 'Paco is the main orchestrator of CommunityOS. He coordinates all 22 agents across 8 teams, manages workflows, and ensures smooth operations.\n\nYou can talk to Paco by mentioning @Paco or using `/ask paco <question>`.',
    color: COLORS.cyan,
  },
  'what agents are available': {
    title: 'Available AI Agents',
    description: 'We have 22+ agents across 8 teams:\n\n- **Core Ops**: Paco, Chief of Staff\n- **Platform Eng**: Coder Prime, QA Guardian\n- **Product**: Product Manager, UX Friend\n- **Knowledge**: Writer, Researcher\n- **Growth**: Growth Marketer, Social Poster\n- **Creator**: Demo Producer, Topic Scout\n- **Career**: Career Agent\n- **Security**: Security & Governance\n\nUse `/ask <agent> <question>` to interact!',
    color: COLORS.purple,
  },
  'when is the next stream': {
    title: 'Stream Schedule',
    description: 'Check #stream-schedule for upcoming streams!\n\n**Platforms:**\n- YouTube: @J4S_GON\n- Twitch: j4s_gon\n\nUse `/schedule` to see the latest schedule.',
    color: COLORS.rose,
  },
  'how do i report a bug': {
    title: 'Reporting Bugs',
    description: 'To report a bug:\n\n1. Post in #bug-reports with details\n2. Or use `/support new` to create a ticket\n3. Include: steps to reproduce, expected behavior, actual behavior\n\nOur QA Guardian will review it!',
    color: COLORS.amber,
  },
};

// Bad words filter - load from file if exists
const BAD_WORDS_PATH = join(CONTROL_CENTER, 'MODERATION', 'bad_words.txt');
export const BAD_WORDS = existsSync(BAD_WORDS_PATH)
  ? readFileSync(BAD_WORDS_PATH, 'utf-8').split('\n').filter(w => w.trim())
  : [];

// Spam detection settings
export const SPAM_SETTINGS = {
  maxMessagesPerMinute: 10,
  maxMentionsPerMessage: 5,
  maxDuplicateMessages: 3,
  duplicateTimeWindow: 60000, // 1 minute
  warnBeforeMute: true,
  muteDuration: 300000, // 5 minutes
};

// Raid protection settings
export const RAID_SETTINGS = {
  joinThreshold: 10, // members joining
  timeWindow: 30000, // within 30 seconds
  action: 'lockdown', // 'lockdown' | 'verify' | 'alert'
  lockdownDuration: 300000, // 5 minutes
};

// Links to external resources
export const LINKS = {
  youtube: 'https://www.youtube.com/@J4S_GON',
  twitch: 'https://www.twitch.tv/j4s_gon',
  pacoHub: process.env.PACO_HUB_URL || 'http://localhost:3010',
  github: 'https://github.com/j4sgon',
};

// API endpoints for Paco Hub integration
export const API_ENDPOINTS = {
  base: process.env.PACO_HUB_URL || 'http://localhost:3010',
  messages: '/api/discord/messages',
  kbSearch: '/api/kb/search',
  agentInteract: '/api/agents/interact',
  support: '/api/support/tickets',
};
