<#
.SYNOPSIS
    Runs the generate_qa_data.py script inside the kolo_container Docker container.
.DESCRIPTION
    This script optionally accepts an OpenAI API key as well as group and answer worker parameters,
    sets the API key as an environment variable inside the container, and passes the worker parameters
    to the Python script.
.EXAMPLE
    .\generate_qa_data.ps1 -OpenAI_API_KEY "your_api_key_here" -GroupWorkers 8 -AnswerWorkers 4
    .\generate_qa_data.ps1 -GroupWorkers 8 -AnswerWorkers 4
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false, HelpMessage = "Provide your OpenAI API Key (optional).")]
    [string]$OpenAI_API_KEY,
    
    [Parameter(Mandatory = $false, HelpMessage = "Max workers for processing file groups (default: 8).")]
    [int]$GroupWorkers = 8,
    
    [Parameter(Mandatory = $false, HelpMessage = "Max workers for answer generation (default: 4).")]
    [int]$AnswerWorkers = 4
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
$baseCommand = "source /opt/conda/bin/activate kolo_env && python /app/generate_qa_data.py --group-workers $GroupWorkers --answer-workers $AnswerWorkers"

if ($OpenAI_API_KEY) {
    $command = "export OPENAI_API_KEY='$OpenAI_API_KEY'; $baseCommand"
}
else {
    $command = $baseCommand
}

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
