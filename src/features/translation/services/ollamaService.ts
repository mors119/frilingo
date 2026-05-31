import { GenerateRequest, Ollama } from 'ollama';

import { FrilingoOllamaConfig, OLLAMA_CONFIG } from '../../../shared/config/ollama';
import { TranslationResult } from '../types/translation';
import { OllamaServiceError } from '../../ollama/types/ollama';

// Builds the primary generate prompt with both the instruction and selected text.
export function buildTranslationPrompt(
  selectedText: string,
  targetLanguage: string,
): string {
  return OLLAMA_CONFIG.promptTemplate
    .replace('{{targetLanguage}}', targetLanguage)
    .replace('{{selectedText}}', selectedText);
}

// Builds a shorter fallback generate prompt for models that ignore the primary instruction.
export function buildFallbackTranslationPrompt(
  selectedText: string,
  targetLanguage: string,
): string {
  return [
    `Translate to ${targetLanguage}.`,
    'Output only translated text.',
    'Do not explain.',
    'Do not analyze.',
    'Do not reason.',
    '',
    selectedText,
  ].join('\n');
}

// Removes common reasoning / wrapper text produced by local models.
function cleanTranslationText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^Translation:\s*/i, '')
    .replace(/^Translated text:\s*/i, '')
    .trim();
}

export class OllamaService {
  private readonly client: Pick<Ollama, 'generate'>;
  private readonly getConfig: () => FrilingoOllamaConfig;

  // Accepts a minimal Ollama client so tests can inject a stable fake implementation.
  public constructor(
    client?: Pick<Ollama, 'generate'>,
    getConfig: () => FrilingoOllamaConfig = () => OLLAMA_CONFIG,
  ) {
    this.getConfig = getConfig;
    this.client = client ?? new Ollama({ host: this.getConfig().host });
  }

  // Extracts and cleans the model output before returning it to the extension.
  private extractTranslationText(response: {
    response?: string;
  }): string | undefined {
    const translatedText = response.response;

    if (!translatedText) {
      return undefined;
    }

    const cleaned = cleanTranslationText(translatedText);

    if (!cleaned) {
      return undefined;
    }

    return cleaned;
  }

  // Creates the shared generate request body so both primary and fallback prompts reuse the same options.
  private buildGenerateRequest(
    prompt: string,
  ): GenerateRequest & { stream: false } {
    const config = this.getConfig();

    return {
      model: config.model,
      prompt,
      think: config.generate.think,
      keep_alive: config.generate.keep_alive,
      options: config.generate.options,
      stream: false,
    };
  }

  // Sends a single non-streaming generate translation request to the configured Ollama model.
  public async translateToKorean(text: string): Promise<TranslationResult> {
    const config = this.getConfig();

    try {
      const primaryResponse = await this.client.generate(
        this.buildGenerateRequest(
          buildTranslationPrompt(text, config.targetLanguage),
        ),
      );

      const primaryTranslation = this.extractTranslationText(primaryResponse);

      if (primaryTranslation) {
        return {
          model: config.model,
          text: primaryTranslation,
          totalDurationNs: primaryResponse.total_duration,
          loadDurationNs: primaryResponse.load_duration,
          promptEvalCount: primaryResponse.prompt_eval_count,
          evalCount: primaryResponse.eval_count,
          usedFallbackPrompt: false,
        };
      }

      const fallbackResponse = await this.client.generate(
        this.buildGenerateRequest(
          buildFallbackTranslationPrompt(text, config.targetLanguage),
        ),
      );

      const fallbackTranslation = this.extractTranslationText(fallbackResponse);

      if (!fallbackTranslation) {
        throw new OllamaServiceError(
          'invalid_response',
          'Ollama returned an invalid response.',
        );
      }

      return {
        model: config.model,
        text: fallbackTranslation,
        totalDurationNs: fallbackResponse.total_duration,
        loadDurationNs: fallbackResponse.load_duration,
        promptEvalCount: fallbackResponse.prompt_eval_count,
        evalCount: fallbackResponse.eval_count,
        usedFallbackPrompt: true,
      };
    } catch (error) {
      if (error instanceof OllamaServiceError) {
        throw error;
      }

      throw new OllamaServiceError(
        'connection_failed',
        `Failed to connect to Ollama: ${String(error)}`,
      );
    }
  }
}
