import * as vscode from 'vscode';

import { FRILINGO_MESSAGES } from '../../../shared/constants/messages';
import {
  appendTranslationError,
  appendTranslationResult,
} from '../services/outputChannel';
import { OllamaService } from '../services/ollamaService';
import { runTranslateSelection } from '../services/translateSelectionCore';

type TranslateTextCommandDependencies = {
  getActiveModelName: () => string;
  showInformationMessage: (message: string) => Thenable<string | undefined>;
  showErrorMessage: (message: string) => Thenable<string | undefined>;
  withProgress: <T>(
    title: string,
    task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
  ) => Thenable<T>;
  outputChannel: vscode.OutputChannel;
};

const defaultDependencies: TranslateTextCommandDependencies = {
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

// Adapts hover-provided text into the shared translation workflow.
export function createTranslateTextCommand(
  ollamaService: OllamaService,
  dependencies: TranslateTextCommandDependencies = defaultDependencies,
): (text: string | undefined) => Promise<void> {
  return async (text: string | undefined) => {
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
          selectedText: text,
          translateToKorean: (value: string) => ollamaService.translateToKorean(value),
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
