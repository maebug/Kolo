# Kolo

**Kolo** is a lightweight tool designed for **fast and efficient fine-tuning and testing of Large Language Models (LLMs)** on your local machine. It leverages cutting-edge tools to simplify the fine-tuning process, making it as quick and seamless as possible.

## 🚀 Features

- 🏗 **Lightweight**: Minimal dependencies, optimized for speed.
- ⚡ **Runs Locally**: No need for cloud-based services; fine-tune models on your own machine.
- 🛠 **Easy Setup**: Simple installation and execution with Docker.
- 🔌 **Support for Popular Frameworks**: Integrates with major LLM toolkits.

## 🛠 Tools Used

Kolo is built using a powerful stack of LLM tools:

- [Unsloth](https://github.com/unslothai/unsloth) – Efficient fine-tuning for LLMs.
- [Llama.cpp](https://github.com/ggerganov/llama.cpp) – Fast inference for Llama models.
- [Ollama](https://ollama.ai/) – Simple and portable model management.
- [Docker](https://www.docker.com/) – Containerized environment for easy deployment.
- [Open WebUI](https://github.com/open-webui/open-webui) – Feature-rich and user-friendly self-hosted LLM web interface.

## System Requirements

Windows 10 OS or higher.
Nvidia GPU with CUDA 12.1 capability and 8GB+ of VRAM
32GB+ System RAM

## 🏃 Getting Started

### 1️⃣ Install Dependencies

Ensure [Docker](https://docs.docker.com/get-docker/) is installed on your system.

Ensure [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) is installed on your windows machine.

### 2️⃣ Build the Image

```bash
./build_image.ps1
```

### 3️⃣ Run the Container

If running for first time:

```bash
./create_and_run_container.ps1
```

For subsequent runs:

```bash
./run_container.ps1
```

### 4️⃣ Copy Training Data

```bash
./copy_training_data.ps1 -f examples/God.jsonl
```

### 5️⃣ Train Model

```bash
./train_model.ps1
```

### 6️⃣ Run Model

```bash
./run_model.ps1 God
```

### 7️⃣ Test Model

Open your browser and navigate to [localhost:8080](http://localhost:8080/)

## 🔧 Advanced Users

### SSH Access

To quickly SSH into the Kolo container for installing additional tools or running scripts directly:

```bash
./connect.ps1
```

If prompted for a password, use:

```bash
password 123
```

Alternatively, you can connect manually via SSH:

```bash
ssh root@localhost -p 2222`
```

Navigate to

```bash
cd /app/
```

Run training script ( make sure you copied over your training data )

```bash
python train.py --epochs 3 --learning_rate 1e-4 --train_data "data.jsonl" --base_model "unsloth/Llama-3.2-1B-Instruct-bnb-4bit" --chat_template "llama-3.1" --lora_rank 16 --lora_alpha 16 --lora_dropout 0 --max_seq_length 1024 --warmup_steps 10 --save_steps 500 --save_total_limit 5 --seed 1337 --scheduler_type linear --output_dir outputs
```

### WinSCP (SFTP Access)

You can use [WinSCP](https://winscp.net/eng/index.php) or any other SFTP file manager to access the Kolo container’s file system. This allows you to manage, modify, add, or remove scripts and files easily.

Connection Details:

Host: localhost
Port: 2222
Username: root
Password: 123
This setup ensures you can easily transfer files between your local machine and the container.
