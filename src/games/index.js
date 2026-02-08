// CommunityOS Discord Bot - Games Module Index
// Exports all game functionality

export {
  startTriviaGame,
  handleTriviaAnswer,
  hasActiveGame as hasActiveTrivia,
  forceEndGame as forceEndTrivia,
  getLeaderboard as getTriviaLeaderboard,
  TRIVIA_QUESTIONS,
} from './trivia.js';

export {
  startWordScramble,
  checkWordScrambleAnswer,
  getWordScrambleHint,
  startHangman,
  checkHangmanGuess,
  hasActiveWordGame,
  forceEndWordGames,
  WORD_LISTS,
} from './word-games.js';

export {
  startRPS,
  handleRPSChoice,
  startNumberGuess,
  checkNumberGuess,
  startQuizCompetition,
  checkQuizAnswer,
  hasActiveQuickGame,
  forceEndQuickGames,
  getGameLeaderboard,
} from './quick-games.js';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../config/constants.js';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const LEADERBOARD_FILE = join(CONTROL_CENTER, 'MEMORY', 'game_leaderboards.json');

/**
 * Get combined leaderboard for all games or specific game
 */
export async function getLeaderboard(gameType = 'all', limit = 10) {
  try {
    if (!existsSync(LEADERBOARD_FILE)) {
      return [];
    }
    const data = await readFile(LEADERBOARD_FILE, 'utf-8');
    const leaderboard = JSON.parse(data);

    if (gameType !== 'all' && leaderboard[gameType]) {
      return Object.entries(leaderboard[gameType])
        .map(([oduserId, userData]) => ({ oduserId, ...userData }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    // Combine all games
    const combined = {};
    for (const [game, players] of Object.entries(leaderboard)) {
      for (const [userId, data] of Object.entries(players)) {
        if (!combined[userId]) {
          combined[userId] = {
            name: data.name,
            totalScore: 0,
            totalWins: 0,
            totalGames: 0,
            games: {},
          };
        }
        combined[userId].totalScore += data.score || 0;
        combined[userId].totalWins += data.wins || 0;
        combined[userId].totalGames += data.gamesPlayed || 0;
        combined[userId].games[game] = data.score || 0;
      }
    }

    return Object.entries(combined)
      .map(([oduserId, data]) => ({ oduserId, ...data }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Create leaderboard embed
 */
export async function createLeaderboardEmbed(gameType = 'all', limit = 10) {
  const leaderboard = await getLeaderboard(gameType, limit);

  const gameNames = {
    all: 'All Games',
    trivia: 'Trivia',
    wordScramble: 'Word Scramble',
    hangman: 'Hangman',
    rps: 'Rock Paper Scissors',
    numberGuess: 'Number Guessing',
    quiz: 'Quiz Competition',
  };

  if (leaderboard.length === 0) {
    return new EmbedBuilder()
      .setColor(COLORS.amber)
      .setTitle(`:trophy: ${gameNames[gameType] || gameType} Leaderboard`)
      .setDescription('No scores yet! Be the first to play!')
      .setTimestamp();
  }

  const medals = [':first_place:', ':second_place:', ':third_place:'];

  const lines = leaderboard.map((player, i) => {
    const medal = medals[i] || `${i + 1}.`;
    if (gameType === 'all') {
      return `${medal} **${player.name}** - ${player.totalScore} pts (${player.totalWins} wins)`;
    }
    return `${medal} **${player.name}** - ${player.score} pts (${player.wins}W / ${player.losses}L)`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(`:trophy: ${gameNames[gameType] || gameType} Leaderboard`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Top ${leaderboard.length} players` })
    .setTimestamp();

  if (gameType === 'all' && leaderboard.length > 0) {
    embed.addFields({
      name: 'Total Games Played',
      value: leaderboard.reduce((sum, p) => sum + p.totalGames, 0).toString(),
      inline: true,
    });
  }

  return embed;
}

/**
 * Check if any game message should be processed
 */
export function shouldProcessGameMessage(message) {
  const channelId = message.channel.id;

  // Import check functions
  const { hasActiveWordGame } = require('./word-games.js');
  const { hasActiveQuickGame } = require('./quick-games.js');
  const { hasActiveGame } = require('./trivia.js');

  return hasActiveWordGame(channelId) || hasActiveQuickGame(channelId) || hasActiveGame(channelId);
}

/**
 * Process game-related messages
 */
export async function processGameMessage(message) {
  const channelId = message.channel.id;

  // Check word scramble
  const { checkWordScrambleAnswer, checkHangmanGuess } = await import('./word-games.js');
  if (await checkWordScrambleAnswer(message)) return true;
  if (await checkHangmanGuess(message)) return true;

  // Check number guess
  const { checkNumberGuess, checkQuizAnswer } = await import('./quick-games.js');
  if (await checkNumberGuess(message)) return true;
  if (await checkQuizAnswer(message)) return true;

  return false;
}
