# Stop script on error
$ErrorActionPreference = "Stop"

# Build the Docker image using dockerfile-amd
Write-Host "Building Docker image using dockerfile-amd..."
docker build -t kolo -f dockerfile-amd .