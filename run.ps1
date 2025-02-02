# Stop script on error
$ErrorActionPreference = "Stop"

# Run the container
Write-Host "Running Docker container..."
docker run -it --rm kolo