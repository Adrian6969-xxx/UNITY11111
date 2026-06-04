import { useEffect, useState, useRef } from 'react';
import { Activity, Shield, BarChart3, BookOpen, MapPin, AlertTriangle, Wifi, ChevronRight, Zap } from 'lucide-react';
import { supabase, DiseaseStats, DiseaseAlert } from '../lib/supabase';

interface HomePageProps {
  onNavigate: (sector: string) => void;
}

const ISLAND_COORDS: Record<string, { x: number; y: number }> = {
  'Siberut Utara':    { x: 18, y: 18 },
  'Siberut Selatan':  { x: 22, y: 32 },
  'Muara Siberut':    { x: 25, y: 28 },
  'Sipora Utara':     { x: 55, y: 44 },
  'Sipora Selatan':   { x: 58, y: 52 },
  'Tuapejat':         { x: 60, y: 46 },
  'Pagai Utara':      { x: 72, y: 60 },
  'Pagai Selatan':    { x: 76, y: 74 },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

const SEVERITY_PULSE: Record<string, string> = {
  low: 'rgba(34,197,94,0.3)',
  medium: 'rgba(245,158,11,0.3)',
  high: 'rgba(239,68,68,0.3)',
  critical: 'rgba(220,38,38,0.4)',
};

export default function HomePage({ onNavigate }: HomePageProps) {
  const [stats, setStats] = useState<DiseaseStats[]>([]);
  const [alerts, setAlerts] = useState<DiseaseAlert[]>([]);
  const [hoveredRegion, setHoveredRegion] = useState<DiseaseStats | null>(null);
  const [pulseFrame, setPulseFrame] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    supabase.from('disease_stats').select('*').eq('period_year', 2026).then(({ data }) => {
      if (data) setStats(data);
    });
    supabase.from('disease_alerts').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setAlerts(data);
    });

    let frame = 0;
    const animate = () => {
      frame = (frame + 1) % 100;
      setPulseFrame(frame);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const getRegionStats = (region: string) => stats.find(s => s.region === region);

  const totalCases = stats.reduce((sum, s) => sum + s.case_count, 0);
  const criticalCount = stats.filter(s => s.severity === 'critical' || s.severity === 'high').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Activity size={16} className="text-slate-950" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-wide text-white">MentawaiSehat</span>
              <span className="text-slate-500 text-xs ml-2">Platform Kesehatan Terpadu</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Sistem Aktif</span>
          </div>
        </div>
      </nav>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="bg-red-900/40 border-b border-red-800/60 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle size={14} className="text-red-400 shrink-0" />
            <span className="text-xs text-red-300 font-medium">SIAGA AKTIF:</span>
            <span className="text-xs text-red-200 truncate">{alerts[0].message}</span>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col gap-10">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 text-xs text-cyan-400">
            <Zap size={12} />
            Sistem Informasi Kesehatan Daerah 3T — Kepulauan Mentawai
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            Portal Hub Terpadu
            <span className="block text-cyan-400">Mentawai</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
            Platform terintegrasi untuk tenaga medis Faskes 1, agregator data epidemiologi,
            dan literasi kesehatan masyarakat Kepulauan Mentawai berbasis standar HL7 FHIR & INA-CBGs.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Kasus Aktif', value: totalCases.toLocaleString(), sub: 'Seluruh wilayah', color: 'text-cyan-400' },
            { label: 'Zona Merah', value: criticalCount, sub: 'Kecamatan kritis', color: 'text-red-400' },
            { label: 'Puskesmas Online', value: '8', sub: 'Terhubung sistem', color: 'text-emerald-400' },
            { label: 'Kode ICD-10 Aktif', value: stats.length, sub: 'Klasifikasi penyakit', color: 'text-amber-400' },
          ].map(item => (
            <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs font-medium text-white mt-1">{item.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Main content: Heatmap + Actions */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Heatmap */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-cyan-400" />
                <span className="text-sm font-semibold">Radar Peta Panas — Kepulauan Mentawai</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Wifi size={12} className="text-emerald-400" />
                Real-time
              </div>
            </div>
            <div className="relative bg-slate-950/50" style={{ paddingBottom: '65%' }}>
              <div className="absolute inset-0">
                {/* Ocean background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900" />

                {/* Grid lines */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`h${i}`} className="absolute left-0 right-0 border-t border-slate-800/30" style={{ top: `${(i + 1) * 16.66}%` }} />
                ))}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`v${i}`} className="absolute top-0 bottom-0 border-l border-slate-800/30" style={{ left: `${(i + 1) * 16.66}%` }} />
                ))}

                {/* Island shape suggestions */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <ellipse cx="20" cy="25" rx="8" ry="16" fill="#1e40af" opacity="0.5" />
                  <ellipse cx="57" cy="48" rx="5" ry="8" fill="#1e40af" opacity="0.5" />
                  <ellipse cx="74" cy="67" rx="6" ry="10" fill="#1e40af" opacity="0.5" />
                </svg>

                {/* Heatmap nodes */}
                {Object.entries(ISLAND_COORDS).map(([region, pos]) => {
                  const regionData = getRegionStats(region);
                  if (!regionData) return null;
                  const color = SEVERITY_COLORS[regionData.severity];
                  const pulseColor = SEVERITY_PULSE[regionData.severity];
                  const pulseSize = 24 + Math.sin((pulseFrame / 100) * Math.PI * 2) * 6;
                  const isHovered = hoveredRegion?.region === region;

                  return (
                    <div
                      key={region}
                      className="absolute cursor-pointer"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                      onMouseEnter={() => setHoveredRegion(regionData)}
                      onMouseLeave={() => setHoveredRegion(null)}
                    >
                      {/* Pulse ring */}
                      <div
                        className="absolute rounded-full"
                        style={{
                          width: pulseSize,
                          height: pulseSize,
                          background: pulseColor,
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          transition: 'width 0.1s, height 0.1s',
                        }}
                      />
                      {/* Core dot */}
                      <div
                        className="relative z-10 rounded-full border-2 border-slate-950 shadow-lg"
                        style={{
                          width: isHovered ? 18 : 12,
                          height: isHovered ? 18 : 12,
                          background: color,
                          transition: 'all 0.2s',
                          boxShadow: `0 0 12px ${color}`,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Tooltip */}
                {hoveredRegion && (
                  <div
                    className="absolute z-20 bg-slate-800/95 border border-slate-700 rounded-xl px-3 py-2.5 text-xs shadow-2xl backdrop-blur-sm pointer-events-none"
                    style={{
                      left: `${(ISLAND_COORDS[hoveredRegion.region]?.x ?? 50)}%`,
                      top: `${(ISLAND_COORDS[hoveredRegion.region]?.y ?? 50) + 6}%`,
                      transform: 'translateX(-50%)',
                      minWidth: 160,
                    }}
                  >
                    <div className="font-semibold text-white">{hoveredRegion.region}</div>
                    <div className="text-slate-400 mt-1">{hoveredRegion.disease_name} ({hoveredRegion.icd10_code})</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-slate-400">{hoveredRegion.case_count} kasus</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium capitalize"
                        style={{ background: SEVERITY_COLORS[hoveredRegion.severity] + '30', color: SEVERITY_COLORS[hoveredRegion.severity] }}
                      >
                        {hoveredRegion.severity}
                      </span>
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2">
                  {Object.entries(SEVERITY_COLORS).map(([sev, col]) => (
                    <div key={sev} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                      <span className="text-xs text-slate-400 capitalize">{sev}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <button
              onClick={() => onNavigate('faskes')}
              className="group flex-1 bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 rounded-2xl p-6 text-left transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <Shield size={22} className="text-cyan-400" />
              </div>
              <div className="font-semibold text-base mb-1.5">Akses Tenaga Medis Faskes 1</div>
              <div className="text-xs text-slate-400 leading-relaxed mb-4">
                Portal klinis untuk dokter dan perawat. Rekam medis elektronik, triase cerdas ML, dan manajemen rujukan terstandarisasi.
              </div>
              <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium">
                <span>Login sebagai Nakes</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => onNavigate('command')}
              className="group flex-1 bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 rounded-2xl p-6 text-left transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                <BarChart3 size={22} className="text-amber-400" />
              </div>
              <div className="font-semibold text-base mb-1.5">Radar Data Epidemiologi</div>
              <div className="text-xs text-slate-400 leading-relaxed mb-4">
                Pusat komando data agregat untuk Kepala Dinkes. Komparasi nasional, sinkronisasi SATUSEHAT, dan kontrol literasi publik.
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <span>Login sebagai Admin</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => onNavigate('literacy')}
              className="group flex-1 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 rounded-2xl p-6 text-left transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <BookOpen size={22} className="text-emerald-400" />
              </div>
              <div className="font-semibold text-base mb-1.5">Pusat Literasi & Edukasi Warga</div>
              <div className="text-xs text-slate-400 leading-relaxed mb-4">
                Akses langsung tanpa login. Panduan kesehatan, pertolongan pertama, dan edukasi sistem puskesmas digital bagi masyarakat.
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <span>Akses Publik</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Bottom region table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <span className="text-sm font-semibold">Distribusi Kasus per Wilayah — Mei 2026</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-5 py-3 font-medium">Wilayah</th>
                  <th className="text-left px-5 py-3 font-medium">Penyakit Dominan</th>
                  <th className="text-left px-5 py-3 font-medium">Kode ICD-10</th>
                  <th className="text-right px-5 py-3 font-medium">Jumlah Kasus</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.sort((a, b) => b.case_count - a.case_count).map((s, i) => (
                  <tr key={s.id} className={`border-b border-slate-800/50 ${i % 2 === 0 ? '' : 'bg-slate-900/50'}`}>
                    <td className="px-5 py-3 text-slate-200">{s.region}</td>
                    <td className="px-5 py-3 text-slate-300">{s.disease_name}</td>
                    <td className="px-5 py-3 font-mono text-cyan-400">{s.icd10_code}</td>
                    <td className="px-5 py-3 text-right font-semibold text-white">{s.case_count}</td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                        style={{
                          background: SEVERITY_COLORS[s.severity] + '20',
                          color: SEVERITY_COLORS[s.severity],
                          border: `1px solid ${SEVERITY_COLORS[s.severity]}40`,
                        }}
                      >
                        {s.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4 space-y-1">
          <div>Standar Interoperabilitas: HL7 FHIR R4 · INA-CBGs · ICD-10 · JKN/BPJS Kesehatan</div>
          <div>© 2026 Dinas Kesehatan Kabupaten Kepulauan Mentawai — Smart Healthcare 3T</div>
        </div>
      </div>
    </div>
  );
}
