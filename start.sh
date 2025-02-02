#!/bin/bash
set -e

echo "Running build tools"
chmod +x /build_tools.sh
/build_tools.sh

# Run start commands
echo "Starting Ollama..."

# Start Ollama
exec ollama serve