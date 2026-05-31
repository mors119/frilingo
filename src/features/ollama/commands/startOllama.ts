import * as vscode from 'vscode';

import { appendOllamaCliError } from '../services/ollamaOutput';
import { OllamaCliService } from '../services/ollamaCliService';
import { OllamaRuntimeService } from '../services/ollamaRuntimeService';

type StartOllamaDependencies = {
  showInformationMessage: (message: string) => Thenable<string | undefined>;
  showErrorMessage: (message: string) => Thenable<string | undefined>;
  withProgress: <T>(task: () => Promise<T>) => Thenable<T>;
  outputChannel: vscode.OutputChannel;
  refreshRuntimeState?: () => Promise<unknown>;
};

const defaultDependencies: StartOllamaDependencies = {
  showInformationMessage: (message: string) =>
    vscode.window.showInformationMessage(message),
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
  withProgress: <T>(task: () => Promise<T>) =>
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Frilingo: Starting Ollama...',
        cancellable: false,
      },
      task,
    ),
  outputChannel: vscode.window.createOutputChannel('Frilingo'),
};

// Starts the Ollama server on demand without introducing background polling.
export function createStartOllamaCommand(
  ollamaCliService: OllamaCliService,
  runtimeService?: Pick<OllamaRuntimeService, 'refreshState'>,
  dependencies: StartOllamaDependencies = defaultDependencies,
): () => Promise<void> {
  return async () => {
    try {
      await dependencies.withProgress(async () => {
        await ollamaCliService.startServer();
        // Gives the spawned server a brief window to bind the local port before the next state check.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      await (dependencies.refreshRuntimeState?.() ?? runtimeService?.refreshState());
      dependencies.outputChannel.appendLine('[Frilingo] Started Ollama server.');
      dependencies.outputChannel.appendLine('');
      dependencies.outputChannel.show(true);
      await dependencies.showInformationMessage('Frilingo: Started Ollama server.');
    } catch (error) {
      const errorMessage = String(error);

      appendOllamaCliError(dependencies.outputChannel, 'start', errorMessage);
      dependencies.outputChannel.show(true);
      await dependencies.showErrorMessage('Frilingo: Failed to start Ollama.');
    }
  };
}
