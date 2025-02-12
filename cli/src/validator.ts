import webUiSchema from "../schema/open-webui-chat-export.json"
import Ajv from "ajv"
import { existsSync, readFileSync } from "fs"

const ajv = new Ajv()

// Add UUID format validation
ajv.addFormat(
  "uuid",
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
)

const validateWebUiFormat = ajv.compile(webUiSchema)

export function validateSourceFile(filepath: string): {
  valid: boolean
  error?: string
} {
  // Check if file exists
  if (!existsSync(filepath)) {
    return { valid: false, error: `File not found: ${filepath}` }
  }

  try {
    // Try to read and parse JSON
    const fileContent = readFileSync(filepath, "utf-8")
    const jsonData = JSON.parse(fileContent)

    // Validate against schema
    if (validateWebUiFormat(jsonData)) {
      return { valid: true }
    } else {
      return {
        valid: false,
        error: `Invalid file format: ${JSON.stringify(
          validateWebUiFormat.errors,
        )}`,
      }
    }
  } catch (error: unknown) {
    return {
      valid: false,
      error: `Error reading/parsing file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    }
  }
}
