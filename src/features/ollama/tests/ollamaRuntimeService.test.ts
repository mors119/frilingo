import * as assert from 'assert';

import { suite, test } from 'mocha';

import {
  createDefaultRuntimeState,
  OllamaRuntimeService,
} from '../services/ollamaRuntimeService';

suite('Ollama Runtime Service', () => {
  test('starts in checking state before the first refresh', () => {
    // Expected: the runtime state is unknown until the first environment check runs.
    assert.deepStrictEqual(createDefaultRuntimeState(), {
      status: 'checking',
      models: [],
      configuredModel: 'gemma3:4b',
    });
  });

  test('returns cli_missing when the ollama binary is unavailable', async () => {
    // Expected: CLI lookup failure prevents the extension from exposing translation actions.
    const service = new OllamaRuntimeService(
      {
        getVersion: async () => {
          throw new Error('spawn ollama ENOENT');
        },
      },
      {} as never,
    );

    const state = await service.refreshState();

    assert.strictEqual(state.status, 'cli_missing');
    assert.strictEqual(state.configuredModel, 'gemma3:4b');
  });

  test('returns not_running when the server version check fails', async () => {
    // Expected: a reachable CLI with an unreachable server is treated as not running.
    const service = new OllamaRuntimeService(
      {
        getVersion: async () => 'ollama version 0.1.0',
      },
      {
        version: async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
        },
        list: async () => ({ models: [] }),
      } as never,
    );

    const state = await service.refreshState();

    assert.strictEqual(state.status, 'not_running');
    assert.strictEqual(state.configuredModel, 'gemma3:4b');
  });

  test('returns no_model when the configured model is not installed', async () => {
    // Expected: the extension can suggest a pull action when the server is ready but the model is missing.
    const service = new OllamaRuntimeService(
      {
        getVersion: async () => 'ollama version 0.1.0',
      },
      {
        version: async () => ({ version: '0.1.0' }),
        list: async () => ({
          models: [{ name: 'exaone:latest' }],
        }),
      } as never,
    );

    const state = await service.refreshState();

    assert.strictEqual(state.status, 'no_model');
    assert.deepStrictEqual(state.models, ['exaone:latest']);
    assert.strictEqual(state.configuredModel, 'gemma3:4b');
  });

  test('returns ready when the configured model is installed', async () => {
    // Expected: hover translation becomes available only after the target model is present.
    const service = new OllamaRuntimeService(
      {
        getVersion: async () => 'ollama version 0.1.0',
      },
      {
        version: async () => ({ version: '0.1.0' }),
        list: async () => ({
          models: [{ name: 'gemma3:4b' }],
        }),
      } as never,
    );

    const state = await service.refreshState();

    assert.strictEqual(state.status, 'ready');
    assert.deepStrictEqual(state.models, ['gemma3:4b']);
    assert.strictEqual(state.configuredModel, 'gemma3:4b');
  });
});
