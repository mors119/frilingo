import * as vscode from 'vscode';

import { FRILINGO_MESSAGES } from '../../../shared/constants/messages';
import {
  appendTranslationError,
  appendTranslationResult,
} from '../services/outputChannel';
import { OllamaService } from '../services/ollamaService';
import { runTranslateSelection } from '../services/translateSelectionCore';

type TranslateSelectionCommandDependencies = {
  getActiveTextEditor: () => vscode.TextEditor | undefined;
  getActiveModelName: () => string;
  showInformationMessage: (message: string) => Thenable<string | undefined>;
  showErrorMessage: (message: string) => Thenable<string | undefined>;
  withProgress: <T>(
    title: string,
    task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
  ) => Thenable<T>;
  outputChannel: vscode.OutputChannel;
};

const defaultDependencies: TranslateSelectionCommandDependencies = {
  getActiveTextEditor: () => vscode.window.activeTextEditor,
  getActiveModelName: () => 'Ollama',
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
  outputChannel: vscode.window.createOutputChannel('Frilingo'),
};

// Adapts the active editor selection into the shared translation workflow.
export function createTranslateSelectionCommand(
  ollamaService: OllamaService,
  dependencies: TranslateSelectionCommandDependencies = defaultDependencies,
): () => Promise<void> {
  return async () => {
    const editor = dependencies.getActiveTextEditor();

    if (!editor) {
      await dependencies.showErrorMessage(FRILINGO_MESSAGES.noActiveEditor);
      return;
    }

    const modelName = dependencies.getActiveModelName();

    await dependencies.withProgress(
      `Frilingo: Translating with ${modelName}...`,
      async (cancellationToken) => {
        let cancelled = false;
        const cancellationPromise = new Promise<void>((resolve) => {
          cancellationToken.onCancellationRequested(() => {
            cancelled = true;
            resolve();
          });
        });
        const translationPromise = runTranslateSelection({
          selectedText: editor.document.getText(editor.selection),
          translateToKorean: (text: string) => ollamaService.translateToKorean(text),
          isCancelled: () => cancelled,
          showInformationMessage: dependencies.showInformationMessage,
          showErrorMessage: dependencies.showErrorMessage,
          onTranslationResult: (sourceText, result) => {
            appendTranslationResult(dependencies.outputChannel, sourceText, result);
            dependencies.outputChannel.show(true);
          },
          onTranslationError: (sourceText, errorMessage) => {
            appendTranslationError(dependencies.outputChannel, sourceText, errorMessage);
            dependencies.outputChannel.show(true);
          },
        }).catch((error) => {
          if (cancelled) {
            return;
          }

          throw error;
        });

        await Promise.race([translationPromise, cancellationPromise]);

        if (cancelled) {
          await dependencies.showInformationMessage(FRILINGO_MESSAGES.translationCancelled);
          return;
        }

        await translationPromise;
      },
    );
  };
}
