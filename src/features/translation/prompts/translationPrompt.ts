// Stores the shared translation prompt in one runtime-safe module.
export const TRANSLATION_PROMPT_TEMPLATE = `
Translate the text inside <text> into {{targetLanguage}}.

Output only the translated text.

Rules:
- Do not explain.
- Do not analyze.
- Do not provide reasoning.
- Do not provide steps.
- Do not provide notes.
- Do not repeat the source text.
- Preserve Markdown.
- Preserve code blocks exactly.
- Preserve URLs.
- Preserve file paths.
- Preserve placeholders such as {{variable}}.
- Preserve line breaks.

<text>
{{selectedText}}
</text>
`.trim();
