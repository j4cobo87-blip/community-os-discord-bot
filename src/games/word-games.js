// CommunityOS Discord Bot - Word Games Module
// Word scramble, hangman, and other word-based games

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { COLORS } from '../config/constants.js';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const LEADERBOARD_FILE = join(CONTROL_CENTER, 'MEMORY', 'game_leaderboards.json');

// Word lists by category
const WORD_LISTS = {
  tech: ['javascript', 'python', 'database', 'algorithm', 'framework', 'compiler', 'debugger', 'variable', 'function', 'interface', 'component', 'terminal', 'repository', 'deployment', 'kubernetes', 'container', 'microservice', 'encryption', 'authentication', 'middleware'],
  programming: ['typescript', 'frontend', 'backend', 'fullstack', 'developer', 'engineer', 'software', 'hardware', 'network', 'protocol', 'recursion', 'iteration', 'abstraction', 'polymorphism', 'inheritance'],
  ai: ['artificial', 'intelligence', 'neural', 'network', 'learning', 'training', 'inference', 'transformer', 'embedding', 'attention', 'gradient', 'backpropagation', 'classification', 'regression'],
  general: ['adventure', 'beautiful', 'challenge', 'discovery', 'excellent', 'fantastic', 'generous', 'happiness', 'important', 'knowledge', 'legendary', 'mysterious', 'outstanding', 'passionate', 'remarkable'],
};

// Active games
const activeWordScrambles = new Map();
const activeHangman = new Map();

