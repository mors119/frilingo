import { FRILINGO_MESSAGES } from '../../../shared/constants/messages';
import { TranslationResult } from '../types/translation';
import { OllamaServiceError } from '../../ollama/types/ollama';

export type TranslateSelectionCoreDependencies = {
  selectedText: string | undefined;
  translateToKorean: (text: string) => Promise<TranslationResult>;
  showInformationMessage: (message: string) => Promise<unknown> | unknown;
  showErrorMessage: (message: string) => Promise<unknown> | unknown;
  isCancelled?: () => boolean;
  onTranslationResult?: (sourceText: string, result: TranslationResult) => void;
  onTranslationError?: (sourceText: string, errorMessage: string) => void;
};

// Runs the shared translation flow used by both selection and hover entry points.
export async function runTranslateSelection(
  dependencies: TranslateSelectionCoreDependencies,
): Promise<void> {
  const selectedText = dependencies.selectedText?.trim();

  if (!selectedText) {
    await dependencies.showInformationMessage(FRILINGO_MESSAGES.noTextSelected);
    return;
  }

  try {
    const translation = await dependencies.translateToKorean(selectedText);

    // Ignores stale model results after the user explicitly cancels the progress notification.
    if (dependencies.isCancelled?.()) {
      return;
    }

    dependencies.onTranslationResult?.(selectedText, translation);
    await dependencies.showInformationMessage(
      FRILINGO_MESSAGES.translatedResult(translation.text),
    );
  } catch (error) {
    // Ignores late failures after the user has already canceled the translation request.
    if (dependencies.isCancelled?.()) {
      return;
    }

    if (error instanceof OllamaServiceError) {
      if (error.code === 'connection_failed') {
        dependencies.onTranslationError?.(
          selectedText,
          FRILINGO_MESSAGES.failedToConnectToOllama,
        );
        await dependencies.showErrorMessage(FRILINGO_MESSAGES.failedToConnectToOllama);
        return;
      }

      if (error.code === 'invalid_response') {
        dependencies.onTranslationError?.(
          selectedText,
          FRILINGO_MESSAGES.invalidOllamaResponse,
        );
        await dependencies.showErrorMessage(FRILINGO_MESSAGES.invalidOllamaResponse);
        return;
      }
    }

    dependencies.onTranslationError?.(selectedText, FRILINGO_MESSAGES.translationFailed);
    await dependencies.showErrorMessage(FRILINGO_MESSAGES.translationFailed);
  }
}
