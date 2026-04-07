export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "MY FizyoAI",

  ai: {
    defaultProvider: (process.env.NEXT_PUBLIC_DEFAULT_PROVIDER ??
      "openai") as "openai" | "gemini",
    defaultModel: process.env.NEXT_PUBLIC_DEFAULT_MODEL ?? "gpt-4.1",
    enableStreaming: process.env.ENABLE_STREAMING !== "false",
    enableAutoTitle: process.env.ENABLE_AUTO_TITLE !== "false",
    providers: {
      openai: {
        models: [
          { id: "gpt-4.1", label: "GPT-4.1" },
          { id: "gpt-4o", label: "GPT-4o" },
          { id: "gpt-4o-mini", label: "GPT-4o Mini" },
        ],
      },
      gemini: {
        models: [
          { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
          { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
          { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        ],
      },
    },
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? "10", 10),
    allowedMimeTypes: (
      process.env.ALLOWED_MIME_TYPES ?? "image/jpeg,image/png,image/gif,image/webp,application/pdf"
    ).split(","),
    uploadDir: process.env.UPLOAD_DIR ?? "public/uploads",
  },

  disclaimer: {
    enabled: process.env.ENABLE_DISCLAIMER !== "false",
    text: "Bu içerik yalnızca bilgilendirme amaçlıdır. Kesin tanı ve tedavi için uzman değerlendirmesi gereklidir.",
  },
} as const;
