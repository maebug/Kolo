# Stop script on error
$ErrorActionPreference = "Stop"

# Build the Docker image without cache
Write-Host "Building Docker image..."
docker build --no-cache -t kolo .

# Run the container
Write-Host "Running Docker container..."
docker run -it --rm kolo
