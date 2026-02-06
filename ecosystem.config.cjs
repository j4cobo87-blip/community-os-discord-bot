// PM2 Ecosystem Configuration for CommunityOS Discord Bot
// Run with: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'community-os-bot',
      script: 'src/index.js',
      cwd: __dirname,

      // Environment variables
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '500M',

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      log_type: 'json',

      // Restart behavior
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Node.js specific
      node_args: '--experimental-specifier-resolution=node',
      interpreter: 'node',

      // Source map support (for debugging)
      source_map_support: true,

      // Post-setup hooks
      post_update: ['npm install'],
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['localhost'],
      ref: 'origin/main',
      repo: 'git@github.com:community-os/discord-bot.git',
      path: '/opt/community-os/discord-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': '',
    },
  },
};
