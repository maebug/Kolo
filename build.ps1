# Stop script on error
$ErrorActionPreference = "Stop"

# Build the Docker image
Write-Host "Building Docker image..."
docker build -t kolo .

# Run the container
Write-Host "Running Docker container..."
docker run -it --rm kolo
