// CommunityOS Discord Bot - Paco Hub Integration Module
// Sync user profiles, agent status, and broadcasts with Paco Hub

import { EmbedBuilder } from 'discord.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { COLORS, LINKS, API_ENDPOINTS } from '../config/constants.js';
import { findTextChannelByName } from './channels.js';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const PACO_HUB_URL = process.env.PACO_HUB_URL || LINKS.pacoHub;
const LINKED_PROFILES_FILE = join(CONTROL_CENTER, 'MEMORY', 'discord_linked_profiles.json');

// Cache for linked profiles
let linkedProfilesCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

// ═══════════════════════════════════════════════════════════════════════
// USER PROFILE SYNC
// ═══════════════════════════════════════════════════════════════════════

/**
 * Load linked profiles from file
 */
async function loadLinkedProfiles() {
  if (linkedProfilesCache && Date.now() - lastCacheUpdate < CACHE_TTL) {
    return linkedProfilesCache;
  }

  try {
    if (!existsSync(LINKED_PROFILES_FILE)) {
      return { profiles: {}, lastSync: null };
    }
    const data = await readFile(LINKED_PROFILES_FILE, 'utf-8');
    linkedProfilesCache = JSON.parse(data);
    lastCacheUpdate = Date.now();
    return linkedProfilesCache;
  } catch {
    return { profiles: {}, lastSync: null };
  }
}

/**
 * Save linked profiles to file
 */
async function saveLinkedProfiles(profiles) {
  const dir = dirname(LINKED_PROFILES_FILE);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(LINKED_PROFILES_FILE, JSON.stringify(profiles, null, 2));
  linkedProfilesCache = profiles;
  lastCacheUpdate = Date.now();
}

/**
 * Link Discord user to Paco Hub profile
 */
