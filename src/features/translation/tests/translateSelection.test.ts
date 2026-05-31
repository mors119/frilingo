import * as assert from 'assert';
import * as vscode from 'vscode';

import { suite, test } from 'mocha';

import { createTranslateSelectionCommand } from '../commands/translateSelection';
import { OllamaServiceError } from '../../ollama/types/ollama';

function createMockCancellationToken(): vscode.CancellationToken {
  // Expected: command tests run with a stable non-cancelled token unless a test overrides it explicitly.
  return {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => undefined }),
  } as unknown as vscode.CancellationToken;
}

suite('Translate Selection Command', () => {
  test('shows an error when there is no active editor', async () => {
    // Expected: the command fails fast when there is no active VSCode editor.
    const shownErrors: string[] = [];
    const command = createTranslateSelectionCommand(
      {
        translateToKorean: async () => ({
          model: 'qwen3:4b',
          text: 'unused',
        }),
      } as never,
      {
        getActiveTextEditor: () => undefined,
        getActiveModelName: () => 'gemma3:4b',
        showInformationMessage: async () => undefined,
        showErrorMessage: async (message: string) => {
          shownErrors.push(message);
          return undefined;
        },
        withProgress: async <T>(
          _title: string,
          task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
        ) => task(createMockCancellationToken()),
        outputChannel: {
          append: () => undefined,
          appendLine: () => undefined,
          clear: () => undefined,
          dispose: () => undefined,
          hide: () => undefined,
          replace: () => undefined,
          show: () => undefined,
          name: 'Frilingo',
        } as vscode.OutputChannel,
      },
    );

    await command();

    assert.deepStrictEqual(shownErrors, ['Frilingo: No active editor.']);
  });

  test('shows an information message when the selection is empty', async () => {
    // Expected: empty selections do not call Ollama and show the empty-selection message.
    const shownMessages: string[] = [];
    const command = createTranslateSelectionCommand(
      {
        translateToKorean: async () => ({
          model: 'qwen3:4b',
          text: 'unused',
        }),
      } as never,
      {
        getActiveTextEditor: () =>
          ({
            document: {
              getText: () => '   ',
            },
            selection: {} as vscode.Selection,
          }) as vscode.TextEditor,
        getActiveModelName: () => 'gemma3:4b',
        showInformationMessage: async (message: string) => {
          shownMessages.push(message);
          return undefined;
        },
        showErrorMessage: async () => undefined,
        withProgress: async <T>(
          _title: string,
          task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
        ) => task(createMockCancellationToken()),
        outputChannel: {
          append: () => undefined,
          appendLine: () => undefined,
          clear: () => undefined,
          dispose: () => undefined,
          hide: () => undefined,
          replace: () => undefined,
          show: () => undefined,
          name: 'Frilingo',
        } as vscode.OutputChannel,
      },
    );

    await command();

    assert.deepStrictEqual(shownMessages, ['Frilingo: No text selected.']);
  });

  test('translates the trimmed selection and shows the result', async () => {
    // Expected: the command trims the selection and shows only the translated text.
    const shownMessages: string[] = [];
    const requestedTexts: string[] = [];
    const command = createTranslateSelectionCommand(
      {
        translateToKorean: async (text: string) => {
          requestedTexts.push(text);
          return {
            model: 'qwen3:4b',
            text: '패턴 매칭은 모든 경우를 다뤄야 합니다.',
          };
        },
      } as never,
      {
        getActiveTextEditor: () =>
          ({
            document: {
              getText: () => '  match expression must be exhaustive  ',
            },
            selection: {} as vscode.Selection,
          }) as vscode.TextEditor,
        getActiveModelName: () => 'gemma3:4b',
        showInformationMessage: async (message: string) => {
          shownMessages.push(message);
          return undefined;
        },
        showErrorMessage: async () => undefined,
        withProgress: async <T>(
          _title: string,
          task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
        ) => task(createMockCancellationToken()),
        outputChannel: {
          append: () => undefined,
          appendLine: () => undefined,
          clear: () => undefined,
          dispose: () => undefined,
          hide: () => undefined,
          replace: () => undefined,
          show: () => undefined,
          name: 'Frilingo',
        } as vscode.OutputChannel,
      },
    );

    await command();

    assert.deepStrictEqual(requestedTexts, ['match expression must be exhaustive']);
    assert.deepStrictEqual(shownMessages, [
      'Frilingo: 패턴 매칭은 모든 경우를 다뤄야 합니다.',
    ]);
  });

  test('shows a connection error when Ollama is unavailable', async () => {
    // Expected: command-level failures map the Ollama connection issue to the user error message.
    const shownErrors: string[] = [];
    const command = createTranslateSelectionCommand(
      {
        translateToKorean: async () => {
          throw new OllamaServiceError('connection_failed', 'offline');
        },
      } as never,
      {
        getActiveTextEditor: () =>
          ({
            document: {
              getText: () => 'network failure example',
            },
            selection: {} as vscode.Selection,
          }) as vscode.TextEditor,
        getActiveModelName: () => 'gemma3:4b',
        showInformationMessage: async () => undefined,
        showErrorMessage: async (message: string) => {
          shownErrors.push(message);
          return undefined;
        },
        withProgress: async <T>(
          _title: string,
          task: (cancellationToken: vscode.CancellationToken) => Promise<T>,
        ) => task(createMockCancellationToken()),
        outputChannel: {
          append: () => undefined,
          appendLine: () => undefined,
          clear: () => undefined,
          dispose: () => undefined,
          hide: () => undefined,
          replace: () => undefined,
          show: () => undefined,
          name: 'Frilingo',
        } as vscode.OutputChannel,
      },
    );

    await command();

    assert.deepStrictEqual(shownErrors, ['Frilingo: Failed to connect to Ollama.']);
  });
});
