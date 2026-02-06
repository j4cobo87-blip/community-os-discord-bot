// CommunityOS Discord Bot - Slash Commands
// Comprehensive command set for the AI-native company

export const commands = [
  // ═══════════════════════════════════════════════════════════════
  // CORE COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ping',
    description: 'Health check - Paco responds with uptime and mood',
  },
  {
    name: 'status',
    description: 'Show system service status across all orgs',
  },
  {
    name: 'hub',
    description: 'Get link to Paco Hub dashboard',
  },
  {
    name: 'daily',
    description: "Get today's daily standup summary",
  },
  {
    name: 'help',
    description: 'Show all available commands and features',
  },

  // ═══════════════════════════════════════════════════════════════
  // KNOWLEDGE BASE COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'kb',
    description: 'Knowledge base commands',
    options: [
      {
        name: 'search',
        description: 'Search KB documents',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'query',
            description: 'Search query',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'doc',
        description: 'Get a specific document by name',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Document name or partial match',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'list',
        description: 'List all documents or by section',
        type: 1,
        options: [
          {
            name: 'section',
            description: 'Filter by section',
            type: 3,
            required: false,
            choices: [
              { name: 'Getting Started', value: 'start-here' },
              { name: 'Product', value: 'product' },
              { name: 'Architecture', value: 'architecture' },
              { name: 'Operations', value: 'operations' },
              { name: 'Projects', value: 'projects' },
              { name: 'Security', value: 'security' },
              { name: 'Finance', value: 'finance' },
              { name: 'Streaming', value: 'streaming' },
              { name: 'Workflows', value: 'workflows' },
              { name: 'API Reference', value: 'api' },
            ],
          },
        ],
      },
      {
        name: 'random',
        description: 'Get a random KB tip or document',
        type: 1,
      },
      {
        name: 'ask',
        description: 'Ask a question using KB context (AI-powered)',
        type: 1,
        options: [
          {
            name: 'question',
            description: 'Your question',
            type: 3,
            required: true,
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // AGENT COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'agent',
    description: 'Agent interaction commands',
    options: [
      {
        name: 'chat',
        description: 'Chat with a specific agent',
        type: 1,
        options: [
          {
            name: 'agent-id',
            description: 'Agent ID (e.g., main, coder, writer)',
            type: 3,
            required: true,
          },
          {
            name: 'message',
            description: 'Your message to the agent',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'task',
        description: 'Assign a task to an agent',
        type: 1,
        options: [
          {
            name: 'agent-id',
            description: 'Agent ID to assign task to',
            type: 3,
            required: true,
          },
          {
            name: 'task',
            description: 'Task description',
            type: 3,
            required: true,
          },
          {
            name: 'priority',
            description: 'Task priority',
            type: 3,
            required: false,
            choices: [
              { name: 'High', value: 'high' },
              { name: 'Medium', value: 'medium' },
              { name: 'Low', value: 'low' },
            ],
          },
        ],
      },
      {
        name: 'status',
        description: 'Get all agent statuses',
        type: 1,
      },
      {
        name: 'summon',
        description: 'Bring an agent to this channel',
        type: 1,
        options: [
          {
            name: 'agent-id',
            description: 'Agent ID to summon',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'info',
        description: 'Get detailed info about an agent',
        type: 1,
        options: [
          {
            name: 'agent-id',
            description: 'Agent ID',
            type: 3,
            required: true,
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PROJECT COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'project',
    description: 'Project management commands',
    options: [
      {
        name: 'list',
        description: 'List all projects',
        type: 1,
      },
      {
        name: 'status',
        description: 'Get project status',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Project name or ID',
            type: 3,
            required: true,
            choices: [
              { name: 'CommunityOS', value: 'communityos' },
              { name: 'Paco Hub', value: 'paco-hub' },
              { name: 'Jacobo Streaming', value: 'jacobo-streaming' },
              { name: 'BELIVEITMAKEIT', value: 'beliveitmakeit' },
              { name: 'Jacobo CV Pipeline', value: 'jacobo-cv' },
              { name: 'Agentic Org System', value: 'agentic-org' },
            ],
          },
        ],
      },
      {
        name: 'build',
        description: 'Trigger a project build',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Project name',
            type: 3,
            required: true,
            choices: [
              { name: 'CommunityOS', value: 'communityos' },
              { name: 'Paco Hub', value: 'paco-hub' },
            ],
          },
        ],
      },
      {
        name: 'deploy',
        description: 'Trigger a project deployment',
        type: 1,
        options: [
          {
            name: 'name',
            description: 'Project name',
            type: 3,
            required: true,
            choices: [
              { name: 'CommunityOS', value: 'communityos' },
              { name: 'Paco Hub', value: 'paco-hub' },
            ],
          },
          {
            name: 'environment',
            description: 'Deployment environment',
            type: 3,
            required: false,
            choices: [
              { name: 'Development', value: 'dev' },
              { name: 'Staging', value: 'staging' },
              { name: 'Production', value: 'prod' },
            ],
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // UTILITY COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'remind',
    description: 'Set a reminder',
    options: [
      {
        name: 'time',
        description: 'When to remind (e.g., "30m", "2h", "1d")',
        type: 3,
        required: true,
      },
      {
        name: 'message',
        description: 'Reminder message',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'note',
    description: 'Save a note to memory',
    options: [
      {
        name: 'text',
        description: 'Note content',
        type: 3,
        required: true,
      },
      {
        name: 'tags',
        description: 'Optional tags (comma-separated)',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'notes',
    description: 'List your saved notes',
    options: [
      {
        name: 'filter',
        description: 'Filter by tag or search term',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'todo',
    description: 'Todo list management',
    options: [
      {
        name: 'add',
        description: 'Add a todo item',
        type: 1,
        options: [
          {
            name: 'task',
            description: 'Task description',
            type: 3,
            required: true,
          },
          {
            name: 'priority',
            description: 'Task priority',
            type: 3,
            required: false,
            choices: [
              { name: 'High', value: 'high' },
              { name: 'Medium', value: 'medium' },
              { name: 'Low', value: 'low' },
            ],
          },
        ],
      },
      {
        name: 'list',
        description: 'List all todos',
        type: 1,
      },
      {
        name: 'done',
        description: 'Mark a todo as complete',
        type: 1,
        options: [
          {
            name: 'id',
            description: 'Todo ID to complete',
            type: 3,
            required: true,
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // FUN COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: '8ball',
    description: 'Ask the magic 8 ball a question',
    options: [
      {
        name: 'question',
        description: 'Your yes/no question',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'quote',
    description: 'Get a random inspirational quote',
  },
  {
    name: 'fact',
    description: 'Get a random tech fact',
  },
  {
    name: 'meme',
    description: 'Generate a meme text',
    options: [
      {
        name: 'topic',
        description: 'Meme topic (optional)',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'fortune',
    description: 'Get your daily fortune',
  },

  // ═══════════════════════════════════════════════════════════════
  // MODERATION COMMANDS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'warn',
    description: 'Warn a user (Mod only)',
    default_member_permissions: '4', // KickMembers (moderate permission)
    dm_permission: false,
    options: [
      {
        name: 'user',
        description: 'User to warn',
        type: 6, // USER
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for warning',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'timeout',
    description: 'Timeout a user (Mod only)',
    default_member_permissions: '1099511627776', // ModerateMembers
    dm_permission: false,
    options: [
      {
        name: 'user',
        description: 'User to timeout',
        type: 6,
        required: true,
      },
      {
        name: 'duration',
        description: 'Duration (e.g., "10m", "1h", "1d")',
        type: 3,
        required: true,
      },
      {
        name: 'reason',
        description: 'Reason for timeout',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'clear',
    description: 'Clear messages in channel (Mod only)',
    default_member_permissions: '8192', // ManageMessages
    dm_permission: false,
    options: [
      {
        name: 'count',
        description: 'Number of messages to delete (max 100)',
        type: 4, // INTEGER
        required: true,
      },
      {
        name: 'user',
        description: 'Only delete messages from this user',
        type: 6,
        required: false,
      },
    ],
  },
  {
    name: 'slowmode',
    description: 'Set slowmode for channel (Mod only)',
    default_member_permissions: '16', // ManageChannels
    dm_permission: false,
    options: [
      {
        name: 'seconds',
        description: 'Slowmode duration in seconds (0 to disable)',
        type: 4,
        required: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ROLE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'role',
    description: 'View or manage Discord role mappings',
    options: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 3,
        required: true,
        choices: [
          { name: 'View My Roles', value: 'view' },
          { name: 'Role Overview', value: 'overview' },
          { name: 'Leadership Hierarchy', value: 'hierarchy' },
        ],
      },
    ],
  },
  {
    name: 'setup-roles',
    description: 'Create all org hierarchy roles (Admin only)',
    default_member_permissions: '8', // Administrator
    dm_permission: false,
  },
  {
    name: 'assign-role',
    description: 'Assign a role to a member (Mod only)',
    default_member_permissions: '268435456', // ManageRoles
    dm_permission: false,
    options: [
      {
        name: 'member',
        description: 'Member to assign role to',
        type: 6, // USER type
        required: true,
      },
      {
        name: 'role',
        description: 'Role to assign',
        type: 3,
        required: true,
        choices: [
          { name: 'Verified', value: 'Verified' },
          { name: 'Guest', value: 'Guest' },
          { name: 'VIP', value: 'VIP' },
          { name: 'Subscriber', value: 'Subscriber' },
          { name: 'CommunityOS', value: 'CommunityOS' },
          { name: 'BELIVEITMAKEIT', value: 'BELIVEITMAKEIT' },
          { name: 'JacoboStreaming', value: 'JacoboStreaming' },
          { name: 'Agent', value: 'Agent' },
          { name: 'Team Lead', value: 'Team Lead' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CHANNEL STRUCTURE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'setup-org',
    description: 'Create org channel structure (Admin only)',
    default_member_permissions: '8', // Administrator
    dm_permission: false,
  },
  {
    name: 'create-team-channel',
    description: 'Create a team-specific channel (Admin only)',
    default_member_permissions: '8', // Administrator
    dm_permission: false,
    options: [
      {
        name: 'team-id',
        description: 'Team ID (e.g., core-ops, platform-eng)',
        type: 3,
        required: true,
      },
      {
        name: 'team-name',
        description: 'Display name for the team',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'channel-overview',
    description: 'View current channel structure',
  },

  // ═══════════════════════════════════════════════════════════════
  // ORG STRUCTURE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'orgs',
    description: 'List all organizations in the umbrella system',
  },
  {
    name: 'org',
    description: 'Show org chart overview for a specific organization',
    options: [
      {
        name: 'name',
        description: 'Organization to view',
        type: 3,
        required: false,
        choices: [
          { name: 'All Organizations', value: 'all' },
          { name: 'CommunityOS', value: 'communityos' },
          { name: 'BELIVEITMAKEIT', value: 'bim' },
          { name: 'Jacobo Streaming', value: 'streaming' },
        ],
      },
    ],
  },
  {
    name: 'teams',
    description: 'List teams within an organization',
    options: [
      {
        name: 'org',
        description: 'Organization to list teams for',
        type: 3,
        required: true,
        choices: [
          { name: 'CommunityOS', value: 'communityos' },
          { name: 'BELIVEITMAKEIT', value: 'bim' },
          { name: 'Jacobo Streaming', value: 'streaming' },
          { name: 'All Orgs', value: 'all' },
        ],
      },
    ],
  },
  {
    name: 'agents',
    description: 'List agents within a team',
    options: [
      {
        name: 'team',
        description: 'Team to list agents for',
        type: 3,
        required: true,
        choices: [
          { name: 'Core Ops', value: 'core-ops' },
          { name: 'Platform Engineering', value: 'platform-eng' },
          { name: 'Product & Design', value: 'product-design' },
          { name: 'Knowledge & Docs', value: 'knowledge' },
          { name: 'Growth & Sales', value: 'growth-team' },
          { name: 'Support Team', value: 'support-team' },
          { name: 'Creator Ops', value: 'creator-ops' },
          { name: 'Security & Finance', value: 'security-finance' },
          { name: 'Data & Analytics', value: 'data-team' },
          { name: 'Automation & Workflows', value: 'automation-team' },
          { name: 'BIM Leadership', value: 'bim-leadership' },
          { name: 'BIM Product', value: 'bim-product' },
          { name: 'Streaming Leadership', value: 'streaming-leadership' },
          { name: 'Stream Production', value: 'stream-production' },
          { name: 'Content Team', value: 'content-team' },
          { name: 'Social Team', value: 'social-team' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ASK AI AGENTS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ask',
    description: 'Ask a question to an AI agent',
    options: [
      {
        name: 'agent',
        description: 'Which agent to ask',
        type: 3,
        required: true,
        choices: [
          { name: 'Paco (Orchestrator)', value: 'main' },
          { name: 'MUFASA (CEO)', value: 'chief-of-staff' },
          { name: 'MAXIMUS (BIM CEO)', value: 'bim-ceo' },
          { name: 'STEFANO (Streaming CEO)', value: 'streaming-ceo' },
          { name: 'Coder Prime', value: 'coder' },
          { name: 'Writer', value: 'writer' },
          { name: 'Researcher', value: 'researcher' },
          { name: 'Career Agent', value: 'career-agent' },
          { name: 'QA Guardian', value: 'qa-guardian' },
          { name: 'Product Manager', value: 'product-manager' },
          { name: 'Growth Marketer', value: 'growth-marketer' },
          { name: 'Demo Producer', value: 'demo-producer' },
          { name: 'UX Friend', value: 'ux-friend' },
          { name: 'Stream Producer', value: 'stream-producer' },
          { name: 'Content Director', value: 'content-director' },
        ],
      },
      {
        name: 'question',
        description: 'Your question',
        type: 3,
        required: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SUPPORT & TICKETS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ticket',
    description: 'Create a support ticket',
    options: [
      {
        name: 'description',
        description: 'Describe your issue or request',
        type: 3,
        required: true,
      },
      {
        name: 'priority',
        description: 'Ticket priority',
        type: 3,
        required: false,
        choices: [
          { name: 'Critical', value: 'critical' },
          { name: 'High', value: 'high' },
          { name: 'Medium', value: 'medium' },
          { name: 'Low', value: 'low' },
        ],
      },
    ],
  },
  {
    name: 'support',
    description: 'View or manage support tickets',
    options: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 3,
        required: true,
        choices: [
          { name: 'New Ticket', value: 'new' },
          { name: 'View Recent', value: 'recent' },
          { name: 'Critical Issues', value: 'critical' },
        ],
      },
      { name: 'title', description: 'Ticket title (for new tickets)', type: 3, required: false },
      { name: 'description', description: 'Ticket description (for new tickets)', type: 3, required: false },
      {
        name: 'priority',
        description: 'Ticket priority',
        type: 3,
        required: false,
        choices: [
          { name: 'Critical', value: 'critical' },
          { name: 'High', value: 'high' },
          { name: 'Medium', value: 'medium' },
          { name: 'Low', value: 'low' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SHIP & BUILD
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'ship',
    description: 'Post a shipped update to #ship-log',
    options: [
      { name: 'text', description: 'What shipped / what changed', type: 3, required: true },
      {
        name: 'org',
        description: 'Organization this update is for',
        type: 3,
        required: false,
        choices: [
          { name: 'CommunityOS', value: 'communityos' },
          { name: 'BELIVEITMAKEIT', value: 'bim' },
          { name: 'Jacobo Streaming', value: 'streaming' },
        ],
      },
    ],
  },
  {
    name: 'swarm',
    description: 'Post a swarm update to #build-swarm',
    options: [
      { name: 'text', description: 'Swarm update', type: 3, required: true },
    ],
  },
  {
    name: 'report',
    description: 'Get a report from an agent team',
    options: [
      {
        name: 'team',
        description: 'Which team',
        type: 3,
        required: true,
        choices: [
          { name: 'Core Ops', value: 'core-ops' },
          { name: 'Platform Engineering', value: 'platform-eng' },
          { name: 'Product & Design', value: 'product-design' },
          { name: 'Knowledge & Docs', value: 'knowledge' },
          { name: 'Growth & Sales', value: 'growth-team' },
          { name: 'Creator Ops', value: 'creator-ops' },
          { name: 'BIM Leadership', value: 'bim-leadership' },
          { name: 'Streaming Leadership', value: 'streaming-leadership' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // STREAMING
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'go-live',
    description: 'Announce you are going live on stream',
    options: [
      { name: 'title', description: 'Stream title / what you are working on', type: 3, required: true },
      {
        name: 'platform',
        description: 'Streaming platform',
        type: 3,
        required: false,
        choices: [
          { name: 'YouTube', value: 'youtube' },
          { name: 'Twitch', value: 'twitch' },
          { name: 'Both', value: 'both' },
        ],
      },
    ],
  },
  {
    name: 'end-stream',
    description: 'Announce stream has ended',
  },
  {
    name: 'schedule',
    description: 'Post a stream schedule update',
    options: [
      { name: 'text', description: 'Schedule details (date, time, topic)', type: 3, required: true },
    ],
  },
  {
    name: 'idea',
    description: 'Submit a stream/content idea',
    options: [
      { name: 'text', description: 'Your idea', type: 3, required: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CAREER & JOBS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'jobs',
    description: 'List current job pipeline status',
  },

  // ═══════════════════════════════════════════════════════════════
  // WORKFLOW & MILESTONES
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'workflow',
    description: 'View workflow status or trigger workflows',
    options: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 3,
        required: true,
        choices: [
          { name: 'List Active', value: 'list' },
          { name: 'View Status', value: 'status' },
          { name: 'Recent Completions', value: 'completed' },
        ],
      },
    ],
  },
  {
    name: 'milestone',
    description: 'Announce a milestone achievement',
    options: [
      { name: 'text', description: 'Milestone description', type: 3, required: true },
      {
        name: 'org',
        description: 'Organization this milestone is for',
        type: 3,
        required: false,
        choices: [
          { name: 'CommunityOS', value: 'communityos' },
          { name: 'BELIVEITMAKEIT', value: 'bim' },
          { name: 'Jacobo Streaming', value: 'streaming' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // MEMBER LINKING
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'link',
    description: 'Link your Discord account to Paco Hub profile',
    options: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 3,
        required: true,
        choices: [
          { name: 'Link Account', value: 'create' },
          { name: 'View Link Status', value: 'status' },
          { name: 'Unlink Account', value: 'unlink' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // MODERATION (Admin/Mod only)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'mod',
    description: 'Moderation commands (Mod only)',
    default_member_permissions: '8192', // ManageMessages
    dm_permission: false,
    options: [
      {
        name: 'action',
        description: 'Moderation action',
        type: 3,
        required: true,
        choices: [
          { name: 'View Mod Log', value: 'log' },
          { name: 'Clear Messages', value: 'clear' },
          { name: 'Lockdown Toggle', value: 'lockdown' },
        ],
      },
      {
        name: 'count',
        description: 'Number of messages (for clear)',
        type: 4, // INTEGER
        required: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ORG SYNC COMMANDS (Admin only)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'sync-org',
    description: 'Sync Discord server with org.json structure (Admin only)',
    default_member_permissions: '8', // Administrator
    dm_permission: false,
    options: [
      {
        name: 'what',
        description: 'What to sync',
        type: 3,
        required: true,
        choices: [
          { name: 'All (roles + channels)', value: 'all' },
          { name: 'Roles Only', value: 'roles' },
          { name: 'Channels Only', value: 'channels' },
          { name: 'Team Channels Only', value: 'teams' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // AGENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'list-agents',
    description: 'List all agents and their status',
    options: [
      {
        name: 'filter',
        description: 'Filter agents by section/org',
        type: 3,
        required: false,
        choices: [
          { name: 'All Agents', value: 'all' },
          { name: 'CommunityOS', value: 'communityos' },
          { name: 'BELIVEITMAKEIT', value: 'bim' },
          { name: 'Jacobo Streaming', value: 'streaming' },
          { name: 'Operations', value: 'ops' },
          { name: 'Engineering', value: 'eng' },
          { name: 'Product', value: 'product' },
          { name: 'Growth', value: 'growth' },
        ],
      },
    ],
  },
  {
    name: 'agent-info',
    description: 'Get detailed info about a specific agent',
    options: [
      {
        name: 'agent-id',
        description: 'Agent ID (e.g., main, coder, writer)',
        type: 3,
        required: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // KNOWLEDGE BASE SYNC
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'kb-sync',
    description: 'Sync knowledge base to Discord (Admin only)',
    default_member_permissions: '8', // Administrator
    dm_permission: false,
    options: [
      {
        name: 'action',
        description: 'Sync action',
        type: 3,
        required: true,
        choices: [
          { name: 'Full Sync', value: 'full' },
          { name: 'Post Index', value: 'index' },
          { name: 'Status', value: 'status' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // GAMES (Placeholder for future expansion)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'trivia',
    description: 'Start a trivia game',
    options: [
      {
        name: 'category',
        description: 'Trivia category',
        type: 3,
        required: false,
        choices: [
          { name: 'Tech', value: 'tech' },
          { name: 'AI', value: 'ai' },
          { name: 'General', value: 'general' },
        ],
      },
    ],
  },
  {
    name: 'poll',
    description: 'Create a quick poll',
    options: [
      {
        name: 'question',
        description: 'Poll question',
        type: 3,
        required: true,
      },
      {
        name: 'options',
        description: 'Options (comma-separated)',
        type: 3,
        required: true,
      },
      {
        name: 'duration',
        description: 'Poll duration (e.g., "1h", "1d")',
        type: 3,
        required: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CHATBOT CONTROL
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'chatbot',
    description: 'Control the chatbot settings',
    options: [
      {
        name: 'action',
        description: 'Action to perform',
        type: 3,
        required: true,
        choices: [
          { name: 'Enable in Channel', value: 'enable' },
          { name: 'Disable in Channel', value: 'disable' },
          { name: 'Assign Agent', value: 'assign' },
          { name: 'Clear Memory', value: 'clear-memory' },
          { name: 'View Status', value: 'status' },
          { name: 'Set Personality', value: 'personality' },
        ],
      },
      {
        name: 'channel',
        description: 'Target channel (for enable/disable/assign/clear)',
        type: 7, // CHANNEL type
        required: false,
      },
      {
        name: 'agent',
        description: 'Agent ID to assign (for assign action)',
        type: 3,
        required: false,
        choices: [
          { name: 'Paco (Orchestrator)', value: 'main' },
          { name: 'Coder Prime', value: 'coder' },
          { name: 'QA Guardian', value: 'qa-guardian' },
          { name: 'Docs Librarian', value: 'docs-librarian' },
          { name: 'Product Manager', value: 'product-manager' },
          { name: 'Support Sheriff', value: 'support-sheriff' },
          { name: 'Growth Marketer', value: 'growth-marketer' },
          { name: 'Chat Host', value: 'chat-host' },
          { name: 'Content Creator', value: 'content-creator' },
          { name: 'Demo Producer', value: 'demo-producer' },
        ],
      },
      {
        name: 'setting',
        description: 'Personality setting to adjust',
        type: 3,
        required: false,
        choices: [
          { name: 'More Humorous', value: 'humor-up' },
          { name: 'Less Humorous', value: 'humor-down' },
          { name: 'More Formal', value: 'formal-up' },
          { name: 'Less Formal', value: 'formal-down' },
          { name: 'More Verbose', value: 'verbose-up' },
          { name: 'Less Verbose', value: 'verbose-down' },
          { name: 'Reset to Default', value: 'reset' },
        ],
      },
    ],
  },
];
