// CommunityOS Discord Bot - Trivia Game Module
// Enhanced trivia game with categories, leaderboards, and multiplayer support

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { COLORS } from '../config/constants.js';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const LEADERBOARD_FILE = join(CONTROL_CENTER, 'MEMORY', 'game_leaderboards.json');

// Trivia Questions Database
const TRIVIA_QUESTIONS = {
  tech: [
    { q: 'What does CPU stand for?', a: 'Central Processing Unit', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit', 'Central Protocol Unit'] },
    { q: 'What does HTML stand for?', a: 'HyperText Markup Language', options: ['HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlinks Text Mark Language', 'Hyperlinking Text Marking Language'] },
    { q: 'Who is known as the father of the computer?', a: 'Charles Babbage', options: ['Alan Turing', 'Charles Babbage', 'Bill Gates', 'Steve Jobs'] },
    { q: 'What does RAM stand for?', a: 'Random Access Memory', options: ['Random Access Memory', 'Read Access Memory', 'Run Access Memory', 'Rapid Access Module'] },
    { q: 'Which company created JavaScript?', a: 'Netscape', options: ['Microsoft', 'Apple', 'Netscape', 'Google'] },
    { q: 'What does API stand for?', a: 'Application Programming Interface', options: ['Application Programming Interface', 'Advanced Program Integration', 'Automated Protocol Interface', 'Application Process Integration'] },
    { q: 'What year was the first iPhone released?', a: '2007', options: ['2005', '2006', '2007', '2008'] },
    { q: 'What does SSD stand for?', a: 'Solid State Drive', options: ['Solid State Drive', 'Super Speed Disk', 'System Storage Device', 'Solid System Data'] },
    { q: 'Who founded Microsoft?', a: 'Bill Gates and Paul Allen', options: ['Bill Gates and Paul Allen', 'Steve Jobs and Steve Wozniak', 'Larry Page and Sergey Brin', 'Mark Zuckerberg'] },
    { q: 'What programming language was created by Guido van Rossum?', a: 'Python', options: ['Java', 'Python', 'Ruby', 'PHP'] },
  ],
  ai: [
    { q: 'What company created ChatGPT?', a: 'OpenAI', options: ['Google', 'OpenAI', 'Microsoft', 'Meta'] },
    { q: 'What does GPT stand for?', a: 'Generative Pre-trained Transformer', options: ['Generative Pre-trained Transformer', 'General Purpose Tool', 'Global Processing Technology', 'Guided Program Training'] },
    { q: 'Who coined the term "Artificial Intelligence"?', a: 'John McCarthy', options: ['Alan Turing', 'John McCarthy', 'Marvin Minsky', 'Claude Shannon'] },
    { q: 'What is the Turing Test used for?', a: "Testing a machine's ability to exhibit intelligent behavior", options: ["Testing a machine's ability to exhibit intelligent behavior", 'Testing computer speed', 'Testing memory capacity', 'Testing network connectivity'] },
    { q: 'What company created Claude AI?', a: 'Anthropic', options: ['OpenAI', 'Google', 'Anthropic', 'Microsoft'] },
    { q: 'What does LLM stand for?', a: 'Large Language Model', options: ['Large Language Model', 'Linear Learning Machine', 'Logical Language Module', 'Limited Learning Method'] },
    { q: 'What was the name of the chess computer that beat Garry Kasparov?', a: 'Deep Blue', options: ['AlphaGo', 'Deep Blue', 'Watson', 'HAL 9000'] },
    { q: 'What year was the first neural network created?', a: '1958', options: ['1943', '1958', '1969', '1982'] },
  ],
  general: [
    { q: 'What is the smallest country in the world?', a: 'Vatican City', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'] },
    { q: 'What is the largest ocean on Earth?', a: 'Pacific Ocean', options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'] },
    { q: 'How many continents are there?', a: '7', options: ['5', '6', '7', '8'] },
    { q: 'What is the capital of Japan?', a: 'Tokyo', options: ['Kyoto', 'Osaka', 'Tokyo', 'Nagoya'] },
    { q: 'Who painted the Mona Lisa?', a: 'Leonardo da Vinci', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'] },
    { q: 'What is the largest planet in our solar system?', a: 'Jupiter', options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'] },
    { q: 'What year did World War II end?', a: '1945', options: ['1943', '1944', '1945', '1946'] },
    { q: 'What is the chemical symbol for gold?', a: 'Au', options: ['Ag', 'Au', 'Gd', 'Go'] },
  ],
  programming: [
    { q: 'What symbol is used for comments in Python?', a: '#', options: ['//', '#', '/*', '--'] },
    { q: 'What does CSS stand for?', a: 'Cascading Style Sheets', options: ['Cascading Style Sheets', 'Computer Style Sheets', 'Creative Style Sheets', 'Colorful Style Sheets'] },
    { q: 'Which language is primarily used for iOS development?', a: 'Swift', options: ['Java', 'Kotlin', 'Swift', 'C#'] },
    { q: 'What is the output of 2 ** 3 in Python?', a: '8', options: ['6', '8', '9', '23'] },
    { q: 'What does JSON stand for?', a: 'JavaScript Object Notation', options: ['JavaScript Object Notation', 'Java Standard Object Notation', 'JavaScript Online Network', 'Java Serialized Object Network'] },
    { q: 'Which company developed the Go programming language?', a: 'Google', options: ['Microsoft', 'Apple', 'Google', 'Amazon'] },
    { q: 'What is the default port for HTTP?', a: '80', options: ['21', '80', '443', '8080'] },
    { q: 'Which of these is NOT a JavaScript framework?', a: 'Django', options: ['React', 'Vue', 'Angular', 'Django'] },
  ],
  crypto: [
    { q: 'Who created Bitcoin?', a: 'Satoshi Nakamoto', options: ['Satoshi Nakamoto', 'Vitalik Buterin', 'Charlie Lee', 'Elon Musk'] },
    { q: 'What year was Bitcoin created?', a: '2009', options: ['2007', '2008', '2009', '2010'] },
    { q: 'What is the name of Ethereum smart contract programming language?', a: 'Solidity', options: ['Solidity', 'Rust', 'Vyper', 'Move'] },
    { q: 'What does NFT stand for?', a: 'Non-Fungible Token', options: ['Non-Fungible Token', 'New Finance Technology', 'Network File Transfer', 'Next Future Token'] },
    { q: 'What consensus mechanism does Bitcoin use?', a: 'Proof of Work', options: ['Proof of Stake', 'Proof of Work', 'Delegated Proof of Stake', 'Proof of Authority'] },
  ],
};

// Active game sessions
const activeGames = new Map();
const userCooldowns = new Map();

// Load/save leaderboard
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

export async function getLeaderboard(gameType, limit = 10) {
  const leaderboard = await loadLeaderboard();
  const gameData = leaderboard[gameType] || {};

  const sorted = Object.entries(gameData)
    .map(([userId, data]) => ({ ...data, oduserId: userId }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return sorted;
}

/**
 * Start a trivia game session
 */
export async function startTriviaGame(interaction, category = 'tech', rounds = 5) {
  const channelId = interaction.channel.id;

  // Check if game already active
  if (activeGames.has(channelId)) {
    await interaction.reply({
      content: 'A game is already in progress in this channel! Wait for it to finish.',
      ephemeral: true,
    });
    return;
  }

  // Check user cooldown (prevent spam)
  const userKey = `${interaction.user.id}-trivia`;
  const lastGame = userCooldowns.get(userKey);
  if (lastGame && Date.now() - lastGame < 30000) {
    await interaction.reply({
      content: 'Please wait 30 seconds between starting new games.',
      ephemeral: true,
    });
    return;
  }
  userCooldowns.set(userKey, Date.now());

  const questions = TRIVIA_QUESTIONS[category] || TRIVIA_QUESTIONS.tech;
  const gameQuestions = [...questions].sort(() => Math.random() - 0.5).slice(0, Math.min(rounds, questions.length));

  const gameSession = {
    category,
    questions: gameQuestions,
    currentRound: 0,
    scores: {},
    startTime: Date.now(),
    hostId: interaction.user.id,
    hostName: interaction.user.displayName || interaction.user.username,
    timeout: null,
  };

  activeGames.set(channelId, gameSession);

  const startEmbed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':brain: Trivia Game Starting!')
    .setDescription(`**Category:** ${category.charAt(0).toUpperCase() + category.slice(1)}\n**Rounds:** ${gameQuestions.length}\n**Host:** ${gameSession.hostName}`)
    .addFields(
      { name: 'How to Play', value: 'Click the button with your answer!\nYou have 20 seconds per question.\nFaster answers = more points!', inline: false },
    )
    .setFooter({ text: 'Game starts in 5 seconds...' })
    .setTimestamp();

  await interaction.reply({ embeds: [startEmbed] });

  // Start first question after 5 seconds
  setTimeout(() => {
    askQuestion(interaction.channel, channelId);
  }, 5000);
}

async function askQuestion(channel, channelId) {
  const game = activeGames.get(channelId);
  if (!game) return;

  if (game.currentRound >= game.questions.length) {
    await endGame(channel, channelId);
    return;
  }

  const question = game.questions[game.currentRound];
  const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
  game.currentQuestion = question;
  game.currentOptions = shuffledOptions;
  game.questionStartTime = Date.now();
  game.answeredUsers = new Set();

  const optionEmojis = [':regional_indicator_a:', ':regional_indicator_b:', ':regional_indicator_c:', ':regional_indicator_d:'];
  const optionLines = shuffledOptions.map((opt, i) => `${optionEmojis[i]} ${opt}`);

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`Question ${game.currentRound + 1}/${game.questions.length}`)
    .setDescription(`**${question.q}**\n\n${optionLines.join('\n')}`)
    .addFields({ name: 'Time', value: '20 seconds', inline: true })
    .setFooter({ text: 'Click a button to answer!' })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`trivia_a_${channelId}`).setLabel('A').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`trivia_b_${channelId}`).setLabel('B').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`trivia_c_${channelId}`).setLabel('C').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`trivia_d_${channelId}`).setLabel('D').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [buttons] });

  // Set timeout for question
  game.timeout = setTimeout(() => {
    revealAnswer(channel, channelId);
  }, 20000);
}