// Load leaderboard helper
async function loadLeaderboard() {
  try {
    if (!existsSync(LEADERBOARD_FILE)) {
      return { trivia: {}, wordScramble: {}, hangman: {}, rps: {}, numberGuess: {} };
    }
    const data = await readFile(LEADERBOARD_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { trivia: {}, wordScramble: {}, hangman: {}, rps: {}, numberGuess: {} };
  }
}

async function saveLeaderboard(leaderboard) {
  const dir = dirname(LEADERBOARD_FILE);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
}

async function updateScore(gameType, userId, userName, points, isWin = true) {
  const leaderboard = await loadLeaderboard();
  if (!leaderboard[gameType]) leaderboard[gameType] = {};

  if (!leaderboard[gameType][userId]) {
    leaderboard[gameType][userId] = {
      name: userName,
      score: 0,
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
      gamesPlayed: 0,
    };
  }

  const user = leaderboard[gameType][userId];
  user.name = userName;
  user.score += points;
  user.gamesPlayed++;

  if (isWin) {
    user.wins++;
    user.streak++;
    if (user.streak > user.bestStreak) user.bestStreak = user.streak;
  } else {
    user.losses++;
    user.streak = 0;
  }

  await saveLeaderboard(leaderboard);
  return user;
}

/**
 * Scramble a word
 */
function scrambleWord(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Make sure it's actually scrambled
  if (arr.join('') === word && word.length > 1) {
    return scrambleWord(word);
  }
  return arr.join('');
}

/**
 * Start word scramble game
 */
export async function startWordScramble(interaction, category = 'tech', difficulty = 'medium') {
  const channelId = interaction.channel.id;

  if (activeWordScrambles.has(channelId)) {
    await interaction.reply({
      content: 'A word scramble is already in progress! Solve it or wait for it to timeout.',
      ephemeral: true,
    });
    return;
  }

  const words = WORD_LISTS[category] || WORD_LISTS.tech;
  const difficultyFilter = {
    easy: words.filter(w => w.length <= 6),
    medium: words.filter(w => w.length >= 5 && w.length <= 9),
    hard: words.filter(w => w.length >= 8),
  };

  const filteredWords = difficultyFilter[difficulty] || words;
  const targetWord = filteredWords[Math.floor(Math.random() * filteredWords.length)];
  const scrambled = scrambleWord(targetWord);

  const timeLimit = difficulty === 'easy' ? 45000 : difficulty === 'hard' ? 60000 : 30000;
  const points = difficulty === 'easy' ? 50 : difficulty === 'hard' ? 150 : 100;

  const game = {
    word: targetWord,
    scrambled,
    category,
    difficulty,
    points,
    startTime: Date.now(),
    timeLimit,
    hints: 0,
    maxHints: Math.floor(targetWord.length / 3),
  };

  activeWordScrambles.set(channelId, game);

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(':twisted_rightwards_arrows: Word Scramble!')
    .setDescription(`Unscramble this word:\n\n# \`${scrambled.toUpperCase()}\``)
    .addFields(
      { name: 'Category', value: category.charAt(0).toUpperCase() + category.slice(1), inline: true },
      { name: 'Difficulty', value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), inline: true },
      { name: 'Points', value: `${points}`, inline: true },
      { name: 'Letters', value: `${targetWord.length}`, inline: true },
    )
    .setFooter({ text: `Type your answer! You have ${timeLimit / 1000} seconds. Use /hint for a hint.` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Timeout
  setTimeout(async () => {
    const currentGame = activeWordScrambles.get(channelId);
    if (currentGame && currentGame.word === targetWord) {
      activeWordScrambles.delete(channelId);

      const timeoutEmbed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle(':x: Time\'s Up!')
        .setDescription(`The word was: **${targetWord.toUpperCase()}**`)
        .setTimestamp();

      await interaction.channel.send({ embeds: [timeoutEmbed] });
    }
  }, timeLimit);
}

/**
 * Check word scramble answer
 */
export async function checkWordScrambleAnswer(message) {
  const channelId = message.channel.id;
  const game = activeWordScrambles.get(channelId);

  if (!game) return false;

  const guess = message.content.toLowerCase().trim();

  if (guess === game.word) {
    activeWordScrambles.delete(channelId);

    const timeBonus = Math.max(0, 1 - (Date.now() - game.startTime) / game.timeLimit);
    const hintPenalty = game.hints * 10;
    const finalPoints = Math.floor(game.points * (1 + timeBonus * 0.5) - hintPenalty);

    const userName = message.author.displayName || message.author.username;
    await updateScore('wordScramble', message.author.id, userName, finalPoints, true);

    const embed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setTitle(':tada: Correct!')
      .setDescription(`**${userName}** solved it!\n\nThe word was: **${game.word.toUpperCase()}**`)
      .addFields(
        { name: 'Points Earned', value: `+${finalPoints}`, inline: true },
        { name: 'Time', value: `${Math.floor((Date.now() - game.startTime) / 1000)}s`, inline: true },
        { name: 'Hints Used', value: `${game.hints}`, inline: true },
      )
      .setFooter({ text: 'Use /leaderboard wordscramble to see rankings!' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return true;
  }

  return false;
}

/**
 * Get a hint for word scramble
 */
export async function getWordScrambleHint(interaction) {
  const channelId = interaction.channel.id;
  const game = activeWordScrambles.get(channelId);

  if (!game) {
    await interaction.reply({
      content: 'No word scramble in progress!',
      ephemeral: true,
    });
    return;
  }

  if (game.hints >= game.maxHints) {
    await interaction.reply({
      content: `No more hints available! (Used ${game.hints}/${game.maxHints})`,
      ephemeral: true,
    });
    return;
  }

  game.hints++;
  const revealedLetters = game.hints;
  const hint = game.word.split('').map((letter, i) => i < revealedLetters ? letter : '_').join(' ');

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.amber)
        .setTitle(':bulb: Hint')
        .setDescription(`The word starts with: **${hint}**`)
        .addFields({ name: 'Hints Remaining', value: `${game.maxHints - game.hints}`, inline: true })
        .setTimestamp(),
    ],
  });
}

/**
 * Start hangman game
 */
export async function startHangman(interaction, category = 'tech') {
  const channelId = interaction.channel.id;

  if (activeHangman.has(channelId)) {
    await interaction.reply({
      content: 'A hangman game is already in progress!',
      ephemeral: true,
    });
    return;
  }

  const words = WORD_LISTS[category] || WORD_LISTS.tech;
  const word = words[Math.floor(Math.random() * words.length)];

  const game = {
    word,
    category,
    guessedLetters: [],
    wrongGuesses: 0,
    maxWrong: 6,
    startTime: Date.now(),
    hostId: interaction.user.id,
    hostName: interaction.user.displayName || interaction.user.username,
    participants: new Set(),
  };

  activeHangman.set(channelId, game);

  const display = getHangmanDisplay(game);
  const embed = createHangmanEmbed(game, display);

  await interaction.reply({ embeds: [embed] });
}

function getHangmanDisplay(game) {
  const stages = [
    '```\n  +---+\n      |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n      |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n  |   |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|   |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n      |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
    '```\n  +---+\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```',
  ];

  return stages[Math.min(game.wrongGuesses, 6)];
}

