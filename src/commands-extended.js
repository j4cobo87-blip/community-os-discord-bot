// CommunityOS Discord Bot - Extended Commands
// Additional commands for enhanced bot functionality

export const extendedCommands = [
  // ═══════════════════════════════════════════════════════════════════════
  // COMMUNITY STATS & LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'stats',
    description: 'Show community statistics',
    options: [
      {
        name: 'type',
        description: 'What stats to show',
        type: 3, // STRING
        required: false,
        choices: [
          { name: 'Community Overview', value: 'community' },
          { name: 'Server Stats', value: 'server' },
          { name: 'My Activity', value: 'personal' },
          { name: 'Agent Activity', value: 'agents' },
        ],
      },
    ],
  },
  {
    name: 'leaderboard',
    description: 'Show activity leaderboards',
    options: [
      {
        name: 'type',
        description: 'Leaderboard type',
        type: 3,
        required: false,
        choices: [
          { name: 'Overall Activity', value: 'activity' },
          { name: 'Trivia Games', value: 'trivia' },
          { name: 'Word Games', value: 'wordscramble' },
          { name: 'RPS Games', value: 'rps' },
          { name: 'Quiz Competitions', value: 'quiz' },
          { name: 'All Games', value: 'games' },
        ],
      },
      {
        name: 'limit',
        description: 'Number of entries to show (default: 10)',
        type: 4, // INTEGER
        required: false,
      },
    ],
  },
  {
    name: 'profile',
    description: 'View user profile with badges and stats',
    options: [
      {
        name: 'user',
        description: 'User to view (leave empty for your own)',
        type: 6, // USER
        required: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ENHANCED GAMES
  // ═══════════════════════════════════════════════════════════════════════
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
          { name: 'Tech & Computing', value: 'tech' },
          { name: 'Artificial Intelligence', value: 'ai' },
          { name: 'Programming', value: 'programming' },
          { name: 'Crypto & Web3', value: 'crypto' },
          { name: 'General Knowledge', value: 'general' },
        ],
      },
      {
        name: 'rounds',
        description: 'Number of rounds (1-10, default: 5)',
        type: 4,
        required: false,
      },
    ],
  },
  {
    name: 'wordscramble',
    description: 'Start a word scramble game',
    options: [
      {
        name: 'category',
        description: 'Word category',
        type: 3,
        required: false,
        choices: [
          { name: 'Tech Terms', value: 'tech' },
          { name: 'Programming', value: 'programming' },
          { name: 'AI & ML', value: 'ai' },
          { name: 'General Words', value: 'general' },
        ],
      },
      {
        name: 'difficulty',
        description: 'Difficulty level',
        type: 3,
        required: false,
        choices: [
          { name: 'Easy (short words)', value: 'easy' },
          { name: 'Medium', value: 'medium' },
          { name: 'Hard (long words)', value: 'hard' },
        ],
      },
    ],
  },
  {
    name: 'hangman',
    description: 'Start a hangman game',
    options: [
      {
        name: 'category',
        description: 'Word category',
        type: 3,
        required: false,
        choices: [
          { name: 'Tech Terms', value: 'tech' },
          { name: 'Programming', value: 'programming' },
          { name: 'AI & ML', value: 'ai' },
          { name: 'General Words', value: 'general' },
        ],
      },
    ],
  },
  {
    name: 'rps',
    description: 'Play Rock Paper Scissors',
    options: [
      {
        name: 'opponent',
        description: 'Challenge another user (leave empty to play vs bot)',
        type: 6, // USER
        required: false,
      },
      {
        name: 'extended',
        description: 'Play Rock Paper Scissors Lizard Spock',
        type: 5, // BOOLEAN
        required: false,
      },
    ],
  },
  {
    name: 'numberguess',
    description: 'Play the number guessing game',
    options: [
      {
        name: 'max',
        description: 'Maximum number (default: 100)',
        type: 4,
        required: false,
      },
      {
        name: 'attempts',
        description: 'Number of attempts (default: 7)',
        type: 4,
        required: false,
      },
    ],
  },
  {
    name: 'quiz',
    description: 'Start a quiz competition',
    options: [
      {
        name: 'rounds',
        description: 'Number of questions (default: 5)',
        type: 4,
        required: false,
      },
    ],
  },
  {
    name: 'hint',
    description: 'Get a hint for the current word game',
  },
  {
    name: 'endgame',
    description: 'End the current game in this channel (admin only)',
    default_member_permissions: '8192', // ManageMessages
    dm_permission: false,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SUGGESTIONS & REPORTS
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'suggest',
    description: 'Submit a suggestion or idea',
    options: [
      {
        name: 'title',
        description: 'Brief title for your suggestion',
        type: 3,
        required: true,
      },
      {
        name: 'description',
        description: 'Detailed description of your idea',
        type: 3,
        required: true,
      },
      {
        name: 'category',
        description: 'Category of suggestion',
        type: 3,
        required: false,
        choices: [
          { name: 'New Feature', value: 'feature' },
          { name: 'Improvement', value: 'improvement' },
          { name: 'Content Idea', value: 'content' },
          { name: 'Stream Topic', value: 'stream' },
          { name: 'Other', value: 'other' },
        ],
      },
    ],
  },
  {
    name: 'report',
    description: 'Report an issue or problem',
    options: [
      {
        name: 'type',
        description: 'Type of report',
        type: 3,
        required: true,
        choices: [
          { name: 'Bug Report', value: 'bug' },
          { name: 'User Report', value: 'user' },
          { name: 'Spam/Scam', value: 'spam' },
          { name: 'Other Issue', value: 'other' },
        ],
      },
      {
        name: 'description',
        description: 'Describe the issue',
        type: 3,
        required: true,
      },
      {
        name: 'evidence',
        description: 'Any evidence (message links, etc)',
        type: 3,
        required: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN COMMANDS
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'admin',
    description: 'Admin commands',
    default_member_permissions: '8', // Administrator
    dm_permission: false,
    options: [
      {
        name: 'stats',
        description: 'View server analytics',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'announce',
        description: 'Send an announcement',
        type: 1,
        options: [
          {
            name: 'channel',
            description: 'Channel to send announcement to',
            type: 7, // CHANNEL
            required: true,
          },
          {
            name: 'message',
            description: 'Announcement message',
            type: 3,
            required: true,
          },
          {
            name: 'mention',
            description: 'Mention everyone/here',
            type: 3,
            required: false,
            choices: [
              { name: 'No mention', value: 'none' },
              { name: '@here', value: 'here' },
              { name: '@everyone', value: 'everyone' },
            ],
          },
        ],
      },
      {
        name: 'role',
        description: 'Manage user roles',
        type: 1,
        options: [
          {
            name: 'action',
            description: 'Action to perform',
            type: 3,
            required: true,
            choices: [
              { name: 'Add Role', value: 'add' },
              { name: 'Remove Role', value: 'remove' },
            ],
          },
          {
            name: 'user',
            description: 'Target user',
            type: 6,
            required: true,
          },
          {
            name: 'role',
            description: 'Role to add/remove',
            type: 8, // ROLE
            required: true,
          },
        ],
      },
      {
        name: 'warn',
        description: 'Warn a user with logging',
        type: 1,
        options: [
          {
            name: 'user',
            description: 'User to warn',
            type: 6,
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
        name: 'mute',
        description: 'Temporarily mute a user',
        type: 1,
        options: [
          {
            name: 'user',
            description: 'User to mute',
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
            description: 'Reason for mute',
            type: 3,
            required: false,
          },
        ],
      },
      {
        name: 'clean',
        description: 'Bulk delete messages',
        type: 1,
        options: [
          {
            name: 'count',
            description: 'Number of messages to delete (max 100)',
            type: 4,
            required: true,
          },
          {
            name: 'user',
            description: 'Only delete messages from this user',
            type: 6,
            required: false,
          },
          {
            name: 'filter',
            description: 'Filter type',
            type: 3,
            required: false,
            choices: [
              { name: 'All Messages', value: 'all' },
              { name: 'Bot Messages Only', value: 'bots' },
              { name: 'User Messages Only', value: 'humans' },
              { name: 'Contains Links', value: 'links' },
              { name: 'Contains Attachments', value: 'attachments' },
            ],
          },
        ],
      },
      {
        name: 'lockdown',
        description: 'Toggle channel lockdown',
        type: 1,
        options: [
          {
            name: 'channel',
            description: 'Channel to lock (default: current)',
            type: 7,
            required: false,
          },
          {
            name: 'reason',
            description: 'Reason for lockdown',
            type: 3,
            required: false,
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PACO HUB INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════
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
          { name: 'Create Link', value: 'create' },
          { name: 'View Status', value: 'status' },
          { name: 'Unlink Account', value: 'unlink' },
          { name: 'Sync Profile', value: 'sync' },
        ],
      },
    ],
  },
  {
    name: 'community',
    description: 'View community resources and links',
    options: [
      {
        name: 'view',
        description: 'What to view',
        type: 3,
        required: false,
        choices: [
          { name: 'All Links', value: 'links' },
          { name: 'Community Stats', value: 'stats' },
          { name: 'Agent Directory', value: 'agents' },
          { name: 'Streaming Info', value: 'streaming' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ENHANCED HELP
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'helpme',
    description: 'Get detailed help for a specific command',
    options: [
      {
        name: 'command',
        description: 'Command to get help for',
        type: 3,
        required: false,
        autocomplete: true,
      },
      {
        name: 'category',
        description: 'Browse commands by category',
        type: 3,
        required: false,
        choices: [
          { name: 'Core Commands', value: 'core' },
          { name: 'Agent Commands', value: 'agents' },
          { name: 'Knowledge Base', value: 'kb' },
          { name: 'Games', value: 'games' },
          { name: 'Moderation', value: 'moderation' },
          { name: 'Streaming', value: 'streaming' },
          { name: 'Utilities', value: 'utilities' },
          { name: 'Admin', value: 'admin' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // QUICK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'quickpoll',
    description: 'Create a quick yes/no poll',
    options: [
      {
        name: 'question',
        description: 'Poll question',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: 'feedback',
    description: 'Submit quick feedback',
    options: [
      {
        name: 'type',
        description: 'Type of feedback',
        type: 3,
        required: true,
        choices: [
          { name: 'Positive Feedback', value: 'positive' },
          { name: 'Bug Report', value: 'bug' },
          { name: 'Suggestion', value: 'suggestion' },
          { name: 'Question', value: 'question' },
        ],
      },
      {
        name: 'message',
        description: 'Your feedback',
        type: 3,
        required: true,
      },
    ],
  },
];

// Context menu commands
export const contextMenuCommands = [
  {
    name: 'View Profile',
    type: 2, // USER context menu
  },
  {
    name: 'Report User',
    type: 2,
  },
  {
    name: 'Search in KB',
    type: 3, // MESSAGE context menu
  },
  {
    name: 'Report Message',
    type: 3,
  },
  {
    name: 'Ask Paco About This',
    type: 3,
  },
];
