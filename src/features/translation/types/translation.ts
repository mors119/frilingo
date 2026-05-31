// Describes the translation payload returned from the Ollama service layer.
export interface TranslationResult {
  model: string;
  text: string;
  totalDurationNs?: number;
  loadDurationNs?: number;
  promptEvalCount?: number;
  evalCount?: number;
  usedFallbackPrompt?: boolean;
}
