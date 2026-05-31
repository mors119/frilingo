import { suite, test } from 'mocha';

import assert from 'node:assert';

suite('Extension Test Suite', () => {
  test('exports the extension lifecycle functions', () => {
    // Expected: the extension entry module can be imported without running the VSCode host.
    const extensionModule = require('../extension') as {
      activate?: unknown;
      deactivate?: unknown;
    };

    assert.strictEqual(typeof extensionModule.activate, 'function');
    assert.strictEqual(typeof extensionModule.deactivate, 'function');
  });
});
