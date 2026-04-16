"use client";

import { useEffect, useState } from "react";
import {
  ASSISTANT_ICON_CHANGE_EVENT,
  loadSavedAssistantIconId,
} from "@/lib/assistantIcon";

export function useAssistantIcon() {
  const [assistantIconId, setAssistantIconId] = useState(loadSavedAssistantIconId());

  useEffect(() => {
    const onAssistantIconChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setAssistantIconId(customEvent.detail || loadSavedAssistantIconId());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === "assistantIcon") {
        setAssistantIconId(loadSavedAssistantIconId());
      }
    };

    window.addEventListener(ASSISTANT_ICON_CHANGE_EVENT, onAssistantIconChange as EventListener);
    window.addEventListener("storage", onStorage);
    setAssistantIconId(loadSavedAssistantIconId());

    return () => {
      window.removeEventListener(ASSISTANT_ICON_CHANGE_EVENT, onAssistantIconChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return assistantIconId;
}