export async function linkProfile(discordUser, pacoHubToken = null) {
  const profiles = await loadLinkedProfiles();

  const userId = discordUser.id;
  const userName = discordUser.displayName || discordUser.username;
  const avatar = discordUser.displayAvatarURL({ size: 256 });

  // Create or update profile link
  profiles.profiles[userId] = {
    discordId: userId,
    discordName: userName,
    discordAvatar: avatar,
    linkedAt: new Date().toISOString(),
    pacoHubToken: pacoHubToken || null,
    badges: [],
    stats: {
      messagesCount: 0,
      commandsUsed: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      kbSearches: 0,
      agentChats: 0,
      ticketsCreated: 0,
      ideasSubmitted: 0,
      shipsPosted: 0,
    },
    preferences: {
      notifications: true,
      dmReminders: true,
      showInLeaderboard: true,
    },
    joinedAt: discordUser.createdAt?.toISOString() || new Date().toISOString(),
  };

  // Try to sync with Paco Hub API
  try {
    const response = await fetch(`${PACO_HUB_URL}/api/discord/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: userId,
        discordName: userName,
        discordAvatar: avatar,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      profiles.profiles[userId].pacoHubId = data.profileId;
      profiles.profiles[userId].syncedWithHub = true;
    }
  } catch {
    // API not available, local link only
    profiles.profiles[userId].syncedWithHub = false;
  }

  profiles.lastSync = new Date().toISOString();
  await saveLinkedProfiles(profiles);

  return profiles.profiles[userId];
}

/**
 * Get linked profile for Discord user
 */
export async function getLinkedProfile(discordUserId) {
  const profiles = await loadLinkedProfiles();
  return profiles.profiles[discordUserId] || null;
}

/**
 * Unlink Discord user from Paco Hub
 */
export async function unlinkProfile(discordUserId) {
  const profiles = await loadLinkedProfiles();

  if (!profiles.profiles[discordUserId]) {
    return { success: false, error: 'Profile not linked' };
  }

  delete profiles.profiles[discordUserId];
  await saveLinkedProfiles(profiles);

  return { success: true };
}

/**
 * Update profile stats
 */
export async function updateProfileStats(discordUserId, statUpdates) {
  const profiles = await loadLinkedProfiles();

  if (!profiles.profiles[discordUserId]) {
    return null;
  }

  const profile = profiles.profiles[discordUserId];
  for (const [key, value] of Object.entries(statUpdates)) {
    if (typeof value === 'number') {
      profile.stats[key] = (profile.stats[key] || 0) + value;
    } else {
      profile.stats[key] = value;
    }
  }

  // Check for badge achievements
  await checkAndAwardBadges(profile);

  profiles.lastSync = new Date().toISOString();
  await saveLinkedProfiles(profiles);

  return profile;
}

/**
 * Check and award badges based on stats
 */
async function checkAndAwardBadges(profile) {
  const badges = profile.badges || [];

  const badgeRules = [
    { id: 'first_message', name: 'First Steps', condition: () => profile.stats.messagesCount >= 1 },
    { id: 'chatty', name: 'Chatty', condition: () => profile.stats.messagesCount >= 100 },
    { id: 'power_user', name: 'Power User', condition: () => profile.stats.commandsUsed >= 50 },
    { id: 'gamer', name: 'Gamer', condition: () => profile.stats.gamesPlayed >= 10 },
    { id: 'winner', name: 'Winner', condition: () => profile.stats.gamesWon >= 5 },
    { id: 'researcher', name: 'Researcher', condition: () => profile.stats.kbSearches >= 20 },
    { id: 'ai_friend', name: 'AI Friend', condition: () => profile.stats.agentChats >= 10 },
    { id: 'helper', name: 'Helper', condition: () => profile.stats.ticketsCreated >= 5 },
    { id: 'idea_machine', name: 'Idea Machine', condition: () => profile.stats.ideasSubmitted >= 10 },
    { id: 'shipper', name: 'Shipper', condition: () => profile.stats.shipsPosted >= 5 },
  ];

  for (const rule of badgeRules) {
    if (!badges.includes(rule.id) && rule.condition()) {
      badges.push(rule.id);
    }
  }

  profile.badges = badges;
}

/**
 * Get badge emoji and description
 */
export function getBadgeInfo(badgeId) {
  const badges = {
    first_message: { emoji: ':wave:', name: 'First Steps', description: 'Sent your first message' },
    chatty: { emoji: ':speech_balloon:', name: 'Chatty', description: 'Sent 100+ messages' },
    power_user: { emoji: ':zap:', name: 'Power User', description: 'Used 50+ commands' },
    gamer: { emoji: ':video_game:', name: 'Gamer', description: 'Played 10+ games' },
    winner: { emoji: ':trophy:', name: 'Winner', description: 'Won 5+ games' },
    researcher: { emoji: ':mag:', name: 'Researcher', description: 'Searched KB 20+ times' },
    ai_friend: { emoji: ':robot:', name: 'AI Friend', description: 'Chatted with agents 10+ times' },
    helper: { emoji: ':handshake:', name: 'Helper', description: 'Created 5+ support tickets' },
    idea_machine: { emoji: ':bulb:', name: 'Idea Machine', description: 'Submitted 10+ ideas' },
    shipper: { emoji: ':rocket:', name: 'Shipper', description: 'Posted 5+ ship updates' },
  };

  return badges[badgeId] || { emoji: ':star:', name: badgeId, description: 'Unknown badge' };
}

/**
 * Create profile embed
 */
export async function createProfileEmbed(discordUser, member = null) {
  const profile = await getLinkedProfile(discordUser.id);

  const embed = new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(`Profile: ${discordUser.displayName || discordUser.username}`)
    .setThumbnail(discordUser.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  if (!profile) {
    embed.setDescription('Profile not linked to Paco Hub.\nUse `/link create` to link your profile!')
      .setColor(COLORS.amber);
    return embed;
  }

  // Badges
  if (profile.badges && profile.badges.length > 0) {
    const badgeStr = profile.badges.map(b => getBadgeInfo(b).emoji).join(' ');
    embed.addFields({ name: 'Badges', value: badgeStr, inline: false });
  }

  // Stats
  embed.addFields(
    { name: 'Messages', value: `${profile.stats.messagesCount || 0}`, inline: true },
    { name: 'Commands', value: `${profile.stats.commandsUsed || 0}`, inline: true },
    { name: 'Games', value: `${profile.stats.gamesPlayed || 0} (${profile.stats.gamesWon || 0} wins)`, inline: true },
    { name: 'KB Searches', value: `${profile.stats.kbSearches || 0}`, inline: true },
    { name: 'Agent Chats', value: `${profile.stats.agentChats || 0}`, inline: true },
    { name: 'Ships Posted', value: `${profile.stats.shipsPosted || 0}`, inline: true },
  );

  if (member) {
    const roles = member.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => r.name)
      .slice(0, 10);
    if (roles.length > 0) {
      embed.addFields({ name: 'Roles', value: roles.join(', '), inline: false });
    }
  }

  if (profile.syncedWithHub) {
    embed.setFooter({ text: `Synced with Paco Hub | Linked ${new Date(profile.linkedAt).toLocaleDateString()}` });
  } else {
    embed.setFooter({ text: `Local profile | Linked ${new Date(profile.linkedAt).toLocaleDateString()}` });
  }

  return embed;
}

// ═══════════════════════════════════════════════════════════════════════
// AGENT STATUS SYNC
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get agent status from Paco Hub
 */
export async function getAgentStatusFromHub() {
  try {
    const response = await fetch(`${PACO_HUB_URL}/api/agents/status`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // API not available
  }

  // Fallback to local org.json
  try {
    const orgPath = join(CONTROL_CENTER, 'ORG', 'org.json');
    const org = JSON.parse(await readFile(orgPath, 'utf-8'));

    const agents = [];
    for (const team of org.teams || []) {
      for (const agentId of team.agents || []) {
        agents.push({
          id: agentId,
          team: team.name,
          teamId: team.id,
          status: 'online',
          isLead: team.lead === agentId,
        });
      }
    }

    return {
      success: true,
      agents,
      totalAgents: agents.length,
      source: 'local',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      agents: [],
      source: 'none',
    };
  }
}

/**
 * Create agent status embed
 */
export async function createAgentStatusEmbed() {
  const status = await getAgentStatusFromHub();

  const embed = new EmbedBuilder()
    .setColor(status.success ? COLORS.emerald : COLORS.rose)
    .setTitle(':robot: Agent Status')
    .setTimestamp();

  if (!status.success) {
    embed.setDescription(`Could not fetch agent status: ${status.error}`);
    return embed;
  }

  // Group by team
  const byTeam = {};
  for (const agent of status.agents || []) {
    if (!byTeam[agent.teamId]) {
      byTeam[agent.teamId] = { name: agent.team, agents: [] };
    }
    byTeam[agent.teamId].agents.push(agent);
  }

  const teamLines = Object.values(byTeam).slice(0, 8).map(team => {
    const agentList = team.agents.slice(0, 5).map(a => {
      const icon = a.isLead ? ':star:' : ':small_blue_diamond:';
      return `${icon} ${a.id}`;
    }).join(', ');
    return `**${team.name}** (${team.agents.length})\n${agentList}`;
  });

  embed.setDescription(teamLines.join('\n\n'));
  embed.addFields(
    { name: 'Total Agents', value: `${status.totalAgents}`, inline: true },
    { name: 'Status', value: ':green_circle: All Online', inline: true },
    { name: 'Source', value: status.source === 'local' ? 'Local' : 'Paco Hub', inline: true },
  );

  return embed;
}

// ═══════════════════════════════════════════════════════════════════════
// BROADCAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Poll for new broadcasts from Paco Hub
 */
export async function pollBroadcasts(client, guildId) {
  try {
    const response = await fetch(`${PACO_HUB_URL}/api/broadcast/pending?target=discord`);
    if (!response.ok) return;

    const data = await response.json();
    const broadcasts = data.broadcasts || [];

    if (broadcasts.length === 0) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    for (const broadcast of broadcasts) {
      await sendBroadcast(guild, broadcast);

      // Mark as sent
      await fetch(`${PACO_HUB_URL}/api/broadcast/${broadcast.id}/mark-sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'discord' }),
      }).catch(() => {});
    }
  } catch {
    // API not available, skip
  }
}

