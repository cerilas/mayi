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
}

interface Patient {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  patientProfile: PatientProfile | null;
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
  videoLinks: "", // comma separated
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

  const [smsTarget, setSmsTarget] = useState<Patient | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsPassword, setSmsPassword] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [smsSuccess, setSmsSuccess] = useState("");

  function openSmsModal(p: Patient) {
    setSmsTarget(p);
    setSmsPhone(p.patientProfile?.phone || "");
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session.user.role !== "admin") {
        router.push("/chat");
      } else {
        fetchPatients(page, search);
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
      videoLinks: prof?.videoLinks ? prof.videoLinks.join(", ") : "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    const body: any = { ...form };
    body.videoLinks = form.videoLinks.split(",").map(s => s.trim()).filter(Boolean);

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

  async function handleDelete(id: string) {
    if (!confirm("Emin misiniz?")) return;
    const res = await fetch(`/api/admin/patients/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchPatients(page, search);
    }
  }

  function handleExport() {
    const dataToExport = patients.map(p => ({
      "Ad Soyad": p.name,
      "E-posta": p.email,
      "Telefon": p.patientProfile?.phone || "",
      "Yaş": p.patientProfile?.age || "",
      "Cinsiyet": p.patientProfile?.gender || "",
      "Kısa Tanıtım": p.patientProfile?.shortDescription || "",
      "Klinik Görüş": p.patientProfile?.clinicalOpinion || ""
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
          clinicalOpinion: row["Klinik Görüş"] || "",
        }));

        const res = await fetch("/api/admin/patients/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patients: formattedData }),
        });
        
        const result = await res.json();
        if (res.ok) {
          alert(`İçe Aktarma Tamamlandı:\nBaşarılı: ${result.success}\nBaşarısız: ${result.failed}\nHatalar: ${result.errors.slice(0, 5).join(", ")}`);
          fetchPatients(page, search);
        } else {
          alert("Hata: " + result.error);
        }
      } catch (err) {
        alert("Dosya okunamadı.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  }

  if (status === "loading" || loading && patients.length === 0) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (session?.user?.role !== "admin") return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto px-6 py-8">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hastalarım</h1>
            <p className="text-sm text-gray-500 mt-1">Hastalarınızı yönetin, listeleyin ve sisteme giriş yapmalarını sağlayın.</p>
          </div>
          <div className="flex gap-3">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Excel İçe Aktar
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Excel Dışa Aktar
            </button>
            <button
              onClick={openAddForm}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg"
              style={{ backgroundColor: "var(--brand)" }}
            >
              Yeni Hasta
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

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-4">Ad Soyad</th>
                <th className="px-6 py-4">E-posta</th>
                <th className="px-6 py-4">Telefon</th>
                <th className="px-6 py-4">Yaş / Cinsiyet</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-gray-600">{p.email}</td>
                  <td className="px-6 py-4 text-gray-600">{p.patientProfile?.phone || "-"}</td>
                  <td className="px-6 py-4 text-gray-600">{p.patientProfile?.age || "-"} / {p.patientProfile?.gender || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openSmsModal(p)} className="text-green-600 hover:text-green-800 font-medium mr-3">SMS</button>
                    <button onClick={() => openEditForm(p)} className="text-blue-600 hover:text-blue-800 font-medium mr-3">Düzenle</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 font-medium">Sil</button>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
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

        {/* Form Modal */}
        {smsTarget ? (
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
                  Kullanıcının şifresi aşağıda belirleyeceğiniz şifre ile güncellenecek ve yeni giriş bilgileri SMS ile gönderilecektir.
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefon Numarası</label>
                  <input type="text" required value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="5XX XXX XX XX" className="w-full text-sm px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Yeni Şifre</label>
                  <input type="text" required minLength={6} value={smsPassword} onChange={e => setSmsPassword(e.target.value)} placeholder="123456" className="w-full text-sm px-3 py-2 border rounded-lg" />
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

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Ad Soyad *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">E-posta *</label><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">{editingPatient ? "Şifre (Değiştirmek için doldurun)" : "Şifre *"}</label><input type="password" required={!editingPatient} minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Yaş</label><input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cinsiyet</label>
                    <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg">
                      <option value="">Seçiniz</option><option value="Erkek">Erkek</option><option value="Kadın">Kadın</option><option value="Diğer">Diğer</option>
                    </select>
                  </div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Fotoğraf URL</label><input value={form.photo} onChange={e => setForm({...form, photo: e.target.value})} placeholder="https://..." className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Kısa Hastalık Tanıtımı</label><input value={form.shortDescription} onChange={e => setForm({...form, shortDescription: e.target.value})} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Uzun Detaylar</label><textarea value={form.longDetails} onChange={e => setForm({...form, longDetails: e.target.value})} rows={3} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Klinik Görüş</label><textarea value={form.clinicalOpinion} onChange={e => setForm({...form, clinicalOpinion: e.target.value})} rows={2} className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
                  <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Video Linkleri (Virgülle ayırın)</label><textarea value={form.videoLinks} onChange={e => setForm({...form, videoLinks: e.target.value})} rows={2} placeholder="https://youtube.com/..., https://vimeo.com/..." className="w-full text-sm px-3 py-2 border rounded-lg" /></div>
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
    </div>
  );
}
