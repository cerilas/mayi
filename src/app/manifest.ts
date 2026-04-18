import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MY FizyoAI - Gaziantep Fizyoterapi ve Yapay Zeka",
    short_name: "MY FizyoAI",
    description:
      "Gaziantep fizyoterapi ve yapay zeka odakli dijital bilgilendirme platformu.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0891b2",
    lang: "tr",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
