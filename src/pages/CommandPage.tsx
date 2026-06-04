import { useState, useEffect } from 'react';
import {
  BarChart3, ChevronLeft, RefreshCw, Globe, Filter, Zap,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle,
  Database, Shield, LogIn, Loader2, Activity, MapPin
} from 'lucide-react';
import { supabase, DiseaseStats, DiseaseAlert } from '../lib/supabase';

interface CommandPageProps {
  onNavigate: (sector: string) => void;
}

type FilterRegion = 'nasional' | 'sumbar' | 'mentawai';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

const MOCK_TREND_DATA: Record<FilterRegion, Record<string, number[]>> = {
  nasional: {
    ISPA: [12400, 13200, 14100, 13800, 15200, 14600],
    Diare: [8700, 9100, 8400, 9800, 10200, 9600],
    Malaria: [2100, 1900, 1700, 1600, 1800, 1500],
    Dengue: [3400, 4100, 3800, 2900, 3200, 3600],
  },
  sumbar: {
    ISPA: [1240, 1320, 1410, 1380, 1520, 1460],
    Diare: [870, 910, 840, 980, 1020, 960],
    Malaria: [210, 190, 170, 160, 180, 150],
    Dengue: [340, 410, 380, 290, 320, 360],
  },
  mentawai: {
    ISPA: [124, 132, 141, 138, 152, 240],
    Diare: [87, 91, 84, 98, 102, 211],
    Malaria: [21, 19, 17, 16, 18, 34],
    Dengue: [34, 41, 38, 29, 32, 22],
  },
};

const DISEASE_COLORS: Record<string, string> = {
  ISPA: '#06b6d4',
  Diare: '#f59e0b',
  Malaria: '#ef4444',
  Dengue: '#10b981',
};

const BAR_MAX: Record<FilterRegion, number> = {
  nasional: 16000,
  sumbar: 1600,
  mentawai: 260,
};

