# Usage Example:
# ./install_model.ps1 "God" -Tool "unsloth" -OutputDir "GodOutput" -Quantization "Q4_K_M"
# ./install_model.ps1 "God" -Tool "torchtune" -OutputDir "GodOutput" -Quantization "Q4_K_M"

param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ModelName, # The name of the model to create

    [Parameter(Mandatory = $true)]
    [string]$OutputDir, # The path to the outputs folder

    [Parameter(Mandatory = $true)]
    [string]$Quantization, # The model file extension

    [Parameter(Mandatory = $true)]
    [ValidateSet("torchtune", "unsloth")]
    [string]$Tool           # The tool source folder (must be either "torchtune" or "unsloth")
)

# Define the container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Construct the full path to the model file using the chosen data source
$BaseDir = "/var/kolo_data/$Tool"
$ModelFilePath = "$BaseDir/$OutputDir/Modelfile$Quantization"

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
