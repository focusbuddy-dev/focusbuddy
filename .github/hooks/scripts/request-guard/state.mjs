import {detectRoute} from "./policy.mjs";

export function createDefaultExecutionState() {
  return {
    route: "Ask",
    isActionTask: false,
    valid: true,
    sourceText: "",
  };
}

export function buildExecutionState(prompt) {
  const route = detectRoute(prompt);
  const isActionTask = route === "Agent";

  return {
    route,
    isActionTask,
    valid: true,
    sourceText: prompt,
  };
}
