import * as assert from 'assert';

import { suite, test } from 'mocha';

import {
  formatOllamaStatusBarText,
  formatOllamaStatusBarTooltip,
} from '../services/statusBar';

suite('Status Bar', () => {
  test('formats the ready state with the configured model name', () => {
    // Expected: the ready label clearly shows the configured model for quick confirmation.
    assert.strictEqual(
      formatOllamaStatusBarText({
        status: 'ready',
        models: ['gemma3:4b'],
        configuredModel: 'gemma3:4b',
      }),
      '$(check) Frilingo: gemma3:4b Ready',
    );
  });

  test('formats the no_model tooltip with the next suggested action', () => {
    // Expected: the tooltip points the user toward pulling the configured model.
    assert.strictEqual(
      formatOllamaStatusBarTooltip({
        status: 'no_model',
        models: [],
        configuredModel: 'gemma3:4b',
      }),
      'Configured model gemma3:4b is missing. Click to inspect or pull models.',
    );
  });
});
