import { useState, useEffect } from 'react';
import { Activity, LogIn, ChevronLeft, Plus, CheckCircle, AlertTriangle, Send, CreditCard as Edit3, Users, Clock, FileText, X, Cpu, Shield, Loader2, TrendingUp, TrendingDown, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FaskesPageProps {
  onNavigate: (sector: string) => void;
}

type View = 'login' | 'dashboard' | 'rme-form' | 'triage-result';

interface RMEInput {
  patientName: string;
  nik: string;
  bpjsNumber: string;
  bloodPressure: string;
  temperature: string;
  respiratoryRate: string;
  chiefComplaint: string;
  symptomDuration: string;
  notes: string;
}

interface TriageOutput {
  icd10Code: string;
  icd10Description: string;
  probability: number;
  recommendation: string;
  category: 'faskes' | 'tele' | 'rujuk';
}

const ML_RULES: Array<{
  keywords: string[];
  icd10Code: string;
  icd10Description: string;
  probability: number;
  recommendation: string;
  category: 'faskes' | 'tele' | 'rujuk';
}> = [
  {
    keywords: ['batuk', 'pilek', 'flu', 'hidung', 'ispa', 'napas', 'demam ringan'],
    icd10Code: 'J06.9',
    icd10Description: 'Acute upper respiratory infection, unspecified',
    probability: 92,
    recommendation: 'Tuntas di Faskes. Berikan simtomatis: antipiretik, mukolitik. Edukasi istirahat cukup.',
    category: 'faskes',
  },
  {
    keywords: ['diare', 'mencret', 'mual', 'muntah', 'perut', 'dehidrasi'],
    icd10Code: 'A09',
    icd10Description: 'Other gastroenteritis and colitis of unspecified origin',
    probability: 88,
    recommendation: 'Tuntas di Faskes. Rehidrasi oral, pertimbangkan oralit. Pantau tanda dehidrasi berat.',
    category: 'faskes',
  },
  {
    keywords: ['demam tinggi', 'menggigil', 'malaria', 'nyamuk', 'plasmodium'],
    icd10Code: 'B54',
    icd10Description: 'Unspecified malaria',
    probability: 76,
    recommendation: 'Rujuk bila RDT positif. Pertimbangkan tele-expertise untuk pemilihan regimen ACT.',
    category: 'tele',
  },
  {
    keywords: ['tekanan darah tinggi', 'hipertensi', 'pusing', 'kepala', 'sakit kepala berat'],
    icd10Code: 'I10',
    icd10Description: 'Essential (primary) hypertension',
    probability: 85,
    recommendation: 'Tuntas di Faskes. Berikan antihipertensi lini pertama. Edukasi diet rendah garam.',
    category: 'faskes',
  },
  {
    keywords: ['nyeri dada', 'sesak napas berat', 'jantung', 'dada', 'keringat dingin'],
    icd10Code: 'I20.9',
    icd10Description: 'Angina pectoris, unspecified',
    probability: 71,
    recommendation: 'RUJUK SEGERA ke RSUD Tuapejat. Stabilisasi awal: oksigen, aspirin jika tidak ada kontraindikasi.',
    category: 'rujuk',
  },
  {
    keywords: ['batuk darah', 'tb', 'tuberkulosis', 'paru', 'berat badan turun'],
    icd10Code: 'A15',
    icd10Description: 'Respiratory tuberculosis',
    probability: 79,
    recommendation: 'Konfirmasi TCM/BTA. Mulai OAT jika positif. Lapor ke P2TB Dinkes.',
    category: 'tele',
  },
  {
    keywords: ['demam', 'bintik', 'ruam', 'dengue', 'nyeri sendi', 'trombosit'],
    icd10Code: 'A97',
    icd10Description: 'Dengue fever',
    probability: 82,
    recommendation: 'Pantau tanda bahaya dengue. Rujuk jika ada perdarahan atau syok.',
    category: 'tele',
  },
];

function simulateML(input: RMEInput): TriageOutput {
  const text = (input.chiefComplaint + ' ' + input.notes + ' ' + input.symptomDuration).toLowerCase();
  const temp = parseFloat(input.temperature);
  const sbp = parseInt(input.bloodPressure.split('/')[0] || '0');

  for (const rule of ML_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      let prob = rule.probability;
      if (temp > 38.5) prob = Math.min(prob + 4, 99);
      if (sbp > 160) prob = Math.min(prob + 3, 99);
      return { ...rule, probability: prob };
    }
  }

  return {
    icd10Code: 'Z00.0',
    icd10Description: 'General examination without complaint',
    probability: 65,
    recommendation: 'Data tidak cukup spesifik. Lakukan pemeriksaan fisik lengkap. Gunakan koreksi manual jika diperlukan.',
    category: 'faskes',
  };
}

