export interface HoverTextPosition {
  line: number;
  character: number;
}

export interface HoverTextRange {
  start: HoverTextPosition;
  end: HoverTextPosition;
}

export interface HoverTextDiagnostic {
  message: string;
  range: HoverTextRange;
}

export interface HoverTextDocument {
  lineAt(line: number): { text: string };
}

function isPositionWithinRange(position: HoverTextPosition, range: HoverTextRange): boolean {
  if (position.line < range.start.line || position.line > range.end.line) {
    return false;
  }

  if (position.line === range.start.line && position.character < range.start.character) {
    return false;
  }

  if (position.line === range.end.line && position.character > range.end.character) {
    return false;
  }

  return true;
}

function extractCommentText(lineText: string, positionCharacter: number): string | undefined {
  const commentPrefixes = ['//', '#'];

  for (const prefix of commentPrefixes) {
    const commentIndex = lineText.indexOf(prefix);
    if (commentIndex >= 0 && positionCharacter >= commentIndex) {
      return lineText.slice(commentIndex + prefix.length).trim();
    }
  }

  return undefined;
}

function extractBlockCommentText(
  lineText: string,
  positionCharacter: number,
): string | undefined {
  const startIndex = lineText.indexOf('/*');

  if (startIndex < 0 || positionCharacter < startIndex) {
    return undefined;
  }

  const endIndex = lineText.indexOf('*/', startIndex + 2);
  const commentEnd = endIndex >= 0 ? endIndex : lineText.length;

  if (positionCharacter > commentEnd) {
    return undefined;
  }

  return lineText
    .slice(startIndex + 2, commentEnd)
    .replace(/^\*+/, '')
    .trim();
}

function extractStringLiteralText(
  lineText: string,
  positionCharacter: number,
): string | undefined {
  const quoteCharacters = [`'`, `"`, '`'];

  for (const quoteCharacter of quoteCharacters) {
    const startIndex = lineText.lastIndexOf(quoteCharacter, positionCharacter);

    if (startIndex < 0) {
      continue;
    }

    const endIndex = lineText.indexOf(quoteCharacter, startIndex + 1);

    if (endIndex < 0 || positionCharacter > endIndex) {
      continue;
    }

    return lineText.slice(startIndex + 1, endIndex).trim();
  }

  return undefined;
}

export function extractTranslatableHoverText(
  document: HoverTextDocument,
  position: HoverTextPosition,
  diagnostics: readonly HoverTextDiagnostic[],
): string | undefined {
  const diagnosticMessage = diagnostics.find((diagnostic) =>
    isPositionWithinRange(position, diagnostic.range),
  )?.message.trim();

  if (diagnosticMessage) {
    return diagnosticMessage;
  }

  const lineText = document.lineAt(position.line).text;
  const blockCommentText = extractBlockCommentText(lineText, position.character);

  if (blockCommentText) {
    return blockCommentText;
  }

  const commentText = extractCommentText(lineText, position.character);

  if (commentText) {
    return commentText;
  }

  const stringLiteralText = extractStringLiteralText(lineText, position.character);

  if (stringLiteralText) {
    return stringLiteralText;
  }

  return undefined;
}
