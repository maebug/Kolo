import readline from "readline"

export async function confirmOverwrite(filepath: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      `File ${filepath} already exists. Type 'y' or 'Y' to overwrite (or use --force to skip this prompt): `,
      (answer) => {
        rl.close()
        resolve(answer.toLowerCase() === "y")
      },
    )
  })
}
