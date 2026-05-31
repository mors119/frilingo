import { ListResponse, Ollama, VersionResponse } from 'ollama';

import { FrilingoOllamaConfig, OLLAMA_CONFIG } from '../../../shared/config/ollama';
import { OllamaCliService } from './ollamaCliService';

export type OllamaRuntimeStatus =
  | 'checking'
  | 'cli_missing'
  | 'not_running'
  | 'no_model'
  | 'ready';

export interface OllamaRuntimeState {
  status: OllamaRuntimeStatus;
  models: string[];
  configuredModel: string;
  cliVersion?: string;
  serverVersion?: string;
  errorMessage?: string;
}

export function createDefaultRuntimeState(
  configuredModel: string = OLLAMA_CONFIG.model,
): OllamaRuntimeState {
  return {
    status: 'checking',
    models: [],
    configuredModel,
  };
}

type OllamaRuntimeClient = Pick<Ollama, 'version' | 'list'>;

// Resolves the current Ollama readiness so UI entry points can react before failing.
export class OllamaRuntimeService {
  private state: OllamaRuntimeState = createDefaultRuntimeState();
  private readonly listeners = new Set<(state: OllamaRuntimeState) => void>();

  public constructor(
    private readonly cliService: Pick<OllamaCliService, 'getVersion'>,
    private readonly client: OllamaRuntimeClient = new Ollama({ host: OLLAMA_CONFIG.host }),
    private readonly getConfig: () => FrilingoOllamaConfig = () => OLLAMA_CONFIG,
  ) {}

  // Returns the latest cached runtime state without performing network or CLI work.
  public getState(): OllamaRuntimeState {
    return this.state;
  }

  // Subscribes to runtime state changes so UI components can stay in sync.
  public onDidChangeState(
    listener: (state: OllamaRuntimeState) => void,
  ): { dispose: () => void } {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  // Broadcasts the latest cached state to any UI listeners.
  private emitState(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // Refreshes the runtime state by checking the CLI, server, and configured model.
  public async refreshState(): Promise<OllamaRuntimeState> {
    const config = this.getConfig();
    let cliVersion: string;

    try {
      cliVersion = await this.cliService.getVersion();
    } catch (error) {
      this.state = {
        status: 'cli_missing',
        models: [],
        configuredModel: config.model,
        errorMessage: String(error),
      };
      this.emitState();

      return this.state;
    }

    let serverVersion: VersionResponse;
    let listResponse: ListResponse;

    try {
      [serverVersion, listResponse] = await Promise.all([
        this.client.version(),
        this.client.list(),
      ]);
    } catch (error) {
      this.state = {
        status: 'not_running',
        models: [],
        configuredModel: config.model,
        cliVersion,
        errorMessage: String(error),
      };
      this.emitState();

      return this.state;
    }

    const models = listResponse.models.map((model) => model.name);
    const status = models.includes(config.model) ? 'ready' : 'no_model';

    this.state = {
      status,
      models,
      configuredModel: config.model,
      cliVersion,
      serverVersion: String(serverVersion.version),
    };
    this.emitState();

    return this.state;
  }
}
