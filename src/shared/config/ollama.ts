import type { Config, GenerateRequest } from 'ollama';
import { TRANSLATION_PROMPT_TEMPLATE } from '../../features/translation/prompts/translationPrompt';

// Defines the default model retention window.
// TODO: Replace this with a user setting once per-user Ollama preferences are supported.
const DEFAULT_KEEP_ALIVE: NonNullable<GenerateRequest['keep_alive']> = 0;

// Defines the default context window for short translation requests.
// TODO: Replace this with a user setting once per-user Ollama preferences are supported.
const DEFAULT_NUM_CTX = 2048;

// Defines the default output budget for a single translation response.
// TODO: Replace this with a user setting once per-user Ollama preferences are supported.
const DEFAULT_NUM_PREDICT = 512;

// Defines the recommended default Ollama model for the Frilingo MVP.
// TODO: Replace this with a richer model recommendation system once multiple presets are supported.
export const DEFAULT_OLLAMA_MODEL: GenerateRequest['model'] = 'gemma3:4b';

// Defines the default deterministic sampling temperature for translation.
// TODO: Replace this with a user setting once per-user Ollama preferences are supported.
const DEFAULT_TEMPERATURE = 0;

// Disables chain-of-thought style reasoning for faster, direct translation output.
// TODO: Replace this with a user setting once per-user Ollama preferences are supported.
const DEFAULT_THINK = false;

export type FrilingoOllamaConfig = {
  host: NonNullable<Config['host']>;
  model: GenerateRequest['model'];
  targetLanguage: string;
  promptTemplate: string;
  generate: Pick<GenerateRequest, 'think' | 'keep_alive' | 'options'>;
};

type FrilingoSettingsReader = {
  get<T>(section: string, defaultValue: T): T;
};

// Builds the runtime config from defaults plus any VSCode setting overrides.
export function createOllamaConfig(
  settings?: FrilingoSettingsReader,
): FrilingoOllamaConfig {
  return {
    host: 'http://localhost:11434',
    model:
      settings?.get('ollamaModel', DEFAULT_OLLAMA_MODEL) ??
      DEFAULT_OLLAMA_MODEL,
    targetLanguage: 'Korean',
    // Keeps the primary translation prompt in one runtime-safe source file.
    promptTemplate: TRANSLATION_PROMPT_TEMPLATE,
    // Defines the default non-streaming generate options used by the MVP translation flow.
    generate: {
      think: DEFAULT_THINK,
      keep_alive: DEFAULT_KEEP_ALIVE,
      options: {
        num_ctx: DEFAULT_NUM_CTX,
        num_predict: DEFAULT_NUM_PREDICT,
        temperature: DEFAULT_TEMPERATURE,
        top_p: 0.1,
        repeat_penalty: 1.05,
      },
    },
  };
}

// Exposes the default runtime config for tests and non-VSCode entry points.
export const OLLAMA_CONFIG = createOllamaConfig();
