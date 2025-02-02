#.\run_model.ps1 "model_name"

param (
    [string]$ModelName  # The name of the model to create
)

# Define container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Execute the Ollama command inside the container
try {
    Write-Host "Creating Ollama model '$ModelName' inside container '$ContainerName'..."
    docker exec -it $ContainerName ollama create $ModelName -f /var/kolo_data/outputs/Modelfile

    if ($?) {
        Write-Host "Ollama model '$ModelName' created successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to create Ollama model." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}
