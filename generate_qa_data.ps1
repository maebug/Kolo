<#
.SYNOPSIS
    Runs the generate_qa_data.py script inside the kolo_container Docker container.
.DESCRIPTION
    This script accepts an OpenAI API key as a parameter and sets it as an environment variable
    inside the container before executing the generate_qa_data.py script.
.EXAMPLE
    .\generate_qa_data.ps1 -OpenAI_API_KEY "your_api_key_here"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Provide your OpenAI API Key.")]
    [string]$OpenAI_API_KEY
)

# Define the container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "$ContainerName"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Build the command string to execute inside the container.
# The command first sets the OPENAI_API_KEY environment variable, activates the conda environment,
# and then runs the Python script.
$command = "export OPENAI_API_KEY='$OpenAI_API_KEY'; source /opt/conda/bin/activate kolo_env && python /app/generate_qa_data.py"

# Execute the Python script inside the container
try {
    Write-Host "Executing generate_qa_data.py inside container: $ContainerName..." -ForegroundColor Cyan
    docker exec -it $ContainerName /bin/bash -c $command

    if ($?) {
        Write-Host "QA data generation script executed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to execute the QA data generation script." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}
