// CommunityOS Discord Bot - Agent Service
// Provides agent interactions, task management, and persona-based chat

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const ORG_PATH = join(CONTROL_CENTER, 'ORG');
const MEMORY_PATH = join(CONTROL_CENTER, 'MEMORY');
const TASKS_PATH = join(CONTROL_CENTER, 'TASKS');

// In-memory cache for org data
let orgCache = {
  org: null,
  personas: null,
  registry: null,
  lastRefresh: 0,
};
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Refresh org data cache
 */
async function refreshOrgCache() {
  const now = Date.now();
  if (now - orgCache.lastRefresh < CACHE_TTL && orgCache.org) {
    return;
  }

  try {
    // Load org.json
    const orgRaw = await readFile(join(ORG_PATH, 'org.json'), 'utf-8');
    orgCache.org = JSON.parse(orgRaw);

    // Load personas
    try {
      const personasRaw = await readFile(join(ORG_PATH, 'personas_by_agent.json'), 'utf-8');
      orgCache.personas = JSON.parse(personasRaw);
    } catch {
      orgCache.personas = { personas: {} };
    }

    // Load agent registry
    try {
      const registryRaw = await readFile(join(ORG_PATH, 'agents_registry.json'), 'utf-8');
      orgCache.registry = JSON.parse(registryRaw);
    } catch {
      orgCache.registry = { agents: [] };
    }

    orgCache.lastRefresh = now;
    console.log('Org cache refreshed');
  } catch (err) {
    console.error('Error refreshing org cache:', err.message);
  }
}

/**
 * Get all agents with their details
 * @returns {Array} - List of agents
 */
export async function getAllAgents() {
  await refreshOrgCache();

  if (!orgCache.org) return [];

  const agents = [];
  const teamMap = {};

  // Build team map
  for (const team of orgCache.org.teams) {
    for (const agentId of team.agents) {
      teamMap[agentId] = team;
    }
  }

  // Build section map
  const sectionMap = {};
  for (const section of orgCache.org.sections) {
    sectionMap[section.id] = section;
  }

  // Build agent list
  for (const agentId of orgCache.org.agents) {
    const team = teamMap[agentId];
    const section = team ? sectionMap[team.sectionId] : null;
    const persona = orgCache.personas?.personas?.[agentId];
    const skills = orgCache.org.agentSkills?.[agentId] || [];

    agents.push({
      id: agentId,
      displayName: persona?.displayName || agentId,
      tagline: persona?.tagline || '',
      team: team?.name || 'Unassigned',
      teamId: team?.id || null,
      section: section?.name || 'Unknown',
      sectionId: section?.id || null,
      isLead: team?.lead === agentId,
      skills,
      strengths: persona?.strengths || [],
      nowDoingDefault: persona?.nowDoingDefault || '',
      status: 'online', // Would need actual status tracking
    });
  }

  return agents;
}

/**
 * Get a specific agent by ID
 * @param {string} agentId - Agent ID
 * @returns {object|null} - Agent details or null
 */
export async function getAgent(agentId) {
  const agents = await getAllAgents();
  return agents.find(a => a.id === agentId) || null;
}

/**
 * Get agents filtered by section, team, or skills
 * @param {object} filter - Filter options
 * @returns {Array} - Filtered agents
 */
export async function filterAgents(filter = {}) {
  const agents = await getAllAgents();

  return agents.filter(agent => {
    if (filter.section && agent.sectionId !== filter.section) return false;
    if (filter.team && agent.teamId !== filter.team) return false;
    if (filter.skill && !agent.skills.includes(filter.skill)) return false;
    if (filter.isLead !== undefined && agent.isLead !== filter.isLead) return false;
    return true;
  });
}

/**
 * Get agent's recent memory (interactions)
 * @param {string} agentId - Agent ID
 * @param {number} limit - Maximum entries to return
 * @returns {Array} - Memory entries
 */
export async function getAgentMemory(agentId, limit = 10) {
  const memoryFile = join(MEMORY_PATH, `${agentId}.jsonl`);

  if (!existsSync(memoryFile)) {
    return [];
  }

  try {
    const content = await readFile(memoryFile, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());

    const entries = [];
    for (const line of lines.slice(-limit)) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip invalid lines
      }
    }

    return entries.reverse(); // Most recent first
  } catch (err) {
    console.error(`Error reading memory for ${agentId}:`, err.message);
    return [];
  }
}

/**
 * Log a memory entry for an agent
 * @param {string} agentId - Agent ID
 * @param {object} entry - Memory entry
 */
