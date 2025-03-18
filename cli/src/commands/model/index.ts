import { createModelAddCommand } from "./add.ts"
import { createModelListCommand } from "./list.ts"
import { createModelRemoveCommand } from "./remove.ts"
import { type Command } from "commander"

export function registerModelCommands(program: Command) {
  program.addCommand(createModelAddCommand())
  program.addCommand(createModelListCommand())
  program.addCommand(createModelRemoveCommand())
}
