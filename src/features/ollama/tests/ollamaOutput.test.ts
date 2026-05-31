import * as assert from 'assert';

import { suite, test } from 'mocha';

import {
  extractLatestPullStatus,
  stripAnsiControlSequences,
} from '../services/ollamaOutput';

suite('Ollama Output', () => {
  test('strips ansi control sequences from raw pull output', () => {
    // Expected: terminal escape sequences are removed before UI text is shown inside VSCode.
    const cleaned = stripAnsiControlSequences(
      '\u001b[?25lpulling manifest \u001b[K',
    );

    assert.strictEqual(cleaned, 'pulling manifest ');
  });

  test('extracts the latest readable pull status from a raw chunk', () => {
    // Expected: noisy multi-line pull chunks collapse into one final progress line for notification updates.
    const latestStatus = extractLatestPullStatus(
      [
        '\u001b[1Gpulling manifest \u001b[K',
        'pulling aeda25e63ebd:  11% ▕█                 ▏ 364 MB/3.3 GB   32 MB/s   1m31s\u001b[K',
      ].join('\n'),
    );

    assert.strictEqual(
      latestStatus,
      'pulling aeda25e63ebd:  11% ▕█                 ▏ 364 MB/3.3 GB   32 MB/s   1m31s',
    );
  });
});
