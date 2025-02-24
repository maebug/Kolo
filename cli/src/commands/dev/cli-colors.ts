import { style } from "../../colors.ts"
import { Command } from "commander"

export function createDevCLIColorsCommand() {
  return new Command()
    .command("dev:cli-colors")
    .description("Sample the color theme")
    .action(() => {
      // Base
      console.log(style.primary("Primary color"))
      console.log(style.secondary("Secondary color"))

      // Status styles
      console.log(style.error("Error color"))
      console.log(style.success("Success color"))
      console.log(style.warning("Warning color"))
      console.log(style.info("Info color"))

      // Special styles
      console.log(style.command("Command color"))
      console.log(style.path("Path color"))
      console.log(style.title("Title color"))
    })
}
