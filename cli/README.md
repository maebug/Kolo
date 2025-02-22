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

### Technology Stack

- **Deno**: JavaScript runtime and toolchain
- **TypeScript**: Programming language
- **Commander.js**: CLI framework
- **Ajv**: JSON Schema validator

### Prerequisites

- [Deno](https://deno.com/) runtime installed

### Installation

Install dependencies:

```bash
deno install
```

Run Kolo commands using Deno:

```bash
deno run kolo help
```

### Building Kolo binaries

The project uses Deno for development and packaging. Here's how to build from source:

#### Building for all platforms

```
deno run package
```

#### Building for a specific platform

```bash
deno run package:<platform>
```

Valid platforms are `linux`, `linux64`, `mac`, `mac64`, and `win`.

#### Output

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

## License

Apache-2.0
