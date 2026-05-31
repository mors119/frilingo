import * as assert from 'assert';

import { suite, test } from 'mocha';

import { parseOllamaListOutput } from '../services/ollamaCliService';

suite('Ollama CLI Service', () => {
  test('parses model names from standard ollama list output', () => {
    // Expected: each data row contributes its first column as the model name.
    const models = parseOllamaListOutput(
      [
        'NAME          ID              SIZE      MODIFIED',
        'qwen3:4b      abc123          2.6 GB    2 minutes ago',
        'exaone:latest def456          7.1 GB    1 hour ago',
      ].join('\n'),
    );

    assert.deepStrictEqual(models, ['qwen3:4b', 'exaone:latest']);
  });

  test('returns an empty list when ollama list has only the header', () => {
    // Expected: a header-only table means no local models are installed.
    const models = parseOllamaListOutput('NAME    ID    SIZE    MODIFIED');

    assert.deepStrictEqual(models, []);
  });
});
