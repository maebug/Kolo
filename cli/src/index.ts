#!/usr/bin/env node
import { style } from "./colors.ts"
import { createConvertCommand } from "./commands/convert.ts"
import { createDestroyCommand } from "./commands/destroy.ts"
import { createDevCLIColorsCommand } from "./commands/dev/cli-colors.ts"
import { createDockerfileCommand } from "./commands/docker-file.ts"
import { createHealthcheckCommand } from "./commands/healthcheck.ts"
import { createInitCommand } from "./commands/init.ts"
import { createOllamaCommand } from "./commands/ollama.ts"
import { createSshCommand } from "./commands/ssh.ts"
import { createStartCommand } from "./commands/start.ts"
import { createStopCommand } from "./commands/stop.ts"
import { Command } from "commander"
import process from "node:process"

// Force color output so the CLI looks pretty!
process.env.FORCE_COLOR = "1"

const program = new Command()

program
  .name(style.primary("kolo"))
  .description(
    style.secondary(
      "Welcome to Kolo, a set of tools for fine-tuning AI models.",
    ),
  )
  .version("0.0.10")
  .enablePositionalOptions()

program
  .addCommand(createConvertCommand())
  .addCommand(createDestroyCommand())
  .addCommand(createDockerfileCommand())
  .addCommand(createHealthcheckCommand())
  .addCommand(createInitCommand())
  .addCommand(createOllamaCommand())
  .addCommand(createSshCommand())
  .addCommand(createStartCommand())
  .addCommand(createStopCommand())

program.configureHelp({
  styleCommandDescription: style.red,
  styleOptionText: style.tertiary,
  styleUsage: style.command,
  styleTitle: style.underline.bold,
  styleSubcommandText: style.command,
})

program.showSuggestionAfterError()
program.showHelpAfterError(
  style.primary(
    `\n Run ${style.command("kolo help")} for a full list of commands.`,
  ),
)

if (Deno.env.get("DENO_ENV") === "dev") {
  program.addCommand(createDevCLIColorsCommand())
}

program.parse()
