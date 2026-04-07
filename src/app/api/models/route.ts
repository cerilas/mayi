import { NextResponse } from "next/server";

// Cache duration: 1 hour
const CACHE_DURATION = 3600;

export const dynamic = "force-dynamic";

interface ModelInfo {
  id: string;
  label: string;
  displayName: string;
  description?: string;
  supportedMethods: string[];
}

export async function GET() {
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!geminiKey || !geminiKey.startsWith("AIza")) {
      return NextResponse.json(
        {
          openai: [
            { id: "gpt-4.1", label: "GPT-4.1" },
            { id: "gpt-4o", label: "GPT-4o" },
            { id: "gpt-4o-mini", label: "GPT-4o Mini" },
          ],
          gemini: [
            { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
            { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
          ],
        },
        {
          headers: {
            "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
          },
        }
      );
    }

    const geminiModels: ModelInfo[] = [];

    // Fetch models from Gemini REST API
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.models && Array.isArray(data.models)) {
          for (const modelInfo of data.models) {
            const name = modelInfo.name.replace("models/", "");

            // Exclude image generation, audio, TTS, video, and live models — chat-only
            const isNonChatModel =
              name.includes("image") ||
              name.includes("imagen") ||
              name.includes("audio") ||
              name.includes("tts") ||
              name.includes("veo") ||
              name.includes("live");
            if (isNonChatModel) continue;

            // Only include models that support generateContent
            if (
              modelInfo.supportedGenerationMethods?.includes("generateContent") ||
              modelInfo.supportedGenerationMethods?.includes("streamGenerateContent")
            ) {
              // Clean up display name
              const displayName = modelInfo.displayName || name;
              const label = displayName
                .replace("Gemini ", "")
                .replace(" Latest", "")
                .trim();

              geminiModels.push({
                id: name,
                label: label || name,
                displayName,
                description: modelInfo.description,
                supportedMethods: modelInfo.supportedGenerationMethods || [],
              });
            }
          }
        }
      }
    } catch (listError) {
      console.warn("Failed to fetch models from Gemini API:", listError);
    }

    // Sort models: latest/newest first, then by version number
    geminiModels.sort((a, b) => {
      // Prioritize models with higher version numbers (2.5 > 2.0 > 1.5)
      const versionA = parseFloat(a.id.match(/\d+\.\d+/)?.[0] || "0");
      const versionB = parseFloat(b.id.match(/\d+\.\d+/)?.[0] || "0");
      if (versionA !== versionB) return versionB - versionA;

      // Then prioritize "flash" over "pro"
      const aIsFlash = a.id.includes("flash");
      const bIsFlash = b.id.includes("flash");
      if (aIsFlash && !bIsFlash) return -1;
      if (!aIsFlash && bIsFlash) return 1;

      return 0;
    });

    return NextResponse.json(
      {
        openai: [
          { id: "gpt-4.1", label: "GPT-4.1" },
          { id: "gpt-4o", label: "GPT-4o" },
          { id: "gpt-4o-mini", label: "GPT-4o Mini" },
        ],
        gemini: geminiModels.slice(0, 10), // Limit to 10 most relevant models
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching models:", error);
    
    // Fallback to hardcoded models on error
    return NextResponse.json(
      {
        openai: [
          { id: "gpt-4.1", label: "GPT-4.1" },
          { id: "gpt-4o", label: "GPT-4o" },
          { id: "gpt-4o-mini", label: "GPT-4o Mini" },
        ],
        gemini: [
          { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
          { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
          { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        ],
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate`,
        },
      }
    );
  }
}
