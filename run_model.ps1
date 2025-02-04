# Usage Example:
# .\run_model.ps1 "my_model_name" -o "custom_outputs" -m "Q4_K_M"
# If -o and -m are not provided, they default to "outputs" and "" respectively.

param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ModelName, # The name of the model to create (always the first argument)
    [string]$OutputDir = "outputs", # The path to the outputs folder (default: "outputs")
    [string]$Quantization = ""       # The model file extension (default: "")
)

# Define container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Construct the full path to the model file
$ModelFilePath = "/var/kolo_data/$OutputDir/Modelfile$Quantization"

# Execute the Ollama command inside the container
try {
    Write-Host "Creating Ollama model '$ModelName' using file '$ModelFilePath' inside container '$ContainerName'..."
    docker exec -it $ContainerName ollama create $ModelName -f $ModelFilePath

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