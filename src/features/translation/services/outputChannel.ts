import * as vscode from 'vscode';

import { TranslationResult } from '../types/translation';

export const FRILINGO_OUTPUT_CHANNEL_NAME = 'Frilingo';

function formatDurationNs(durationNs: number | undefined): string {
  if (!durationNs || durationNs <= 0) {
    return 'n/a';
  }

  return `${(durationNs / 1_000_000_000).toFixed(2)}s`;
}

// Appends a compact translation summary so slow model loads are visible to the user.
export function appendTranslationResult(
  outputChannel: vscode.OutputChannel,
  sourceText: string,
  result: TranslationResult,
): void {
  outputChannel.appendLine(`[Frilingo] Model: ${result.model}`);
  outputChannel.appendLine(`[Frilingo] Source: ${sourceText}`);
  outputChannel.appendLine(`[Frilingo] Translation: ${result.text}`);
  outputChannel.appendLine(
    `[Frilingo] Load duration: ${formatDurationNs(result.loadDurationNs)}`,
  );
  outputChannel.appendLine(
    `[Frilingo] Total duration: ${formatDurationNs(result.totalDurationNs)}`,
  );

  if (typeof result.promptEvalCount === 'number') {
    outputChannel.appendLine(`[Frilingo] Prompt tokens: ${result.promptEvalCount}`);
  }

  if (typeof result.evalCount === 'number') {
    outputChannel.appendLine(`[Frilingo] Output tokens: ${result.evalCount}`);
  }

  if (result.usedFallbackPrompt) {
    outputChannel.appendLine('[Frilingo] Fallback prompt: used');
  }

  outputChannel.appendLine('');
}

// Appends a single failure line so API errors stay visible after notifications disappear.
export function appendTranslationError(
  outputChannel: vscode.OutputChannel,
  sourceText: string,
  errorMessage: string,
): void {
  outputChannel.appendLine(`[Frilingo] Source: ${sourceText}`);
  outputChannel.appendLine(`[Frilingo] Error: ${errorMessage}`);
  outputChannel.appendLine('');
}
