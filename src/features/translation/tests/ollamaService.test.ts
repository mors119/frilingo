import * as assert from 'assert';

import { suite, test } from 'mocha';
import { GenerateRequest, Ollama } from 'ollama';

import { OLLAMA_CONFIG } from '../../../shared/config/ollama';
import {
  buildFallbackTranslationPrompt,
  buildTranslationPrompt,
  OllamaService,
} from '../services/ollamaService';
import { OllamaServiceError } from '../../ollama/types/ollama';

suite('Ollama Service', () => {
  test('builds a prompt with the selected text and target language placeholders resolved', () => {
    // Expected: the runtime prompt keeps the <text> wrapper and injects both dynamic values.
    const sourceText = 'match expression must be exhaustive';
    const prompt = buildTranslationPrompt(
      sourceText,
      OLLAMA_CONFIG.targetLanguage,
    );

    assert.ok(prompt.includes(OLLAMA_CONFIG.targetLanguage));
    assert.ok(prompt.includes('<text>'));
    assert.ok(prompt.includes(sourceText));
    assert.ok(prompt.includes('</text>'));
  });

  test('sends the expected Ollama generate request for translation', async () => {
    // Expected: the service sends one primary generate request with the configured prompt and limits.
    const requests: GenerateRequest[] = [];
    const client = {
      generate: async (request: GenerateRequest & { stream?: false }) => {
        requests.push(request);

        return {
          response: '번역 결과',
        } as never;
      },
    } as unknown as Pick<Ollama, 'generate'>;

    const service = new OllamaService(client);
    const translation = await service.translateToKorean('hello world');

    assert.deepStrictEqual(translation, {
      model: OLLAMA_CONFIG.model,
      text: '번역 결과',
      totalDurationNs: undefined,
      loadDurationNs: undefined,
      promptEvalCount: undefined,
      evalCount: undefined,
      usedFallbackPrompt: false,
    });
    assert.strictEqual(requests.length, 1);
    assert.strictEqual(requests[0]?.model, OLLAMA_CONFIG.model);
    assert.strictEqual(requests[0]?.think, OLLAMA_CONFIG.generate.think);
    assert.strictEqual(
      requests[0]?.keep_alive,
      OLLAMA_CONFIG.generate.keep_alive,
    );
    assert.strictEqual(requests[0]?.stream, false);
    assert.ok(requests[0]?.prompt?.includes('hello world'));
    assert.deepStrictEqual(requests[0]?.options, OLLAMA_CONFIG.generate.options);
  });

  test('returns the first non-empty response without forcing a fallback retry', async () => {
    // Expected: any non-empty model output is returned so the user can verify end-to-end behavior first.
    const requests: GenerateRequest[] = [];
    const client = {
      generate: async (request: GenerateRequest & { stream?: false }) => {
        requests.push(request);

        return {
          response: "Okay, let's tackle this translation request.",
        } as never;
      },
    } as unknown as Pick<Ollama, 'generate'>;

    const service = new OllamaService(client);
    const translation = await service.translateToKorean('hello world');

    assert.strictEqual(requests.length, 1);
    assert.deepStrictEqual(translation, {
      model: OLLAMA_CONFIG.model,
      text: "Okay, let's tackle this translation request.",
      totalDurationNs: undefined,
      loadDurationNs: undefined,
      promptEvalCount: undefined,
      evalCount: undefined,
      usedFallbackPrompt: false,
    });
  });

  test('throws an invalid response error when Ollama returns no text', async () => {
    // Expected: blank model output is rejected instead of shown to the user.
    const client = {
      generate: async () =>
        ({
          response: '   ',
        }) as never,
    } as unknown as Pick<Ollama, 'generate'>;
    const service = new OllamaService(client);

    await assert.rejects(
      async () => service.translateToKorean('hello world'),
      (error: unknown) =>
        error instanceof OllamaServiceError &&
        error.code === 'invalid_response',
    );
  });

  test('retries with the fallback prompt after a blank primary response', async () => {
    // Expected: a blank primary response triggers one fallback request before the service gives up.
    const requests: GenerateRequest[] = [];
    const client = {
      generate: async (request: GenerateRequest & { stream?: false }) => {
        requests.push(request);

        if (requests.length === 1) {
          return {
            response: '   ',
          } as never;
        }

        return {
          response: '경계선의 총 길이는 약 400입니다.',
        } as never;
      },
    } as unknown as Pick<Ollama, 'generate'>;
    const service = new OllamaService(client);

    const translation = await service.translateToKorean('hello world');

    assert.strictEqual(requests.length, 2);
    assert.strictEqual(
      requests[1]?.prompt,
      buildFallbackTranslationPrompt(
        'hello world',
        OLLAMA_CONFIG.targetLanguage,
      ),
    );
    assert.deepStrictEqual(translation, {
      model: OLLAMA_CONFIG.model,
      text: '경계선의 총 길이는 약 400입니다.',
      totalDurationNs: undefined,
      loadDurationNs: undefined,
      promptEvalCount: undefined,
      evalCount: undefined,
      usedFallbackPrompt: true,
    });
  });

  test('throws a connection error when the ollama client request fails', async () => {
    // Expected: low-level client failures are mapped to the extension connection error.
    const client = {
      generate: async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
      },
    } as unknown as Pick<Ollama, 'generate'>;
    const service = new OllamaService(client);

    await assert.rejects(
      async () => service.translateToKorean('hello world'),
      (error: unknown) =>
        error instanceof OllamaServiceError &&
        error.code === 'connection_failed',
    );
  });

  test('uses the configured fixed generation options for every request', () => {
    // Expected: the shared Ollama defaults stay centralized in the config module.
    assert.deepStrictEqual(OLLAMA_CONFIG.generate.options, {
      num_ctx: 2048,
      num_predict: 512,
      temperature: 0,
      top_p: 0.1,
      repeat_penalty: 1.05,
    });
  });
});
