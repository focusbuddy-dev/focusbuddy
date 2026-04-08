const userAgent = process.env.npm_config_user_agent ?? '';
const packageManager = userAgent.split(' ')[0]?.split('/')[0] ?? '';

if (packageManager === 'pnpm') {
  process.exit(0);
}

console.error('This repository supports pnpm only.');
console.error('Use just commitlint-setup for the initial setup flow.');
console.error('If you need to install dependencies directly, use pnpm install --frozen-lockfile.');
process.exit(1);