/**
 * Send broadcast to appropriate Discord channel
 */
async function sendBroadcast(guild, broadcast) {
  const channelMap = {
    announcement: 'announcements',
    status: 'status',
    stream: 'stream-chat',
    agent: 'agent-reports',
    support: 'support',
    ship: 'ship-log',
  };

  const channelName = channelMap[broadcast.type] || 'announcements';
  const channel = await findTextChannelByName(guild, channelName);

  if (!channel) return;

  const colorMap = {
    announcement: COLORS.cyan,
    status: COLORS.emerald,
    stream: COLORS.rose,
    agent: COLORS.purple,
    support: COLORS.amber,
    ship: COLORS.indigo,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[broadcast.type] || COLORS.cyan)
    .setTitle(broadcast.title)
    .setDescription(broadcast.message)
    .setTimestamp(new Date(broadcast.createdAt));

  if (broadcast.author) {
    embed.setAuthor({ name: broadcast.author });
  }

  if (broadcast.fields) {
    embed.addFields(broadcast.fields);
  }

  embed.setFooter({ text: 'Paco Hub Broadcast' });

  const content = broadcast.mentionEveryone ? '@here' : undefined;
  await channel.send({ content, embeds: [embed] });
}

// ═══════════════════════════════════════════════════════════════════════
// COMMUNITY PAGES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get community links embed
 */
