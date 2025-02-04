### PowerShell Script to Execute a Python Script inside a Docker Container
###
### Usage:
### .\train_model.ps1 -Epochs 3 -LearningRate 1e-4 -TrainData "data.jsonl" -BaseModel "unsloth/Llama-3.2-1B-Instruct-bnb-4bit" -ChatTemplate "llama-3.1" -LoraRank 16 -LoraAlpha 16 -LoraDropout 0 -MaxSeqLength 1024 -WarmupSteps 10 -SaveSteps 500 -SaveTotalLimit 5 -Seed 1337 -SchedulerType "linear" -BatchSize 2 -OutputDir "outputs" -Quantization "Q4_K_M"
###

param (
    [int]$Epochs = 3,
    [double]$LearningRate = 1e-4,
    [string]$TrainData = "data.jsonl",
    [string]$BaseModel = "unsloth/Llama-3.2-1B-Instruct-bnb-4bit",
    [string]$ChatTemplate = "llama-3.1",
    [int]$LoraRank = 16,
    [int]$LoraAlpha = 16,
    [double]$LoraDropout = 0,
    [int]$MaxSeqLength = 1024,
    [int]$WarmupSteps = 10,
    [int]$SaveSteps = 500,
    [int]$SaveTotalLimit = 5,
    [int]$Seed = 1337,
    [string]$SchedulerType = "linear",
    [int]$BatchSize = 2,
    [string]$OutputDir = "outputs",
    [string]$Quantization = "Q4_K_M"
)

Write-Host "Parameters passed to the script:" -ForegroundColor Cyan
Write-Host "Epochs: $Epochs"
Write-Host "LearningRate: $LearningRate"
Write-Host "TrainData: $TrainData"
Write-Host "BaseModel: $BaseModel"
Write-Host "ChatTemplate: $ChatTemplate"
Write-Host "LoraRank: $LoraRank"
Write-Host "LoraAlpha: $LoraAlpha"
Write-Host "LoraDropout: $LoraDropout"
Write-Host "MaxSeqLength: $MaxSeqLength"
Write-Host "WarmupSteps: $WarmupSteps"
Write-Host "SaveSteps: $SaveSteps"
Write-Host "SaveTotalLimit: $SaveTotalLimit"
Write-Host "Seed: $Seed"
Write-Host "SchedulerType: $SchedulerType"
Write-Host "BatchSize: $BatchSize"
Write-Host "OutputDir: $OutputDir"
Write-Host "Quantization: $Quantization"

# Define container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "$ContainerName"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Execute the python script inside the container
try {
    Write-Host "Executing script inside container: $ContainerName..."
    $command = "/opt/conda/bin/conda run -n kolo_env python /app/train.py --epochs $Epochs --learning_rate $LearningRate --train_data '$TrainData' --base_model '$BaseModel' --chat_template '$ChatTemplate' --lora_rank $LoraRank --lora_alpha $LoraAlpha --lora_dropout $LoraDropout --max_seq_length $MaxSeqLength --warmup_steps $WarmupSteps --save_steps $SaveSteps --save_total_limit $SaveTotalLimit --seed $Seed --scheduler_type '$SchedulerType' --batch_size $BatchSize --output_dir '$OutputDir' --quantization '$Quantization'"
    
    docker exec -it $ContainerName /bin/bash -c $command
    
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