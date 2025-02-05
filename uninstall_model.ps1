# Usage Example:
# .\remove_model.ps1 "my_model_name"

param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ModelName  # The name of the model to remove (always the first argument)
)

# Define container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Execute the Ollama remove command inside the container
try {
    Write-Host "Removing Ollama model '$ModelName' inside container '$ContainerName'..."
    docker exec -it $ContainerName ollama rm $ModelName

    if ($?) {
        Write-Host "Ollama model '$ModelName' removed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to remove Ollama model." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}
