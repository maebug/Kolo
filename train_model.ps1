### PowerShell Script to Execute a Python Script inside a Docker Container
###
### Usage:
### .\train_model.ps1 -Epochs 3 -LearningRate 1e-4 -TrainData "data.jsonl" -BaseModel "unsloth/Llama-3.2-1B-Instruct-bnb-4bit" -ChatTemplate "llama-3.1" -LoraRank 16 -LoraAlpha 16 -LoraDropout 0 -MaxSeqLength 1024 -WarmupSteps 10 -SaveSteps 500 -SaveTotalLimit 5 -Seed 1337 -SchedulerType "linear" -BatchSize 2 -OutputDir "outputs" -Quantization "Q4_K_M -WeightDecay 0"
###

param (
    [int]$Epochs,
    [double]$LearningRate,
    [string]$TrainData,
    [string]$BaseModel,
    [string]$ChatTemplate,
    [int]$LoraRank,
    [int]$LoraAlpha,
    [double]$LoraDropout,
    [int]$MaxSeqLength,
    [int]$WarmupSteps,
    [int]$SaveSteps,
    [int]$SaveTotalLimit,
    [int]$Seed,
    [string]$SchedulerType,
    [int]$BatchSize,
    [string]$OutputDir,
    [string]$Quantization,
    [double]$WeightDecay
)

Write-Host "Parameters passed to the script:" -ForegroundColor Cyan

if ($Epochs) { Write-Host "Epochs: $Epochs" }
if ($LearningRate) { Write-Host "LearningRate: $LearningRate" }
if ($TrainData) { Write-Host "TrainData: $TrainData" }
if ($BaseModel) { Write-Host "BaseModel: $BaseModel" }
if ($ChatTemplate) { Write-Host "ChatTemplate: $ChatTemplate" }
if ($LoraRank) { Write-Host "LoraRank: $LoraRank" }
if ($LoraAlpha) { Write-Host "LoraAlpha: $LoraAlpha" }
if ($LoraDropout) { Write-Host "LoraDropout: $LoraDropout" }
if ($MaxSeqLength) { Write-Host "MaxSeqLength: $MaxSeqLength" }
if ($WarmupSteps) { Write-Host "WarmupSteps: $WarmupSteps" }
if ($SaveSteps) { Write-Host "SaveSteps: $SaveSteps" }
if ($SaveTotalLimit) { Write-Host "SaveTotalLimit: $SaveTotalLimit" }
if ($Seed) { Write-Host "Seed: $Seed" }
if ($SchedulerType) { Write-Host "SchedulerType: $SchedulerType" }
if ($BatchSize) { Write-Host "BatchSize: $BatchSize" }
if ($OutputDir) { Write-Host "OutputDir: $OutputDir" }
if ($Quantization) { Write-Host "Quantization: $Quantization" }
if ($WeightDecay) { Write-Host "WeightDecay: $WeightDecay" }

# Define container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "$ContainerName"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Build command string dynamically
$command = "/opt/conda/bin/conda run -n kolo_env python /app/train.py"

if ($Epochs) { $command += " --epochs $Epochs" }
if ($LearningRate) { $command += " --learning_rate $LearningRate" }
if ($TrainData) { $command += " --train_data '$TrainData'" }
if ($BaseModel) { $command += " --base_model '$BaseModel'" }
if ($ChatTemplate) { $command += " --chat_template '$ChatTemplate'" }
if ($LoraRank) { $command += " --lora_rank $LoraRank" }
if ($LoraAlpha) { $command += " --lora_alpha $LoraAlpha" }
if ($LoraDropout) { $command += " --lora_dropout $LoraDropout" }
if ($MaxSeqLength) { $command += " --max_seq_length $MaxSeqLength" }
if ($WarmupSteps) { $command += " --warmup_steps $WarmupSteps" }
if ($SaveSteps) { $command += " --save_steps $SaveSteps" }
if ($SaveTotalLimit) { $command += " --save_total_limit $SaveTotalLimit" }
if ($Seed) { $command += " --seed $Seed" }
if ($SchedulerType) { $command += " --scheduler_type '$SchedulerType'" }
if ($BatchSize) { $command += " --batch_size $BatchSize" }
if ($OutputDir) { $command += " --output_dir '$OutputDir'" }
if ($Quantization) { $command += " --quantization '$Quantization'" }
if ($WeightDecay) { $command += " --weight_decay '$WeightDecay'" }

# Execute the python script inside the container
try {
    Write-Host "Executing script inside container: $ContainerName..."
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