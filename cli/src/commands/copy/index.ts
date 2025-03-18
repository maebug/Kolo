import { createCopyConfigsCommand } from "./configs.ts"
import { createCopyQaInputCommand } from "./qa-input.ts"
import { createCopyScriptsCommand } from "./scripts.ts"
import { createCopyTrainingDataCommand } from "./training-data.ts"
import { type Command } from "commander"

export function registerCopyCommands(program: Command) {
  program.addCommand(createCopyConfigsCommand())
  program.addCommand(createCopyQaInputCommand())
  program.addCommand(createCopyScriptsCommand())
  program.addCommand(createCopyTrainingDataCommand())
}
