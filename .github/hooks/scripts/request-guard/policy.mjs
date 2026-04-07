import { buildPromptLikeText, normalizeGuardText } from './shared.mjs';

function isIssueOnlyCommand(command) {
  return /\bgh\s+issue\s+(list|view|create|edit|comment)\b/.test(command);
}

function isIssuePreparationCommand(command) {
  return /\bgh\s+auth\s+status\b/.test(command);
}

function isIssueManagementTool(toolName) {
  return /(mcp_io_github_git_issue_write|issue_write|issues_add_comment|gh[_-]issue|issue[_-](create|edit|comment))/i.test(
    toolName,
  );
}

function isWorktreePreparationCommand(command) {
  return [
    /git\b.*\brev-parse\s+--show-toplevel\b/,
    /git\b.*\bbranch\s+--show-current\b/,
    /git\b.*\bbranch\s+--list\b/,
    /git\b.*\bworktree\s+list\b/,
    /git\b.*\bworktree\s+add\b/,
    /git\b.*\bpull\s+--ff-only\b/,
  ].some((pattern) => pattern.test(command));
}

export function branchMatchesIssue(branch, issueNumbers) {
  if (!branch || branch === 'main') {
    return false;
  }

  if (issueNumbers.length === 0) {
    return /#\d+/.test(branch);
  }

  return issueNumbers.some((issueNumber) => branch.includes(`#${issueNumber}`));
}

export function shouldBypassIssueWorktreeRequirement(event) {
  const toolName = normalizeGuardText(event.tool_name || '');
  const command = normalizeGuardText(
    [event.command, event.tool_input?.command, buildPromptLikeText(event)]
      .filter(Boolean)
      .join('\n'),
  );

  if (isIssueManagementTool(toolName)) {
    return true;
  }

  if (!command) {
    return false;
  }

  return (
    isIssueOnlyCommand(command) ||
    isIssuePreparationCommand(command) ||
    isWorktreePreparationCommand(command)
  );
}

export function detectExplicitOperation(prompt) {
  const normalized = normalizeGuardText(prompt);
  const match = normalized.match(/^[>*\-\s`]*操作(?:種別)?\s*[:：]\s*(\S+)/im);

  if (!match) {
    return null;
  }

  return String(match[1] || '').toLowerCase();
}

export function isAnswerOnlyResearch(prompt) {
  const normalized = normalizeGuardText(prompt);

  return (
    /(回答だけ|回答のみ|チャットで回答|このチャットで回答|このチャットでよい|ファイル化は不要|ファイル化不要|docs は不要|docs不要|保存は不要|保存不要)/i.test(
      normalized,
    ) &&
    /(調査|確認|比較|説明|要約|まとめ|根拠|仕様|制約|Webページ|webページ|ページ確認|公式ドキュメント|公式サイト)/i.test(
      normalized,
    )
  );
}

export function detectRoute(prompt) {
  const normalized = String(prompt || '');
  const explicitOperation = detectExplicitOperation(normalized);

  if (explicitOperation === 'none') {
    return 'Ask';
  }

  if (isAnswerOnlyResearch(normalized)) {
    return 'Ask';
  }

  const hasActionVerb =
    /(作成|生成|更新|編集|修正|追加|追記する|削除|実装|書いて|出力して|作って|更新して|直して|保存(?:して)?|実行して|push|commit|コミット|checkout|PR作成|PRに保存|run|create|update|delete)/i.test(
      normalized,
    );
  const hasPlanVerb = /(計画|手順|段取り|ステップ|方針|プラン|優先順位|整理して)/i.test(normalized);
  const hasResearchVerb =
    /(調査|確認|比較|整理|説明|要約|まとめ|違い|とは|レビュー|根拠|仕様|制約)/i.test(normalized);

  if (hasActionVerb) {
    return 'Agent';
  }

  if (hasPlanVerb) {
    return 'Plan';
  }

  if (hasResearchVerb) {
    return 'Ask';
  }

  return 'Ask';
}

export function isExecutionLikeTool(toolName) {
  return /(edit|create|write|replace|string|delete|terminal|run|command|file-editor|create_file|apply_patch|run_in_terminal)/i.test(
    toolName,
  );
}
