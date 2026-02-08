// CommunityOS Discord Bot - Quick Games Module
// Rock Paper Scissors, Number Guessing, and other quick games

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { COLORS } from '../config/constants.js';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const LEADERBOARD_FILE = join(CONTROL_CENTER, 'MEMORY', 'game_leaderboards.json');

// Active games
const activeRPS = new Map();
const activeNumberGuess = new Map();
const activeQuiz = new Map();

// Load/save leaderboard helpers
async function loadLeaderboard() {
  try {
    if (!existsSync(LEADERBOARD_FILE)) {
      return { trivia: {}, wordScramble: {}, hangman: {}, rps: {}, numberGuess: {}, quiz: {} };
    }
    const data = await readFile(LEADERBOARD_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { trivia: {}, wordScramble: {}, hangman: {}, rps: {}, numberGuess: {}, quiz: {} };
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

// ═══════════════════════════════════════════════════════════════════════
// ROCK PAPER SCISSORS
// ═══════════════════════════════════════════════════════════════════════

const RPS_CHOICES = {
  rock: { emoji: ':rock:', beats: 'scissors', name: 'Rock' },
  paper: { emoji: ':page_facing_up:', beats: 'rock', name: 'Paper' },
  scissors: { emoji: ':scissors:', beats: 'paper', name: 'Scissors' },
};

const RPS_EXTENDED_CHOICES = {
  ...RPS_CHOICES,
  lizard: { emoji: ':lizard:', beats: ['paper', 'spock'], name: 'Lizard' },
  spock: { emoji: ':vulcan:', beats: ['rock', 'scissors'], name: 'Spock' },
};

/**
 * Start RPS game (vs bot or challenge another user)
 */
export async function startRPS(interaction, opponent = null, extended = false) {
  const userId = interaction.user.id;
  const channelId = interaction.channel.id;
  const gameId = `${channelId}-${Date.now()}`;

  const choices = extended ? RPS_EXTENDED_CHOICES : RPS_CHOICES;
  const choiceNames = Object.keys(choices);

  if (opponent && opponent.id !== interaction.user.id && !opponent.bot) {
    // PvP challenge
    const game = {
      id: gameId,
      challengerId: userId,
      challengerName: interaction.user.displayName || interaction.user.username,
      opponentId: opponent.id,
      opponentName: opponent.displayName || opponent.username,
      challengerChoice: null,
      opponentChoice: null,
      extended,
      createdAt: Date.now(),
    };

    activeRPS.set(gameId, game);

    const buttons = new ActionRowBuilder().addComponents(
      ...choiceNames.map(choice =>
        new ButtonBuilder()
          .setCustomId(`rps_${gameId}_${choice}`)
          .setLabel(choices[choice].name)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle(':crossed_swords: RPS Challenge!')
      .setDescription(`**${game.challengerName}** has challenged **${game.opponentName}** to ${extended ? 'Rock Paper Scissors Lizard Spock' : 'Rock Paper Scissors'}!\n\nBoth players: Click your choice below!`)
      .setFooter({ text: 'Game expires in 60 seconds' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [buttons] });

    // Timeout
    setTimeout(async () => {
      if (activeRPS.has(gameId)) {
        activeRPS.delete(gameId);
        await interaction.followUp({
          content: 'RPS game expired! No one made a choice.',
          ephemeral: true,
        });
      }
    }, 60000);
  } else {
    // vs Bot
    const botChoice = choiceNames[Math.floor(Math.random() * choiceNames.length)];

    const buttons = new ActionRowBuilder().addComponents(
      ...choiceNames.map(choice =>
        new ButtonBuilder()
          .setCustomId(`rps_bot_${botChoice}_${choice}`)
          .setLabel(choices[choice].name)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.cyan)
      .setTitle(':robot: Rock Paper Scissors')
      .setDescription(`Challenge Paco to ${extended ? 'Rock Paper Scissors Lizard Spock' : 'Rock Paper Scissors'}!\n\nChoose your move:`)
      .setFooter({ text: 'Click a button to play!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [buttons] });
  }
}

/**
 * Handle RPS button click
 */
export async function handleRPSChoice(interaction) {
  const [_, gameIdOrBot, botChoiceOrChoice, playerChoice] = interaction.customId.split('_');

  if (gameIdOrBot === 'bot') {
    // vs Bot game
    const botChoice = botChoiceOrChoice;
    const choice = playerChoice;
    const userName = interaction.user.displayName || interaction.user.username;

    const result = getRPSResult(choice, botChoice);

    const resultEmoji = result === 'win' ? ':trophy:' : result === 'lose' ? ':x:' : ':handshake:';
    const resultText = result === 'win' ? 'You Win!' : result === 'lose' ? 'You Lose!' : 'It\'s a Tie!';
    const points = result === 'win' ? 25 : result === 'lose' ? 0 : 10;

    await updateScore('rps', interaction.user.id, userName, points, result === 'win');

    const embed = new EmbedBuilder()
      .setColor(result === 'win' ? COLORS.emerald : result === 'lose' ? COLORS.rose : COLORS.amber)
      .setTitle(`${resultEmoji} ${resultText}`)
      .setDescription(`**Your choice:** ${RPS_CHOICES[choice]?.emoji || RPS_EXTENDED_CHOICES[choice]?.emoji} ${choice}\n**Paco's choice:** ${RPS_CHOICES[botChoice]?.emoji || RPS_EXTENDED_CHOICES[botChoice]?.emoji} ${botChoice}`)
      .addFields({ name: 'Points', value: `+${points}`, inline: true })
      .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  // PvP game
  const gameId = gameIdOrBot + '_' + botChoiceOrChoice;
  const choice = playerChoice;
  const game = activeRPS.get(gameId);

  if (!game) {
    await interaction.reply({ content: 'This game has expired!', ephemeral: true });
    return;
  }

  const userId = interaction.user.id;

  if (userId === game.challengerId) {
    if (game.challengerChoice) {
      await interaction.reply({ content: 'You already made your choice!', ephemeral: true });
      return;
    }
    game.challengerChoice = choice;
    await interaction.reply({ content: `:white_check_mark: You chose **${choice}**! Waiting for opponent...`, ephemeral: true });
  } else if (userId === game.opponentId) {
    if (game.opponentChoice) {
      await interaction.reply({ content: 'You already made your choice!', ephemeral: true });
      return;
    }
    game.opponentChoice = choice;
    await interaction.reply({ content: `:white_check_mark: You chose **${choice}**! Waiting for challenger...`, ephemeral: true });
  } else {
    await interaction.reply({ content: 'You\'re not part of this game!', ephemeral: true });
    return;
  }

  // Both players chose
  if (game.challengerChoice && game.opponentChoice) {
    activeRPS.delete(gameId);

    const result = getRPSResult(game.challengerChoice, game.opponentChoice, game.extended);
    const choices = game.extended ? RPS_EXTENDED_CHOICES : RPS_CHOICES;

    let winnerName, loserName;
    if (result === 'win') {
      winnerName = game.challengerName;
      loserName = game.opponentName;
      await updateScore('rps', game.challengerId, game.challengerName, 50, true);
      await updateScore('rps', game.opponentId, game.opponentName, 0, false);
    } else if (result === 'lose') {
      winnerName = game.opponentName;
      loserName = game.challengerName;
      await updateScore('rps', game.opponentId, game.opponentName, 50, true);
      await updateScore('rps', game.challengerId, game.challengerName, 0, false);
    } else {
      await updateScore('rps', game.challengerId, game.challengerName, 10, false);
      await updateScore('rps', game.opponentId, game.opponentName, 10, false);
    }

    const resultEmoji = result === 'win' ? ':trophy:' : result === 'lose' ? ':trophy:' : ':handshake:';
    const resultText = result === 'draw' ? 'It\'s a Tie!' : `${winnerName} Wins!`;

    const embed = new EmbedBuilder()
      .setColor(result === 'draw' ? COLORS.amber : COLORS.emerald)
      .setTitle(`${resultEmoji} ${resultText}`)
      .setDescription(
        `**${game.challengerName}:** ${choices[game.challengerChoice]?.emoji} ${game.challengerChoice}\n` +
        `**${game.opponentName}:** ${choices[game.opponentChoice]?.emoji} ${game.opponentChoice}`,
      )
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });
  }
}

function getRPSResult(player1Choice, player2Choice, extended = false) {
  if (player1Choice === player2Choice) return 'draw';

  const choices = extended ? RPS_EXTENDED_CHOICES : RPS_CHOICES;
  const p1Beats = choices[player1Choice]?.beats;

  if (Array.isArray(p1Beats)) {
    return p1Beats.includes(player2Choice) ? 'win' : 'lose';
  }
  return p1Beats === player2Choice ? 'win' : 'lose';
}

// ═══════════════════════════════════════════════════════════════════════
// NUMBER GUESSING GAME
// ═══════════════════════════════════════════════════════════════════════

/**
 * Start number guessing game
 */
export async function startNumberGuess(interaction, maxNumber = 100, maxAttempts = 7) {
  const channelId = interaction.channel.id;

  if (activeNumberGuess.has(channelId)) {
    await interaction.reply({
      content: 'A number guessing game is already in progress!',
      ephemeral: true,
    });
    return;
  }

  const targetNumber = Math.floor(Math.random() * maxNumber) + 1;

  const game = {
    target: targetNumber,
    maxNumber,
    maxAttempts,
    attempts: 0,
    guesses: [],
    startTime: Date.now(),
    hostId: interaction.user.id,
    hostName: interaction.user.displayName || interaction.user.username,
  };

  activeNumberGuess.set(channelId, game);

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':1234: Number Guessing Game')
    .setDescription(`I'm thinking of a number between **1** and **${maxNumber}**!\n\nType a number to guess. You have **${maxAttempts}** attempts.`)
    .addFields(
      { name: 'Range', value: `1 - ${maxNumber}`, inline: true },
      { name: 'Attempts', value: `${maxAttempts}`, inline: true },
    )
    .setFooter({ text: 'Type a number to guess!' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * Check number guess
 */
export async function checkNumberGuess(message) {
  const channelId = message.channel.id;
  const game = activeNumberGuess.get(channelId);

  if (!game) return false;

  const guess = parseInt(message.content.trim());

  if (isNaN(guess) || guess < 1 || guess > game.maxNumber) {
    return false; // Not a valid guess
  }

  game.attempts++;
  game.guesses.push(guess);

  const userName = message.author.displayName || message.author.username;

  if (guess === game.target) {
    activeNumberGuess.delete(channelId);

    const points = Math.max(10, 100 - (game.attempts - 1) * 15);
    await updateScore('numberGuess', message.author.id, userName, points, true);

    const embed = new EmbedBuilder()
      .setColor(COLORS.emerald)
      .setTitle(':tada: Correct!')
      .setDescription(`**${userName}** guessed the number!\n\nThe number was: **${game.target}**`)
      .addFields(
        { name: 'Attempts', value: `${game.attempts}/${game.maxAttempts}`, inline: true },
        { name: 'Points', value: `+${points}`, inline: true },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return true;
  }

  const hint = guess < game.target ? ':arrow_up: Higher!' : ':arrow_down: Lower!';
  const attemptsLeft = game.maxAttempts - game.attempts;

  if (attemptsLeft <= 0) {
    activeNumberGuess.delete(channelId);

    const embed = new EmbedBuilder()
      .setColor(COLORS.rose)
      .setTitle(':x: Game Over!')
      .setDescription(`Out of attempts!\n\nThe number was: **${game.target}**`)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
    return true;
  }

  await message.reply({
    content: `${hint} **(${attemptsLeft} attempts left)**`,
  });

  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// QUIZ COMPETITION
// ═══════════════════════════════════════════════════════════════════════

const QUIZ_QUESTIONS = [
  { q: 'What is 15 x 17?', a: '255', type: 'math' },
  { q: 'What is the square root of 144?', a: '12', type: 'math' },
  { q: 'What is 2^10?', a: '1024', type: 'math' },
  { q: 'What planet is known as the Red Planet?', a: 'mars', type: 'science' },
  { q: 'What is the chemical symbol for water?', a: 'h2o', type: 'science' },
  { q: 'What year was the first moon landing?', a: '1969', type: 'history' },
  { q: 'Who wrote "Romeo and Juliet"?', a: 'shakespeare', type: 'literature' },
  { q: 'What is the largest mammal on Earth?', a: 'blue whale', type: 'science' },
  { q: 'What gas do plants absorb from the atmosphere?', a: 'carbon dioxide', type: 'science' },
  { q: 'In what year did World War I begin?', a: '1914', type: 'history' },
];

/**
 * Start quiz competition
 */
export async function startQuizCompetition(interaction, rounds = 5) {
  const channelId = interaction.channel.id;

  if (activeQuiz.has(channelId)) {
    await interaction.reply({
      content: 'A quiz competition is already in progress!',
      ephemeral: true,
    });
    return;
  }

  const questions = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, rounds);

  const game = {
    questions,
    currentRound: 0,
    scores: {},
    startTime: Date.now(),
    hostId: interaction.user.id,
    currentAnswer: null,
    answered: false,
  };

  activeQuiz.set(channelId, game);

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':trophy: Quiz Competition Starting!')
    .setDescription(`**Rounds:** ${rounds}\n**Host:** ${interaction.user.displayName || interaction.user.username}\n\nFirst to answer correctly wins points!\nType your answer in chat.`)
    .setFooter({ text: 'Game starts in 5 seconds...' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  setTimeout(() => askQuizQuestion(interaction.channel, channelId), 5000);
}

async function askQuizQuestion(channel, channelId) {
  const game = activeQuiz.get(channelId);
  if (!game) return;

  if (game.currentRound >= game.questions.length) {
    await endQuizCompetition(channel, channelId);
    return;
  }

  const question = game.questions[game.currentRound];
  game.currentAnswer = question.a.toLowerCase();
  game.answered = false;
  game.questionStartTime = Date.now();

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`Question ${game.currentRound + 1}/${game.questions.length}`)
    .setDescription(`**${question.q}**`)
    .addFields({ name: 'Category', value: question.type.charAt(0).toUpperCase() + question.type.slice(1), inline: true })
    .setFooter({ text: 'Type your answer! 20 seconds...' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  // Timeout
  setTimeout(async () => {
    const currentGame = activeQuiz.get(channelId);
    if (currentGame && !currentGame.answered && currentGame.currentRound === game.currentRound) {
      currentGame.currentRound++;
      await channel.send({ content: `:x: Time's up! The answer was: **${question.a}**` });
      setTimeout(() => askQuizQuestion(channel, channelId), 3000);
    }
  }, 20000);
}

/**
 * Check quiz answer
 */
export async function checkQuizAnswer(message) {
  const channelId = message.channel.id;
  const game = activeQuiz.get(channelId);

  if (!game || game.answered || !game.currentAnswer) return false;

  const guess = message.content.toLowerCase().trim();

  if (guess === game.currentAnswer || guess.includes(game.currentAnswer)) {
    game.answered = true;
    const userId = message.author.id;
    const userName = message.author.displayName || message.author.username;

    const responseTime = Date.now() - game.questionStartTime;
    const points = Math.max(10, 100 - Math.floor(responseTime / 200));

    if (!game.scores[userId]) {
      game.scores[userId] = { name: userName, points: 0, correct: 0 };
    }
    game.scores[userId].points += points;
    game.scores[userId].correct++;

    await message.reply({
      content: `:white_check_mark: Correct, **${userName}**! +${points} points`,
    });

    game.currentRound++;
    setTimeout(() => askQuizQuestion(message.channel, channelId), 3000);
    return true;
  }

  return false;
}

async function endQuizCompetition(channel, channelId) {
  const game = activeQuiz.get(channelId);
  if (!game) return;

  activeQuiz.delete(channelId);

  const sortedScores = Object.entries(game.scores)
    .map(([userId, data]) => ({ oduserId: userId, ...data }))
    .sort((a, b) => b.points - a.points);

  // Update leaderboard
  for (const player of sortedScores) {
    const isWinner = sortedScores.indexOf(player) === 0;
    await updateScore('quiz', player.userId, player.name, player.points, isWinner);
  }

  const medals = [':first_place:', ':second_place:', ':third_place:'];
  const scoreLines = sortedScores.slice(0, 10).map((player, i) => {
    const medal = medals[i] || `${i + 1}.`;
    return `${medal} **${player.name}** - ${player.points} pts (${player.correct} correct)`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':trophy: Quiz Competition Complete!')
    .setDescription(scoreLines.length > 0 ? scoreLines.join('\n') : 'No one played!')
    .addFields({ name: 'Questions', value: `${game.questions.length}`, inline: true })
    .setFooter({ text: 'Use /leaderboard quiz to see all-time rankings!' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if there's an active quick game
 */
export function hasActiveQuickGame(channelId) {
  return activeNumberGuess.has(channelId) || activeQuiz.has(channelId);
}

/**
 * Force end quick games
 */
export function forceEndQuickGames(channelId) {
  const hadNumber = activeNumberGuess.delete(channelId);
  const hadQuiz = activeQuiz.delete(channelId);
  return hadNumber || hadQuiz;
}

/**
 * Get game leaderboard
 */
export async function getGameLeaderboard(gameType, limit = 10) {
  const leaderboard = await loadLeaderboard();
  const gameData = leaderboard[gameType] || {};

  return Object.entries(gameData)
    .map(([userId, data]) => ({ oduserId: userId, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
