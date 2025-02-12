export interface DatasetMessage {
  role: "user" | "assistant"
  content: string
}

export interface Dataset {
  messages: DatasetMessage[]
}

export interface WebUiChat {
  chat: {
    messages: {
      role: "user" | "assistant"
      content: string
      timestamp: number
    }[]
  }
}

export type WebUiChatExport = WebUiChat[]
