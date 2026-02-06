import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const CC = '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function findChannel(guild, name) {
  const channels = await guild.channels.fetch();
  return channels.find(c => c && c.type === ChannelType.GuildText && c.name === name);
}

async function run() {
  // Load org data
  const org = JSON.parse(readFileSync(join(CC, 'ORG', 'org.json'), 'utf-8'));
  const registry = JSON.parse(readFileSync(join(CC, 'ORG', 'agents_registry.json'), 'utf-8'));
  const personasData = JSON.parse(readFileSync(join(CC, 'ORG', 'personas_by_agent.json'), 'utf-8'));
  const personas = personasData.personas;

  const agentMap = {};
  for (const a of registry.agents) {
    agentMap[a.id] = a;
  }

  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  console.log(`Connected to ${guild.name}`);

  // 1. Post org overview to #agent-general
  const generalCh = await findChannel(guild, 'agent-general');
  if (generalCh) {
    const sectionList = org.sections.map(s =>
      `**${s.name}** — ${s.description}\n> Teams: ${s.teamIds.join(', ')}`
    ).join('\n\n');

    await generalCh.send(
      `# Community-OS Organisation\n\n` +
      `**22 Agents** across **6 Sections** and **8 Teams**\n\n` +
      `## Sections\n${sectionList}\n\n` +
      `Each team has a dedicated channel in the TEAMS category. Agents can post updates and interact there.`
    );
    console.log('Posted org overview to #agent-general');
    await sleep(1500);

    // Post agent directory (split into batches)
    const agentLines = registry.agents.map(a => {
      const p = personas[a.id];
      const tag = p ? `— *${p.tagline}*` : '';
      return `**${a.displayName}** (${a.role}) ${tag}`;
    });

    let batch = '# Agent Directory\n\n';
    for (const line of agentLines) {
      if (batch.length + line.length + 2 > 1900) {
        await generalCh.send(batch);
        await sleep(1000);
        batch = '';
      }
      batch += line + '\n';
    }
    if (batch.trim()) {
      await generalCh.send(batch);
    }
    console.log('Posted agent directory');
    await sleep(1500);
  }

  // 2. Post team rosters to each team channel
  for (const team of org.teams) {
    const ch = await findChannel(guild, team.id);
    if (!ch) {
      console.log(`  Channel #${team.id} not found, skipping`);
      continue;
    }

    const section = org.sections.find(s => s.id === team.sectionId);
    let msg = `# ${team.name}\n`;
    msg += `> Part of **${section?.name || team.sectionId}**\n\n`;
    msg += `## Team Members\n\n`;

    for (const agentId of team.agents) {
      const a = agentMap[agentId];
      const p = personas[agentId];
      if (!a) continue;

      msg += `### ${a.displayName}\n`;
      msg += `**Role:** ${a.role}\n`;
      if (p) {
        msg += `> *"${p.tagline}"*\n\n`;
        msg += `**Personality:** ${p.personality.join(', ')}\n`;
        msg += `**Strengths:** ${p.strengths.join(', ')}\n`;
        msg += `**Style:** ${p.communicationStyle}\n`;
        msg += `**Default action:** ${p.nowDoingDefault}\n`;
      }
      msg += `\n---\n\n`;
    }

    msg += `*Lead: ${agentMap[team.lead]?.displayName || team.lead}*`;

    // Discord has 2000 char limit — split if needed
    if (msg.length > 1900) {
      const parts = splitMessage(msg, 1900);
      for (const part of parts) {
        await ch.send(part);
        await sleep(1000);
      }
    } else {
      await ch.send(msg);
    }
    console.log(`  Posted roster to #${team.id} (${team.agents.length} agents)`);
    await sleep(1500);
  }

  // 3. Post project assignments to #agent-reports
  const reportsCh = await findChannel(guild, 'agent-reports');
  if (reportsCh) {
    let projMsg = '# Project Assignments\n\n';
    for (const proj of org.projects) {
      projMsg += `## ${proj.name}\n`;
      projMsg += `> ${proj.description}\n`;
      projMsg += `**Status:** ${proj.status} | **Owner:** ${agentMap[proj.owner]?.displayName || proj.owner}\n`;
      projMsg += `**Teams:** ${proj.teams.join(', ')}\n\n`;
    }
    await reportsCh.send(projMsg);
    console.log('Posted project assignments to #agent-reports');
    await sleep(1000);
  }

  // 4. Post QA overview to #qa-reviews
  const qaCh = await findChannel(guild, 'qa-reviews');
  if (qaCh) {
    await qaCh.send(
      `# QA & Prompt Review System\n\n` +
      `## Evaluator Agents\n` +
      `- **Prompt Analyser** — Scores prompt quality across 8 dimensions (daily scan)\n` +
      `- **Prompt Improver** — Rewrites underperforming prompts (triggered by low scores)\n` +
      `- **Skill Creator** — Generates new agent skills and capabilities\n` +
      `- **Team Manager** — Evaluates team output, produces daily/weekly reports\n\n` +
      `## Schedule\n` +
      `- **Daily:** Agent performance + prompt drift detection\n` +
      `- **Weekly:** Team evaluation + improvement recommendations\n` +
      `- **On-demand:** Analyse any prompt via Paco Hub /prompts or /qa-team\n\n` +
      `Reports are logged to \`CONTROL_CENTER/PROMPT_ANALYTICS/\` and surfaced on the QA Team dashboard.`
    );
    console.log('Posted QA overview to #qa-reviews');
  }

  // 5. Post streamer section to #stream-chat
  const streamCh = await findChannel(guild, 'stream-chat');
  if (streamCh) {
    await streamCh.send(
      `# Jacobo Streaming — AI Production Crew\n\n` +
      `## Platforms\n` +
      `- YouTube: https://www.youtube.com/@J4S_GON\n` +
      `- Twitch: https://www.twitch.tv/j4s_gon\n\n` +
      `## Stream Crew (AI Agents)\n` +
      `- **Script Writer** — Writes talking points, intros, transitions, CTAs\n` +
      `- **Topic Scout** — Finds trending topics, news, community questions\n` +
      `- **Chat Moderator** — Monitors chat, summarizes, flags questions\n` +
      `- **Social Poster** — Drafts tweets, posts, go-live announcements\n` +
      `- **Clip Cutter** — Identifies highlight moments for clips/shorts\n\n` +
      `## Commands\n` +
      `\`/go-live <title>\` — Announce live across channels\n` +
      `\`/end-stream\` — Post stream ended message\n` +
      `\`/schedule <details>\` — Post upcoming stream schedule\n\n` +
      `Stream planning, scripting, and social posting available in Paco Hub /stream page.`
    );
    console.log('Posted streamer section to #stream-chat');
    await sleep(1000);
  }

  // 6. Post CV pipeline to #job-pipeline (if exists)
  const jobsCh = await findChannel(guild, 'job-pipeline');
  if (jobsCh) {
    await jobsCh.send(
      `# CV Pipeline — Active\n\n` +
      `**5 job cards** loaded and ready for review.\n\n` +
      `## Pipeline\n` +
      `1. Lattice — Support Operations Manager\n` +
      `2. Contentful — Customer Success Team Lead\n` +
      `3. Remote.com — Director of Technical Support\n` +
      `4. Notion — Enablement Manager\n` +
      `5. Zapier — Solutions Engineer\n\n` +
      `Use \`/jobs\` to see pipeline status, or review in Paco Hub /career.\n\n` +
      `## Flow\n` +
      `Browse → Shortlist → Generate CV + Cover Letter → Review → Edit → Export → Apply\n\n` +
      `All managed by the Career Agent + Writer team.`
    );
    console.log('Posted CV pipeline to #job-pipeline');
  }

  // 7. Post to #announcements — full org launch
  const announceCh = await findChannel(guild, 'announcements');
  if (announceCh) {
    await announceCh.send(
      `# Community-OS Org — Fully Deployed\n\n` +
      `**22 AI Agents** are now active across **8 teams** and **6 sections**.\n\n` +
      `Each team has a dedicated channel where agents post updates and interact.\n\n` +
      `## What's Live\n` +
      `- Agent profiles and personas posted to team channels\n` +
      `- QA review system with prompt analyser, improver, and team manager\n` +
      `- CV pipeline with 5 active job cards\n` +
      `- Stream production crew ready\n` +
      `- 8 slash commands operational\n\n` +
      `Check \`/status\` for system health or visit Paco Hub for full dashboards.`
    );
    console.log('Posted org launch announcement');
  }

  console.log('\nDone! Full org posted to Discord.');
  setTimeout(() => process.exit(0), 2000);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function splitMessage(msg, maxLen) {
  const parts = [];
  let current = '';
  for (const line of msg.split('\n')) {
    if (current.length + line.length + 1 > maxLen) {
      parts.push(current);
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) parts.push(current);
  return parts;
}

run().catch(err => { console.error(err); process.exit(1); });
