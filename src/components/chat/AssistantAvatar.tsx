"use client";

import { getAssistantIconId } from "@/lib/assistantIcon";
import { useAssistantIcon } from "@/hooks/useAssistantIcon";

function AssistantGlyph({ iconId }: { iconId: string }) {
  switch (getAssistantIconId(iconId)) {
    case "my-logo":
      return <span className="text-white text-[10px] font-bold leading-none tracking-tight">MY</span>;
    case "robot":
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m-4 4h8a3 3 0 013 3v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a3 3 0 013-3zm1 4h.01M15 12h.01M9 17h6" />
        </svg>
      );
    case "spark":
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zm6 14l.8 2.2L21 20l-2.2.8L18 23l-.8-2.2L15 20l2.2-.8L18 17zM5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6L5 15z" />
        </svg>
      );
    case "brain":
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 4a3.5 3.5 0 00-3.5 3.5V8a3 3 0 000 6v.5A3.5 3.5 0 009.5 18H10m4.5-14A3.5 3.5 0 0118 7.5V8a3 3 0 010 6v.5A3.5 3.5 0 0114.5 18H14m-4-9v6m4-8v10" />
        </svg>
      );
    case "pulse":
    default:
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
  }
}

interface AssistantAvatarProps {
  iconId?: string;
  className?: string;
}

export default function AssistantAvatar({ iconId, className = "w-8 h-8 rounded-xl mt-0.5" }: AssistantAvatarProps) {
  const selectedIconId = useAssistantIcon();
  const resolvedIconId = iconId ?? selectedIconId;

  return (
    <div className={`flex-shrink-0 flex items-center justify-center ${className}`} style={{ backgroundColor: "var(--brand)" }}>
      <AssistantGlyph iconId={resolvedIconId} />
    </div>
  );
}