export function createCommunityLinksEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.cyan)
    .setTitle(':link: Community Links')
    .setDescription('Quick access to all CommunityOS resources!')
    .addFields(
      { name: ':house: Paco Hub', value: `[Dashboard](${PACO_HUB_URL}/)`, inline: true },
      { name: ':robot: Agents', value: `[Agent Directory](${PACO_HUB_URL}/org)`, inline: true },
      { name: ':books: Knowledge Base', value: `[Browse KB](${PACO_HUB_URL}/kb)`, inline: true },
      { name: ':speech_balloon: Chat', value: `[AI Chat](${PACO_HUB_URL}/chat)`, inline: true },
      { name: ':briefcase: Career', value: `[CV Pipeline](${PACO_HUB_URL}/career)`, inline: true },
      { name: ':ticket: Support', value: `[Get Help](${PACO_HUB_URL}/support-funnel)`, inline: true },
      { name: ':red_circle: YouTube', value: `[Watch](${LINKS.youtube})`, inline: true },
      { name: ':purple_circle: Twitch', value: `[Watch](${LINKS.twitch})`, inline: true },
      { name: ':octopus: GitHub', value: `[Code](${LINKS.github})`, inline: true },
    )
    .setFooter({ text: 'CommunityOS - AI-Native Company' })
    .setTimestamp();
}

/**
 * Get stats from Paco Hub
 */
export async function getCommunityStats() {
  try {
    const response = await fetch(`${PACO_HUB_URL}/api/stats`);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // API not available
  }

  // Return mock stats
  return {
    members: '100+',
    agents: '22+',
    teams: '8',
    kbDocs: '50+',
    streamHours: '100+',
    shipsLogged: '200+',
  };
}

/**
 * Create community stats embed
 */
export async function createCommunityStatsEmbed() {
  const stats = await getCommunityStats();

  return new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':bar_chart: Community Stats')
    .addFields(
      { name: 'Members', value: stats.members, inline: true },
      { name: 'AI Agents', value: stats.agents, inline: true },
      { name: 'Teams', value: stats.teams, inline: true },
      { name: 'KB Documents', value: stats.kbDocs, inline: true },
      { name: 'Stream Hours', value: stats.streamHours, inline: true },
      { name: 'Ships Logged', value: stats.shipsLogged, inline: true },
    )
    .setFooter({ text: 'Updated in real-time from Paco Hub' })
    .setTimestamp();
}

// ═══════════════════════════════════════════════════════════════════════
// LEADERBOARD SYNC
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get activity leaderboard
 */
export async function getActivityLeaderboard(limit = 10) {
  const profiles = await loadLinkedProfiles();

  const sorted = Object.values(profiles.profiles || {})
    .map(profile => ({
      name: profile.discordName,
      discordId: profile.discordId,
      score: (profile.stats.messagesCount || 0) +
             (profile.stats.commandsUsed || 0) * 2 +
             (profile.stats.gamesWon || 0) * 5 +
             (profile.stats.shipsPosted || 0) * 10,
      badges: profile.badges?.length || 0,
      stats: profile.stats,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return sorted;
}

/**
 * Create activity leaderboard embed
 */
export async function createActivityLeaderboardEmbed(limit = 10) {
  const leaderboard = await getActivityLeaderboard(limit);

  if (leaderboard.length === 0) {
    return new EmbedBuilder()
      .setColor(COLORS.amber)
      .setTitle(':trophy: Activity Leaderboard')
      .setDescription('No activity recorded yet! Start chatting and using commands to appear here.')
      .setTimestamp();
  }

  const medals = [':first_place:', ':second_place:', ':third_place:'];
  const lines = leaderboard.map((player, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const badgeCount = player.badges > 0 ? ` (:medal: ${player.badges})` : '';
    return `${medal} **${player.name}** - ${player.score} pts${badgeCount}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.purple)
    .setTitle(':trophy: Activity Leaderboard')
    .setDescription(lines.join('\n'))
    .addFields({ name: 'How Points Work', value: 'Messages: 1pt | Commands: 2pts | Game wins: 5pts | Ships: 10pts', inline: false })
    .setFooter({ text: 'Link your profile with /link create to track your stats!' })
    .setTimestamp();
}
