# Fine-Tuning Guide for LLMs

Fine-tuning is the process of adapting a pre-trained large language model (LLM) to perform specialized tasks or express customized behaviors. By fine tuning a base model—such as Meta's LLaMA—you can update its knowledge, alter its personality, or improve its performance on domain-specific tasks.

---

## 1. What Is Fine-Tuning?

Fine-tuning involves taking a pre-trained model and training it further on a specialized dataset. This approach enables you to:

- **Learn New Information:** Update the model with domain-specific data.
- **Customize Personality:** Adjust the model’s tone or style to suit a particular application.
- **Handle Specific Scenarios:** Modify how the model responds to certain tasks or contexts.

**Important Considerations:**

- **Resource Intensive:** Fine-tuning requires significantly more VRAM than inference because both the model’s weights and the training data must be loaded into memory.
- **Time-Consuming:** Depending on the dataset size and model size, fine-tuning can take several hours or more.

---

## 2. Understanding Model Parameters

Large language models are built from billions—of parameters, analogous to neurons in a neural network. The number of parameters influences the model's ability to handle complex tasks and store information.

---

## 3. Choosing the Right Model

Not every task necessitates the largest model available. Begin with a model that aligns with your current needs and scale up as necessary. A typical progression might be:

1. Begin with a model like LLaMA 1B to experiment with fine-tuning techniques.
2. If the smaller model does not meet your needs, consider moving to a larger model (e.g., LLaMA 3B or 8B).

| Model Size | Torchtune Base Model                  | Unsloth Base Model                           |
|------------|---------------------------------------|-----------------------------------------------------|
| **1B**     | `Meta-llama/Llama-3.2-1B-Instruct`      | `unsloth/Llama-3.2-1B-Instruct-bnb-4bit`              |
| **3B**     | `Meta-llama/Llama-3.2-3B-Instruct`      | `unsloth/Llama-3.2-3B-Instruct-bnb-4bit`              |
| **8B**     | `Meta-llama/Llama-3.1-8B-Instruct`      | `unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit`         |

> **Note:** While all base models are supported for Unsloth, the recommended ones are listed above.

---

## 4. Balancing Underfitting and Overfitting

A crucial part of fine-tuning is finding the right balance between underfitting and overfitting:

- **Overfitting:** Occurs when the model memorizes the training data too well. While it may perform perfectly on training examples, it often fails to generalize to new, unseen data.
- **Underfitting:** Happens when the model does not learn enough from the training data, causing it to behave similarly to the pre-trained version without noticable improvements.

**Adjustments:**

- **If Overfitting:**

  - **Reduce the Learning Rate:** Slower learning can prevent the model from becoming too rigid.
  - **Decrease the Number of Epochs:** Fewer passes through the data can help maintain generalization.

- **If Underfitting:**
  - **Increase the Learning Rate:** A slightly higher rate may help the model learn more from the data.
  - **Increase the Number of Epochs:** Allow the model more passes through the dataset for deeper learning.

---

## 5. Key Fine-Tuning Parameters

### 5.1. Learning Rate

The learning rate determines how much the model's weights are adjusted during training and is one of the most impactful hyperparameters.

- **Default Value:** A common starting point is `1e-4` (0.0001).
- **Considerations:**
  - **Higher Learning Rates:** Higher Learning Rates: Speed up learning but may risk overfitting.
  - **Lower Learning Rates:** Lower Learning Rates: Promote gradual, stable learning but might require more training epochs to achieve similar results.
- **Experimentation:** Try values like `2e-4` (0.0002) or `5e-5` (0.00005) to see which best suits your task.

### 5.2. Epochs

An epoch represents one complete pass through your training dataset.

- **1 Epoch:** Every training example is seen once.
- **Multiple Epochs:** For example, 3 epochs mean each example is processed three times, which can help deepen learning.
- **Tradeoff:**
  - A high learning rate might need fewer epochs.
  - A low learning rate might require more epochs to achieve comparable results.

### 5.3. Additional Fine-Tuning Parameters

Beyond the basic parameters like learning rate and epochs, the following parameters provide additional control over the fine-tuning process.

