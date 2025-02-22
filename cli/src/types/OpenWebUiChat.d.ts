/**
 * Represents a singleton of an exported chat from Open Web UI.
 *
 * @see https://github.com/open-webui/open-webui
 */
export interface OpenWebUiChat {
  chat: {
    messages: {
      role: "user" | "assistant"
      content: string
      timestamp: number
    }[]
  }
}

/**
 * Represents a collection of exported chats from Open Web UI.
 */
export type OpenWebUiChatExport = OpenWebUiChat[]
