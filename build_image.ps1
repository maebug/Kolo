# Stop script on error
$ErrorActionPreference = "Stop"

# Build the Docker image
Write-Host "Building Docker image..."
docker build -t kolo .
