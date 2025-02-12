import { Dataset, WebUiChatExport } from "./types"
import { writeFileSync } from "fs"
import path from "path"

function isJsonlFile(filepath: string): boolean {
  return path.extname(filepath).toLowerCase() === ".jsonl"
}

export function convertToDataset(data: WebUiChatExport): Dataset {
  // Extract messages from the first chat (assuming we want to process one chat at a time)
  const messages = data[0].chat.messages.map(({ role, content }) => ({
    role,
    content,
  }))

  // Ensure there are at least 2 messages (requirement from schema)
  if (messages.length < 2) {
    throw new Error("Chat must contain at least 2 messages")
  }

  return { messages }
}

export function saveDataset(dataset: Dataset, filepath: string): void {
  if (isJsonlFile(filepath)) {
    // For JSONL format, write each message pair as a separate line
    const jsonLines = dataset.messages
      .reduce((acc: Dataset[], _, index, array) => {
        // Skip odd indices to avoid duplicating pairs
        if (index % 2 === 0 && index + 1 < array.length) {
          acc.push({
            messages: [array[index], array[index + 1]],
          })
        }
        return acc
      }, [])
      .map((entry) => JSON.stringify(entry))
      .join("\n")

    writeFileSync(filepath, jsonLines + "\n")
  } else {
    // For JSON format, write the entire dataset as a single JSON object
    writeFileSync(filepath, JSON.stringify(dataset, null, 2))
  }
}
