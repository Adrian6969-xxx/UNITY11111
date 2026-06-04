import { useState, useEffect } from 'react';
import {
  BookOpen, ChevronLeft, AlertTriangle, Play, Search,
  ChevronRight, X, ExternalLink, Heart, Droplets, Wind,
  Thermometer, Bug, Zap, Activity
} from 'lucide-react';
import { supabase, LiteracyContent, DiseaseAlert } from '../lib/supabase';

interface LiteracyPageProps {
  onNavigate: (sector: string) => void;
}

const DISEASE_DIRECTORY = [
  { name: 'Diare', code: 'A09', icon: Droplets, color: '#f59e0b', firstAid: 'Buat oralit: 1 liter air matang + 6 sdt gula + ½ sdt garam. Berikan sedikit-sedikit setiap 5-10 menit. Pergi ke puskesmas jika >3 hari, ada darah, atau anak tampak sangat lemas.' },
  { name: 'ISPA / Batuk Pilek', code: 'J06.9', icon: Wind, color: '#06b6d4', firstAid: 'Istirahat cukup, perbanyak minum air hangat. Kompres dahi jika demam. Gunakan masker agar tidak menular. Segera ke puskesmas jika napas cepat atau kesulitan bernapas.' },
  { name: 'Malaria', code: 'B54', icon: Bug, color: '#ef4444', firstAid: 'Jangan tunggu gejala berat. Segera ke puskesmas untuk pemeriksaan darah (RDT). Selama menunggu: turunkan demam dengan kompres, jangan diberikan obat sembarangan.' },
  { name: 'Hipertensi', code: 'I10', icon: Activity, color: '#8b5cf6', firstAid: 'Hindari stres, garam berlebih, dan kafein. Istirahat berbaring jika kepala sangat pusing. Jangan hentikan obat rutin. Segera ke puskesmas jika pusing sangat berat atau disertai nyeri dada.' },
  { name: 'Demam Berdarah', code: 'A97', icon: Thermometer, color: '#10b981', firstAid: 'Perbanyak minum: air putih, jus jambu biji, oralit. Pantau tanda bahaya: bintik merah di kulit, mimisan, muntah darah. SEGERA ke puskesmas atau RSUD jika ada tanda bahaya tersebut.' },
  { name: 'TB Paru', code: 'A15', icon: Heart, color: '#f97316', firstAid: 'Batuk > 2 minggu, ada darah, berat badan turun tanpa sebab: segera periksa ke puskesmas. Pakai masker, pisahkan alat makan. Obat TB harus diminum rutin 6 bulan penuh — jangan berhenti.' },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  diare: Droplets,
  ispa: Wind,
  malaria: Bug,
  sistem: BookOpen,
  general: Heart,
};

