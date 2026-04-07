"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface ConversationItemProps {
  conversation: {
    id: string;
    title: string;
    updatedAt: string;
    aiProvider: string;
  };
  isActive: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function ConversationItem({
  conversation,
  isActive,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename() {
    setMenuOpen(false);
    setRenaming(true);
    setRenameValue(conversation.title);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function submitRename() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    }
    setRenaming(false);
  }

  return (
    <div className="relative group">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
          ${isActive ? "bg-white shadow-sm border border-gray-200" : "hover:bg-gray-100"}`}
        onClick={() => {
          if (!renaming) router.push(`/chat/${conversation.id}`);
        }}
      >
        {/* Title */}
        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm bg-white border brand-border rounded px-1 outline-none min-w-0"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 text-sm truncate min-w-0 ${isActive ? "text-gray-900 font-medium" : "text-gray-700"}`}
          >
            {conversation.title}
          </span>
        )}

        {/* Menu button */}
        {!renaming && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className={`flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
              ${isActive ? "opacity-100" : ""}
              hover:bg-gray-200`}
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-1 top-8 z-20 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
            <button
              onClick={() => startRename()}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Yeniden Adlandır
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Sil
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => onDelete(conversation.id)}
        title="Sohbeti Sil"
        message="Bu sohbet kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        confirmDanger
      />
    </div>
  );
}
