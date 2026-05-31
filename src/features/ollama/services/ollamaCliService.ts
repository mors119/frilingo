import { spawn } from 'child_process';

// Describes the parsed result of an `ollama list` call.
export interface OllamaModelListResult {
  models: string[];
  rawOutput: string;
}

// Parses the standard `ollama list` table output into model names.
export function parseOllamaListOutput(output: string): string[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => line.split(/\s+/)[0])
    .filter((model): model is string => Boolean(model));
}

type OllamaCliCommandResult = {
  stdout: string;
  stderr: string;
};

type OllamaCliCommandOptions = {
  onOutput?: (chunk: string) => void;
};

// Wraps the Ollama CLI so extension code can inspect and manage local models.
export class OllamaCliService {
  // Resolves the Ollama binary through the current shell PATH before other CLI actions run.
  private resolveCommandPath(): Promise<string> {
    return new Promise((resolve, reject) => {
      const shell = process.env.SHELL || '/bin/sh';
      const child = spawn(shell, ['-lc', 'command -v ollama']);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        const resolvedPath = stdout.trim();

        if (code === 0 && resolvedPath) {
          resolve(resolvedPath);
          return;
        }

        reject(new Error(stderr.trim() || 'ollama command was not found in PATH'));
      });
    });
  }

  // Runs a plain Ollama CLI command and captures both stdout and stderr.
  private runCommand(
    args: string[],
    options: OllamaCliCommandOptions = {},
  ): Promise<OllamaCliCommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('ollama', args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer | string) => {
        const text = chunk.toString();

        stdout += text;
        options.onOutput?.(text);
      });

      child.stderr.on('data', (chunk: Buffer | string) => {
        const text = chunk.toString();

        stderr += text;
        options.onOutput?.(text);
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error(stderr.trim() || `ollama exited with code ${String(code)}`));
      });
    });
  }

  // Reads the locally installed Ollama models from the CLI table output.
  public async listModels(): Promise<OllamaModelListResult> {
    const result = await this.runCommand(['list']);

    return {
      models: parseOllamaListOutput(result.stdout),
      rawOutput: result.stdout.trim(),
    };
  }

  // Verifies that the Ollama CLI binary is available in the current environment.
  public async getVersion(): Promise<string> {
    await this.resolveCommandPath();

    const result = await this.runCommand(['--version']);

    return [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  }

  // Starts the Ollama server process only when the user explicitly asks for it.
  public async startServer(): Promise<void> {
    await this.resolveCommandPath();

    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });

    child.unref();
  }

  // Pulls one model through the Ollama CLI and returns raw CLI output for logging.
  public async pullModel(
    model: string,
    options: OllamaCliCommandOptions = {},
  ): Promise<string> {
    const result = await this.runCommand(['pull', model], options);

    return [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  }
}