- **LoraRank:**

  - Defines the rank (i.e., the number of low-rank factors) used in the LoRA (Low-Rank Adaptation) approach. A higher rank allows the model to capture more nuanced information but increases the number of additional parameters and memory requirements.

- **LoraAlpha:**

  - Acts as a scaling factor that controls the magnitude of updates in the LoRA layers. The ratio between LoraAlpha and LoraRank is key. For example:

    - A LoraAlpha of 16 with a LoraRank of 16 yields a ratio of 1.
    - A LoraAlpha of 32 with a LoraRank of 16 results in a ratio of 2, meaning the trained LoRA weights will have a greater impact—similar to increasing the learning rate—which can lead to overfitting.

  - Recommendation: A ratio of 1 is generally recommended, but feel free to experiment with ratios of 2 or 0.5 based on your specific needs.

- **LoraDropout:**

  - Sets the fraction of neurons in the LoRA layers to drop during training to help prevent overfitting.

  - A LoraDropout of 0.1 means 10% of the neurons are deactivated; 0.2 increases this effect.

  - Start with 0.1 and adjust based on model performance—if you observe overfitting, increase LoraDropout; if underfitting, decrease it.

- **MaxSeqLength:**

  - Sets the maximum number of tokens the model will process in a single input sequence.

  - A longer sequence can capture more context but may increase memory usage and computational load. Adjust this parameter carefully, especially with very long texts, to avoid truncation or memory requirements.
 
  - Ensure that your sequence length is set high enough to accommodate your longest prompt. If the prompt exceeds the specified MaxSeqLength, it will be truncated. As a general guideline, one token is roughly equivalent to a 4-letter word.

- **WarmupSteps:**

  - Specifies the number of training steps during which the learning rate is gradually increased from a lower initial value to the target learning rate. This warmup phase helps stabilize early training by preventing large, destabilizing updates at the start.

- **SchedulerType:**

  - Selects the learning rate scheduler that adjusts the learning rate during training.
    - **Linear Decay:** Gradually decreases the learning rate linearly after the warmup period.
    - **Cosine Annealing:** Uses a cosine function to adjust the learning rate after the warmup period.

- **Seed:**

  - Used to initialize the random number generators for various processes during training. Setting a fixed seed ensures that experiments are reproducible, allowing you to replicate results exactly across multiple runs.

- **BatchSize:**

  - Determines how many samples are processed together in a single training step. Larger batch sizes can speed up training and stabilize gradient estimates but require more memory. Smaller batch sizes reduce memory usage but might result in noisier updates.

- **Quantization:**

  - Quantization involves reducing the numerical precision of the model’s weights (e.g., from 32-bit floating-point to 8-bit).

  - This only affects the output GGUF file that will be loaded into Ollama for testing.

  - More quantization will make inference faster at the cost of peformance. We recommend Q4_K_M for a balanced approach between performance and speed.

- **WeightDecay:**

  - A regularization technique that penalizes large weights by adding a fraction of their magnitude to the loss function. This encourages the model to maintain smaller, more generalizable weights, reducing the risk of overfitting.

  - We recommend starting with a weight decay of 0.01, but you can experiment with 0.1, 0.001 and 0.

  - Increase weight decay if you experience overfitting, decrease weight decay if you experience underfitting.

---

## 6. The Iterative Fine-Tuning Process

Fine-tuning is inherently iterative. The process involves:

1. **Experimentation:** Adjust key hyperparameters (learning rate, number of epochs, etc.) gradually.
2. **Validation:** Continuously evaluate the model to monitor performance and avoid overfitting or underfitting.
3. **Iteration:** Continue experimenting and fine-tune your hyperparameters further, aiming for a model that generalizes well.

---

## Conclusion

Fine-tuning is a powerful way to customize pre-trained LLMs for your specific applications. By understanding and carefully adjusting critical parameters like the learning rate and epochs—and by balancing the risk of overfitting versus underfitting—you can enhance a model’s performance on specialized tasks. Start with smaller models and datasets, iterate based on testing and feedback, and scale up gradually to achieve optimal results.

**Happy fine-tuning!**
