export interface AssistantIconOption {
  id: string;
  label: string;
}

export const ASSISTANT_ICON_OPTIONS: AssistantIconOption[] = [
  { id: "pulse", label: "Pulse" },
  { id: "robot", label: "Robot" },
  { id: "spark", label: "Spark" },
  { id: "brain", label: "Brain" },
  { id: "my-logo", label: "MY Logo" },
];

export const DEFAULT_ASSISTANT_ICON_ID = "pulse";
export const ASSISTANT_ICON_STORAGE_KEY = "assistantIcon";
export const ASSISTANT_ICON_CHANGE_EVENT = "assistant-icon-change";

export function getAssistantIconId(id: string): string {
  return ASSISTANT_ICON_OPTIONS.some((icon) => icon.id === id)
    ? id
    : DEFAULT_ASSISTANT_ICON_ID;
}

export function loadSavedAssistantIconId(): string {
  if (typeof localStorage === "undefined") return DEFAULT_ASSISTANT_ICON_ID;
  return getAssistantIconId(localStorage.getItem(ASSISTANT_ICON_STORAGE_KEY) ?? DEFAULT_ASSISTANT_ICON_ID);
}

export function saveAssistantIcon(id: string) {
  const normalizedId = getAssistantIconId(id);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ASSISTANT_ICON_STORAGE_KEY, normalizedId);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ASSISTANT_ICON_CHANGE_EVENT, { detail: normalizedId }));
  }
}