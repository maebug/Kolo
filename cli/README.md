# Kolo CLI

A command-line tool for converting Open WebUI chat exports into training datasets for AI fine-tuning.

## Getting Started

### 1. [Install Docker or Docker Desktop](https://docs.docker.com/get-docker/)

### 2. [Download the Kolo CLI binary](https://github.com/maebug/kolo/releases)

Download the latest release from the [releases page](https://github.com/maebug/kolo/releases) for your platform. You may use the binary directly without any additional setup, or you can add it to your PATH for easier access.

### 3. Initialize Kolo

Run the following command to initialize Kolo:

```bash
kolo init
```

## Usage

### Help

For a list of all available commands, run:

```bash
kolo help
```

A summary of the available commands is shown below:

### Basic Conversion

Convert a chat export to a training dataset:

```bash
kolo convert chat-output.json training-dataset.json
```

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

### Custom configuration

You can modify certain certain aspects of the docker configuration, files that are copied, and more by setting up a custom `.env` file.

Duplicate the `.env.example` file, rename it to `.env`, and modify it to suit your needs.

The default values used when building Kolo are displayed in the `.env.example` file.

### Building Kolo binaries

Here's how to build from source:

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
