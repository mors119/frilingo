import { OLLAMA_CONFIG } from '../../../shared/config/ollama';
import {
  buildTranslationPrompt,
  OllamaService,
} from '../services/ollamaService';

// Uses a stable sample so local smoke runs can validate the real Ollama round trip quickly.
const DEFAULT_SOURCE_TEXT =
  'I am writing to follow up on our previous discussion.';

function formatDurationNs(durationNs: number | undefined): string {
  if (!durationNs || durationNs <= 0) {
    return 'n/a';
  }

  return `${(durationNs / 1_000_000_000).toFixed(2)}s`;
}

// Reads a manual smoke input from CLI args while keeping a predictable default for quick checks.
function getSourceText(): string {
  const cliText = process.argv.slice(2).join(' ').trim();

  if (cliText) {
    return cliText;
  }

  return DEFAULT_SOURCE_TEXT;
}

// Runs one real Ollama request and prints the prompt and response details for local debugging.
async function main(): Promise<void> {
  // Expected: the smoke run prints the active config so local model selection is easy to verify.
  const sourceText = getSourceText();
  const prompt = buildTranslationPrompt(
    sourceText,
    OLLAMA_CONFIG.targetLanguage,
  );
  const service = new OllamaService();

  console.log('[Frilingo][Smoke] Host:', OLLAMA_CONFIG.host);
  console.log('[Frilingo][Smoke] Model:', OLLAMA_CONFIG.model);
  console.log('[Frilingo][Smoke] Source:', sourceText);
  console.log(
    '[Frilingo][Smoke] Configured num_predict:',
    OLLAMA_CONFIG.generate.options?.num_predict ?? 'n/a',
  );
  console.log('[Frilingo][Smoke] Prompt:');
  console.log(prompt);
  console.log('');

  try {
    const result = await service.translateToKorean(sourceText);

    console.log('[Frilingo][Smoke] Response:');
    console.log(result.text);
    console.log('');
    console.log(
      '[Frilingo][Smoke] Load duration:',
      formatDurationNs(result.loadDurationNs),
    );
    console.log(
      '[Frilingo][Smoke] Total duration:',
      formatDurationNs(result.totalDurationNs),
    );
    console.log(
      '[Frilingo][Smoke] Prompt tokens:',
      result.promptEvalCount ?? 'n/a',
    );
    console.log('[Frilingo][Smoke] Output tokens:', result.evalCount ?? 'n/a');
    console.log(
      '[Frilingo][Smoke] Fallback prompt:',
      result.usedFallbackPrompt ? 'used' : 'not used',
    );
  } catch (error) {
    console.error('[Frilingo][Smoke] Error:', String(error));
    process.exitCode = 1;
  }
}

void main();