export default function CommandPage({ onNavigate }: CommandPageProps) {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('admin@dinkes.id');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<FilterRegion>('mentawai');
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [alerts, setAlerts] = useState<DiseaseAlert[]>([]);
  const [stats, setStats] = useState<DiseaseStats[]>([]);
  const [applyingLiteracy, setApplyingLiteracy] = useState(false);
  const [literacyApplied, setLiteracyApplied] = useState<string | null>(null);
  const [selectedDisease, setSelectedDisease] = useState('ISPA');

  useEffect(() => {
    if (authed) {
      supabase.from('disease_alerts').select('*').then(({ data }) => {
        if (data) setAlerts(data);
      });
      supabase.from('disease_stats').select('*').eq('period_year', 2026).then(({ data }) => {
        if (data) setStats(data);
      });
    }
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoginError('Demo mode: akun admin perlu dibuat terlebih dahulu di Supabase Auth.');
      } else {
        setAuthed(true);
      }
    } catch {
      setLoginError('Koneksi gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = () => {
    setSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      setSyncing(false);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    }, 2500);
  };

  const handleApplyLiteracy = (diseaseName: string) => {
    setApplyingLiteracy(true);
    setTimeout(() => {
      setApplyingLiteracy(false);
      setLiteracyApplied(diseaseName);
      setTimeout(() => setLiteracyApplied(null), 4000);
    }, 1500);
  };

  const trendData = MOCK_TREND_DATA[filter];
  const currentMax = BAR_MAX[filter];

  const filterLabels: Record<FilterRegion, string> = {
    nasional: 'Data Nasional',
    sumbar: 'Provinsi Sumatera Barat',
    mentawai: 'Kab. Kepulauan Mentawai',
  };

  const topDisease = stats.sort((a, b) => b.case_count - a.case_count)[0];

  if (!authed) {
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
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={26} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Pusat Komando Data</h2>
              <p className="text-sm text-slate-400 mt-1">Akses khusus Kepala Dinkes / Admin</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Admin</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Kata Sandi</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              {loginError && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{loginError}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Masuk Pusat Komando
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setAuthed(true)} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">
                Demo mode (tanpa autentikasi)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800 bg-slate-950 px-6 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
          <ChevronLeft size={16} />
          Portal Utama
        </button>
        <span className="text-sm font-semibold text-slate-200">Pusat Komando Data Epidemiologi</span>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield size={12} className="text-amber-400" />
          Admin Dinkes
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 space-y-6">

        {/* Literacy applied banner */}
        {literacyApplied && (
          <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-xl px-5 py-3 flex items-center gap-3">
            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            <span className="text-sm text-emerald-300">
              Prioritas Literasi Otomatis diterapkan untuk penyakit <strong>{literacyApplied}</strong>. Portal Publik Sektor 4 telah diperbarui.
            </span>
          </div>
        )}

        {/* Top control bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-1">
            {(['mentawai', 'sumbar', 'nasional'] as FilterRegion[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {f === 'mentawai' ? 'Mentawai' : f === 'sumbar' ? 'Sumatera Barat' : 'Nasional'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={12} />
            {filterLabels[filter]}
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-500 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 transition-all disabled:opacity-60"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Menyinkronkan...' : syncDone ? 'Tersinkronisasi!' : 'Sinkronisasi SATUSEHAT'}
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Kasus Aktif', value: stats.reduce((s, d) => s + d.case_count, 0).toLocaleString(), trend: '+12%', up: true, icon: Activity },
            { label: 'Penyakit Dominan', value: topDisease?.disease_name || 'ISPA', trend: topDisease?.icd10_code || 'J06.9', up: true, icon: AlertTriangle },
            { label: 'Zona Siaga Aktif', value: stats.filter(s => s.severity === 'critical').length.toString(), trend: 'Wilayah kritis', up: false, icon: MapPin },
            { label: 'Alert Aktif', value: alerts.filter(a => a.is_active).length.toString(), trend: 'Level siaga', up: false, icon: Zap },
          ].map(kpi => (
            <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <kpi.icon size={15} className="text-slate-400" />
                <span className={`text-xs flex items-center gap-0.5 ${kpi.up ? 'text-amber-400' : 'text-red-400'}`}>
                  {kpi.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {kpi.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Main charts area */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trend chart */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-amber-400" />
                <span className="text-sm font-semibold">Tren Penyakit — {filterLabels[filter]}</span>
              </div>
              <div className="flex gap-1.5">
                {Object.keys(trendData).map(disease => (
                  <button
                    key={disease}
                    onClick={() => setSelectedDisease(disease)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedDisease === disease ? 'text-slate-950 font-semibold' : 'text-slate-400 bg-slate-800 hover:bg-slate-700'}`}
                    style={selectedDisease === disease ? { background: DISEASE_COLORS[disease] } : {}}
                  >
                    {disease}
                  </button>
                ))}
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-3 h-48">
              {MONTH_LABELS.map((month, i) => {
                const val = trendData[selectedDisease]?.[i] ?? 0;
                const heightPct = (val / currentMax) * 100;
                const isLatest = i === MONTH_LABELS.length - 1;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs text-slate-400">{val.toLocaleString()}</span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 relative"
                      style={{
                        height: `${heightPct}%`,
                        background: isLatest ? DISEASE_COLORS[selectedDisease] : `${DISEASE_COLORS[selectedDisease]}60`,
                        minHeight: 4,
                      }}
                    >
                      {isLatest && (
                        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-sm" />
                      )}
                    </div>
                    <span className={`text-xs ${isLatest ? 'text-white font-medium' : 'text-slate-500'}`}>{month}</span>
                  </div>
                );
              })}
            </div>

            {/* Multi-disease legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-800">
              {Object.entries(DISEASE_COLORS).map(([disease, color]) => {
                const vals = trendData[disease] ?? [];
                const latest = vals[vals.length - 1] ?? 0;
                const prev = vals[vals.length - 2] ?? 0;
                const delta = latest - prev;
                return (
                  <div key={disease} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-slate-300">{disease}</span>
                    <span className={`${delta > 0 ? 'text-red-400' : delta < 0 ? 'text-emerald-400' : 'text-slate-400'} flex items-center gap-0.5`}>
                      {delta > 0 ? <TrendingUp size={10} /> : delta < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                      {Math.abs(delta).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alert & Literacy control */}
          <div className="flex flex-col gap-4">
            {/* Alerts */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={15} className="text-red-400" />
                <span className="text-sm font-semibold">Alert Aktif</span>
              </div>
              <div className="space-y-3">
                {alerts.filter(a => a.is_active).map(alert => (
                  <div key={alert.id} className="bg-red-900/20 border border-red-800/40 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-red-400 font-bold">{alert.icd10_code}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-red-900/60 text-red-300 rounded font-medium uppercase">{alert.alert_level}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 mb-1">{alert.disease_name}</div>
                    <div className="text-xs text-slate-400 leading-relaxed line-clamp-2">{alert.message}</div>
                  </div>
                ))}
                {alerts.filter(a => a.is_active).length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Tidak ada alert aktif.</p>
                )}
              </div>
            </div>

            {/* Literacy Priority Control */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={15} className="text-amber-400" />
                <span className="text-sm font-semibold">Terapkan Prioritas Literasi</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Paksa Sektor 4 untuk menampilkan konten edukasi sesuai penyakit yang sedang melonjak.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'Diare Akut', code: 'A09', color: 'text-amber-400' },
                  { name: 'ISPA', code: 'J06.9', color: 'text-cyan-400' },
                  { name: 'Malaria', code: 'B54', color: 'text-red-400' },
                ].map(d => (
                  <button
                    key={d.name}
                    onClick={() => handleApplyLiteracy(d.name)}
                    disabled={applyingLiteracy}
                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl px-3 py-2.5 transition-all group disabled:opacity-60"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-mono font-bold ${d.color}`}>{d.code}</span>
                      <span className="text-slate-300">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-amber-400 transition-colors">
                      {applyingLiteracy ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      Terapkan
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Regional table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-slate-400" />
              <span className="text-sm font-semibold">Data Wilayah Mentawai — Mei 2026</span>
            </div>
            <span className="text-xs text-slate-500">Sumber: Faskes Internal + SATUSEHAT</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-5 py-3 font-medium">Wilayah</th>
                  <th className="text-left px-5 py-3 font-medium">Penyakit</th>
                  <th className="text-left px-5 py-3 font-medium">ICD-10</th>
                  <th className="text-right px-5 py-3 font-medium">Kasus</th>
                  <th className="text-left px-5 py-3 font-medium">Proporsi</th>
                  <th className="text-center px-5 py-3 font-medium">Tingkat</th>
                </tr>
              </thead>
              <tbody>
                {stats.sort((a, b) => b.case_count - a.case_count).map((s, i) => {
                  const maxCount = Math.max(...stats.map(x => x.case_count));
                  const barWidth = (s.case_count / maxCount) * 100;
                  const sevColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' }[s.severity];
                  return (
                    <tr key={s.id} className={`border-b border-slate-800/50 ${i % 2 === 0 ? '' : 'bg-slate-900/40'}`}>
                      <td className="px-5 py-3 text-slate-200">{s.region}</td>
                      <td className="px-5 py-3 text-slate-300">{s.disease_name}</td>
                      <td className="px-5 py-3 font-mono text-amber-400">{s.icd10_code}</td>
                      <td className="px-5 py-3 text-right font-bold text-white">{s.case_count}</td>
                      <td className="px-5 py-3">
                        <div className="w-24 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: sevColor }} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: sevColor + '20', color: sevColor, border: `1px solid ${sevColor}40` }}>
                          {s.severity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4 space-y-1">
          <div>Sinkronisasi API: SATUSEHAT Kemenkes · BPJS Kesehatan Data Hub · WHO IHR</div>
          <div>Pusat Komando Data — Dinas Kesehatan Kabupaten Kepulauan Mentawai</div>
        </div>
      </div>
    </div>
  );
}
