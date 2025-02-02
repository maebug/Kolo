# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "kolo_container"

if (-Not $containerRunning) {
    Write-Host "Error: Container is not running." -ForegroundColor Red
    exit 1
}

# Execute the python script inside the container
try {
    Write-Host "Executing script..."
    docker exec -it kolo_container /bin/bash -c "/opt/conda/bin/conda run -n kolo_env python /app/scripts/train.py --train_data data.jsonl"

    if ($?) {
        Write-Host "Script executed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to execute script." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}
