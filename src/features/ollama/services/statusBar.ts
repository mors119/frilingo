import * as vscode from 'vscode';

import { OllamaRuntimeState } from './ollamaRuntimeService';

export const FRILINGO_STATUS_BAR_COMMAND = 'frilingo.showOllamaModels';

// Maps the current Ollama runtime state to one compact status bar label.
export function formatOllamaStatusBarText(state: OllamaRuntimeState): string {
  switch (state.status) {
    case 'checking':
      return '$(sync~spin) Frilingo: Checking Ollama';
    case 'cli_missing':
      return '$(warning) Frilingo: Ollama CLI Missing';
    case 'not_running':
      return '$(circle-slash) Frilingo: Ollama Offline';
    case 'no_model':
      return `$(package) Frilingo: Pull ${state.configuredModel}`;
    case 'ready':
      return `$(check) Frilingo: ${state.configuredModel} Ready`;
    default:
      return '$(question) Frilingo: Ollama Unknown';
  }
}

// Maps the current Ollama runtime state to a tooltip with the next suggested action.
export function formatOllamaStatusBarTooltip(state: OllamaRuntimeState): string {
  switch (state.status) {
    case 'checking':
      return 'Frilingo is checking the local Ollama runtime.';
    case 'cli_missing':
      return 'Ollama CLI is not available. Click to inspect local Ollama status.';
    case 'not_running':
      return 'Ollama server is not running. Click to inspect local models and runtime state.';
    case 'no_model':
      return `Configured model ${state.configuredModel} is missing. Click to inspect or pull models.`;
    case 'ready':
      return `Ollama is ready with ${state.configuredModel}. Click to inspect local models.`;
    default:
      return 'Click to inspect the local Ollama runtime.';
  }
}

// Updates the shared status bar item whenever the Ollama runtime state changes.
export function updateOllamaStatusBarItem(
  statusBarItem: vscode.StatusBarItem,
  state: OllamaRuntimeState,
): void {
  statusBarItem.text = formatOllamaStatusBarText(state);
  statusBarItem.tooltip = formatOllamaStatusBarTooltip(state);
  statusBarItem.command = FRILINGO_STATUS_BAR_COMMAND;
  statusBarItem.show();
}
