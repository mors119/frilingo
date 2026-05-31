import * as vscode from 'vscode';
import { Ollama } from 'ollama';

import {
  createPullRecommendedModelCommand,
  createShowOllamaModelsCommand,
  createStartOllamaCommand,
  OllamaCliService,
  OllamaRuntimeService,
  updateOllamaStatusBarItem,
} from './features/ollama';
import { createSelectOllamaModelCommand } from './features/settings';
import {
  FRILINGO_OUTPUT_CHANNEL_NAME,
  createTranslateHoverProvider,
  createTranslateSelectionCommand,
  createTranslateTextCommand,
  OllamaService,
} from './features/translation';
import { createOllamaConfig } from './shared/config/ollama';

export function activate(context: vscode.ExtensionContext) {
  const getOllamaConfig = () =>
    createOllamaConfig(vscode.workspace.getConfiguration('frilingo'));
  const ollamaService = new OllamaService(undefined, getOllamaConfig);
  const ollamaCliService = new OllamaCliService();
  const ollamaRuntimeService = new OllamaRuntimeService(
    ollamaCliService,
    new Ollama({ host: getOllamaConfig().host }),
    getOllamaConfig,
  );
  // Creates a shared output channel so every translation request writes to the same log.
  const outputChannel = vscode.window.createOutputChannel(FRILINGO_OUTPUT_CHANNEL_NAME);
  // Keeps the current Ollama readiness visible even when the output panel is closed.
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  updateOllamaStatusBarItem(statusBarItem, ollamaRuntimeService.getState());
  const runtimeSubscription = ollamaRuntimeService.onDidChangeState((state) => {
    updateOllamaStatusBarItem(statusBarItem, state);
  });
  const showOllamaModelsDisposable = vscode.commands.registerCommand(
    'frilingo.showOllamaModels',
    createShowOllamaModelsCommand(ollamaCliService, ollamaRuntimeService, getOllamaConfig, {
      showInformationMessage: (message: string, ...items: string[]) =>
        vscode.window.showInformationMessage(message, ...items),
      showWarningMessage: (message: string, ...items: string[]) =>
        vscode.window.showWarningMessage(message, ...items),
      executeCommand: (command: string) => vscode.commands.executeCommand(command),
      openExternal: (uri: vscode.Uri) => vscode.env.openExternal(uri),
      outputChannel,
      refreshRuntimeState: () => ollamaRuntimeService.refreshState(),
    }),
  );
  const startOllamaDisposable = vscode.commands.registerCommand(
    'frilingo.startOllama',
    createStartOllamaCommand(ollamaCliService, ollamaRuntimeService, {
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
      outputChannel,
      refreshRuntimeState: () => ollamaRuntimeService.refreshState(),
    }),
  );
  const pullRecommendedModelDisposable = vscode.commands.registerCommand(
    'frilingo.pullRecommendedModel',
    createPullRecommendedModelCommand(ollamaCliService, ollamaRuntimeService, getOllamaConfig, {
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
      outputChannel,
      refreshRuntimeState: () => ollamaRuntimeService.refreshState(),
    }),
  );
  const selectOllamaModelDisposable = vscode.commands.registerCommand(
    'frilingo.selectOllamaModel',
    createSelectOllamaModelCommand(ollamaCliService, ollamaRuntimeService, {
      showQuickPick: (items, options) => vscode.window.showQuickPick(items, options),
      showInformationMessage: (message: string) =>
        vscode.window.showInformationMessage(message),
      showWarningMessage: (message: string) => vscode.window.showWarningMessage(message),
      executeCommand: (command: string) => vscode.commands.executeCommand(command),
      updateConfiguration: (model: string) =>
        vscode.workspace
          .getConfiguration('frilingo')
          .update('ollamaModel', model, vscode.ConfigurationTarget.Global),
      refreshRuntimeState: () => ollamaRuntimeService.refreshState(),
    }),
  );
  const translateSelectionDisposable = vscode.commands.registerCommand(
    'frilingo.translateSelection',
    createTranslateSelectionCommand(ollamaService, {
      getActiveTextEditor: () => vscode.window.activeTextEditor,
      getActiveModelName: () => getOllamaConfig().model,
      showInformationMessage: (message: string) =>
        vscode.window.showInformationMessage(message),
      showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
      withProgress: <T>(
        title: string,
        task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
      ) =>
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: true,
          },
          (_progress, cancellationToken) => task(cancellationToken),
        ),
      outputChannel,
    }),
  );
  const translateTextDisposable = vscode.commands.registerCommand(
    'frilingo.translateText',
    createTranslateTextCommand(ollamaService, {
      getActiveModelName: () => getOllamaConfig().model,
      showInformationMessage: (message: string) =>
        vscode.window.showInformationMessage(message),
      showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
      withProgress: <T>(
        title: string,
        task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
      ) =>
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: true,
          },
          (_progress, cancellationToken) => task(cancellationToken),
        ),
      outputChannel,
    }),
  );
  const hoverProviderDisposable = vscode.languages.registerHoverProvider(
    { scheme: 'file' },
    createTranslateHoverProvider(ollamaRuntimeService),
  );

  // Runs one startup inventory pass so the output channel shows local model state immediately.
  void vscode.commands.executeCommand('frilingo.showOllamaModels');

  context.subscriptions.push(
    statusBarItem,
    runtimeSubscription,
    showOllamaModelsDisposable,
    startOllamaDisposable,
    pullRecommendedModelDisposable,
    selectOllamaModelDisposable,
    translateSelectionDisposable,
    translateTextDisposable,
    hoverProviderDisposable,
    outputChannel,
  );
}

export function deactivate() {
  // No cleanup is required for v0.1.
}
