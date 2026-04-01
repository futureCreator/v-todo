module.exports = {
  apps: [
    {
      name: "v-todo",
      script: "node_modules/.bin/next",
      args: "start -p 3101",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
