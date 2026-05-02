"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { THEME_COLORS, applyTheme, loadSavedTheme } from "@/lib/theme";
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
  const defaultTab = isAdmin ? "users" : isPatient ? "theme" : "instructions";
  const [tab, setTab] = useState<"users" | "theme" | "instructions" | "apikey">(defaultTab);

  // ── Theme tab state ─────────────────────────
  const [activeTheme, setActiveTheme] = useState(loadSavedTheme());
  const [activeAssistantIcon, setActiveAssistantIcon] = useState(loadSavedAssistantIconId());

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Ayarlar</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 gap-4">
          {isAdmin && (
            <button
              onClick={() => setTab("users")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === "users" ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Kullanıcı Yönetimi
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setTab("apikey")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === "apikey" ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              API Anahtarı
            </button>
          )}
          {!isPatient && (
            <button
              onClick={() => setTab("instructions")}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === "instructions" ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Sistem Talimatı
            </button>
          )}
          <button
            onClick={() => setTab("theme")}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === "theme" ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Renk Teması
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── THEME TAB ── */}
          {tab === "theme" && (
            <div>
              <p className="text-sm text-gray-500 mb-5">Uygulamanın vurgu rengini seçin. Seçiminiz tarayıcıda kaydedilir.</p>
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
              {showForm ? (
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "user" }))}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent bg-white"
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="admin">Admin</option>
                      </select>
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
    </div>,
    document.body
  );
}
