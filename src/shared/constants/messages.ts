// Centralizes user-facing copy so product wording can be updated in one place.
export const FRILINGO_MESSAGES = {
  noActiveEditor: 'Frilingo: No active editor.',
  noTextSelected: 'Frilingo: No text selected.',
  failedToConnectToOllama: 'Frilingo: Failed to connect to Ollama.',
  invalidOllamaResponse: 'Frilingo: Received an invalid response from Ollama.',
  translationFailed: 'Frilingo: Translation failed.',
  translationCancelled: 'Frilingo: Translation canceled.',
  translatedResult: (translation: string) => `Frilingo: ${translation}`,
} as const;
