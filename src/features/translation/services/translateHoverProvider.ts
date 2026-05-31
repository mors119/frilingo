import * as vscode from 'vscode';

import { OllamaRuntimeService } from '../../ollama/services/ollamaRuntimeService';
import { extractTranslatableHoverText } from './hoverText';

function createCommandHover(markdownText: string): vscode.Hover {
  const markdown = new vscode.MarkdownString(markdownText);

  markdown.isTrusted = true;

  return new vscode.Hover(markdown);
}

// Shows translation actions only when Ollama is actually ready for the configured model.
export function createTranslateHoverProvider(
  runtimeService: Pick<OllamaRuntimeService, 'getState' | 'refreshState'>,
): vscode.HoverProvider {
  return {
    async provideHover(document, position) {
      const diagnostics = vscode.languages.getDiagnostics(document.uri).map((diagnostic) => ({
        message: diagnostic.message,
        range: {
          start: {
            line: diagnostic.range.start.line,
            character: diagnostic.range.start.character,
          },
          end: {
            line: diagnostic.range.end.line,
            character: diagnostic.range.end.character,
          },
        },
      }));
      const hoverText = extractTranslatableHoverText(document, position, diagnostics);

      if (!hoverText) {
        return undefined;
      }

      const cachedState = runtimeService.getState();
      const runtimeState =
        cachedState.status === 'checking'
          ? await runtimeService.refreshState()
          : cachedState;

      if (runtimeState.status === 'cli_missing') {
        return createCommandHover(
          '[Frilingo: Ollama CLI is not available. Show install guidance](command:frilingo.showOllamaModels)',
        );
      }

      if (runtimeState.status === 'not_running') {
        return createCommandHover(
          [
            '[Start Ollama with Frilingo](command:frilingo.startOllama)',
            '',
            '[Show local Ollama status](command:frilingo.showOllamaModels)',
          ].join('\n'),
        );
      }

      if (runtimeState.status === 'no_model') {
        return createCommandHover(
          [
            `[Pull ${runtimeState.configuredModel} with Frilingo](command:frilingo.pullRecommendedModel)`,
            '',
            '[Show local Ollama models](command:frilingo.showOllamaModels)',
          ].join('\n'),
        );
      }

      if (runtimeState.status !== 'ready') {
        return undefined;
      }

      return createCommandHover(
        `[Translate with Frilingo](command:frilingo.translateText?${encodeURIComponent(
          JSON.stringify([hoverText]),
        )})`,
      );
    },
  };
}
