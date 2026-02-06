#!/bin/bash
# CommunityOS Discord Bot Deployment Script
# Usage: ./deploy.sh [--force] [--register]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CommunityOS Discord Bot Deployment${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Parse arguments
FORCE=false
REGISTER=false
for arg in "$@"; do
  case $arg in
    --force)
      FORCE=true
      shift
      ;;
    --register)
      REGISTER=true
      shift
      ;;
  esac
done

# Check for .env file
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found!${NC}"
  echo "Please create a .env file with your DISCORD_TOKEN and other configuration."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Error: Node.js 18+ required. Current version: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}[1/5]${NC} Checking for updates..."

# Pull latest code if in a git repo
if [ -d ".git" ]; then
  if [ "$FORCE" = true ]; then
    echo "Force pulling latest changes..."
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null || true
  else
    echo "Pulling latest changes..."
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "Not a git repo or no remote"
  fi
else
  echo "Not a git repository, skipping pull"
fi

echo -e "${GREEN}[2/5]${NC} Installing dependencies..."
npm install

# Create logs directory
mkdir -p logs

echo -e "${GREEN}[3/5]${NC} Validating configuration..."

# Check if DISCORD_TOKEN is set
if ! grep -q "DISCORD_TOKEN=" .env; then
  echo -e "${RED}Error: DISCORD_TOKEN not found in .env${NC}"
  exit 1
fi

# Check if DISCORD_GUILD_ID is set
if ! grep -q "DISCORD_GUILD_ID=" .env; then
  echo -e "${YELLOW}Warning: DISCORD_GUILD_ID not found in .env${NC}"
  echo "Some guild-specific features may not work."
fi

echo -e "${GREEN}[4/5]${NC} Registering slash commands..."

if [ "$REGISTER" = true ] || [ ! -f ".commands-registered" ]; then
  echo "Running command registration..."
  npm run register
  touch .commands-registered
  echo -e "${GREEN}Commands registered successfully!${NC}"
else
  echo "Commands already registered. Use --register to force re-registration."
fi

echo -e "${GREEN}[5/5]${NC} Starting/restarting bot with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "PM2 not found, installing globally..."
  npm install -g pm2
fi

# Check if bot is already running
if pm2 describe community-os-bot > /dev/null 2>&1; then
  echo "Bot is running, restarting..."
  pm2 restart community-os-bot --update-env
else
  echo "Starting bot..."
  pm2 start ecosystem.config.cjs
fi

# Save PM2 process list
pm2 save

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "View logs:      ${CYAN}pm2 logs community-os-bot${NC}"
echo -e "View status:    ${CYAN}pm2 status${NC}"
echo -e "Stop bot:       ${CYAN}pm2 stop community-os-bot${NC}"
echo -e "Restart bot:    ${CYAN}pm2 restart community-os-bot${NC}"
echo ""

# Show bot status
pm2 status community-os-bot

echo ""
echo -e "${YELLOW}Note: Use 'pm2 startup' to enable auto-start on system reboot${NC}"
