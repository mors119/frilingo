import * as assert from 'assert';

import { suite, test } from 'mocha';

import { runTranslateSelection } from '../services/translateSelectionCore';
import { OllamaServiceError } from '../../ollama/types/ollama';

suite('Translate Selection Core', () => {
  test('shows an information message when the selection is empty', async () => {
    // Expected: blank or whitespace-only selections do not call the model.
    const shownMessages: string[] = [];

    await runTranslateSelection({
      selectedText: '   ',
      translateToKorean: async () => ({
        model: 'qwen3:4b',
        text: 'unused',
      }),
      showInformationMessage: async (message: string) => {
        shownMessages.push(message);
      },
      showErrorMessage: async () => undefined,
    });

    assert.deepStrictEqual(shownMessages, ['Frilingo: No text selected.']);
  });

  test('translates the trimmed selection and shows the result', async () => {
    // Expected: the selected text is trimmed before it is sent to Ollama.
    const shownMessages: string[] = [];
    const requestedTexts: string[] = [];

    await runTranslateSelection({
      selectedText: '  match expression must be exhaustive  ',
      translateToKorean: async (text: string) => {
        requestedTexts.push(text);
        return {
          model: 'qwen3:4b',
          text: '패턴 매칭은 모든 경우를 다뤄야 합니다.',
        };
      },
      showInformationMessage: async (message: string) => {
        shownMessages.push(message);
      },
      showErrorMessage: async () => undefined,
    });

    assert.deepStrictEqual(requestedTexts, ['match expression must be exhaustive']);
    assert.deepStrictEqual(shownMessages, [
      'Frilingo: 패턴 매칭은 모든 경우를 다뤄야 합니다.',
    ]);
  });

  test('shows a connection error when Ollama is unavailable', async () => {
    // Expected: connection failures are surfaced as a user-facing error message.
    const shownErrors: string[] = [];

    await runTranslateSelection({
      selectedText: 'network failure example',
      translateToKorean: async () => {
        throw new OllamaServiceError('connection_failed', 'offline');
      },
      showInformationMessage: async () => undefined,
      showErrorMessage: async (message: string) => {
        shownErrors.push(message);
      },
    });

    assert.deepStrictEqual(shownErrors, ['Frilingo: Failed to connect to Ollama.']);
  });
});