async function revealAnswer(channel, channelId) {
  const game = activeGames.get(channelId);
  if (!game || !game.currentQuestion) return;

  const correctIndex = game.currentOptions.indexOf(game.currentQuestion.a);
  const letters = ['A', 'B', 'C', 'D'];

  const embed = new EmbedBuilder()
    .setColor(COLORS.emerald)
    .setTitle(':white_check_mark: Time\'s Up!')
    .setDescription(`The correct answer was: **${letters[correctIndex]}. ${game.currentQuestion.a}**`)
    .setTimestamp();

  // Show who got it right this round
  const roundScores = [];
  for (const [userId, data] of Object.entries(game.scores)) {
    if (data.lastRoundCorrect) {
      roundScores.push(`${data.name}: +${data.lastRoundPoints} pts`);
    }
  }

  if (roundScores.length > 0) {
    embed.addFields({ name: 'Correct Answers', value: roundScores.join('\n'), inline: false });
  } else {
    embed.addFields({ name: 'Result', value: 'No one got it right!', inline: false });
  }

  await channel.send({ embeds: [embed] });

  game.currentRound++;

  // Next question or end game
  setTimeout(() => {
    if (game.currentRound >= game.questions.length) {
      endGame(channel, channelId);
    } else {
      askQuestion(channel, channelId);
    }
  }, 3000);
}

