#!/bin/bash
set -e  # Exit immediately if a command fails

# Check if Ollama is installed and executable
if ! command -v ollama >/dev/null 2>&1; then
    echo "Error: Ollama is not installed or not in PATH!"
    exit 1
fi

echo "Starting Ollama server..."
exec ollama serve
