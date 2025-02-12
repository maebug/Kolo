# Kolo CLI

A command-line tool for converting Open WebUI chat exports into training datasets for AI fine-tuning.

## Setup

Download the latest release from the [releases page](https://github.com/maebug/kolo/releases) for your platform. You may use the binary directly without any additional setup, or you can add it to your PATH for easier access.

## Usage

### Basic Conversion

Convert a chat export to JSON format:

```bash
kolo convert input.json output.json
```

Convert to JSONL format:

```bash
kolo convert input.json output.jsonl
```

### Options

- `-f, --force`: Force overwrite existing files without prompting
- `-h, --help`: Display help information
- `-v, --version`: Display version information

## Input Format

The tool accepts Open WebUI chat exports in JSON format. These must conform to the schema defined in `schema/open-webui-chat-export.json`.

Example input structure:

```json
[
  {
    "id": "uuid",
    "chat": {
      "messages": [
        {
          "role": "user",
          "content": "Hello"
        },
        {
          "role": "assistant",
          "content": "Hi there!"
        }
      ]
    }
  }
]
```

## Output Formats

### JSON

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi there!"
    }
  ]
}
```

### JSONL

```jsonl
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi there!"
    }
  ]
}
```

## Development

This project was created using `bun init` in bun v1.2.2. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

### Project Structure

```
cli/
├── src/
│   ├── index.ts       # Entry point
│   ├── converter.ts   # Conversion logic
│   ├── validator.ts   # Schema validation
│   ├── cli.ts         # CLI utilities
│   └── types.ts       # TypeScript types
├── schema/
│   ├── dataset.json   # Output schema
│   └── open-webui-chat-export.json
└── package.json
```

### Technology Stack

- **Bun**: JavaScript runtime and toolchain
- **TypeScript**: Programming language
- **Commander.js**: CLI framework
- **Ajv**: JSON Schema validator

### Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Node.js 18+ (for development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cli

# Install dependencies
bun install
```

### Development Scripts

```bash
# Run the CLI directly through Bun
bun convert-cli convert <input> <output>

# Build TypeScript files
bun build

# Package binaries for all platforms
bun package

# Package for specific platforms
bun package:linux    # Linux x64
bun package:linux64  # Linux ARM64
bun package:mac      # macOS x64
bun package:mac64    # macOS ARM64
bun package:win      # Windows x64
bun package:win64    # Windows ARM64
```

### Building from Source

The project uses Bun for development and packaging. Here's how to build from source:

1. Build TypeScript files:

```bash
bun build
```

2. Package for your platform:

```bash
bun package:<platform>
```

Binaries will be output to the `bin` directory in the following structure:

```
bin/
├── linux/
│   └── kolo
├── linux64/
│   └── kolo
├── mac/
│   └── kolo
├── mac64/
│   └── kolo
└── win/
│   └── kolo.exe
```

**Note:** Windows ARM64 binaries are not currently supported. See [Bun documentation about supported targets](https://bun.sh/docs/bundler/executables#supported-targets).

## License

Apache-2.0