export default function LiteracyPage({ onNavigate }: LiteracyPageProps) {
  const [content, setContent] = useState<LiteracyContent[]>([]);
  const [alerts, setAlerts] = useState<DiseaseAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<LiteracyContent | null>(null);
  const [activeDisease, setActiveDisease] = useState<typeof DISEASE_DIRECTORY[number] | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  useEffect(() => {
    supabase.from('literacy_content').select('*').eq('is_active', true).order('priority_order').then(({ data }) => {
      if (data) setContent(data);
    });
    supabase.from('disease_alerts').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setAlerts(data);
    });
  }, []);

  const activeAlert = alerts[0];
  const featured = content.filter(c => c.is_featured);
  const articles = content.filter(c => c.content_type === 'article');
  const filteredDirectory = DISEASE_DIRECTORY.filter(d =>
    searchQuery === '' ||
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const alertColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    critical: { bg: 'bg-red-900/60', border: 'border-red-600/60', text: 'text-red-200', icon: 'text-red-400' },
    warning: { bg: 'bg-amber-900/40', border: 'border-amber-600/40', text: 'text-amber-200', icon: 'text-amber-400' },
    info: { bg: 'bg-blue-900/40', border: 'border-blue-600/40', text: 'text-blue-200', icon: 'text-blue-400' },
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-800 bg-slate-950 sticky top-0 z-40 px-6 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm">
          <ChevronLeft size={16} />
          Portal Utama
        </button>
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-400" />
          <span className="text-sm font-semibold text-slate-200">Pusat Literasi & Edukasi Warga</span>
        </div>
        <div className="w-20" />
      </nav>

      {/* Dynamic Alert Banner */}
      {activeAlert && (
        <div className={`${alertColors[activeAlert.alert_level].bg} ${alertColors[activeAlert.alert_level].border} border-b px-6 py-4`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className={`${alertColors[activeAlert.alert_level].icon} shrink-0 mt-0.5`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${alertColors[activeAlert.alert_level].text}`}>
                    AWAS WABAH {activeAlert.disease_name.toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-red-900/60 text-red-300 rounded-full font-medium uppercase">{activeAlert.alert_level}</span>
                </div>
                <p className={`text-xs ${alertColors[activeAlert.alert_level].text} opacity-80 leading-relaxed`}>{activeAlert.message}</p>
              </div>
              <button
                onClick={() => setShowDirectory(true)}
                className={`shrink-0 flex items-center gap-1 text-xs font-medium ${alertColors[activeAlert.alert_level].text} underline`}
              >
                Lihat Panduan
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-8">

        {/* Hero with featured content */}
        {featured.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {featured.map(item => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer border border-slate-700/50 hover:border-emerald-500/50 transition-all"
                onClick={() => item.content_type === 'video' ? setShowVideo(true) : setActiveArticle(item)}
              >
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {item.content_type === 'video' ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                        <Play size={10} />
                        Video Tutorial
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs rounded-full">
                        Panduan Kesehatan
                      </span>
                    )}
                    {item.is_featured && activeAlert && (
                      <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs rounded-full flex items-center gap-1">
                        <Zap size={10} />
                        Diprioritaskan
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white leading-tight">{item.title}</h3>
                </div>
                {item.content_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/30">
                      <Play size={22} className="text-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: BookOpen,
              label: 'Baca Panduan Pencegahan Mandiri',
              desc: 'Langkah-langkah pencegahan penyakit umum di rumah',
              color: 'text-emerald-400',
              border: 'border-emerald-500/30 hover:border-emerald-500/60',
              bg: 'bg-emerald-500/10',
              action: () => setActiveArticle(content.find(c => c.content_type === 'article') ?? null),
            },
            {
              icon: Play,
              label: 'Tonton Cara Pakai Puskesmas Digital',
              desc: 'Animasi tutorial alur berobat sistem baru',
              color: 'text-cyan-400',
              border: 'border-cyan-500/30 hover:border-cyan-500/60',
              bg: 'bg-cyan-500/10',
              action: () => setShowVideo(true),
            },
            {
              icon: Search,
              label: 'Cari Arsip Pertolongan Pertama',
              desc: 'Direktori A-Z penanganan penyakit ringan di rumah',
              color: 'text-amber-400',
              border: 'border-amber-500/30 hover:border-amber-500/60',
              bg: 'bg-amber-500/10',
              action: () => setShowDirectory(true),
            },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className={`group text-left bg-slate-900 border ${item.border} rounded-2xl p-5 transition-all`}
            >
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon size={18} className={item.color} />
              </div>
              <div className="font-medium text-sm text-white mb-1">{item.label}</div>
              <div className="text-xs text-slate-400">{item.desc}</div>
            </button>
          ))}
        </div>

        {/* Articles grid */}
        {articles.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-white mb-4">Artikel Kesehatan Terkini</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {articles.map(article => {
                const CategoryIcon = CATEGORY_ICONS[article.category] ?? Heart;
                return (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticle(article)}
                    className="group text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-all"
                  >
                    {article.thumbnail_url && (
                      <img src={article.thumbnail_url} alt={article.title} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon size={12} className="text-emerald-400" />
                        <span className="text-xs text-slate-500 capitalize">{article.category}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white leading-snug mb-1">{article.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2">
                        Baca selengkapnya <ChevronRight size={12} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Disease directory preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Direktori Penyakit Umum</h2>
            <button onClick={() => setShowDirectory(true)} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Lihat semua <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DISEASE_DIRECTORY.slice(0, 6).map(disease => (
              <button
                key={disease.code}
                onClick={() => { setActiveDisease(disease); setShowDirectory(false); }}
                className="group text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-all"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: disease.color + '20' }}>
                  <disease.icon size={16} style={{ color: disease.color }} />
                </div>
                <div className="text-xs font-semibold text-white">{disease.name}</div>
                <div className="font-mono text-xs mt-0.5" style={{ color: disease.color }}>{disease.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 pb-4 space-y-1">
          <div>Informasi kesehatan ini bersumber dari Kemenkes RI, WHO, dan PPK Faskes 1.</div>
          <div>Portal Literasi Publik — Dinas Kesehatan Kabupaten Kepulauan Mentawai</div>
        </div>
      </div>

      {/* Article Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur flex items-start justify-center pt-8 px-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl mb-8">
            {activeArticle.thumbnail_url && (
              <img src={activeArticle.thumbnail_url} alt={activeArticle.title} className="w-full h-52 object-cover" />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-white leading-snug pr-4">{activeArticle.title}</h2>
                <button onClick={() => setActiveArticle(null)} className="shrink-0 text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div
                className="prose-custom text-sm text-slate-300 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: activeArticle.body_html }}
              />
              <div className="mt-6 pt-5 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
                <ExternalLink size={12} />
                Sumber: Pedoman Klinis Kemenkes RI — Panduan Praktik Klinis Faskes Tingkat Pertama
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play size={15} className="text-emerald-400" />
                <span className="text-sm font-semibold">Tutorial: Cara Pakai Puskesmas Digital</span>
              </div>
              <button onClick={() => setShowVideo(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Animated placeholder for video tutorial */}
              <div className="bg-slate-800 rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-cyan-900/20" />
                <div className="text-center z-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
                    <Play size={28} className="text-emerald-400 ml-1" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Video Tutorial Sistem Digital</p>
                  <p className="text-xs text-slate-500 mt-1">Durasi: 3 menit 24 detik</p>
                </div>
              </div>
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-white">Ringkasan Alur Berobat Digital:</h3>
                {[
                  '1. Datang ke Puskesmas → Daftar antrian via sistem digital',
                  '2. Nakes input keluhan ke sistem RME (Rekam Medis Elektronik)',
                  '3. Mesin Triase ML memproses data & menyarankan diagnosis',
                  '4. Dokter memvalidasi dan pasien mendapat resep digital',
                  '5. Klaim BPJS otomatis tercatat — tidak perlu antri administrasi',
                ].map(step => (
                  <div key={step} className="flex items-start gap-2 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Directory Modal */}
      {showDirectory && !activeDisease && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex items-start justify-center pt-8 px-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl mb-8">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={15} className="text-amber-400" />
                <span className="text-sm font-semibold">Arsip Pertolongan Pertama A-Z</span>
              </div>
              <button onClick={() => setShowDirectory(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari penyakit atau kode ICD-10..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDirectory.map(disease => (
                  <button
                    key={disease.code}
                    onClick={() => setActiveDisease(disease)}
                    className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-3 text-left transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: disease.color + '20' }}>
                      <disease.icon size={16} style={{ color: disease.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{disease.name}</div>
                      <div className="text-xs font-mono mt-0.5" style={{ color: disease.color }}>{disease.code}</div>
                    </div>
                    <ChevronRight size={15} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disease Detail Modal */}
      {activeDisease && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: activeDisease.color + '20' }}>
                  <activeDisease.icon size={16} style={{ color: activeDisease.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{activeDisease.name}</div>
                  <div className="font-mono text-xs" style={{ color: activeDisease.color }}>{activeDisease.code}</div>
                </div>
              </div>
              <button onClick={() => setActiveDisease(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pertolongan Pertama di Rumah</h3>
              <p className="text-sm text-slate-200 leading-relaxed">{activeDisease.firstAid}</p>
              <div className="mt-5 p-4 bg-amber-900/20 border border-amber-800/40 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    Informasi ini hanya untuk pertolongan pertama awal. Selalu kunjungi tenaga medis atau puskesmas terdekat untuk penanganan yang tepat.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveDisease(null)}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Kembali ke Direktori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
