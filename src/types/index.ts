export type AIProvider = "openai" | "gemini";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string | AIMessageContent[];
}

export interface AIMessageContent {
  type: "text" | "image_url" | "inline_data";
  text?: string;
  image_url?: { url: string };
  inline_data?: { mimeType: string; data: string };
}

export interface AIToolSet {
  declarations: Record<string, unknown>[];
  execute: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export interface AIRequestOptions {
  provider: AIProvider;
  model: string;
  messages: AIMessage[];
  stream?: boolean;
  webSearch?: boolean;
  structuredOutput?: boolean;
  /** Function-calling tools (Gemini only). Ignored when URL context or web search is active. */
  tools?: AIToolSet;
}

export interface ConversationWithMessages {
  id: string;
  title: string;
  aiProvider: string;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
  messages: MessageWithAttachments[];
}

export interface MessageWithAttachments {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  provider: string | null;
  model: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  attachments: AttachmentData[];
}

export interface AttachmentData {
  id: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  filePath: string;
  fileSize: number;
  createdAt: Date;
}
