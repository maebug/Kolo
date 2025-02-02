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

## 🏃 Getting Started

### 1️⃣ Install Dependencies

Ensure [Docker](https://docs.docker.com/get-docker/) is installed on your system.

Ensure [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) is installed on your windows machine.

### 2️⃣ Build the Image

`./build_image.ps1`

### 3️⃣ Run the Container

If running for first time:

`./create_and_run_container.ps1`

For subsequent runs:

`./run_container.ps1`

### 4️⃣ Copy Training Data

`./copy_training_data.ps1 -f examples/data.jsonl`

### 5️⃣ Train Model

`./train.ps1`

### 6️⃣ Run Model

`./run_model.ps1 {name}`

### 7️⃣ Test Model

Open your browser and navigate to [localhost:8080](http://localhost:8080/)

## 🔧 Advanced Users

### SSH Access

To quickly SSH into the Kolo container for installing additional libraries or running scripts:

`./connect.ps1`

If prompted for a password, use:

`password 123`

Alternatively, you can connect manually via SSH:

`ssh root@localhost -p 2222`

### WinSCP (SFTP Access)

You can use [WinSCP](https://winscp.net/eng/index.php) or any other SFTP file manager to access the Kolo container’s file system. This allows you to manage, modify, add, or remove scripts and files easily.

Connection Details:

Host: localhost
Port: 2222
Username: root
Password: 123
This setup ensures you can easily transfer files between your local machine and the container.
