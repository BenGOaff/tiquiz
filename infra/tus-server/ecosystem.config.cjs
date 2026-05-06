// pm2 process file. Reads secrets from /opt/popquiz-tus/.env via dotenv.
// Start with:  pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: "popquiz-tus",
      cwd: "/opt/popquiz-tus",
      script: "server.mjs",
      interpreter: "node",
      node_args: ["--env-file=/opt/popquiz-tus/.env"],
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      kill_timeout: 30000,
      wait_ready: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