function getWordDisplay(game) {
  return game.word.split('').map(letter => game.guessedLetters.includes(letter) ? letter : '_').join(' ');
}

function createHangmanEmbed(game, display) {
  const wordDisplay = getWordDisplay(game);
  const wrongLetters = game.guessedLetters.filter(l => !game.word.includes(l)).join(', ') || 'None';

  return new EmbedBuilder()
    .setColor(game.wrongGuesses >= 6 ? COLORS.rose : COLORS.cyan)
    .setTitle(':skull: Hangman')
    .setDescription(`${display}\n\n**Word:** \`${wordDisplay}\`\n\n**Wrong Letters:** ${wrongLetters}`)
    .addFields(
      { name: 'Category', value: game.category.charAt(0).toUpperCase() + game.category.slice(1), inline: true },
      { name: 'Lives Left', value: `${game.maxWrong - game.wrongGuesses}`, inline: true },
      { name: 'Letters', value: `${game.word.length}`, inline: true },
    )
    .setFooter({ text: 'Type a single letter to guess!' })
    .setTimestamp();
}

/**
 * Check hangman guess
 */
export async function checkHangmanGuess(message) {
  const channelId = message.channel.id;
  const game = activeHangman.get(channelId);

  if (!game) return false;

  const guess = message.content.toLowerCase().trim();

  // Single letter guess
  if (guess.length === 1 && /[a-z]/.test(guess)) {
    if (game.guessedLetters.includes(guess)) {
      await message.reply({ content: `Letter \`${guess}\` was already guessed!`, ephemeral: false });
      return true;
    }

    game.guessedLetters.push(guess);
    game.participants.add(message.author.id);

    if (!game.word.includes(guess)) {
      game.wrongGuesses++;
    }

    const display = getHangmanDisplay(game);
    const wordComplete = !getWordDisplay(game).includes('_');

    // Game won
    if (wordComplete) {
      activeHangman.delete(channelId);

      const points = 100 - game.wrongGuesses * 10;
      for (const participantId of game.participants) {
        const user = await message.client.users.fetch(participantId).catch(() => null);
        if (user) {
          await updateScore('hangman', participantId, user.displayName || user.username, points, true);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.emerald)
        .setTitle(':tada: You Won!')
        .setDescription(`${display}\n\nThe word was: **${game.word.toUpperCase()}**`)
        .addFields(
          { name: 'Wrong Guesses', value: `${game.wrongGuesses}`, inline: true },
          { name: 'Points', value: `+${points}`, inline: true },
          { name: 'Players', value: `${game.participants.size}`, inline: true },
        )
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      return true;
    }

    // Game lost
    if (game.wrongGuesses >= game.maxWrong) {
      activeHangman.delete(channelId);

      const embed = new EmbedBuilder()
        .setColor(COLORS.rose)
        .setTitle(':skull: Game Over!')
        .setDescription(`${display}\n\nThe word was: **${game.word.toUpperCase()}**`)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      return true;
    }

    // Continue game
    const embed = createHangmanEmbed(game, display);
    const reaction = game.word.includes(guess) ? ':white_check_mark:' : ':x:';
    await message.reply({ content: `${reaction} Letter: \`${guess}\``, embeds: [embed] });
    return true;
  }

  // Full word guess
  if (guess === game.word) {
    activeHangman.delete(channelId);

    const points = 150 - game.wrongGuesses * 10;
    const userName = message.author.displayName || message.author.username;
    await updateScore('hangman', message.author.id, userName, points, true);

    const embed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setTitle(':trophy: Word Guessed!')
      .setDescription(`**${userName}** guessed the entire word!\n\nThe word was: **${game.word.toUpperCase()}**`)
      .addFields({ name: 'Points', value: `+${points}`, inline: true })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return true;
  }

  return false;
}

/**
 * Check if there's an active word game
 */
export function hasActiveWordGame(channelId) {
  return activeWordScrambles.has(channelId) || activeHangman.has(channelId);
}

/**
 * Force end word games
 */
export function forceEndWordGames(channelId) {
  const hadScramble = activeWordScrambles.delete(channelId);
  const hadHangman = activeHangman.delete(channelId);
  return hadScramble || hadHangman;
}

export { WORD_LISTS };
