import * as vscode from 'vscode';

import { DEFAULT_OLLAMA_MODEL, FrilingoOllamaConfig, OLLAMA_CONFIG } from '../../../shared/config/ollama';
import {
  appendOllamaCliError,
  appendOllamaModelList,
} from '../services/ollamaOutput';
import { OllamaCliService } from '../services/ollamaCliService';
import { OllamaRuntimeService } from '../services/ollamaRuntimeService';

type ShowOllamaModelsDependencies = {
  showInformationMessage: (
    message: string,
    ...items: string[]
  ) => Thenable<string | undefined>;
  showWarningMessage: (
    message: string,
    ...items: string[]
  ) => Thenable<string | undefined>;
  executeCommand: (command: string) => Thenable<unknown>;
  openExternal: (uri: vscode.Uri) => Thenable<boolean>;
  outputChannel: vscode.OutputChannel;
  refreshRuntimeState?: () => Promise<unknown>;
};

const START_OLLAMA_ACTION = 'Start Ollama';
const INSTALL_OLLAMA_ACTION = 'Install Ollama';
const SELECT_MODEL_ACTION = 'Select Model';

const defaultDependencies: ShowOllamaModelsDependencies = {
  showInformationMessage: (message: string, ...items: string[]) =>
    vscode.window.showInformationMessage(message, ...items),
  showWarningMessage: (message: string, ...items: string[]) =>
    vscode.window.showWarningMessage(message, ...items),
  executeCommand: (command: string) => vscode.commands.executeCommand(command),
  openExternal: (uri: vscode.Uri) => vscode.env.openExternal(uri),
  outputChannel: vscode.window.createOutputChannel('Frilingo'),
};

// Lists local Ollama models and recommends the configured default when none are installed.
export function createShowOllamaModelsCommand(
  ollamaCliService: OllamaCliService,
  runtimeService?: Pick<OllamaRuntimeService, 'refreshState'>,
  getConfig: () => FrilingoOllamaConfig = () => OLLAMA_CONFIG,
  dependencies: ShowOllamaModelsDependencies = defaultDependencies,
): () => Promise<void> {
  return async () => {
    const config = getConfig();
    const recommendedModel = config.model || DEFAULT_OLLAMA_MODEL;
    const pullRecommendedModelAction = `Pull ${recommendedModel}`;

    try {
      const runtimeState = await (
        dependencies.refreshRuntimeState?.() ?? runtimeService?.refreshState()
      );

      if (runtimeState && typeof runtimeState === 'object' && 'status' in runtimeState) {
        if (runtimeState.status === 'cli_missing') {
          const selection = await dependencies.showWarningMessage(
            'Frilingo: Ollama CLI was not found. Install Ollama to continue.',
            INSTALL_OLLAMA_ACTION,
          );

          if (selection === INSTALL_OLLAMA_ACTION) {
            await dependencies.openExternal(vscode.Uri.parse('https://ollama.com/download'));
          }

          return;
        }

        if (runtimeState.status === 'not_running') {
          const selection = await dependencies.showWarningMessage(
            'Frilingo: Ollama server is not running. Start it now?',
            START_OLLAMA_ACTION,
          );

          if (selection === START_OLLAMA_ACTION) {
            await dependencies.executeCommand('frilingo.startOllama');
          }

          return;
        }
      }

      const result = await ollamaCliService.listModels();

      appendOllamaModelList(
        dependencies.outputChannel,
        result.models,
        result.rawOutput,
      );
      dependencies.outputChannel.show(true);

      if (result.models.length === 0) {
        const selection = await dependencies.showWarningMessage(
          `Frilingo: No Ollama models found. Pull ${recommendedModel}?`,
          pullRecommendedModelAction,
        );

        if (selection === pullRecommendedModelAction) {
          await dependencies.executeCommand('frilingo.pullRecommendedModel');
        }

        return;
      }

      const selection = await dependencies.showInformationMessage(
        `Frilingo: Found ${result.models.length} Ollama model(s). Active model: ${recommendedModel}.`,
        SELECT_MODEL_ACTION,
      );

      if (selection === SELECT_MODEL_ACTION) {
        await dependencies.executeCommand('frilingo.selectOllamaModel');
      }
    } catch (error) {
      const errorMessage = String(error);

      appendOllamaCliError(dependencies.outputChannel, 'list', errorMessage);
      dependencies.outputChannel.show(true);
      await dependencies.showWarningMessage(
        'Frilingo: Failed to read local Ollama models.',
      );
    }
  };
}
