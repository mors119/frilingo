import * as assert from 'assert';

import { suite, test } from 'mocha';

import { extractTranslatableHoverText } from '../services/hoverText';

function createDocument(lineText: string) {
  return {
    lineAt: () => ({ text: lineText }),
  };
}

suite('Hover Text Extraction', () => {
  test('extracts a diagnostic message before code text', () => {
    const document = createDocument('const x = foo();');
    const diagnostics = [
      {
        message: 'Cannot find name foo',
        range: {
          start: { line: 0, character: 10 },
          end: { line: 0, character: 13 },
        },
      },
    ];

    const result = extractTranslatableHoverText(
      document,
      { line: 0, character: 11 },
      diagnostics,
    );

    assert.strictEqual(result, 'Cannot find name foo');
  });

  test('extracts inline comment text', () => {
    const document = createDocument('const value = 1; // important warning');

    const result = extractTranslatableHoverText(
      document,
      { line: 0, character: 22 },
      [],
    );

    assert.strictEqual(result, 'important warning');
  });

  test('extracts string literal text', () => {
    const document = createDocument('throw new Error("match expression must be exhaustive");');

    const result = extractTranslatableHoverText(
      document,
      { line: 0, character: 20 },
      [],
    );

    assert.strictEqual(result, 'match expression must be exhaustive');
  });

  test('returns undefined for ordinary code', () => {
    const document = createDocument('const result = left + right;');

    const result = extractTranslatableHoverText(
      document,
      { line: 0, character: 8 },
      [],
    );

    assert.strictEqual(result, undefined);
  });
});
