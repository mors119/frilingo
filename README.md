# Frilingo

Translate code, errors, and documentation directly inside VSCode.

🚧 Early development stage

Frilingo helps developers understand code, error messages, comments, documentation, and technical content in their preferred language using local LLMs through Ollama.

## Features

### Translate Selected Text

Translate selected text directly inside VSCode.

```text
Select text
↓
Run command
↓
Receive translated result
```

### Generate Code Comments

Generate clear and readable code comments from selected code.

```ts
const count = map.entry(word).orInsert(0);
```

```ts
// Return the existing value for the key.
// Insert 0 when the key does not exist.
const count = map.entry(word).orInsert(0);
```

### Local LLM Support

Frilingo works with local models through Ollama.

Supported models include:

- EXAONE
- Qwen
- DeepSeek
- Any Ollama-compatible model

### Korean-First Workflow

Frilingo is designed for developers who frequently work with:

- English documentation
- Compiler errors
- Open source projects
- Technical discussions

## Roadmap

### v0.1

- Translate selected text
- Ollama integration
- EXAONE support

### v0.2

- Activity Bar panel
- Translation history

### v0.3

- Comment generation

### v0.4

- Multi-language support

### v1.0

- Marketplace release

## Requirements

- VSCode
- Node.js 22+
- Ollama

## Development

Install dependencies:

```bash
npm install
```

Run extension host:

```bash
F5
```

Build project:

```bash
npm run compile
```

## Contributing

Contributions are welcome.

Please read the contributing guide before submitting a pull request.

## License

MIT
