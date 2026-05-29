"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface PatientProfile {
  photo: string | null;
  age: number | null;
  phone: string | null;
  gender: string | null;
  shortDescription: string | null;
  longDetails: string | null;
  clinicalOpinion: string | null;
  videoLinks: string[];
  responsibleAdminId: string | null;
  responsibleAdmin: { id: string; name: string } | null;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  usageLimit: number;
  usageUsed: number;
  usageResetAt: string;
  patientProfile: PatientProfile | null;
}

interface AdminUser {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  photo: "",
  age: "",
  phone: "",
  gender: "",
  shortDescription: "",
  longDetails: "",
  clinicalOpinion: "",
  videoLinks: [] as string[],
  responsibleAdminId: "",
};

export default function PatientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  // Password reveal
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string | null>>({});
  const [revealLoading, setRevealLoading] = useState<Record<string, boolean>>({});
  const [formPasswordVisible, setFormPasswordVisible] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  
  // Import States
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success: number, failed: number, duplicate: number, errors: string[]} | null>(null);

  // Delete States
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleRevealPassword(userId: string) {
    if (revealedPasswords[userId] !== undefined) {
      // Toggle visibility: remove to hide
      setRevealedPasswords(prev => { const n = {...prev}; delete n[userId]; return n; });
      return;
    }
    setRevealLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`);
      const data = await res.json();
      setRevealedPasswords(prev => ({ ...prev, [userId]: data.password ?? data.message ?? "Bilinmiyor" }));
    } catch {
      setRevealedPasswords(prev => ({ ...prev, [userId]: "Hata" }));
    } finally {
      setRevealLoading(prev => ({ ...prev, [userId]: false }));
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.attachments?.[0]) {
        const filePath = `/api/files/${data.attachments[0].filePath}`;
        setForm(prev => ({ ...prev, photo: filePath }));
      } else {
        setError(data.error || "Fotoğraf yüklenemedi.");
      }
    } catch {
      setError("Fotoğraf yüklenirken hata oluştu.");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  const [smsTarget, setSmsTarget] = useState<Patient | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsPassword, setSmsPassword] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [smsSuccess, setSmsSuccess] = useState("");

  const [smsFetching, setSmsFetching] = useState(false);

  async function openSmsModal(p: Patient) {
    setSmsTarget(p);
    setSmsPhone(p.patientProfile?.phone || "");
    setSmsPassword("");
    setSmsError("");
    setSmsSuccess("");
    
    // Var olan şifreyi otomatik çek
    setSmsFetching(true);
    try {
      if (revealedPasswords[p.id]) {
        setSmsPassword(revealedPasswords[p.id] as string);
      } else {
        const res = await fetch(`/api/admin/users/${p.id}/password`);
        const data = await res.json();
        if (res.ok && data.password) {
          setSmsPassword(data.password);
          setRevealedPasswords(prev => ({ ...prev, [p.id]: data.password }));
        }
      }
    } catch {
      // sessizce devam et
    } finally {
      setSmsFetching(false);
    }
  }

  // ── Rights Grant State ──
  const [rightsTarget, setRightsTarget] = useState<Patient | null>(null);
  const [rightsAmount, setRightsAmount] = useState<number | string>(10);
  const [rightsLoading, setRightsLoading] = useState(false);
  const [rightsSuccess, setRightsSuccess] = useState("");
  const [rightsError, setRightsError] = useState("");

  function openRightsModal(p: Patient) {
    setRightsTarget(p);
    setRightsAmount(10);
    setRightsError("");
    setRightsSuccess("");
  }

  async function handleRightsSubmit(amount: number | string) {
    if (!amount) return;
    setRightsLoading(true);
    setRightsError("");
    setRightsSuccess("");
    
    let action = "add";
    let finalAmount = Number(amount);
    if (amount === "unlimited") {
      action = "set";
      finalAmount = 999999;
    }

    try {
      const res = await fetch(`/api/admin/patients/${rightsTarget?.id}/rights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setRightsSuccess(data.message || "Hak başarıyla tanımlandı!");
        
        // Update local state immediately
        if (editingPatient && editingPatient.id === rightsTarget?.id) {
          setEditingPatient(prev => prev ? { ...prev, usageLimit: data.usageLimit, usageUsed: data.usageUsed } : prev);
        }
        setPatients(prev => prev.map(p => p.id === rightsTarget?.id ? { ...p, usageLimit: data.usageLimit, usageUsed: data.usageUsed } : p));
        
        setTimeout(() => setRightsTarget(null), 3000);
      } else {
        setRightsError(data.error || "Hata oluştu.");
      }
    } catch {
      setRightsError("Sunucu hatası.");
    } finally {
      setRightsLoading(false);
    }
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session.user.role !== "admin") {
        router.push("/chat");
      } else {
        fetchPatients(page, search);
        // Fetch admin list for responsible dropdown
        fetch("/api/admin/users")
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) setAdmins(data.filter((u: any) => u.role === "admin"));
          })
          .catch(() => {});
      }
    }
  }, [status, session, router, page]);

  async function fetchPatients(p: number, s: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/patients?page=${p}&limit=10&search=${encodeURIComponent(s)}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.items);
        setTotalPages(data.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPatients(1, search);
  }

  function openAddForm() {
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEditForm(p: Patient) {
    setEditingPatient(p);
    const prof = p.patientProfile;
    setForm({
      name: p.name,
      email: p.email,
      password: "", // empty for edit
      photo: prof?.photo || "",
      age: prof?.age ? prof.age.toString() : "",
      phone: prof?.phone || "",
      gender: prof?.gender || "",
      shortDescription: prof?.shortDescription || "",
      longDetails: prof?.longDetails || "",
      clinicalOpinion: prof?.clinicalOpinion || "",
      videoLinks: prof?.videoLinks || [],
      responsibleAdminId: prof?.responsibleAdminId || "",
    });
    setNewVideoUrl("");
    setError("");
    setShowForm(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    const body: any = { ...form };
    body.videoLinks = form.videoLinks.filter(Boolean);

    const url = editingPatient ? `/api/admin/patients/${editingPatient.id}` : "/api/admin/patients";
    const method = editingPatient ? "PATCH" : "POST";

    if (editingPatient && !body.password) {
      delete body.password;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu");
        return;
      }
      setShowForm(false);
      fetchPatients(page, search);
    } finally {
      setFormLoading(false);
    }
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await fetch(`/api/admin/patients/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPatients(page, search);
      setDeleteTarget(null);
    }
    setIsDeleting(false);
  }

  function handleExport() {
    const dataToExport = patients.map(p => ({
      "Ad Soyad": p.name,
      "E-posta": p.email,
      "Telefon": p.patientProfile?.phone || "",
      "Yaş": p.patientProfile?.age || "",
      "Cinsiyet": p.patientProfile?.gender || "",
      "Kısa Tanıtım": p.patientProfile?.shortDescription || "",
      "Uzun Detaylar": p.patientProfile?.longDetails || "",
      "Klinik Görüş": p.patientProfile?.clinicalOpinion || "",
      "Video Linkleri": (p.patientProfile?.videoLinks || []).join(", "),
      "Sorumlu": p.patientProfile?.responsibleAdmin?.name || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hastalar");
    XLSX.writeFile(workbook, "hastalar.xlsx");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedData = data.map((row: any) => ({
          name: row["Ad Soyad"] || row["Ad"] || row["Name"],
          email: row["E-posta"] || row["Email"],
          phone: row["Telefon"] || row["Phone"] || "",
          age: row["Yaş"] || row["Age"] || "",
          gender: row["Cinsiyet"] || row["Gender"] || "",
          shortDescription: row["Kısa Tanıtım"] || "",
          longDetails: row["Uzun Detaylar"] || "",
          clinicalOpinion: row["Klinik Görüş"] || "",
          videoLinks: row["Video Linkleri"] ? row["Video Linkleri"].split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          responsibleAdminName: row["Sorumlu"] || "",
        }));

        setIsImporting(true);
        const res = await fetch("/api/admin/patients/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patients: formattedData }),
        });
        
        const result = await res.json();
        if (res.ok) {
          setImportResult({
            success: result.success,
            failed: result.failed,
            duplicate: result.duplicate || 0,
            errors: result.errors
          });
          fetchPatients(page, search);
        } else {
          setImportResult({
            success: 0,
            failed: formattedData.length,
            duplicate: 0,
            errors: [result.error || "Sunucu hatası oluştu."]
          });
        }
      } catch (err) {
        setImportResult({
          success: 0,
          failed: 1,
          duplicate: 0,
          errors: ["Dosya okunamadı veya sunucuya ulaşılamadı."]
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  }

  if (status === "loading" || loading && patients.length === 0) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hastalarım</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Hastalarınızı yönetin, listeleyin ve sisteme giriş yapmalarını sağlayın.</p>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                  Yükleniyor...
                </>
              ) : (
                "İçe Aktar"
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={isImporting}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
            >
              Dışa Aktar
            </button>
            <button
              onClick={openAddForm}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-lg"
              style={{ backgroundColor: "var(--brand)" }}
            >
              + Yeni Hasta
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya e-posta ile ara..."
            className="flex-1 max-w-md px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Ara
          </button>
        </form>

        {/* Desktop Table */}
        <div className="hidden sm:block bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-[var(--border-primary)]">Ad Soyad</th>
                <th className="px-6 py-4 border-b border-[var(--border-primary)]">E-posta</th>
                <th className="px-6 py-4 border-b border-[var(--border-primary)]">Telefon</th>
                <th className="px-6 py-4 border-b border-[var(--border-primary)]">Yaş / Cinsiyet</th>
                <th className="px-6 py-4 border-b border-[var(--border-primary)]">Sorumlu</th>
                <th className="px-6 py-4 border-b border-[var(--border-primary)] text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{p.name}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{p.email}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{p.patientProfile?.phone || "-"}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">{p.patientProfile?.age || "-"} / {p.patientProfile?.gender || "-"}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">
                    {p.patientProfile?.responsibleAdmin ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-medium">
                        {p.patientProfile.responsibleAdmin.name}
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)] text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Password reveal */}
                      <button
                        onClick={() => handleRevealPassword(p.id)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono border border-[var(--border-secondary)] rounded-md px-2 py-1 hover:bg-[var(--bg-tertiary)] transition-all"
                        title="Şifreyi göster/gizle"
                      >
                        {revealLoading[p.id] ? (
                          <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : revealedPasswords[p.id] !== undefined ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            <span className="max-w-[100px] truncate">{revealedPasswords[p.id]}</span>
                          </>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                      <button onClick={() => openSmsModal(p)} className="text-green-600 hover:text-green-800 font-medium text-xs">SMS</button>
                      <button onClick={() => openEditForm(p)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Düzenle</button>
                      <button onClick={() => setDeleteTarget(p)} className="text-red-600 hover:text-red-800 font-medium text-xs">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3 mb-6">
          {patients.map(p => (
            <div key={p.id} className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-primary)] text-sm truncate">{p.name}</div>
                  <div className="text-xs text-[var(--text-secondary)] truncate">{p.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleRevealPassword(p.id)} className="text-gray-500 hover:text-gray-800" title="Şifre">
                    {revealLoading[p.id] ? (
                      <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                  <button onClick={() => openSmsModal(p)} className="text-green-600 text-xs font-medium">SMS</button>
                  <button onClick={() => openEditForm(p)} className="text-blue-600 text-xs font-medium">Düzenle</button>
                  <button onClick={() => setDeleteTarget(p)} className="text-red-600 text-xs font-medium">Sil</button>
                </div>
              </div>
              {revealedPasswords[p.id] !== undefined && (
                <div className="mt-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg text-xs font-mono text-[var(--text-primary)]">
                  🔑 {revealedPasswords[p.id]}
                </div>
              )}
              <div className="flex gap-4 text-xs text-[var(--text-secondary)] mt-2 flex-wrap">
                <span>📞 {p.patientProfile?.phone || "-"}</span>
                <span>🎂 {p.patientProfile?.age || "-"}</span>
                <span>{p.patientProfile?.gender || "-"}</span>
                {p.patientProfile?.responsibleAdmin && (
                  <span className="text-purple-600 dark:text-purple-400 font-medium ml-auto">
                    👤 {p.patientProfile.responsibleAdmin.name}
                  </span>
                )}
              </div>
            </div>
          ))}
          {patients.length === 0 && !loading && (
            <div className="text-center text-gray-500 text-sm py-8">Kayıt bulunamadı.</div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Önceki
            </button>
            <span className="px-4 py-1.5 text-sm text-gray-600">Sayfa {page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}

        {/* Rights Modal */}
        {rightsTarget ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setRightsTarget(null)} />
            <div className="bg-[var(--bg-primary)] rounded-3xl shadow-2xl w-full max-w-sm p-8 relative border border-[var(--border-secondary)] transform transition-all scale-100 opacity-100 overflow-hidden">
              {/* Background decorative glow */}
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

              <button onClick={() => setRightsTarget(null)} className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] z-10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4 transform rotate-3">
                  <svg className="w-8 h-8 text-white filter drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Özel Hak Tanımla</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  <span className="font-semibold text-[var(--text-primary)]">{rightsTarget.name}</span> kullanıcısına yapay zeka kullanım hakkı hediye edin.
                </p>

                {rightsError && <p className="text-sm text-red-600 bg-red-50/10 border border-red-500/20 p-3 rounded-xl mb-4 w-full">{rightsError}</p>}
                {rightsSuccess && <p className="text-sm text-green-600 bg-green-50/10 border border-green-500/20 p-3 rounded-xl mb-4 w-full font-medium">{rightsSuccess}</p>}

                {!rightsSuccess && (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2 px-2">
                      <span>Mevcut Limit: <strong className="text-[var(--text-primary)]">{rightsTarget.usageLimit}</strong></span>
                      <span>Kalan: <strong className="text-[var(--brand)]">{Math.max(0, rightsTarget.usageLimit - rightsTarget.usageUsed)}</strong></span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
                      <input 
                        type="number" 
                        min="1"
                        value={rightsAmount} 
                        onChange={(e) => setRightsAmount(e.target.value)}
                        placeholder="Miktar giriniz"
                        className="w-full py-3 px-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-center font-medium"
                      />
                      <button
                        onClick={() => handleRightsSubmit(rightsAmount)}
                        disabled={rightsLoading || !rightsAmount}
                        className="w-full sm:w-auto py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md shadow-purple-500/20 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      >
                        Ekle
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleRightsSubmit("unlimited")}
                      disabled={rightsLoading}
                      className="w-full py-3 px-4 rounded-xl font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      Limitsiz Kullanım (Sınırsız)
                    </button>
                    <div className="flex gap-4 mb-6">
                      <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{importResult.success}</div>
                        <div className="text-xs text-green-700 dark:text-green-500 font-medium uppercase tracking-wider">Başarılı</div>
                      </div>
                      <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 text-center">
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{importResult.duplicate}</div>
                        <div className="text-xs text-orange-700 dark:text-orange-500 font-medium uppercase tracking-wider">Kopya / Es Geçildi</div>
                      </div>
                      <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-center">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{importResult.failed}</div>
                        <div className="text-xs text-red-700 dark:text-red-500 font-medium uppercase tracking-wider">Hatalı</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : smsTarget ? (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
              <h2 className="text-xl font-bold mb-4">Giriş Bilgilerini SMS Gönder</h2>
              <button onClick={() => setSmsTarget(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <form onSubmit={handleSmsSubmit} className="space-y-4">
                {smsError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{smsError}</p>}
                {smsSuccess && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{smsSuccess}</p>}
                <p className="text-sm text-gray-500">
                  Kullanıcının mevcut şifresi aşağıya otomatik getirildi. İsterseniz değiştirip yeni şifreyi SMS olarak gönderebilirsiniz.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefon Numarası</label>
                  <input type="text" required value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="5XX XXX XX XX" className="w-full text-sm px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Şifre (Mevcut şifre otomatik getirildi)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required 
                      minLength={6} 
                      value={smsPassword} 
                      onChange={e => setSmsPassword(e.target.value)} 
                      placeholder={smsFetching ? "Şifre getiriliyor..." : "123456"} 
                      disabled={smsFetching}
                      className="flex-1 text-sm px-3 py-2 border rounded-lg disabled:bg-gray-50 disabled:text-gray-500" 
                    />
                    <button type="button" onClick={() => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let p = ""; for (let i = 0; i < 8; i++) p += c.charAt(Math.floor(Math.random() * c.length)); setSmsPassword(p); }} className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap" title="8 haneli rastgele şifre oluştur">
                      🎲 Rastgele
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setSmsTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">İptal</button>
                  <button type="submit" disabled={smsLoading || !!smsSuccess} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 bg-green-600 hover:bg-green-700">
                    {smsLoading ? "Gönderiliyor..." : "Gönder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-full overflow-y-auto p-6 relative">
              <h2 className="text-xl font-bold mb-4">{editingPatient ? "Hasta Düzenle" : "Yeni Hasta Ekle"}</h2>
              <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              {/* Usage Rights Display in Edit Form */}
              {editingPatient && (
                <div className="mb-6 p-4 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="w-full sm:w-auto">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Yapay Zeka Kullanım Hakları
                    </h3>
                    <div className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>Kalan: <strong className="text-[var(--text-primary)]">{Math.max(0, editingPatient.usageLimit - editingPatient.usageUsed)}</strong> / {editingPatient.usageLimit}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Sıfırlanma: {new Date(editingPatient.usageResetAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRightsModal(editingPatient)}
                    className="w-full sm:w-auto px-4 py-2 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg shadow-sm shadow-purple-500/20 hover:shadow-md transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Hak Tanımla
                  </button>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Ad Soyad *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">E-posta *</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">{editingPatient ? "Şifre (Değiştirmek için doldurun)" : "Şifre *"}</label>
                    <div className="relative">
                      <input
                        type={formPasswordVisible ? "text" : "password"}
                        required={!editingPatient}
                        minLength={6}
                        value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg pr-10"
                        placeholder={editingPatient ? "••••••" : "En az 6 karakter"}
                      />
                      <button
                        type="button"
                        onClick={() => setFormPasswordVisible(v => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-700"
                      >
                        {formPasswordVisible ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                    {editingPatient && (
                      <button
                        type="button"
                        onClick={() => handleRevealPassword(editingPatient.id)}
                        className="mt-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {revealedPasswords[editingPatient.id] !== undefined
                          ? `Mevcut: ${revealedPasswords[editingPatient.id]}`
                          : "Mevcut Şifreyi Göster"}
                      </button>
                    )}
                  </div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Yaş</label><input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cinsiyet</label>
                    <div className="relative">
                      <select
                        value={form.gender}
                        onChange={e => setForm({...form, gender: e.target.value})}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent pr-9"
                        style={{ color: form.gender ? "#111827" : "#9ca3af" }}
                      >
                        <option value="">Seçiniz</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sorumlu Admin (Fizyoterapist)</label>
                    <div className="relative">
                      <select
                        value={form.responsibleAdminId}
                        onChange={e => setForm({...form, responsibleAdminId: e.target.value})}
                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent pr-9"
                        style={{ color: form.responsibleAdminId ? "#111827" : "#9ca3af" }}
                      >
                        <option value="">Atanmamış</option>
                        {admins.map(admin => (
                          <option key={admin.id} value={admin.id}>{admin.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hasta Fotoğrafı</label>
                    <div className="flex items-center gap-4">
                      {form.photo && (
                        <img src={form.photo} alt="Hasta" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          ref={photoInputRef}
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={photoUploading}
                          onClick={() => photoInputRef.current?.click()}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          {photoUploading ? "Yükleniyor..." : form.photo ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
                        </button>
                        {form.photo && (
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, photo: "" }))}
                            className="ml-2 px-3 py-2 text-sm text-red-600 hover:text-red-800"
                          >
                            Kaldır
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Kısa Hastalık Tanıtımı</label><input value={form.shortDescription} onChange={e => setForm({...form, shortDescription: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Uzun Detaylar</label><textarea value={form.longDetails} onChange={e => setForm({...form, longDetails: e.target.value})} rows={3} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Klinik Görüş</label><textarea value={form.clinicalOpinion} onChange={e => setForm({...form, clinicalOpinion: e.target.value})} rows={2} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Video Linkleri</label>
                    <div className="space-y-3">
                      {form.videoLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          {/* Video Önizleme */}
                          <div className="w-24 h-16 bg-black rounded-md overflow-hidden shrink-0 flex items-center justify-center relative">
                            {link.includes("youtube.com") || link.includes("youtu.be") ? (
                              <img src={`https://img.youtube.com/vi/${link.includes("v=") ? link.split("v=")[1].split("&")[0] : link.split("youtu.be/")[1]?.split("?")[0]}/mqdefault.jpg`} className="w-full h-full object-cover" alt="Video Preview" />
                            ) : (
                              <svg className="w-6 h-6 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          {/* Input */}
                          <input 
                            value={link} 
                            onChange={e => {
                              const newLinks = [...form.videoLinks];
                              newLinks[idx] = e.target.value;
                              setForm({ ...form, videoLinks: newLinks });
                            }} 
                            className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg w-full" 
                          />
                          <button 
                            type="button" 
                            onClick={() => {
                              const newLinks = [...form.videoLinks];
                              newLinks.splice(idx, 1);
                              setForm({ ...form, videoLinks: newLinks });
                            }} 
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Videoyu Sil"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                      
                      <div className="flex gap-2">
                        <input 
                          value={newVideoUrl} 
                          onChange={e => setNewVideoUrl(e.target.value)} 
                          placeholder="https://youtube.com/watch?v=..." 
                          className="flex-1 text-sm px-3 py-2 border border-dashed border-gray-400 bg-white rounded-lg focus:border-blue-500 focus:bg-blue-50/50" 
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            if(newVideoUrl.trim()) {
                              setForm({ ...form, videoLinks: [...form.videoLinks, newVideoUrl.trim()] });
                              setNewVideoUrl("");
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors whitespace-nowrap flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          Video Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">İptal</button>
                  <button type="submit" disabled={formLoading} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: "var(--brand)" }}>
                    {formLoading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-primary)] rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-[var(--border-secondary)] overflow-hidden">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">İçe Aktarma Sonucu</h2>
            
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl p-3 sm:p-5 text-center shadow-sm">
                <svg className="absolute -top-3 -right-3 w-16 h-16 text-green-500 opacity-10 rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl font-extrabold text-green-600 dark:text-green-400 mb-1 tracking-tighter">{importResult.success}</div>
                  <div className="text-[10px] sm:text-xs text-green-800 dark:text-green-500 font-bold uppercase tracking-widest opacity-90">Başarılı</div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-3 sm:p-5 text-center shadow-sm">
                <svg className="absolute -top-3 -right-3 w-16 h-16 text-orange-500 opacity-10 rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl font-extrabold text-orange-600 dark:text-orange-400 mb-1 tracking-tighter">{importResult.duplicate}</div>
                  <div className="text-[10px] sm:text-xs text-orange-800 dark:text-orange-500 font-bold uppercase tracking-widest opacity-90">Es Geçildi</div>
                </div>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-3 sm:p-5 text-center shadow-sm">
                <svg className="absolute -top-3 -right-3 w-16 h-16 text-red-500 opacity-10 rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl font-extrabold text-red-600 dark:text-red-400 mb-1 tracking-tighter">{importResult.failed}</div>
                  <div className="text-[10px] sm:text-xs text-red-800 dark:text-red-500 font-bold uppercase tracking-widest opacity-90">Hatalı</div>
                </div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  Hata Detayları
                </h3>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-xl p-3 max-h-32 overflow-y-auto text-xs text-[var(--text-secondary)] space-y-1 font-mono">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="border-b border-[var(--border-primary)] last:border-0 pb-1 last:pb-0 pt-1 first:pt-0">
                      • {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setImportResult(null)}
              className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--brand)" }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-primary)] rounded-3xl shadow-2xl w-full max-w-sm p-8 relative border border-[var(--border-secondary)] overflow-hidden text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Hastayı Sil</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              <strong className="text-[var(--text-primary)]">{deleteTarget.name}</strong> isimli hastayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] transition-all active:scale-95 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                disabled={isDeleting}
                onClick={executeDelete}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 border border-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Evet, Sil"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
