import * as vscode from 'vscode';

const ANSI_ESCAPE_PATTERN =
  // Removes terminal control sequences from raw Ollama CLI output before showing it in VSCode UI.
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

// Strips terminal escape sequences so CLI progress can be shown in VSCode-friendly UI text.
export function stripAnsiControlSequences(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

// Extracts the latest readable pull status line from a raw CLI chunk.
export function extractLatestPullStatus(chunk: string): string | undefined {
  const cleaned = stripAnsiControlSequences(chunk);
  const lines = cleaned
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.at(-1);
}

// Appends the current local Ollama model list to the shared output channel.
export function appendOllamaModelList(
  outputChannel: vscode.OutputChannel,
  models: string[],
  rawOutput: string,
): void {
  outputChannel.appendLine('[Frilingo] Ollama model inventory');

  if (models.length === 0) {
    outputChannel.appendLine('[Frilingo] No local Ollama models were found.');
  } else {
    models.forEach((model) => {
      outputChannel.appendLine(`[Frilingo] Model: ${model}`);
    });
  }

  if (rawOutput) {
    outputChannel.appendLine('[Frilingo] Raw `ollama list` output:');
    outputChannel.appendLine(rawOutput);
  }

  outputChannel.appendLine('');
}

// Appends the result of a pull command so slow downloads stay visible after the notification closes.
export function appendOllamaPullResult(
  outputChannel: vscode.OutputChannel,
  model: string,
  output: string,
): void {
  outputChannel.appendLine(`[Frilingo] Pulled model: ${model}`);

  if (output) {
    outputChannel.appendLine(output);
  }

  outputChannel.appendLine('');
}

// Appends CLI-level failures that happen outside the translation request path.
export function appendOllamaCliError(
  outputChannel: vscode.OutputChannel,
  action: string,
  errorMessage: string,
): void {
  outputChannel.appendLine(`[Frilingo] Ollama CLI action failed: ${action}`);
  outputChannel.appendLine(`[Frilingo] Error: ${errorMessage}`);
  outputChannel.appendLine('');
}
