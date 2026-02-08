// CommunityOS Discord Bot - Handlers Index
// Central handler exports for all bot functionality

export {
  handleExtendedCommand,
  handleExtendedButton,
  handleExtendedContextMenu,
} from './extended-commands.js';

// Import for game message processing
import {
  checkWordScrambleAnswer,
  checkHangmanGuess,
} from '../games/word-games.js';

import {
  checkNumberGuess,
  checkQuizAnswer,
} from '../games/quick-games.js';

import {
  hasActiveTrivia,
} from '../games/trivia.js';

import {
  hasActiveWordGame,
} from '../games/word-games.js';

import {
  hasActiveQuickGame,
} from '../games/quick-games.js';

import { updateProfileStats } from '../modules/paco-hub.js';

/**
 * Check if any active game should process this message
 */
export function shouldProcessAsGameMessage(channelId) {
  return hasActiveTrivia(channelId) ||
         hasActiveWordGame(channelId) ||
         hasActiveQuickGame(channelId);
}

/**
 * Process game-related messages
 * Returns true if the message was handled as a game input
 */
export async function processGameMessage(message) {
  // Check word scramble
  if (await checkWordScrambleAnswer(message)) {
    await updateProfileStats(message.author.id, { gamesWon: 1 });
    return true;
  }

  // Check hangman
  if (await checkHangmanGuess(message)) {
    return true;
  }

  // Check number guess
  if (await checkNumberGuess(message)) {
    return true;
  }

  // Check quiz
  if (await checkQuizAnswer(message)) {
    return true;
  }

  return false;
}

/**
 * Track user activity for profile stats
 */
export async function trackUserActivity(userId, action) {
  const statMap = {
    message: { messagesCount: 1 },
    command: { commandsUsed: 1 },
    game: { gamesPlayed: 1 },
    win: { gamesWon: 1 },
    kb_search: { kbSearches: 1 },
    agent_chat: { agentChats: 1 },
    ticket: { ticketsCreated: 1 },
    idea: { ideasSubmitted: 1 },
    ship: { shipsPosted: 1 },
  };

  const stats = statMap[action];
  if (stats) {
    await updateProfileStats(userId, stats);
  }
}
