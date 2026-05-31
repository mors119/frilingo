export type OllamaServiceErrorCode =
  | 'connection_failed'
  | 'request_failed'
  | 'invalid_response';

export class OllamaServiceError extends Error {
  public readonly code: OllamaServiceErrorCode;

  public constructor(code: OllamaServiceErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
