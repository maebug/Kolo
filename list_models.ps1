# Define the container name
$containerName = "kolo_container"

# Define the target directories inside the container
$targetDirectories = @(
    "/var/kolo_data/torchtune",
    "/var/kolo_data/unsloth"
)

foreach ($dir in $targetDirectories) {
    Write-Host "Model folders in $dir" -ForegroundColor Cyan

    # Build the command to allow shell globbing and suppress error messages if no folders are found.
    $command = "docker"
    $cmd = "ls -d $dir/*/ 2>/dev/null"  # ls will not print an error if no folder exists
    $args = @("exec", $containerName, "sh", "-c", $cmd)

    try {
        # Execute the command and capture the output.
        $result = & $command @args 2>&1 | Out-String

        # If the trimmed output is empty, no folders were found.
        if ($result.Trim().Length -eq 0) {
            Write-Host "No models found" -ForegroundColor Green
        }
        else {
            Write-Host $result -ForegroundColor Green
        }
    }
    catch {
        Write-Host "An exception occurred while listing folders in $dir $_" -ForegroundColor Red
    }
    
    Write-Host "-------------------------------------" -ForegroundColor Yellow
}

# Now, list the installed models in Ollama using the 'ollama list' command inside the container.
Write-Host "`nListing installed models in Ollama:" -ForegroundColor Cyan
try {
    # Build the docker exec command to run 'ollama list' inside the container.
    $command = "docker"
    $cmd = "ollama list"
    $args = @("exec", $containerName, "sh", "-c", $cmd)

    # Execute the command and capture the output.
    $ollamaOutput = & $command @args 2>&1 | Out-String

    # Check if any output was returned.
    if ($ollamaOutput.Trim().Length -eq 0) {
        Write-Host "No models installed or no output from ollama list." -ForegroundColor Green
    }
    else {
        Write-Host $ollamaOutput -ForegroundColor Green
    }
}
catch {
    Write-Host "An exception occurred while listing installed models in Ollama: $_" -ForegroundColor Red
}
