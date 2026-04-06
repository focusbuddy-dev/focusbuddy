import {handlePreToolUse, handleUserPrompt} from "./request-guard/handlers.mjs";

const mode = process.argv[2];

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  let event = {};
  if (input) {
    try {
      event = JSON.parse(input);
    } catch {
      event = {};
    }
  }

  if (mode === "user-prompt") {
    handleUserPrompt(event);
    return;
  }

  if (mode === "pre-tool") {
    handlePreToolUse(event);
    return;
  }

  process.stdout.write(JSON.stringify({continue: true}));
});
