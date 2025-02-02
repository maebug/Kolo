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
- [Hugging Face](https://huggingface.co/) – Model hosting, training, and deployment.
- [Llama.cpp](https://github.com/ggerganov/llama.cpp) – Fast inference for Llama models.
- [Ollama](https://ollama.ai/) – Simple and portable model management.
- [Docker](https://www.docker.com/) – Containerized environment for easy deployment.
- [Open WebUI](https://github.com/open-webui/open-webui) – Feature-rich and user-friendly self-hosted LLM web interface.

## 🏃 Getting Started

### 1️⃣ Install Dependencies

Ensure [Docker](https://docs.docker.com/get-docker/) is installed on your system.

Ensure [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) is installed on your windows machine.

### 2️⃣ Build the Image

`./build.ps1`

### 3️⃣ Run the Container

`./run.ps1`

### 4️⃣ Connect via SSH

`./connect.ps1`

`password 123`

### 5️⃣ Copy over your JSONL dataset

docker cp /path/to/local/file container_id:/path/in/container

...

### 6️⃣ Train

Training

Save data into a Docker Volume so you do not lose it.
...

### 7️⃣ Run

Ollama
and / or
openweb-ui
...

---

Discord group link