async function endGame(channel, channelId) {
  const game = activeGames.get(channelId);
  if (!game) return;

  if (game.timeout) clearTimeout(game.timeout);

  // Calculate final scores
  const sortedScores = Object.entries(game.scores)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // Update leaderboard
  for (const player of sortedScores) {
    const isWinner = sortedScores.indexOf(player) === 0;
    await updateScore('trivia', player.userId, player.name, player.totalPoints, isWinner);
  }

  const medals = [':first_place:', ':second_place:', ':third_place:'];
  const scoreLines = sortedScores.slice(0, 10).map((player, i) => {
    const medal = medals[i] || `${i + 1}.`;
    return `${medal} **${player.name}** - ${player.totalPoints} pts (${player.correct}/${game.questions.length} correct)`;
  });

  const duration = Math.floor((Date.now() - game.startTime) / 1000);

  const embed = new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':trophy: Trivia Game Complete!')
    .setDescription(scoreLines.length > 0 ? scoreLines.join('\n') : 'No one played!')
    .addFields(
      { name: 'Category', value: game.category.charAt(0).toUpperCase() + game.category.slice(1), inline: true },
      { name: 'Questions', value: `${game.questions.length}`, inline: true },
      { name: 'Duration', value: `${duration}s`, inline: true },
    )
    .setFooter({ text: 'Use /leaderboard trivia to see all-time rankings!' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  activeGames.delete(channelId);
}

/**
 * Handle trivia answer button
 */
export async function handleTriviaAnswer(interaction) {
  const channelId = interaction.channel.id;
  const game = activeGames.get(channelId);

  if (!game || !game.currentQuestion) {
    await interaction.reply({ content: 'No active trivia question!', ephemeral: true });
    return;
  }

  // Check if already answered
  if (game.answeredUsers.has(interaction.user.id)) {
    await interaction.reply({ content: 'You already answered this question!', ephemeral: true });
    return;
  }

  game.answeredUsers.add(interaction.user.id);

  // Parse answer from button ID
  const buttonId = interaction.customId;
  const answerLetter = buttonId.split('_')[1].toUpperCase();
  const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
  const selectedAnswer = game.currentOptions[answerIndex];
  const isCorrect = selectedAnswer === game.currentQuestion.a;

  // Calculate points based on speed
  const responseTime = Date.now() - game.questionStartTime;
  const maxPoints = 100;
  const minPoints = 10;
  const timeBonus = Math.max(0, 1 - responseTime / 20000);
  const points = isCorrect ? Math.floor(minPoints + (maxPoints - minPoints) * timeBonus) : 0;

  // Update player score
  const userId = interaction.user.id;
  const userName = interaction.user.displayName || interaction.user.username;

  if (!game.scores[userId]) {
    game.scores[userId] = {
      name: userName,
      totalPoints: 0,
      correct: 0,
      incorrect: 0,
    };
  }

  game.scores[userId].totalPoints += points;
  game.scores[userId].lastRoundCorrect = isCorrect;
  game.scores[userId].lastRoundPoints = points;

  if (isCorrect) {
    game.scores[userId].correct++;
  } else {
    game.scores[userId].incorrect++;
  }

  await interaction.reply({
    content: isCorrect
      ? `:white_check_mark: Correct! +${points} points (${Math.floor(responseTime / 1000)}s)`
      : `:x: Wrong! The answer was ${game.currentQuestion.a}`,
    ephemeral: true,
  });
}

/**
 * Check if there's an active game
 */
export function hasActiveGame(channelId) {
  return activeGames.has(channelId);
}

/**
 * Force end a game (admin)
 */
export function forceEndGame(channelId) {
  const game = activeGames.get(channelId);
  if (game && game.timeout) {
    clearTimeout(game.timeout);
  }
  activeGames.delete(channelId);
  return !!game;
}

export { TRIVIA_QUESTIONS };
