import React from "react";
import { Volume2, Music, Type, AlertCircle, ShieldAlert, Zap, Radio, Sliders } from "lucide-react";
import type { Project } from "../types";

interface SettingsPanelProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

export default function SettingsPanel({ project, onUpdateProject }: SettingsPanelProps) {
  const fileStructures = [
    { name: "/generated_video", desc: "Tempat penyimpanan footage rendering WAN 2.2" },
    { name: "/generated_audio", desc: "Narasi bervolume & pitch yang diproduksi otomatis" },
    { name: "/subtitle", desc: "Penyimpanan metadata SRT/ASS berformat modern" },
    { name: "/thumbnails", desc: "Thumbnail visual siap pakai & beresolusi tinggi" },
  ];

  return (
    <div id="settings-audio-sub" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Sound overlay settings */}
      <div className="space-y-6">
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Volume2 className="h-4 w-4 text-[#ff5a1f]" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Metode Voice Over AI & Audio</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Voice select engine */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Mesin Rekonstruksi Suara AI</label>
              <select
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
                value={project.voiceEngine}
                onChange={(e: any) => onUpdateProject({ ...project, voiceEngine: e.target.value })}
              >
                <option value="Edge TTS">Edge TTS (Gratis, Natural & Cepat)</option>
                <option value="Kokoro TTS">Kokoro TTS (Lokal, Akurasi Tinggi)</option>
                <option value="XTTS">XTTS v2 (Kloning Suara Lokal)</option>
                <option value="Fish Speech">Fish Speech v1.2 (Sangat Manusiawi)</option>
                <option value="ElevenLabs">ElevenLabs API (Kualitas Studio / Premium)</option>
              </select>
            </div>

            {/* Speeds and speed sliders */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Kecepatan Pengucapan</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    className="w-full h-1 bg-[#24242b] rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
                    value={project.voiceSpeed}
                    onChange={(e) => onUpdateProject({ ...project, voiceSpeed: parseFloat(e.target.value) })}
                  />
                  <span className="font-mono text-xs w-8 text-right text-neutral-300">{project.voiceSpeed}x</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Nuansa & Emosi Suara</label>
                <select
                  className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  value={project.voiceEmotion}
                  onChange={(e) => onUpdateProject({ ...project, voiceEmotion: e.target.value })}
                >
                  <option value="Dramatis & Misterius">Dramatis & Misterius</option>
                  <option value="Horor Menyeramkan">Horor Menyeramkan</option>
                  <option value="Semangat & Inspiratif">Semangat & Inspiratif</option>
                  <option value="Humor & Santai">Humor & Santai</option>
                  <option value="Dokumenter Tenang">Dokumenter Tenang</option>
                </select>
              </div>
            </div>

            {/* Background Music picker */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Musik Latar Belakang (No-Copyright)</label>
              <select
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
                value={project.musicMood}
                onChange={(e) => onUpdateProject({ ...project, musicMood: e.target.value })}
              >
                <option value="suspense_dark">Suspense Dark Ambient (Instan matching)</option>
                <option value="epic_orchestral">Epic Cinematic Orchestral</option>
                <option value="lofi_nostalgic">Lofi Chill Nostalgic (Santai)</option>
                <option value="action_drums">Aggressive Cinematic Drums</option>
                <option value="mystical_pad">Mystical Deep Space Pads</option>
              </select>
            </div>
          </div>
        </div>

        {/* Antrian folder directory structures view as defined in MVP structure */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Radio className="h-4 w-4 text-cyan-500" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Arsitektur Penyimpanan Lokal</h3>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-neutral-400 mb-2">Semua file didefinisikan ke struktur disk lokal agar render engine tidak crash:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fileStructures.map((f, idx) => (
                <div key={idx} className="bg-[#18181c] border border-[#22222a] p-2.5 rounded-lg space-y-1">
                  <span className="font-mono text-[#ff5a1f] font-semibold">{f.name}</span>
                  <p className="text-neutral-400 text-[10px]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subtitle & Anti copyright transforms */}
      <div className="space-y-6">
        {/* Style of subtitles */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Type className="h-4 w-4 text-[#ff5a1f]" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Auto Subtitle & Overlays</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Gaya Teks Tampilan Subtitle</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "tiktok", name: "Gaya TikTok Pop", desc: "Teks lompat kata-per-kata" },
                  { id: "documentary", name: "Dokumenter Klasik", desc: "Ramping bawah, warna kuning" },
                  { id: "cinematic", name: "Cinematic Letterbox", desc: "Kecil di black border" },
                  { id: "karaoke", name: "Karaoke Realtime", desc: "Warna bergerak mengikuti suara" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onUpdateProject({ ...project, subtitleStyle: st.id as any })}
                    className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                      project.subtitleStyle === st.id
                        ? "bg-[#ff5a1f]/10 border-[#ff5a1f] text-white"
                        : "bg-[#1c1c21] border-[#2d2d37] text-neutral-400"
                    }`}
                  >
                    <span className="block font-semibold">{st.name}</span>
                    <span className="text-[10px] text-neutral-400">{st.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#17171d] border border-[#23232a] p-3 rounded-lg">
              <div className="space-y-0.5">
                <span className="block font-medium text-neutral-200">Gunakan Burn-In Subtitles</span>
                <p className="text-[10px] text-neutral-400">Teks langsung dirender mati ke berkas video MP4 final</p>
              </div>
              <input
                type="checkbox"
                checked={project.subtitleBurn}
                onChange={(e) => onUpdateProject({ ...project, subtitleBurn: e.target.checked })}
                className="rounded border-[#2d2d37] bg-[#1c1c21] text-[#ff5a1f] focus:ring-0 focus:ring-offset-0 h-4 w-4"
              />
            </div>
          </div>
        </div>

        {/* Section 11 Anti copyright transforms detail settings */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <ShieldAlert className="h-4 w-4 text-emerald-500" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Sistem Pelindung Anti-Copyright YouTube</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-2 bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg text-emerald-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Protektor Hak Cipta Ganda Aktif</span>
                Sistem secara cerdas merubah metadata visual dan frekuensi audio untuk meminimalisir sensor copyright ID YouTube.
              </div>
            </div>

            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-medium text-neutral-300">Random Motion Transform</span>
                  <p className="text-[10px] text-neutral-400">Merubah sedikit rotasi sudut footage video WAN 2.2</p>
                </div>
                <div className="px-2 py-0.5 bg-neutral-800 text-emerald-400 font-mono text-[10px] rounded">AKTIF</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-medium text-neutral-300">Dynamic Crop & Zoom Loop</span>
                  <p className="text-[10px] text-neutral-400">Variasi zoom minor (0.5% - 2%) secara dinamis sepanjang scene</p>
                </div>
                <div className="px-2 py-0.5 bg-neutral-800 text-emerald-400 font-mono text-[10px] rounded">AKTIF</div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="block font-medium text-neutral-300">Audio Pitch Micro-Shift</span>
                  <p className="text-[10px] text-neutral-400">Geser ketukan pitch minuscle untuk musik agar tidak terdeteksi bot</p>
                </div>
                <div className="px-2 py-0.5 bg-neutral-800 text-emerald-400 font-mono text-[10px] rounded">AKTIF</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
