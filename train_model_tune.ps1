<#
.SYNOPSIS
    Executes a torchtune LoRA/QLoRA finetuning run inside a Docker container.

.DESCRIPTION
    This script builds and runs a torchtune command for fine-tuning using the 
    "lora_finetune_single_device" recipe and the configuration "llama3_1/8B_qlora_single_device".
    It passes a series of command-line overrides to ensure that the following parameters are set:

      dataset.packed=False
      compile=True
      loss=torchtune.modules.loss.CEWithChunkedOutputLoss
      enable_activation_checkpointing=True
      optimizer_in_bwd=False
      enable_activation_offloading=True
      optimizer=torch.optim.AdamW
      tokenizer.max_seq_len=2048
      gradient_accumulation_steps=1
      epochs=3
      batch_size=2
      dataset.data_files=./data.json
      dataset._component_=torchtune.datasets.chat_dataset
      dataset.source=json
      dataset.conversation_column=conversations
      dataset.conversation_style=sharegpt
      model.lora_rank=32
      model.lora_alpha=32

.PARAMETER Epochs
    Number of training epochs. Default: 3

.PARAMETER LearningRate
    Learning rate for the optimizer. (Override if needed; no default override in the script.)

.PARAMETER TrainData
    Path to the training data file. Default: "./data.json"

.PARAMETER BaseModel
    Base model identifier. (Not used directly by the torchtune command.)

.PARAMETER ChatTemplate
    Chat template name. (Not used directly by the torchtune command.)

.PARAMETER LoraRank
    LoRA rank value. Default: 32

.PARAMETER LoraAlpha
    LoRA alpha value. Default: 32

.PARAMETER LoraDropout
    LoRA dropout rate. (Optional override)

.PARAMETER MaxSeqLength
    Maximum sequence length for the tokenizer. Default: 2048

.PARAMETER WarmupSteps
    Number of warmup steps for the learning rate scheduler. Default: 100

.PARAMETER SaveSteps
    Checkpoint save interval (not used by this command). 

.PARAMETER SaveTotalLimit
    Maximum number of checkpoints to keep (not used by this command).

.PARAMETER Seed
    Random seed value. (Optional)

.PARAMETER SchedulerType
    Scheduler type to use (e.g. cosine_schedule_with_warmup). Default: cosine_schedule_with_warmup

.PARAMETER BatchSize
    Training batch size. Default: 2

.PARAMETER OutputDir
    Output directory for model checkpoints. (Optional)

.PARAMETER Quantization
    Quantization option. (Not used by the current recipe.)

.PARAMETER WeightDecay
    Weight decay for the optimizer. Default: 0.01

.PARAMETER UseCheckpoint
    Switch to resume training from checkpoint. Default: False

.EXAMPLE
    .\train_torchtune.ps1 -Epochs 3 -LearningRate 0.0003 -TrainData "./data.json" -LoraRank 32 -LoraAlpha 32 -MaxSeqLength 2048 -WarmupSteps 100 -BatchSize 2 -WeightDecay 0.01

.NOTES
    - Ensure Docker is installed and a container named "kolo_container" is running.
    - The container must have the conda environment "kolo_env" set up.
#>

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
    [double]$WeightDecay,
    [switch]$UseCheckpoint
)

# Log received parameters
Write-Host "Parameters passed:" -ForegroundColor Cyan
if ($Epochs) { Write-Host "Epochs: $Epochs" }
if ($LearningRate) { Write-Host "LearningRate: $LearningRate" }
if ($TrainData) { Write-Host "TrainData: $TrainData" }
if ($BaseModel) { Write-Host "BaseModel: $BaseModel" }
if ($ChatTemplate) { Write-Host "ChatTemplate: $ChatTemplate" }
if ($LoraRank) { Write-Host "LoraRank: $LoraRank" }
if ($LoraAlpha) { Write-Host "LoraAlpha: $LoraAlpha" }
if ($LoraDropout -ne $null) { Write-Host "LoraDropout: $LoraDropout" }
if ($MaxSeqLength) { Write-Host "MaxSeqLength: $MaxSeqLength" }
if ($WarmupSteps) { Write-Host "WarmupSteps: $WarmupSteps" }
if ($SaveSteps) { Write-Host "SaveSteps: $SaveSteps" }
if ($SaveTotalLimit) { Write-Host "SaveTotalLimit: $SaveTotalLimit" }
if ($Seed) { Write-Host "Seed: $Seed" }
if ($SchedulerType) { Write-Host "SchedulerType: $SchedulerType" }
if ($BatchSize) { Write-Host "BatchSize: $BatchSize" }
if ($OutputDir) { Write-Host "OutputDir: $OutputDir" } else { $OutputDir = "outputs" }
if ($Quantization) { Write-Host "Quantization: $Quantization" }
if ($WeightDecay) { Write-Host "WeightDecay: $WeightDecay" }
if ($UseCheckpoint) { Write-Host "UseCheckpoint: Enabled" } else { Write-Host "UseCheckpoint: Disabled" }