const CATEGORY_STYLES = {
  faskes: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/40', text: 'text-emerald-400', label: 'Tuntas di Faskes' },
  tele: { bg: 'bg-amber-900/40', border: 'border-amber-500/40', text: 'text-amber-400', label: 'Konsultasi Tele-Expertise' },
  rujuk: { bg: 'bg-red-900/40', border: 'border-red-500/40', text: 'text-red-400', label: 'Pertimbangkan Rujukan' },
};

export default function FaskesPage({ onNavigate }: FaskesPageProps) {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('nakes@puskesmas.id');
  const [password, setPassword] = useState('password123');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rme, setRme] = useState<RMEInput>({
    patientName: '', nik: '', bpjsNumber: '',
    bloodPressure: '', temperature: '', respiratoryRate: '',
    chiefComplaint: '', symptomDuration: '', notes: '',
  });
  const [triageResult, setTriageResult] = useState<TriageOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [completedToday, setCompletedToday] = useState(18);
  const [referredToday, setReferredToday] = useState(3);
  const [auditLog, setAuditLog] = useState<Array<{ time: string; action: string; user: string }>>([
    { time: '08:14', action: 'Login sistem', user: 'Dr. Amara Sitepu' },
    { time: '08:22', action: 'Input RME — Pasien #1024', user: 'Dr. Amara Sitepu' },
    { time: '08:35', action: 'Validasi INA-CBG J06.9', user: 'Dr. Amara Sitepu' },
    { time: '09:10', action: 'Otorisasi Rujukan — RSUD Tuapejat', user: 'Dr. Amara Sitepu' },
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError('Demo mode: gunakan kredensial demo atau buat akun baru di Supabase.');
      } else {
        setView('dashboard');
      }
    } catch {
      setLoginError('Koneksi gagal. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setView('dashboard');
  };

  const handleRunTriage = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = simulateML(rme);
      setTriageResult(result);
      setIsProcessing(false);
      setView('triage-result');
    }, 1800);
  };

  const handleAction = (action: string) => {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setAuditLog(prev => [{ time: timestamp, action, user: 'Dr. (Demo)' }, ...prev]);
    setActionDone(action);
    if (action.includes('Selesai') || action.includes('Validasi')) {
      setCompletedToday(prev => prev + 1);
    }
    if (action.includes('Rujukan Fisik')) {
      setReferredToday(prev => prev + 1);
    }
    setTimeout(() => {
      setActionDone(null);
      setTriageResult(null);
      setRme({ patientName: '', nik: '', bpjsNumber: '', bloodPressure: '', temperature: '', respiratoryRate: '', chiefComplaint: '', symptomDuration: '', notes: '' });
      setView('dashboard');
    }, 2000);
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <nav className="border-b border-slate-800 bg-slate-950 px-6 h-14 flex items-center gap-3">
          <button onClick={() => onNavigate('home')} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
            <ChevronLeft size={16} />
            Kembali
          </button>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={26} className="text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Portal Nakes Faskes 1</h2>
              <p className="text-sm text-slate-400 mt-1">Login dengan akun tenaga medis terdaftar</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Institusi</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="nakes@puskesmas.id"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Kata Sandi</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{loginError}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Masuk Sistem
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={handleDemoLogin} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
                Masuk sebagai Demo (tanpa autentikasi)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'rme-form') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <nav className="border-b border-slate-800 bg-slate-950 px-6 h-14 flex items-center justify-between">
          <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
            <ChevronLeft size={16} />
            Dashboard
          </button>
          <span className="text-sm font-semibold text-slate-300">Formulir Rekam Medis Elektronik (RME)</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={12} className="text-emerald-400" />
            Standar Kemenkes
          </div>
        </nav>
        <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                <span className="font-semibold text-sm">Data Pasien & Pemeriksaan Fisik</span>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Patient info */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identitas Pasien</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Nama Lengkap', key: 'patientName', placeholder: 'Nama pasien...', span: 2 },
                    { label: 'NIK', key: 'nik', placeholder: '16 digit NIK' },
                    { label: 'No. BPJS', key: 'bpjsNumber', placeholder: 'Nomor peserta BPJS' },
                  ].map(field => (
                    <div key={field.key} className={field.span === 2 ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs text-slate-400 mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        value={rme[field.key as keyof RMEInput]}
                        onChange={e => setRme(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Vital signs */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tanda Vital</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Tekanan Darah (mmHg)', key: 'bloodPressure', placeholder: '120/80' },
                    { label: 'Suhu Tubuh (°C)', key: 'temperature', placeholder: '36.5' },
                    { label: 'Frekuensi Napas (/min)', key: 'respiratoryRate', placeholder: '18' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-xs text-slate-400 mb-1.5">{field.label}</label>
                      <input
                        type="text"
                        value={rme[field.key as keyof RMEInput]}
                        onChange={e => setRme(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Anamnesis */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Anamnesis</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Keluhan Utama</label>
                    <textarea
                      rows={3}
                      value={rme.chiefComplaint}
                      onChange={e => setRme(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                      placeholder="Deskripsikan keluhan utama pasien secara detail (batuk, demam, nyeri, dsb)..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Lama Gejala</label>
                      <input
                        type="text"
                        value={rme.symptomDuration}
                        onChange={e => setRme(prev => ({ ...prev, symptomDuration: e.target.value }))}
                        placeholder="contoh: 3 hari, 1 minggu..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Catatan Tambahan</label>
                      <input
                        type="text"
                        value={rme.notes}
                        onChange={e => setRme(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Riwayat penyakit, alergi, dsb..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRunTriage}
                disabled={!rme.chiefComplaint || isProcessing}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mesin Triase ML sedang memproses...
                  </>
                ) : (
                  <>
                    <Cpu size={16} />
                    Jalankan Mesin Triase Cerdas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'triage-result' && triageResult) {
    const style = CATEGORY_STYLES[triageResult.category];
    return (
      <div className="min-h-screen bg-slate-950/90 backdrop-blur flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-lg">
          {actionDone ? (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 text-center">
              <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">Aksi Berhasil Dieksekusi</h3>
              <p className="text-sm text-slate-400">{actionDone}</p>
              <p className="text-xs text-slate-500 mt-2">Kembali ke dashboard...</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-cyan-400" />
                  <span className="font-semibold text-sm">Hasil Klasifikasi Mesin Triase</span>
                </div>
                <button onClick={() => setView('rme-form')} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Result banner */}
                <div className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Diagnosis Prediktif</div>
                      <div className="font-mono font-bold text-base text-white">[{triageResult.icd10Code}]</div>
                      <div className="text-sm text-slate-200 mt-0.5">{triageResult.icd10Description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{triageResult.probability}%</div>
                      <div className="text-xs text-slate-400">Probabilitas</div>
                    </div>
                  </div>

                  {/* Probability bar */}
                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 mt-3">
                    <div
                      className="h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${triageResult.probability}%`, background: triageResult.category === 'faskes' ? '#10b981' : triageResult.category === 'tele' ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-slate-400">Basis Aturan: PPK Kemenkes</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text} border ${style.border}`}>
                      {style.label}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-400 mb-1">Rekomendasi Klinis</div>
                  <p className="text-sm text-slate-200">{triageResult.recommendation}</p>
                </div>

                {/* Action buttons */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Otorisasi Keputusan Dokter</div>

                  <button
                    onClick={() => handleAction('Validasi INA-CBG & BPJS diklaim — Pasien selesai di Faskes')}
                    className="w-full flex items-center gap-3 bg-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-900/50 rounded-xl px-4 py-3 text-sm font-medium text-emerald-300 transition-all"
                  >
                    <CheckCircle size={16} />
                    <div className="text-left">
                      <div>Validasi & Generate Kode INA-CBG</div>
                      <div className="text-xs text-emerald-500/70 font-normal">Klaim BPJS otomatis · Pasien selesai di Faskes</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAction('Tele-Expertise diminta — Data RME dikirim ke Spesialis RSUD')}
                    className="w-full flex items-center gap-3 bg-amber-900/30 border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-900/50 rounded-xl px-4 py-3 text-sm font-medium text-amber-300 transition-all"
                  >
                    <Phone size={16} />
                    <div className="text-left">
                      <div>Minta Tele-Expertise Spesialis</div>
                      <div className="text-xs text-amber-500/70 font-normal">Ping dokter spesialis RSUD Tuapejat untuk second opinion</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAction('Rujukan Fisik diotorisasi — Notifikasi terenkripsi dikirim ke RSUD Tuapejat (HL7 FHIR)')}
                    className="w-full flex items-center gap-3 bg-red-900/30 border border-red-500/30 hover:border-red-500/60 hover:bg-red-900/50 rounded-xl px-4 py-3 text-sm font-medium text-red-300 transition-all"
                  >
                    <Send size={16} />
                    <div className="text-left">
                      <div>Otorisasi Rujukan Fisik & Ping RSUD</div>
                      <div className="text-xs text-red-500/70 font-normal">Kirim data terenkripsi HL7 FHIR ke RSUD Tuapejat</div>
                    </div>
                  </button>

                  {!showManualInput ? (
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-600/40 hover:border-slate-500 hover:bg-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition-all"
                    >
                      <Edit3 size={16} />
                      <div className="text-left">
                        <div>Koreksi Diagnosis Manual</div>
                        <div className="text-xs text-slate-500 font-normal">Override ML — dokter tetap memiliki kendali penuh</div>
                      </div>
                    </button>
                  ) : (
                    <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4 space-y-3">
                      <div className="text-xs font-medium text-slate-300">Masukkan Kode ICD-10 Manual</div>
                      <input
                        type="text"
                        value={manualCode}
                        onChange={e => setManualCode(e.target.value)}
                        placeholder="contoh: J18.9"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => manualCode && handleAction(`Koreksi Manual: Kode ICD-10 ${manualCode} diterapkan dokter`)}
                          disabled={!manualCode}
                          className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors"
                        >
                          Terapkan Kode Manual
                        </button>
                        <button onClick={() => setShowManualInput(false)} className="px-3 py-2 text-slate-400 hover:text-white text-xs transition-colors">
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard view
  const ratio = completedToday / (completedToday + referredToday);
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800 bg-slate-950 px-6 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
          <ChevronLeft size={16} />
          Portal Utama
        </button>
        <span className="text-sm font-semibold text-slate-200">Dashboard Faskes 1 — Puskesmas Mentawai</span>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield size={12} className="text-cyan-400" />
          <span>Dr. (Demo)</span>
        </div>
      </nav>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Summary graph */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-cyan-400" />
                <span className="text-sm font-semibold">Rasio Pasien — Hari Ini</span>
              </div>
              <span className="text-xs text-slate-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex items-end gap-8 mb-4">
              <div>
                <div className="text-3xl font-bold text-emerald-400">{completedToday}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1"><TrendingUp size={12} /> Selesai di Faskes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{referredToday}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1"><TrendingDown size={12} /> Dirujuk ke RSUD</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-400">{(completedToday + referredToday)}</div>
                <div className="text-xs text-slate-400 mt-1">Total Kunjungan</div>
              </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${ratio * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1.5">
              <span>{(ratio * 100).toFixed(0)}% selesai di Faskes</span>
              <span>{((1 - ratio) * 100).toFixed(0)}% dirujuk</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-amber-400" />
              <span className="text-sm font-semibold">Audit Trail (Medikolegal)</span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {auditLog.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-500 font-mono shrink-0">{log.time}</span>
                  <span className="text-slate-300">{log.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => setView('rme-form')}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all text-base shadow-lg shadow-cyan-500/20"
        >
          <Plus size={20} />
          Input Pemeriksaan Pasien Baru
        </button>

        {/* Queue table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
            <Users size={15} className="text-slate-400" />
            <span className="text-sm font-semibold">Antrian Pasien Aktif</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-5 py-3 font-medium">No.</th>
                  <th className="text-left px-5 py-3 font-medium">Pasien</th>
                  <th className="text-left px-5 py-3 font-medium">Keluhan</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { no: '001', name: 'Sabarina Sabolak', complaint: 'Batuk berdahak 5 hari', status: 'triaged', time: '09:45' },
                  { no: '002', name: 'Yohanes Satoko', complaint: 'Demam tinggi, menggigil', status: 'pending', time: '10:02' },
                  { no: '003', name: 'Maria Siritoitet', complaint: 'Diare 2 hari, lemas', status: 'pending', time: '10:20' },
                  { no: '004', name: 'Andi Siregar', complaint: 'Nyeri kepala, TD tinggi', status: 'pending', time: '10:35' },
                ].map(row => (
                  <tr key={row.no} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-400">{row.no}</td>
                    <td className="px-5 py-3 text-slate-200">{row.name}</td>
                    <td className="px-5 py-3 text-slate-400">{row.complaint}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === 'triaged' ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-800/40' : 'bg-slate-700/60 text-slate-400 border border-slate-600/40'}`}>
                        {row.status === 'triaged' ? 'Triase' : 'Menunggu'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 font-mono">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Standard badges */}
        <div className="flex flex-wrap gap-2 justify-center">
          {['HL7 FHIR R4', 'INA-CBGs BPJS', 'ICD-10 WHO', 'PPK Kemenkes', 'Audit Trail Medikolegal'].map(badge => (
            <span key={badge} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400">{badge}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
