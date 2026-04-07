const workspaceName = process.argv[2];
const taskName = process.argv[3];

if (!workspaceName || !taskName) {
  console.error("usage: node scripts/workspace-task.mjs <workspace-name> <task-name>");
  process.exit(1);
}

console.log(`[${workspaceName}] ${taskName} placeholder for Issue #18 workspace setup`);