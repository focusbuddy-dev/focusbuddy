import {buildPreToolPermissionOutput} from "./permission.mjs";
import {
  buildPromptLikeText,
  getStatePath,
  safeWriteJson,
  safeReadJson,
} from "./shared.mjs";
import {createDefaultExecutionState, buildExecutionState} from "./state.mjs";

export function handleUserPrompt(event) {
  const cwd = event.cwd || process.cwd();
  const prompt = buildPromptLikeText(event);
  const statePath = getStatePath(cwd);
  const state = buildExecutionState(prompt);

  safeWriteJson(statePath, state);

  if (state.isActionTask) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        systemMessage:
          "実行系タスクです。不明点や曖昧な箇所がある場合はユーザーに質問してから進めてください。",
      }),
    );
    return;
  }

  process.stdout.write(JSON.stringify({continue: true}));
}

export function handlePreToolUse(event) {
  const cwd = event.cwd || process.cwd();
  const statePath = getStatePath(cwd);
  const state = safeReadJson(statePath, createDefaultExecutionState());

  process.stdout.write(
    JSON.stringify(buildPreToolPermissionOutput(cwd, event, state)),
  );
}
