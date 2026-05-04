"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { THEME_COLORS, applyTheme, loadSavedTheme, applyColorMode, loadSavedColorMode } from "@/lib/theme";
import type { ColorMode } from "@/lib/theme";
import {
  ASSISTANT_ICON_OPTIONS,
  loadSavedAssistantIconId,
  saveAssistantIcon,
} from "@/lib/assistantIcon";
import AssistantAvatar from "@/components/chat/AssistantAvatar";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}

const EMPTY_FORM: UserFormData = { name: "", email: "", password: "", role: "user" };

// ─────────────────────────────────────────────
// Settings Modal
// ─────────────────────────────────────────────
interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const isPatient = session?.user?.role === "patient";
  const defaultTab = isAdmin ? "users" : isPatient ? "account" : "instructions";
  const [tab, setTab] = useState<"users" | "theme" | "instructions" | "apikey" | "sms_settings" | "account">(defaultTab);

  // ── Theme tab state ─────────────────────────
  const [activeTheme, setActiveTheme] = useState(loadSavedTheme());
  const [activeAssistantIcon, setActiveAssistantIcon] = useState(loadSavedAssistantIconId());
  const [colorMode, setColorMode] = useState<ColorMode>(loadSavedColorMode());

  function handleThemeSelect(id: string) {
    setActiveTheme(id);
    applyTheme(id);
  }

  function handleAssistantIconSelect(id: string) {
    setActiveAssistantIcon(id);
    saveAssistantIcon(id);
  }

  // ── System instruction tab state ────────────
  const [sysInstruction, setSysInstruction] = useState("");
  const [patientSysInstruction, setPatientSysInstruction] = useState("");
  const [sysInstructionSaved, setSysInstructionSaved] = useState("");
  const [baseInstruction, setBaseInstruction] = useState("");
  const [sysLoading, setSysLoading] = useState(false);
  const [sysSaving, setSysSaving] = useState(false);
  const [sysSaved, setSysSaved] = useState(false);

  // ── API Key tab state (admin only) ──────────
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeyEditing, setApiKeyEditing] = useState(false);

  useEffect(() => {
    if (tab === "instructions" && !sysInstructionSaved) {
      setSysLoading(true);
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          const val = data.system_instruction ?? "";
          setSysInstruction(val);
          setPatientSysInstruction(data.patient_system_instruction ?? "");
          setSysInstructionSaved(val || "__loaded__");
          const base = data.base_instruction ?? "";
          setBaseInstruction(base);
        })
        .catch(() => {})
        .finally(() => setSysLoading(false));
    }
  }, [tab, sysInstructionSaved]);

  // Load API key (admin only)
  useEffect(() => {
    if (isAdmin && tab === "apikey" && !apiKeyLoaded) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
          const masked = data.gemini_api_key ?? "";
          setApiKeyMasked(masked);
          setApiKeyLoaded(true);
        })
        .catch(() => {});
    }
  }, [isAdmin, tab, apiKeyLoaded]);

  async function handleSaveApiKey() {
    if (!apiKeyValue.trim()) return;
    setApiKeySaving(true);
    setApiKeySaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "gemini_api_key", value: apiKeyValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeyMasked(data.value);
        setApiKeyValue("");
        setApiKeyEditing(false);
        setApiKeySaved(true);
        setTimeout(() => setApiKeySaved(false), 2000);
      }
    } finally {
      setApiKeySaving(false);
    }
  }

  async function handleSaveInstructions() {
    setSysSaving(true);
    setSysSaved(false);
    try {
      const promises = [
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "base_instruction", value: baseInstruction }),
        }),
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "system_instruction", value: sysInstruction }),
        }),
      ];
      if (isAdmin) {
        promises.push(
          fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "patient_system_instruction", value: patientSysInstruction }),
          })
        );
      }
      const results = await Promise.all(promises);
      if (results.every(r => r.ok)) {
        setSysSaved(true);
        setSysInstructionSaved(sysInstruction || "__loaded__");
        setTimeout(() => setSysSaved(false), 2000);
      }
    } finally {
      setSysSaving(false);
    }
  }

  // ── User management state ───────────────────
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  // ── SMS Settings state ──────────────────────
  const [smsHeaders, setSmsHeaders] = useState<string[]>([]);
  const [smsHeadersLoading, setSmsHeadersLoading] = useState(false);
  const [activeHeader, setActiveHeader] = useState("");
  const [savingHeader, setSavingHeader] = useState(false);
  const [savedHeader, setSavedHeader] = useState(false);

  // ── Patient model state ────────────────────
  const [availableModels, setAvailableModels] = useState<{id:string;label:string}[]>([]);
  const [patientModel, setPatientModel] = useState("");
  const [savingModel, setSavingModel] = useState(false);
  const [savedModel, setSavedModel] = useState(false);

  useEffect(() => {
    if (isAdmin && tab === "sms_settings") {
      fetch("/api/settings")
        .then(r => r.json())
        .then(data => {
          if (data.netgsm_active_header) setActiveHeader(data.netgsm_active_header);
          if (data.patient_default_model) setPatientModel(data.patient_default_model);
        });

      setSmsHeadersLoading(true);
      fetch("/api/admin/sms/headers")
        .then(r => r.json())
        .then(data => {
          if (data.success) setSmsHeaders(data.headers);
        })
        .finally(() => setSmsHeadersLoading(false));

      fetch("/api/models")
        .then(r => r.json())
        .then(data => {
          if (data.gemini) setAvailableModels(data.gemini);
        })
        .catch(() => {});
    }
  }, [isAdmin, tab]);

  async function handleSaveSmsHeader() {
    setSavingHeader(true);
    setSavedHeader(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "netgsm_active_header", value: activeHeader }),
      });
      if (res.ok) {
        setSavedHeader(true);
        setTimeout(() => setSavedHeader(false), 2000);
      }
    } finally {
      setSavingHeader(false);
    }
  }

  async function handleSavePatientModel() {
    setSavingModel(true);
    setSavedModel(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "patient_default_model", value: patientModel }),
      });
      if (res.ok) {
        setSavedModel(true);
        setTimeout(() => setSavedModel(false), 2000);
      }
    } finally {
      setSavingModel(false);
    }
  }

  // ── SMS state ─────────────────────────────
  const [smsTarget, setSmsTarget] = useState<UserRow | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsPassword, setSmsPassword] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [smsSuccess, setSmsSuccess] = useState("");

  // ── Account (password change) state ────────
  const [acCurrentPw, setAcCurrentPw] = useState("");
  const [acNewPw, setAcNewPw] = useState("");
  const [acConfirmPw, setAcConfirmPw] = useState("");
  const [acLoading, setAcLoading] = useState(false);
  const [acError, setAcError] = useState("");
  const [acSuccess, setAcSuccess] = useState("");

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 8; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setAcError("");
    setAcSuccess("");
    if (acNewPw !== acConfirmPw) { setAcError("Şifreler eşleşmiyor."); return; }
    if (acNewPw.length < 6) { setAcError("Şifre en az 6 karakter olmalıdır."); return; }
    setAcLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: acCurrentPw, newPassword: acNewPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setAcSuccess("Şifreniz başarıyla güncellendi.");
        setAcCurrentPw(""); setAcNewPw(""); setAcConfirmPw("");
      } else {
        setAcError(data.error || "Hata oluştu.");
      }
    } catch {
      setAcError("Sunucu hatası.");
    } finally {
      setAcLoading(false);
    }
  }

  function openSmsModal(user: UserRow) {
    setSmsTarget(user);
    setSmsPhone("");
    setSmsPassword("");
    setSmsError("");
    setSmsSuccess("");
  }

  async function handleSmsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSmsLoading(true);
    setSmsError("");
    setSmsSuccess("");
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: smsTarget?.id, phone: smsPhone, newPassword: smsPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsSuccess("SMS başarıyla gönderildi.");
        setTimeout(() => setSmsTarget(null), 2000);
      } else {
        setSmsError(data.error || "Hata oluştu.");
      }
    } catch {
      setSmsError("Sunucu hatası.");
    } finally {
      setSmsLoading(false);
    }
  }

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && tab === "users") fetchUsers();
  }, [isAdmin, tab, fetchUsers]);

  function openAddForm() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(user: UserRow) {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role as "admin" | "user" });
    setFormError("");
    setShowForm(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const body: Partial<UserFormData> = { name: form.name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Bir hata oluştu"); return; }

      if (editingUser) {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? data : u)));
      } else {
        setUsers((prev) => [...prev, data]);
      }
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  }

  // ── Render ──────────────────────────────────
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl sm:mx-4 flex flex-col h-full sm:h-auto sm:max-h-[90vh]" style={{ background: "var(--bg-primary)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-secondary)" }}>
          <h2 className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>Ayarlar</h2>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ color: "var(--text-tertiary)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mobile: horizontal tab bar */}
        <div className="sm:hidden shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--border-secondary)", background: "var(--bg-secondary)" }}>
          <div className="flex gap-1 px-3 py-2 min-w-max">
            {isAdmin && <button onClick={() => setTab("users")} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${ tab === "users" ? "shadow-sm" : "opacity-60" }`} style={tab === "users" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : { color: "var(--text-secondary)" }}>Kullanıcılar</button>}
            {isAdmin && <button onClick={() => setTab("apikey")} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${ tab === "apikey" ? "shadow-sm" : "opacity-60" }`} style={tab === "apikey" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : { color: "var(--text-secondary)" }}>API</button>}
            {isAdmin && <button onClick={() => setTab("sms_settings")} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${ tab === "sms_settings" ? "shadow-sm" : "opacity-60" }`} style={tab === "sms_settings" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : { color: "var(--text-secondary)" }}>Genel</button>}
            {!isPatient && <button onClick={() => setTab("instructions")} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${ tab === "instructions" ? "shadow-sm" : "opacity-60" }`} style={tab === "instructions" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : { color: "var(--text-secondary)" }}>Talimatlar</button>}
            <button onClick={() => setTab("theme")} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${ tab === "theme" ? "shadow-sm" : "opacity-60" }`} style={tab === "theme" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : { color: "var(--text-secondary)" }}>Görünüm</button>
            <button onClick={() => setTab("account")} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${ tab === "account" ? "shadow-sm" : "opacity-60" }`} style={tab === "account" ? { background: "var(--bg-primary)", color: "var(--text-primary)" } : { color: "var(--text-secondary)" }}>Hesabım</button>
          </div>
        </div>

        {/* Sidebar + Content layout */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div className="hidden sm:block w-48 shrink-0 py-3 px-2 overflow-y-auto" style={{ borderRight: "1px solid var(--border-secondary)", background: "var(--bg-secondary)" }}>
            <nav className="flex flex-col gap-0.5">
              {isAdmin && (
                <button onClick={() => setTab("users")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${ tab === "users" ? "shadow-sm" : "opacity-70 hover:opacity-100" }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  Kullanıcılar
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setTab("apikey")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${ tab === "apikey" ? "shadow-sm" : "opacity-70 hover:opacity-100" }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
                  API Anahtarı
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setTab("sms_settings")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${ tab === "sms_settings" ? "shadow-sm" : "opacity-70 hover:opacity-100" }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Genel Ayarlar
                </button>
              )}
              {!isPatient && (
                <button onClick={() => setTab("instructions")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${ tab === "instructions" ? "shadow-sm" : "opacity-70 hover:opacity-100" }`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  Talimatlar
                </button>
              )}
              <button onClick={() => setTab("theme")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${ tab === "theme" ? "shadow-sm" : "opacity-70 hover:opacity-100" }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg>
                Görünüm
              </button>
              <div className="my-2 border-t border-gray-100" />
              <button onClick={() => setTab("account")} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium transition-all ${ tab === "account" ? "shadow-sm" : "opacity-70 hover:opacity-100" }`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                Hesabım
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">

          {/* ── ACCOUNT TAB ── */}
          {tab === "account" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Şifre Değiştir</h3>
                <p className="text-xs text-gray-500 mb-4">Mevcut şifrenizi girerek yeni bir şifre belirleyebilirsiniz.</p>
              </div>
              {acError && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{acError}</p>}
              {acSuccess && <p className="text-xs text-green-600 bg-green-50 rounded-xl px-4 py-2.5">{acSuccess}</p>}
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Mevcut Şifre</label>
                  <input type="password" required value={acCurrentPw} onChange={e => setAcCurrentPw(e.target.value)} className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Yeni Şifre</label>
                  <input type="password" required minLength={6} value={acNewPw} onChange={e => setAcNewPw(e.target.value)} className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent" placeholder="En az 6 karakter" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Yeni Şifre (Tekrar)</label>
                  <input type="password" required minLength={6} value={acConfirmPw} onChange={e => setAcConfirmPw(e.target.value)} className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent" placeholder="Tekrar girin" />
                </div>
                <button type="submit" disabled={acLoading} className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50" style={{ backgroundColor: "var(--brand)" }}>
                  {acLoading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                </button>
              </form>
            </div>
          )}

          {/* ── SMS SETTINGS TAB ── */}
          {tab === "sms_settings" && isAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">NetGSM Aktif Gönderici Başlığı</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Sistemin göndereceği SMS'lerde kullanılacak gönderici başlığını seçin. Başlıkların listesi NetGSM hesabınızdan otomatik olarak çekilmektedir.
                </p>
                {smsHeadersLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-[var(--brand)] rounded-full animate-spin" />
                  </div>
                ) : smsHeaders.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {smsHeaders.map((header) => (
                        <button
                          key={header}
                          type="button"
                          onClick={() => setActiveHeader(header)}
                          className={`relative px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                            activeHeader === header
                              ? "border-[var(--brand)] bg-[var(--brand)]/5 text-gray-900 shadow-sm"
                              : "border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {activeHeader === header && (
                            <span className="absolute top-2 right-2">
                              <svg className="w-4 h-4" fill="var(--brand)" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </span>
                          )}
                          {header}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveSmsHeader}
                        disabled={savingHeader || !activeHeader}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "var(--brand)" }}
                      >
                        {savingHeader ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                      {savedHeader && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Başlık kaydedildi
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg">
                    Onaylı SMS başlığı bulunamadı veya API bilgileri geçersiz. Lütfen .env dosyanızdaki NetGSM ayarlarını kontrol edin.
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Patient Default Model */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Hasta Varsayılan Modeli</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Hastalar sohbette model değiştiremez. Burada seçtiğiniz model tüm hastalar için varsayılan olarak kullanılacaktır.
                </p>
                {availableModels.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {availableModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPatientModel(m.id)}
                          className={`relative px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-all ${
                            patientModel === m.id
                              ? "border-[var(--brand)] bg-[var(--brand)]/5 text-gray-900 shadow-sm"
                              : "border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {patientModel === m.id && (
                            <span className="absolute top-2 right-2">
                              <svg className="w-4 h-4" fill="var(--brand)" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            </span>
                          )}
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSavePatientModel}
                        disabled={savingModel || !patientModel}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "var(--brand)" }}
                      >
                        {savingModel ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                      {savedModel && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Model kaydedildi
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-[var(--brand)] rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── THEME TAB ── */}
          {tab === "theme" && (
            <div>
              {/* Dark / Light Mode Toggle */}
              <div className="mb-6">
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>Mod seçin</p>
                <div className="flex gap-2">
                  {(["light", "dark"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { setColorMode(mode); applyColorMode(mode); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        colorMode === mode
                          ? "border-[var(--brand)] shadow-sm"
                          : "hover:opacity-80"
                      }`}
                      style={{
                        borderColor: colorMode === mode ? "var(--brand)" : "var(--border-primary)",
                        background: colorMode === mode ? "var(--brand-light)" : "var(--bg-secondary)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {mode === "light" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" strokeWidth={1.5}/><path strokeLinecap="round" strokeWidth={1.5} d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>
                      )}
                      {mode === "light" ? "Açık" : "Koyu"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-1" style={{ borderTop: "1px solid var(--border-primary)" }} />

              <p className="text-sm mb-5 mt-5" style={{ color: "var(--text-secondary)" }}>Uygulamanın vurgu rengini seçin. Seçiminiz tarayıcıda kaydedilir.</p>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 sm:gap-3">
                {THEME_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleThemeSelect(color.id)}
                    title={color.label}
                    className={`flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 transition-all ${
                      activeTheme === color.id
                        ? "border-gray-800 shadow-md scale-105"
                        : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    <span
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[9px] sm:text-[10px] text-gray-600 font-medium">{color.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <p className="text-sm text-gray-500 mb-5">Yapay zeka mesaj ikonunu seçin. Klinik logosu sabit kalır.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ASSISTANT_ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon.id}
                      onClick={() => handleAssistantIconSelect(icon.id)}
                      title={icon.label}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        activeAssistantIcon === icon.id
                          ? "border-gray-800 shadow-md scale-[1.02]"
                          : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      <AssistantAvatar iconId={icon.id} className="w-12 h-12 rounded-xl" />
                      <span className="text-[10px] text-gray-600 font-medium">{icon.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SYSTEM INSTRUCTION TAB ── */}
          {tab === "instructions" && (
            <div className="space-y-5">
              {sysLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-[var(--brand)] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Base instruction */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Temel Talimat</label>
                    <p className="text-xs text-gray-400">
                      AI&apos;ın kim olduğunu ve nasıl davranacağını tanımlayan ana talimat. Boş bırakırsanız varsayılan kullanılır.
                    </p>
                    <textarea
                      value={baseInstruction}
                      onChange={(e) => setBaseInstruction(e.target.value)}
                      rows={5}
                      maxLength={4000}
                      placeholder={"Örnek: Sen Mahmut Yücel'in fizyoterapi kliniğinin yapay zeka asistanısın. Türkçe cevap ver."}
                      className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none font-mono leading-relaxed"
                    />
                    <span className="text-xs text-gray-400">
                      {baseInstruction.length} / 4000 karakter
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* Custom instruction */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Ek Talimatlar</label>
                    <p className="text-xs text-gray-400">
                      Temel talimata ek olarak gönderilecek özel kurallar.
                    </p>
                    <textarea
                      value={sysInstruction}
                      onChange={(e) => setSysInstruction(e.target.value)}
                      rows={6}
                      maxLength={4000}
                      placeholder={"Örnek:\n- Her zaman nazik ve profesyonel ol.\n- Yanıtlarını kısa tut.\n- Fizyoterapi dışı konularda yardım etme."}
                      className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none font-mono leading-relaxed"
                    />
                    <span className="text-xs text-gray-400">
                      {sysInstruction.length} / 4000 karakter
                    </span>
                  </div>

                  {isAdmin && (
                    <>
                      <div className="border-t border-gray-100" />
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Genel Hasta Talimatı</label>
                        <p className="text-xs text-gray-400">
                          Tüm hastalar için geçerli olacak genel kurallar (Örn: Hastalarla ismiyle konuş, onlara moral ver).
                        </p>
                        <textarea
                          value={patientSysInstruction}
                          onChange={(e) => setPatientSysInstruction(e.target.value)}
                          rows={4}
                          maxLength={4000}
                          placeholder={"Örnek:\n- Hastalara nazik davran, moral ver.\n- Hastalıklarıyla ilgili endişelendirecek yorumlardan kaçın."}
                          className="w-full text-sm px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none font-mono leading-relaxed"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-end gap-3">
                    {sysSaved && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Kaydedildi
                      </span>
                    )}
                    <button
                      onClick={handleSaveInstructions}
                      disabled={sysSaving}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "var(--brand)" }}
                    >
                      {sysSaving ? "Kaydediliyor…" : "Kaydet"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── API KEY TAB ── */}
          {tab === "apikey" && isAdmin && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Gemini API Anahtarı</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Google AI Studio&apos;dan aldığınız API anahtarını buraya girin. Bu anahtar veritabanında saklanır ve .env dosyasındaki anahtarın yerine kullanılır.
                </p>
              </div>

              {/* Current key display */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Mevcut Anahtar</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={apiKeyMasked || "Tanımlanmamış"}
                    className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono"
                  />
                  {apiKeyMasked && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-[11px] text-green-600 font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Edit section */}
              {apiKeyEditing ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Yeni API Anahtarı</label>
                    <input
                      type="password"
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      placeholder="AIza..."
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      disabled={apiKeySaving || !apiKeyValue.trim()}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "var(--brand)" }}
                    >
                      {apiKeySaving ? "Kaydediliyor…" : "Kaydet"}
                    </button>
                    <button
                      onClick={() => { setApiKeyEditing(false); setApiKeyValue(""); }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setApiKeyEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: "var(--brand)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {apiKeyMasked ? "Anahtarı Değiştir" : "Anahtar Ekle"}
                </button>
              )}

              {apiKeySaved && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  API anahtarı güncellendi
                </span>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">
                  <strong>Not:</strong> API anahtarı veritabanında şifrelenmemiş olarak saklanır. Eğer .env dosyasında da bir anahtar varsa, veritabanındaki öncelikli olarak kullanılır.
                </p>
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === "users" && isAdmin && (
            <div>
              {smsTarget ? (
                <form onSubmit={handleSmsSubmit} className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {smsTarget.name} - Giriş Bilgilerini SMS Gönder
                  </h3>
                  {smsError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{smsError}</p>}
                  {smsSuccess && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">{smsSuccess}</p>}
                  <p className="text-xs text-gray-500">
                    Kullanıcının giriş şifresi aşağıda yazdığınız şifre ile güncellenecek ve kendisine giriş yapabilmesi için SMS gönderilecektir.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Telefon Numarası</label>
                    <input type="text" required value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="5XX XXX XX XX" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Yeni Şifre (Geçici Şifre)</label>
                    <div className="flex gap-2">
                      <input type="text" required minLength={6} value={smsPassword} onChange={e => setSmsPassword(e.target.value)} placeholder="123456" className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                      <button type="button" onClick={() => setSmsPassword(generateRandomPassword())} className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap" title="8 haneli rastgele şifre oluştur">
                        🎲 Rastgele
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={smsLoading || !!smsSuccess} className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 bg-green-600 hover:bg-green-700">
                      {smsLoading ? "Gönderiliyor..." : "SMS Gönder"}
                    </button>
                    <button type="button" onClick={() => setSmsTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">
                      İptal
                    </button>
                  </div>
                </form>
              ) : showForm ? (
                /* ── User form ── */
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {editingUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı Ekle"}
                  </h3>
                  {formError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ad Soyad</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                        placeholder="Mehmet Yılmaz"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">E-posta</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                        placeholder="ornek@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {editingUser ? "Yeni Şifre (boş bırakılırsa değişmez)" : "Şifre"}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        minLength={6}
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                        placeholder="En az 6 karakter"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Rol</label>
                      <div className="flex gap-2">
                        {(["user", "admin"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, role: r }))}
                            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                              form.role === r
                                ? "border-[var(--brand)] bg-[var(--brand)]/5 text-gray-900"
                                : "border-gray-100 text-gray-500 hover:border-gray-200"
                            }`}
                          >
                            {r === "admin" ? "Admin" : "Kullanıcı"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: "var(--brand)" }}
                    >
                      {formLoading ? "Kaydediliyor…" : editingUser ? "Güncelle" : "Ekle"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : deleteTarget ? (
                /* ── Delete confirm ── */
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.email}) kullanıcısını silmek istediğinizden emin misiniz?
                    Bu işlem geri alınamaz ve kullanıcının tüm sohbetleri de silinir.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Evet, Sil
                    </button>
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                /* ── User table ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{users.length} kullanıcı</p>
                    <button
                      onClick={openAddForm}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors"
                      style={{ backgroundColor: "var(--brand)" }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Kullanıcı Ekle
                    </button>
                  </div>
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-[var(--brand)] rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <th className="text-left px-4 py-3">Ad Soyad</th>
                            <th className="text-left px-4 py-3">E-posta</th>
                            <th className="text-left px-4 py-3">Rol</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-800">{user.name}</td>
                              <td className="px-4 py-3 text-gray-600">{user.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user.role === "admin"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}>
                                  {user.role === "admin" ? "Admin" : "Kullanıcı"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => openSmsModal(user)}
                                    className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                                    title="SMS Gönder"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 16.5c0 .83-.67 1.5-1.5 1.5h-4.34l-3.32 2.66a1 1 0 01-1.64-.78V18H4.5C3.67 18 3 17.33 3 16.5v-10C3 5.67 3.67 5 4.5 5h15c.83 0 1.5.67 1.5 1.5v10z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openEditForm(user)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Düzenle"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(user)}
                                    disabled={user.id === session?.user?.id}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Sil"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
