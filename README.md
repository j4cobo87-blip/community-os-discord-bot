# Community-OS Discord Bot

Minimal Discord bot for the Community-OS project. Posts updates to dedicated channels and provides health checks.

## Architecture

```
src/
  index.js              — Main bot: login, event handlers, channel posting
  commands.js           — Slash command definitions (ping, ship, swarm)
  register-commands.js  — One-time command registration with Discord API
```

**Stack:** Node.js 20 + discord.js v14 + dotenv
**Ports:** None (outbound WebSocket to Discord gateway only)
**Persistence:** `./data/` directory (mounted as volume in Docker)

## Bot Commands

| Command | What it does | Target channel |
|---------|-------------|----------------|
| `/ping` | Health check (ephemeral reply: "pong") | — |
| `/ship text:<msg>` | Posts update with ship emoji | `#ship-log` |
| `/swarm text:<msg>` | Posts update with robot emoji | `#build-swarm` |

On startup, the bot posts "Community-OS bot is online" to the `#status` channel.

## Setup

### Prerequisites

- Node.js >= 20
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)
- The bot must be invited to your server with `bot` + `applications.commands` scopes

> **STILL NEEDED:** Paste the bot token into `.env` — see step 2 below.

### 1. Install dependencies

```bash
cd DISCORD_BOTS/community-os-bot
npm install
```

### 2. Configure `.env`

A `.env` file already exists with everything except the token:

```bash
# Edit .env and paste your DISCORD_TOKEN
nano .env
```

The App ID and Guild ID are pre-filled. Only `DISCORD_TOKEN` needs to be added.

**Where to get the token:**
1. Go to https://discord.com/developers/applications
2. Select the Community-OS bot application (App ID: `1468614925659144205`)
3. Navigate to "Bot" in the sidebar
4. Click "Reset Token" and copy it
5. Paste into `.env` as `DISCORD_TOKEN=your_token_here`

### 3. Register slash commands (one time)

```bash
npm run register
```

This registers `/ping`, `/ship`, `/swarm` as guild-only commands. Re-run if you change `commands.js`.

### 4a. Run locally

```bash
npm start          # production
npm run dev        # dev mode with auto-reload (--watch)
```

### 4b. Run with Docker

```bash
docker compose up -d --build
docker compose logs -f          # watch logs
docker compose down             # stop
```

## Discord Server Setup

The bot expects these text channels to exist in the server:

| Channel | Purpose | Env override |
|---------|---------|-------------|
| `#status` | Bot online/offline announcements | `STATUS_CHANNEL_NAME` |
| `#ship-log` | Ship updates from `/ship` | `SHIP_LOG_CHANNEL_NAME` |
| `#build-swarm` | Swarm updates from `/swarm` | `BUILD_SWARM_CHANNEL_NAME` |

> **STILL NEEDED:** Verify these channels exist in the Discord server (Guild ID: `1468607965123575889`).

## Channel name overrides

Edit `.env` to use different channel names:
```
STATUS_CHANNEL_NAME=bot-status
SHIP_LOG_CHANNEL_NAME=shipping
BUILD_SWARM_CHANNEL_NAME=swarm-chat
```

## Security

- Never paste bot tokens into chat or commit them to git
- `.env` is in `.gitignore` — only `.env.example` is tracked
- Rotate the token immediately if it ever leaks (Discord Developer Portal > Bot > Reset Token)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing DISCORD_TOKEN" | Paste token into `.env` |
| Commands not showing in Discord | Run `npm run register` |
| "I can't find #ship-log" | Create the channel in Discord, or change `SHIP_LOG_CHANNEL_NAME` in `.env` |
| Bot appears offline | Check `docker compose logs` or run `npm start` and look for errors |