# Define the Docker container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $ContainerName
if (-not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Build the base torchtune command string.
# The following fixed parameters match the default torchtune command:
#   tune run lora_finetune_single_device --config llama3_1/8B_qlora_single_device 
#       dataset.packed=False compile=True loss=torchtune.modules.loss.CEWithChunkedOutputLoss
#       enable_activation_checkpointing=True optimizer_in_bwd=False enable_activation_offloading=True
#       optimizer=torch.optim.AdamW tokenizer.max_seq_len=2048 gradient_accumulation_steps=1
#       epochs=3 batch_size=2 dataset.data_files=./data.json 
#       dataset._component_=torchtune.datasets.chat_dataset dataset.source=json 
#       dataset.conversation_column=conversations dataset.conversation_style=sharegpt 
#       model.lora_rank=32 model.lora_alpha=32

$command = "source /opt/conda/bin/activate kolo_env && tune run lora_finetune_single_device --config llama3_1/8B_qlora_single_device"

# Fixed command options
$command += " dataset.packed=False"
$command += " compile=True"
$command += " loss=torchtune.modules.loss.CEWithChunkedOutputLoss"
$command += " enable_activation_checkpointing=True"
$command += " optimizer_in_bwd=False"
$command += " enable_activation_offloading=True"
$command += " optimizer=torch.optim.AdamW"
$command += " tokenizer.max_seq_len=2048"
$command += " gradient_accumulation_steps=1"

# Dynamic parameters with defaults
if ($Epochs) {
    $command += " epochs=$Epochs"
}
else {
    $command += " epochs=3"
}

if ($BatchSize) {
    $command += " batch_size=$BatchSize"
}
else {
    $command += " batch_size=2"
}

if ($TrainData) {
    $command += " dataset.data_files='$TrainData'"
}
else {
    $command += " dataset.data_files=./data.json"
}

# Fixed dataset parameters
$command += " dataset._component_=torchtune.datasets.chat_dataset"
$command += " dataset.source=json"
$command += " dataset.conversation_column=conversations"
$command += " dataset.conversation_style=sharegpt"

if ($LoraRank) {
    $command += " model.lora_rank=$LoraRank"
}
else {
    $command += " model.lora_rank=32"
}

if ($LoraAlpha) {
    $command += " model.lora_alpha=$LoraAlpha"
}
else {
    $command += " model.lora_alpha=32"
}

if ($LoraDropout -ne $null) {
    $command += " model.lora_dropout=$LoraDropout"
}

if ($LearningRate) {
    $command += " optimizer.lr=$LearningRate"
}

if ($MaxSeqLength) {
    $command += " tokenizer.max_seq_len=$MaxSeqLength"
}

if ($WarmupSteps) {
    $command += " lr_scheduler.num_warmup_steps=$WarmupSteps"
}
else {
    $command += " lr_scheduler.num_warmup_steps=100"
}

if ($Seed) {
    $command += " seed=$Seed"
}

if ($SchedulerType) {
    $command += " lr_scheduler._component_=torchtune.training.lr_schedulers.get_${SchedulerType}_schedule_with_warmup"
}
else {
    $command += " lr_scheduler._component_=torchtune.training.lr_schedulers.get_cosine_schedule_with_warmup"
}

if ($WeightDecay) {
    $command += " optimizer.weight_decay=$WeightDecay"
}
else {
    $command += " optimizer.weight_decay=0.01"
}

if ($UseCheckpoint) {
    $command += " resume_from_checkpoint=True"
}
else {
    $command += " resume_from_checkpoint=False"
}


$command += " output_dir='/var/kolo_data/torchtune/$OutputDir'"


# Note: Parameters such as BaseModel, ChatTemplate, and Quantization are logged for reference
if ($BaseModel) {
    Write-Host "Note: BaseModel parameter '$BaseModel' is provided but is not used directly."
}
if ($ChatTemplate) {
    Write-Host "Note: ChatTemplate parameter '$ChatTemplate' is provided but is not used directly."
}
if ($Quantization) {
    Write-Host "Note: Quantization parameter '$Quantization' is provided but is not used by this recipe."
}

Write-Host "Executing command inside container '$ContainerName':" -ForegroundColor Yellow
Write-Host $command -ForegroundColor Yellow

# Execute the command inside the Docker container
try {
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