export async function logAgentMemory(agentId, entry) {
  const memoryFile = join(MEMORY_PATH, `${agentId}.jsonl`);
  const dir = dirname(memoryFile);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  }) + '\n';

  await writeFile(memoryFile, line, { flag: 'a' });
}

/**
 * Chat with an agent using their persona
 * @param {string} agentId - Agent ID
 * @param {string} message - User message
 * @param {object} context - Additional context
 * @returns {object} - Agent response
 */
export async function chatWithAgent(agentId, message, context = {}) {
  const agent = await getAgent(agentId);

  if (!agent) {
    return {
      success: false,
      error: `Agent "${agentId}" not found`,
    };
  }

  // Try to call Paco Hub API
  const PACO_HUB_URL = process.env.PACO_HUB_URL || 'http://localhost:3010';

  try {
    const res = await fetch(`${PACO_HUB_URL}/api/agents/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        message,
        context: {
          ...context,
          source: 'discord',
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();

      // Log to memory
      await logAgentMemory(agentId, {
        type: 'chat',
        source: 'discord',
        userId: context.userId,
        message,
        response: data.response,
      });

      return {
        success: true,
        response: data.response || data.message,
        agentName: agent.displayName,
        agentId: agent.id,
        team: agent.team,
      };
    }
  } catch (err) {
    console.error(`Chat error with ${agentId}:`, err.message);
  }

  // Fallback: Generate persona-based response
  const persona = orgCache.personas?.personas?.[agentId];
  let fallbackResponse;

  if (persona) {
    fallbackResponse = `*${persona.tagline}*\n\n`;

    if (message.toLowerCase().includes('help') || message.toLowerCase().includes('what can you do')) {
      fallbackResponse += `I'm ${agent.displayName} from the ${agent.team} team.\n\n`;
      fallbackResponse += `**My strengths:** ${agent.strengths.join(', ')}\n\n`;
      fallbackResponse += `**My skills:** ${agent.skills.join(', ')}\n\n`;
      fallbackResponse += `Right now I'm typically: *${persona.nowDoingDefault}*`;
    } else {
      fallbackResponse += `I received your message: "${message.slice(0, 100)}..."\n\n`;
      fallbackResponse += `As ${agent.displayName}, I'd approach this based on my expertise in ${agent.skills.slice(0, 3).join(', ')}.\n\n`;
      fallbackResponse += `*For a full AI-powered response, please use Paco Hub -> /chat*`;
    }
  } else {
    fallbackResponse = `Agent ${agentId} is available but the AI service is currently offline. Please try again later or use Paco Hub.`;
  }

  return {
    success: true,
    response: fallbackResponse,
    agentName: agent.displayName,
    agentId: agent.id,
    team: agent.team,
    isFallback: true,
  };
}

/**
 * Assign a task to an agent
 * @param {string} agentId - Agent ID
 * @param {string} task - Task description
 * @param {object} options - Task options (priority, due, etc.)
 * @returns {object} - Task result
 */
