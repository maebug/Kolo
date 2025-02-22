/**
 * A single message in a dataset for fine-tuning a model.
 */
export interface TrainingDatasetMessage {
  role: "user" | "assistant"
  content: string
}

/**
 * A collection of messages in a dataset for fine-tuning a model.
 */
export interface TrainingDataset {
  messages: TrainingDatasetMessage[]
}
