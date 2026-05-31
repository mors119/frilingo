import * as vscode from 'vscode';

import { DEFAULT_OLLAMA_MODEL, FrilingoOllamaConfig, OLLAMA_CONFIG } from '../../../shared/config/ollama';
import {
  appendOllamaCliError,
  appendOllamaPullResult,
  extractLatestPullStatus,
} from '../services/ollamaOutput';
import { OllamaCliService } from '../services/ollamaCliService';
import { OllamaRuntimeService } from '../services/ollamaRuntimeService';

type PullRecommendedModelDependencies = {
  showInformationMessage: (message: string) => Thenable<string | undefined>;
  showErrorMessage: (message: string) => Thenable<string | undefined>;
  withProgress: <T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string }>) => Promise<T>,
  ) => Thenable<T>;
  outputChannel: vscode.OutputChannel;
  refreshRuntimeState?: () => Promise<unknown>;
};

const defaultDependencies: PullRecommendedModelDependencies = {
  showInformationMessage: (message: string) =>
    vscode.window.showInformationMessage(message),
  showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
  withProgress: <T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string }>) => Promise<T>,
  ) =>
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false,
      },
      (progress) => task(progress),
    ),
  outputChannel: vscode.window.createOutputChannel('Frilingo'),
};

// Pulls the configured recommendation so the user can bootstrap Frilingo quickly.
export function createPullRecommendedModelCommand(
  ollamaCliService: OllamaCliService,
  runtimeService?: Pick<OllamaRuntimeService, 'refreshState'>,
  getConfig: () => FrilingoOllamaConfig = () => OLLAMA_CONFIG,
  dependencies: PullRecommendedModelDependencies = defaultDependencies,
): () => Promise<void> {
  return async () => {
    const config = getConfig();
    const model = config.model || DEFAULT_OLLAMA_MODEL;

    try {
      dependencies.outputChannel.appendLine(
        `[Frilingo] Pulling model: ${model}`,
      );
      const output = await dependencies.withProgress(
        `Frilingo: Pulling ${model}...`,
        (progress) =>
          ollamaCliService.pullModel(model, {
            // Updates the VSCode notification with the latest sanitized CLI status instead of dumping raw ANSI output.
            onOutput: (chunk: string) => {
              const latestStatus = extractLatestPullStatus(chunk);

              if (latestStatus) {
                progress.report({ message: latestStatus });
              }
            },
          }),
      );

      appendOllamaPullResult(
        dependencies.outputChannel,
        model,
        output,
      );
      await (dependencies.refreshRuntimeState?.() ?? runtimeService?.refreshState());
      dependencies.outputChannel.show(true);

      await dependencies.showInformationMessage(
        `Frilingo: Pulled recommended model ${model}.`,
      );
    } catch (error) {
      const errorMessage = String(error);

      appendOllamaCliError(dependencies.outputChannel, 'pull', errorMessage);
      dependencies.outputChannel.show(true);
      await dependencies.showErrorMessage(
        `Frilingo: Failed to pull ${model}.`,
      );
    }
  };
}
