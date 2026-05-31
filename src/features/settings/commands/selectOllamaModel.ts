import * as vscode from 'vscode';

import { DEFAULT_OLLAMA_MODEL } from '../../../shared/config/ollama';
import { OllamaCliService } from '../../ollama/services/ollamaCliService';
import { OllamaRuntimeService } from '../../ollama/services/ollamaRuntimeService';

type ModelQuickPickItem = vscode.QuickPickItem & {
  action: 'select' | 'pull';
  model?: string;
};

type SelectOllamaModelDependencies = {
  showQuickPick: (
    items: readonly ModelQuickPickItem[],
    options: vscode.QuickPickOptions,
  ) => Thenable<ModelQuickPickItem | undefined>;
  showInformationMessage: (message: string) => Thenable<string | undefined>;
  showWarningMessage: (message: string) => Thenable<string | undefined>;
  executeCommand: (command: string) => Thenable<unknown>;
  updateConfiguration: (model: string) => Thenable<void>;
  refreshRuntimeState?: () => Promise<unknown>;
};

const defaultDependencies: SelectOllamaModelDependencies = {
  showQuickPick: (items, options) => vscode.window.showQuickPick(items, options),
  showInformationMessage: (message: string) =>
    vscode.window.showInformationMessage(message),
  showWarningMessage: (message: string) => vscode.window.showWarningMessage(message),
  executeCommand: (command: string) => vscode.commands.executeCommand(command),
  updateConfiguration: (model: string) =>
    vscode.workspace
      .getConfiguration('frilingo')
      .update('ollamaModel', model, vscode.ConfigurationTarget.Global),
};

// Lets the user switch the active Ollama model without editing source files.
export function createSelectOllamaModelCommand(
  ollamaCliService: Pick<OllamaCliService, 'listModels'>,
  runtimeService?: Pick<OllamaRuntimeService, 'refreshState' | 'getState'>,
  dependencies: SelectOllamaModelDependencies = defaultDependencies,
): () => Promise<void> {
  return async () => {
    const result = await ollamaCliService.listModels();
    const state = runtimeService?.getState();
    const installedModels = result.models;
    const items: ModelQuickPickItem[] = installedModels.map((model) => ({
      label: model,
      description:
        model === state?.configuredModel ? 'Current configured model' : undefined,
      action: 'select',
      model,
    }));

    if (!installedModels.includes(DEFAULT_OLLAMA_MODEL)) {
      items.unshift({
        label: `Pull ${DEFAULT_OLLAMA_MODEL}`,
        description: 'Recommended model for Frilingo v0.1',
        action: 'pull',
        model: DEFAULT_OLLAMA_MODEL,
      });
    }

    if (items.length === 0) {
      await dependencies.showWarningMessage(
        'Frilingo: No Ollama models found. Pull the recommended model first.',
      );
      await dependencies.executeCommand('frilingo.pullRecommendedModel');
      return;
    }

    const selection = await dependencies.showQuickPick(items, {
      title: 'Select an Ollama model for Frilingo',
      placeHolder: 'Choose an installed model or pull the recommended one',
      ignoreFocusOut: true,
    });

    if (!selection) {
      return;
    }

    if (selection.action === 'pull') {
      await dependencies.executeCommand('frilingo.pullRecommendedModel');
      return;
    }

    if (!selection.model) {
      return;
    }

    await dependencies.updateConfiguration(selection.model);
    await (dependencies.refreshRuntimeState?.() ?? runtimeService?.refreshState());
    await dependencies.showInformationMessage(
      `Frilingo: Using Ollama model ${selection.model}.`,
    );
  };
}
