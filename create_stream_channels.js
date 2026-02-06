import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const streamChannels = [
  {
    category: 'STREAM',
    channels: [
      { name: 'stream-topics', desc: 'Vote on and suggest stream topics' },
      { name: 'stream-clips', desc: 'Best clips, highlights, and moments from streams' },
      { name: 'stream-feedback', desc: 'Feedback on streams, what to improve, what you liked' },
    ],
  },
  {
    category: 'CREATOR',
    channels: [
      { name: 'content-ideas', desc: 'Ideas for videos, tutorials, and content pieces' },
      { name: 'social-media', desc: 'Social media drafts, scheduling, and performance' },
      { name: 'collabs', desc: 'Collaboration opportunities and guest appearances' },
      { name: 'ai-tools', desc: 'AI tools, workflows, and automation for content creation' },
      { name: 'behind-the-scenes', desc: 'How the stream and content production works' },
      { name: 'community-spotlight', desc: 'Showcasing community projects and contributions' },
    ],
  },
];

async function run() {
  await client.login(token);
  const guild = await client.guilds.fetch(guildId);
  console.log(`Connected to guild`);

  for (const cat of streamChannels) {
    const channels = await guild.channels.fetch();
    let category = channels.find(
      c => c && c.type === ChannelType.GuildCategory && c.name.toUpperCase() === cat.category.toUpperCase()
    );

    if (!category) {
      category = await guild.channels.create({
        name: cat.category,
        type: ChannelType.GuildCategory,
      });
      console.log(`Created category: ${cat.category}`);
    } else {
      console.log(`Category exists: ${cat.category}`);
    }

    for (const ch of cat.channels) {
      const existing = channels.find(
        c => c && c.type === ChannelType.GuildText && c.name === ch.name
      );
      if (existing) {
        console.log(`  Channel exists: #${ch.name}`);
        continue;
      }

      const created = await guild.channels.create({
        name: ch.name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: ch.desc,
      });
      console.log(`  Created: #${created.name}`);

      // Post welcome content
      const welcomeMessages = {
        'stream-topics': `# Stream Topics\n\nSuggest and vote on what we should stream next!\n\nCategories:\n- **Build**: Live coding sessions\n- **Tutorial**: Step-by-step guides\n- **Q&A**: Community questions\n- **Deep Dive**: Architecture and design\n- **Vlog**: Day in the life\n\nDrop your ideas below!`,
        'stream-clips': `# Stream Clips\n\nBest moments from our streams.\n\nShare timestamps, clips, and highlights. The Clip Cutter agent will also post auto-detected highlights here.`,
        'stream-feedback': `# Stream Feedback\n\nHelp us improve! Share what you liked, what could be better, and what you'd like to see more of.\n\nWe read everything and use it to plan future streams.`,
        'content-ideas': `# Content Ideas\n\nBrainstorm content for YouTube, social media, and the community.\n\nThe Topic Scout agent monitors trends and posts ideas here for community voting.`,
        'social-media': `# Social Media Hub\n\nDraft posts, review performance, and coordinate social media activity.\n\nThe Social Poster agent helps with drafting and scheduling across platforms.`,
        'collabs': `# Collaborations\n\nOpportunities for guest streams, co-creation, and partnerships.\n\nIf you know someone who'd be a great guest, suggest them here!`,
        'ai-tools': `# AI Tools & Workflows\n\nShare and discuss AI tools, automations, and workflows for content creation.\n\nOur stack: Claude, OpenClaw (22 agents), n8n, ComfyUI, and more.`,
        'behind-the-scenes': `# Behind the Scenes\n\nHow we build content with AI agents.\n\n- Stream prep workflow\n- Agent-assisted scripting\n- Multi-agent orchestration\n- Production pipeline\n\nAsk anything about our setup!`,
        'community-spotlight': `# Community Spotlight\n\nShowcasing amazing projects and contributions from our community.\n\nShare your work, get feedback, and inspire others!`,
      };

      if (welcomeMessages[ch.name]) {
        await created.send(welcomeMessages[ch.name]);
      }

      await new Promise(r => setTimeout(r, 1200));
    }
  }

  console.log('\nDone creating streaming community channels!');
  setTimeout(() => process.exit(0), 2000);
}

run().catch(err => { console.error(err); process.exit(1); });
