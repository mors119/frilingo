# Frilingo

Frilingo is a VS Code extension that translates code annotations, comments, and selected text using local AI models powered by Ollama.

The project aims to provide privacy-friendly and offline-first translation directly inside VS Code without requiring cloud APIs.

## Features

### Translate Selected Text

Translate the current editor selection using a local Ollama model.

### Translate Comments and Annotations

Quickly translate documentation, comments, and annotations without leaving the editor.

### Local AI Models

Use local models through Ollama.

Examples:

- gemma3:4b
- qwen3:4b
- llama3.1

### Ollama Integration

Manage local models directly from VS Code.

- Start Ollama
- List installed models
- Pull recommended models
- Check runtime status

## Requirements

### Install Ollama

Download and install Ollama:

https://ollama.com/download

### Pull a Model

Example:

```bash
ollama pull gemma3:4b
```

## Development

Install dependencies:

```bash
npm install
```

Run type checking:

```bash
npm run check-types
```

Run lint:

```bash
npm run lint
```

Run smoke test:

```bash
npm run test:ollama
```

## Roadmap

- [x] Ollama integration
- [x] Selection translation
- [x] Model management
- [ ] Hover translation
- [ ] Inline replacement
- [ ] Multiple language support
- [ ] Translation caching
- [ ] User settings

## Known Issues

Some reasoning-oriented models may generate explanations instead of direct translations.

For translation-focused workflows, models such as gemma3 are recommended.

## License

MIT
