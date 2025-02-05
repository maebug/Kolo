# Usage Example:
# .\run_model.ps1 "my_model_name" -m "Q4_K_M"
# If -m is not provided, it defaults to an empty string.

param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ModelName, # The name of the model to create
    [string]$OutputDir = "outputs", # The path to the outputs folder (default: "outputs")
    [string]$Quantization = ""  # Optional quantization string appended to the model file name
)

# Define the container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Construct the full path to the model file using the fixed directory
$ModelFilePath = "/var/kolo_data/torchtune/$OutputDir/Modelfile$Quantization"

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
