# Stop script on error
$ErrorActionPreference = "Stop"

# Run the container
Write-Host "Running Docker container..."
docker volume create kolo_volume
docker run --gpus all -p 2222:22 -p 8080:8080 -v kolo_volume:/var/kolo_data -it -d --name kolo_container kolo