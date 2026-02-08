# CommunityOS Discord Bot

**AI-Native Discord Bot for Company Operations**

A comprehensive Discord bot for the CommunityOS ecosystem, featuring KB integration, multi-agent chat, automated moderation, role management, and deep integration with Paco Hub.

---

## Quick Stats

| Metric | Value |
|--------|-------|
| **Commands** | 30+ slash commands |
| **Modules** | 12 feature modules |
| **AI Integrations** | Anthropic, OpenRouter |
| **KB Documents** | 100+ searchable docs |
| **Agents** | 96 AI agents accessible |

---

## Architecture

```
src/
├── index.js              — Main bot: login, event handlers, command routing
├── commands.js           — Slash command definitions
├── register-commands.js  — One-time command registration
├── config/
│   └── constants.js      — Colors, links, API endpoints
├── modules/
│   ├── roles.js          — Role management and org hierarchy
│   ├── channels.js       — Channel setup and organization
│   ├── welcome.js        — Member join/leave handling
│   ├── autoResponse.js   — KB search, agent chat, auto-replies
│   ├── moderation.js     — Raid protection, moderation tools
│   └── integration.js    — Paco Hub API integration
├── services/
│   ├── kb-service.js     — Knowledge base operations
│   ├── agent-service.js  — AI agent communication
│   └── chatbot-service.js — Conversational AI
└── data/                 — Persistent data (mounted volume)
```

**Stack:** Node.js 20+ | discord.js v14 | dotenv
**AI:** Anthropic Claude | OpenRouter
**Integration:** Paco Hub API (port 3010)

---

## Features

### Knowledge Base Integration
- `/kb search <query>` - Search the knowledge base
- `/kb doc <id>` - Get specific document
- `/kb list [section]` - List documents by section
- `/kb sections` - Show all KB sections
- `/kb random` - Get a random document
- `/kb ask <question>` - AI-powered KB Q&A
- `/kb stats` - Knowledge base statistics

### AI Agent System
- `/agent list` - List all 96 AI agents
- `/agent info <id>` - Get agent details
- `/agent chat <id> <message>` - Chat with an agent
- `/agent task <id> <task>` - Assign task to agent
- `/agent status` - Get agent system status
- `/agent summon <id>` - Summon agent to channel
- `/agents teams` - List all teams
- `/agents sections` - List all sections

### Server Management
- `/setup org` - Initialize org structure (roles + channels)
- `/setup roles` - Create org role hierarchy
- `/setup channels` - Create team channels
- `/role assign <user> <role>` - Assign role to user
- `/role stats` - Role distribution statistics
- `/channel create <name>` - Create team channel

### Utility Commands
- `/ping` - Health check
- `/status` - Bot and system status
- `/ship <message>` - Post to #ship-log
- `/swarm <message>` - Post to #build-swarm
- `/ticket <title> <description>` - Create support ticket

### Automated Features
- **Auto KB Search** - Responds to questions with KB results
- **Agent Chat** - Conversational AI in designated channels
- **Welcome Messages** - Custom onboarding for new members
- **Raid Protection** - Automatic detection and mitigation
- **Moderation Tools** - Content filtering and warnings

---

## Setup

### Prerequisites

- Node.js >= 20
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- Bot invited with `bot` + `applications.commands` scopes
- (Optional) Anthropic API key for AI features
- (Optional) OpenRouter API key for model variety

### 1. Install dependencies

```bash
cd ~/.openclaw/workspace/DISCORD_BOTS/community-os-bot
npm install
```

### 2. Configure environment

```bash
# Copy example and edit
cp .env.example .env
nano .env
```

**Required:**
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_APP_ID=1468614925659144205
DISCORD_GUILD_ID=1468607965123575889
```

**Optional (for AI features):**
```env
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
PACO_HUB_URL=http://localhost:3010
```

### 3. Register commands

```bash
npm run register
```

### 4. Run the bot

```bash
# Production
npm start

# Development (auto-reload)
npm run dev

# With PM2 (recommended for production)
npm run pm2:start
npm run pm2:logs
```

---

## Process Management (PM2)

```bash
npm run pm2:start    # Start with PM2
npm run pm2:stop     # Stop bot
npm run pm2:restart  # Restart bot
npm run pm2:logs     # View logs
npm run pm2:status   # Check status
```

---

## Docker Deployment

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

---

## Channel Structure

The bot expects/creates these channels:

| Channel | Purpose |
|---------|---------|
| `#status` | Bot announcements |
| `#ship-log` | Shipping updates |
| `#build-swarm` | Development updates |
| `#kb-search` | Knowledge base queries |
| `#agent-chat` | AI agent conversations |
| `#support` | Support tickets |

---

## Security

- Never commit tokens to git
- `.env` is in `.gitignore`
- Rotate tokens if leaked (Developer Portal > Bot > Reset Token)
- Use environment variables for all secrets

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing DISCORD_TOKEN" | Add token to `.env` |
| Commands not showing | Run `npm run register` |
| Channel not found | Create channel or update `.env` |
| Bot offline | Check `pm2 logs` or run `npm start` |
| AI not responding | Verify API keys in `.env` |

---

## Related Projects

| Project | Path | Port |
|---------|------|------|
| Paco Hub | `~/Desktop/PACO_HUB/paco-hub-app/` | 3010 |
| CommunityOS | `~/Desktop/AI PROPERT MNG PRJECT/` | 3002, 4001 |
| Control Center | `~/Desktop/CONTROL_CENTER/` | - |

---

**Version**: 0.3.0 | **Last Updated**: 2026-02-07
