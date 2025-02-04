# Example usage:
# ./copy_training_data.ps1 -f "C:\path\to\file.jsonl" -d "newfile.jsonl"

param (
    [string]$f, # Local file path
    [string]$d = "data.jsonl" # Destination filename (default: data.jsonl)
)

# Check if the file exists
if (-Not (Test-Path $f)) {
    Write-Host "Error: File does not exist at path: $f" -ForegroundColor Red
    exit 1
}

# Execute the docker cp command
try {
    Write-Host "Copying $f to container kolo_container at /app/$d..."
    docker cp $f "kolo_container`:/app/$d"
    
    if ($?) {
        Write-Host "File copied successfully as $d!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to copy file." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}