export async function assignTask(agentId, task, options = {}) {
  const agent = await getAgent(agentId);

  if (!agent) {
    return {
      success: false,
      error: `Agent "${agentId}" not found`,
    };
  }

  // Create task ID
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Create task object
  const taskObj = {
    id: taskId,
    description: task,
    assignedTo: agentId,
    assignedAt: new Date().toISOString(),
    status: 'pending',
    priority: options.priority || 'medium',
    dueDate: options.dueDate || null,
    source: 'discord',
    requesterId: options.userId || 'unknown',
    requesterName: options.userName || 'Discord User',
  };

  // Try to submit to Paco Hub
  const PACO_HUB_URL = process.env.PACO_HUB_URL || 'http://localhost:3010';

  try {
    const res = await fetch(`${PACO_HUB_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskObj),
    });

    if (res.ok) {
      const data = await res.json();

      // Log to agent memory
      await logAgentMemory(agentId, {
        type: 'task_assigned',
        taskId: data.task?.id || taskId,
        description: task,
        source: 'discord',
        userId: options.userId,
      });

      return {
        success: true,
        task: data.task || taskObj,
        agentName: agent.displayName,
        message: `Task assigned to ${agent.displayName}`,
      };
    }
  } catch (err) {
    console.error('Task assignment error:', err.message);
  }

  // Fallback: Save to local file
  const tasksFile = join(TASKS_PATH, 'discord_tasks.jsonl');
  const tasksDir = dirname(tasksFile);

  if (!existsSync(tasksDir)) {
    await mkdir(tasksDir, { recursive: true });
  }

  await writeFile(tasksFile, JSON.stringify(taskObj) + '\n', { flag: 'a' });

  // Log to agent memory
  await logAgentMemory(agentId, {
    type: 'task_assigned',
    taskId,
    description: task,
    source: 'discord',
    userId: options.userId,
  });

  return {
    success: true,
    task: taskObj,
    agentName: agent.displayName,
    message: `Task queued for ${agent.displayName} (offline mode)`,
    isOffline: true,
  };
}

/**
 * Get agent status (all agents or specific)
 * @param {string|null} agentId - Optional specific agent ID
 * @returns {object} - Status information
 */
export async function getAgentStatus(agentId = null) {
  await refreshOrgCache();

  if (agentId) {
    const agent = await getAgent(agentId);
    if (!agent) return null;

    // Try to get live status from Paco Hub
    const PACO_HUB_URL = process.env.PACO_HUB_URL || 'http://localhost:3010';

    try {
      const res = await fetch(`${PACO_HUB_URL}/api/agents/${agentId}/status`);
      if (res.ok) {
        const data = await res.json();
        return {
          ...agent,
          status: data.status || 'online',
          currentTask: data.currentTask,
          lastActive: data.lastActive,
        };
      }
    } catch {
      // Fall through to default
    }

    return {
      ...agent,
      status: 'online',
      currentTask: null,
      lastActive: null,
    };
  }

  // Get status for all agents grouped by team
  const agents = await getAllAgents();
  const byTeam = {};

  for (const agent of agents) {
    const teamName = agent.team || 'Unassigned';
    if (!byTeam[teamName]) {
      byTeam[teamName] = [];
    }
    byTeam[teamName].push({
      id: agent.id,
      name: agent.displayName,
      isLead: agent.isLead,
      status: 'online',
    });
  }

  return {
    totalAgents: agents.length,
    teams: Object.keys(byTeam).length,
    byTeam,
  };
}

/**
 * Summon an agent to a channel (create announcement)
 * @param {string} agentId - Agent ID
 * @returns {object} - Summon result with agent info
 */
export async function summonAgent(agentId) {
  const agent = await getAgent(agentId);

  if (!agent) {
    return {
      success: false,
      error: `Agent "${agentId}" not found`,
    };
  }

  const persona = orgCache.personas?.personas?.[agentId];

  return {
    success: true,
    agent: {
      id: agent.id,
      displayName: agent.displayName,
      tagline: persona?.tagline || `${agent.displayName} from ${agent.team}`,
      team: agent.team,
      section: agent.section,
      skills: agent.skills,
      strengths: agent.strengths || [],
      introduction: persona?.introduction || `Hello! I'm ${agent.displayName}, part of the ${agent.team} team. ${persona?.tagline || ''}`,
    },
  };
}

/**
 * Get teams with their agents
 * @returns {Array} - List of teams with agents
 */
export async function getTeams() {
  await refreshOrgCache();

  if (!orgCache.org) return [];

  const sectionMap = {};
  for (const section of orgCache.org.sections) {
    sectionMap[section.id] = section;
  }

  return orgCache.org.teams.map(team => {
    const section = sectionMap[team.sectionId];
    const leadAgent = orgCache.personas?.personas?.[team.lead];

    return {
      id: team.id,
      name: team.name,
      section: section?.name || 'Unknown',
      sectionId: team.sectionId,
      lead: team.lead,
      leadName: leadAgent?.displayName || team.lead,
      agentCount: team.agents.length,
      agents: team.agents,
    };
  });
}

/**
 * Get sections with their teams
 * @returns {Array} - List of sections
 */
export async function getSections() {
  await refreshOrgCache();

  if (!orgCache.org) return [];

  return orgCache.org.sections.map(section => {
    const teams = orgCache.org.teams.filter(t => t.sectionId === section.id);
    const totalAgents = teams.reduce((sum, t) => sum + t.agents.length, 0);

    return {
      id: section.id,
      name: section.name,
      description: section.description,
      teamCount: teams.length,
      agentCount: totalAgents,
      teams: teams.map(t => ({ id: t.id, name: t.name })),
    };
  });
}

/**
 * Search agents by name or skills
 * @param {string} query - Search query
 * @returns {Array} - Matching agents
 */
export async function searchAgents(query) {
  const agents = await getAllAgents();
  const queryLower = query.toLowerCase();

  return agents.filter(agent => {
    if (agent.id.toLowerCase().includes(queryLower)) return true;
    if (agent.displayName.toLowerCase().includes(queryLower)) return true;
    if (agent.team.toLowerCase().includes(queryLower)) return true;
    if (agent.skills.some(s => s.toLowerCase().includes(queryLower))) return true;
    if (agent.tagline.toLowerCase().includes(queryLower)) return true;
    return false;
  });
}
