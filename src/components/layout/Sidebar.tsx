"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import ConversationItem from "./ConversationItem";
import SettingsModal from "@/components/settings/SettingsModal";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  aiProvider: string;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
  _count: { conversations: number };
}

// ─── Draggable conversation row ─────────────────────────────────────────────
function DraggableConv({
  conv,
  isActive,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  isActive: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: conv.id,
    data: { type: "conversation", folderId: conv.folderId },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
      {...listeners}
      {...attributes}
    >
      <ConversationItem
        conversation={conv}
        isActive={isActive}
        onDelete={onDelete}
        onRename={onRename}
      />
    </li>
  );
}

// ─── Droppable folder ────────────────────────────────────────────────────────
function FolderRow({
  folder,
  conversations,
  activeConvId,
  isOpen,
  onToggle,
  onRenameFolder,
  onDeleteFolder,
  onDeleteConv,
  onRenameConv,
}: {
  folder: Folder;
  conversations: Conversation[];
  activeConvId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteConv: (id: string) => void;
  onRenameConv: (id: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditName(folder.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRenameFolder(folder.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOver ? "bg-blue-50 ring-1 ring-blue-300" : ""}`}
    >
      {/* Folder header */}
      <div className="group flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer select-none">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          <svg
            className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
            fill="currentColor" viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-3.5 h-3.5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
          </svg>
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(false);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-xs font-medium bg-white border border-blue-300 rounded px-1 py-0.5 outline-none min-w-0"
            />
          ) : (
            <span className="flex-1 text-xs font-medium text-gray-700 truncate">{folder.name}</span>
          )}
          <span className="text-[10px] text-gray-400 shrink-0 ml-1">{conversations.length}</span>
        </button>
        {/* Folder actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200"
            title="Yeniden adlandır"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
            className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
            title="Klasörü sil"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {/* Conversations inside folder */}
      {isOpen && (
        <ul className="pl-3 space-y-0.5 pb-1">
          {conversations.length === 0 ? (
            <li className="text-[11px] text-gray-400 px-4 py-1 italic">
              Sohbet sürükleyin
            </li>
          ) : (
            conversations.map((conv) => (
              <DraggableConv
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onDelete={onDeleteConv}
                onRename={onRenameConv}
              />
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef: rootDropRef, isOver: isOverRoot } = useDroppable({ id: "root" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const fetchConversations = useCallback(async (cursor?: string) => {
    try {
      const url = cursor
        ? `/api/conversations?limit=30&cursor=${cursor}`
        : `/api/conversations?limit=30`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (cursor) {
        setConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newItems = (data.items as Conversation[]).filter((c) => !existingIds.has(c.id));
          return [...prev, ...newItems];
        });
      } else {
        setConversations(data.items ?? []);
      }
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (!res.ok) return;
    const data = await res.json();
    setFolders(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchConversations();
    fetchFolders();
  }, [fetchConversations, fetchFolders, pathname]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60 && hasMore && !loadingMore) {
        setLoadingMore(true);
        fetchConversations(nextCursor ?? undefined);
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, nextCursor, fetchConversations]);

  async function handleNewChat() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const conv = await res.json();
      router.push(`/chat/${conv.id}`);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (pathname === `/chat/${id}`) router.push("/chat");
    }
  }

  async function handleRename(id: string, title: string) {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, folder]);
      setOpenFolders((prev) => new Set(prev).add(folder.id));
    }
    setNewFolderName("");
    setShowNewFolder(false);
  }

  async function handleRenameFolder(id: string, name: string) {
    const res = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    }
  }

  async function handleDeleteFolder(id: string) {
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setConversations((prev) =>
        prev.map((c) => (c.folderId === id ? { ...c, folderId: null } : c))
      );
    }
  }

  async function moveConversation(convId: string, targetFolderId: string | null) {
    const res = await fetch(`/api/conversations/${convId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: targetFolderId }),
    });
    if (res.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, folderId: targetFolderId } : c))
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function handleDragOver() {
    // visual feedback handled by useDroppable isOver in child components
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);

    if (!over) return;
    const convId = String(active.id);
    const currentFolderId = (active.data.current as { folderId?: string | null })?.folderId ?? null;
    const overId = String(over.id);

    let targetFolderId: string | null = null;
    if (overId === "root") {
      targetFolderId = null;
    } else if (overId.startsWith("folder:")) {
      targetFolderId = overId.replace("folder:", "");
    } else {
      return;
    }

    if (targetFolderId === currentFolderId) return;
    moveConversation(convId, targetFolderId);
  }

  const activeId = pathname.startsWith("/chat/") ? pathname.replace("/chat/", "") : null;
  const draggingConv = conversations.find((c) => c.id === draggingId);
  const freeConversations = conversations.filter((c) => !c.folderId);

  return (
    <aside className="flex flex-col w-65 min-w-65 bg-gray-50 border-r border-gray-200 h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <img src="/logo.png" alt="MY FizyoAI" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">MY FizyoAI</span>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium btn-brand-soft rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yeni Sohbet
          </button>
          <button
            onClick={() => {
              setShowNewFolder(true);
              setTimeout(() => newFolderInputRef.current?.focus(), 0);
            }}
            className="px-2.5 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            title="Yeni klasör"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="mt-2 flex gap-1">
            <input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
              }}
              placeholder="Klasör adı..."
              className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded-lg outline-none focus:border-blue-400"
            />
            <button
              onClick={handleCreateFolder}
              className="px-2 py-1.5 text-xs btn-brand rounded-lg"
            >
              Ekle
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div ref={listRef} className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="flex justify-center pt-6">
              <div className="w-4 h-4 border-2 border-gray-300 brand-spinner rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  conversations={conversations.filter((c) => c.folderId === folder.id)}
                  activeConvId={activeId}
                  isOpen={openFolders.has(folder.id)}
                  onToggle={() =>
                    setOpenFolders((prev) => {
                      const next = new Set(prev);
                      if (next.has(folder.id)) next.delete(folder.id);
                      else next.add(folder.id);
                      return next;
                    })
                  }
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onDeleteConv={handleDelete}
                  onRenameConv={handleRename}
                />
              ))}

              {/* Root drop zone — shown while dragging */}
              <div ref={rootDropRef}>
                {draggingId && (
                  <div
                    className={`mx-0 mb-1 h-8 border-2 border-dashed rounded-lg flex items-center justify-center text-xs transition-colors ${
                      isOverRoot
                        ? "border-blue-400 bg-blue-50 text-blue-500"
                        : "border-gray-200 text-gray-400"
                    }`}
                  >
                    Klasörsüz bırak
                  </div>
                )}
              </div>

              {/* Free conversations */}
              {freeConversations.length === 0 && folders.length === 0 ? (
                <p className="text-xs text-gray-400 text-center pt-4 px-4">
                  Henüz sohbet yok
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {freeConversations.map((conv) => (
                    <DraggableConv
                      key={conv.id}
                      conv={conv}
                      isActive={conv.id === activeId}
                      onDelete={handleDelete}
                      onRename={handleRename}
                    />
                  ))}
                </ul>
              )}

              {loadingMore && (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 border-2 border-gray-300 brand-spinner rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggingConv ? (
            <div className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg shadow-lg text-gray-700 max-w-50 truncate">
              {draggingConv.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Çıkış Yap
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Ayarlar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </aside>
  );
}
