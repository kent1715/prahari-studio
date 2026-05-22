import React, { useState } from "react";
import { Volume2, Music, Type, AlertCircle, ShieldAlert, Zap, Radio, Sliders, RefreshCw, CheckCircle2, XCircle, Activity } from "lucide-react";
import type { Project } from "../types";

interface SettingsPanelProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

export default function SettingsPanel({ project, onUpdateProject }: SettingsPanelProps) {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{
    active: boolean;
    models: string[];
    message: string;
    source?: "server" | "client";
  } | null>(null);

  const checkOllamaStatus = async () => {
    setChecking(true);
    setStatus(null);
    const ollamaUrl = project.ollamaUrl || "http://127.0.0.1:11434";
    
    try {
      // 1. Try server-side query first
      const srvRes = await fetch("/api/check-ollama-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaUrl }),
      });
      const srvData = await srvRes.json();
      
      if (srvData.active) {
        setStatus({
          active: true,
          models: (srvData.models || []).map((m: any) => m.name || m),
          source: "server",
          message: srvData.message,
        });
        setChecking(false);
        return;
      }
      
      // 2. Fallback to client-side direct request (browser is local to Ollama host)
      const controller = new AbortController();
      const abortId = setTimeout(() => controller.abort(), 1500);
      
      const clientRes = await fetch(`${ollamaUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(abortId);
      
      if (clientRes.ok) {
        const clientData = await clientRes.json();
        const detectedModels = (clientData.models || []).map((m: any) => m.name || m);
        setStatus({
          active: true,
          models: detectedModels,
          source: "client",
          message: "Koneksi Langsung Browser Sukses! Ollama aktif di komputer local Anda."
        });
      } else {
        throw new Error("CORS or network error");
      }
    } catch (err: any) {
      setStatus({
        active: false,
        models: [],
        message: `Gagal terhubung ke Ollama (${err.message === "CORS or network error" ? "Akses diblokir CORS / Proteksi Browser" : "Service Offline"}). Pastikan Anda menyalakan aplikasi Ollama dan setel environment OLLAMA_ORIGINS=* jika perlu.`
      });
    } finally {
      setChecking(false);
    }
  };

  const [checkingWan, setCheckingWan] = useState(false);
  const [wanStatus, setWanStatus] = useState<{
    active: boolean;
    message: string;
    statusCode?: number;
  } | null>(null);

  const checkWanStatus = async () => {
    setCheckingWan(true);
    setWanStatus(null);
    const wanUrl = project.wanUrl || "http://127.0.0.1:7860";
    
    try {
      // 1. Coba melalui server proxy cloud
      const res = await fetch("/api/check-wan-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wanUrl })
      });
      const data = await res.json();
      
      if (data.active) {
        setWanStatus({
          active: true,
          statusCode: data.statusCode,
          message: data.message
        });
        setCheckingWan(false);
        return;
      }
    } catch (err: any) {}

    // 2. Jika server gagal (pasti terjadi untuk localhost karena server ada di cloud), coba uji LANGSUNG dari browser klien
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      
      // Mode no-cors dpt mendeteksi apakah host merespon/terbuka, meskipun browser memblokir pembacaan body karena aturan CORS
      await fetch(wanUrl, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      setWanStatus({
        active: true,
        message: `Terhubung Langsung! Browser Anda berhasil menjangkau mesin lokal Anda di ${wanUrl}. Sinyal terminal responsif.`
      });
    } catch (clientErr: any) {
      setWanStatus({
        active: false,
        message: `Gagal terhubung dari server cloud maupun browser Anda. Pastikan software (Gradio/ComfyUI/WebUI) menyala di PC Anda pada alamat "${wanUrl}" dan aktifkan fitur API.`
      });
    } finally {
      setCheckingWan(false);
    }
  };

  const fileStructures = [
    { name: "/generated_video", desc: "Tempat penyimpanan footage rendering WAN 2.2" },
    { name: "/generated_audio", desc: "Narasi bervolume & pitch yang diproduksi otomatis" },
    { name: "/subtitle", desc: "Penyimpanan metadata SRT/ASS berformat modern" },
    { name: "/thumbnails", desc: "Thumbnail visual siap pakai & beresolusi tinggi" },
  ];

  return (
    <div id="settings-audio-sub" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Sound overlay & LLM settings */}
      <div className="space-y-6">
        {/* LLM Engine Control */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Zap className="h-4 w-4 text-[#ff5a1f]" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Mesin Kecerdasan Buatan (LLM Engine)</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5 align-middle">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Penyedia Model AI (Text & Script Generator)</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => onUpdateProject({ ...project, llmProvider: "gemini" })}
                  className={`p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                    project.llmProvider !== "ollama"
                      ? "bg-[#ff5a1f]/10 border-[#ff5a1f] text-white"
                      : "bg-[#1c1c21] border-[#2d2d37] text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="block font-medium text-xs">Gemini API (Cloud AI)</span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5 leading-tight">Kecepatan tinggi melalui Google Cloud</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateProject({ ...project, llmProvider: "ollama" })}
                  className={`p-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                    project.llmProvider === "ollama"
                      ? "bg-[#ff5a1f]/10 border-[#ff5a1f] text-white"
                      : "bg-[#1c1c21] border-[#2d2d37] text-neutral-400 hover:text-white"
                  }`}
                >
                  <span className="block font-medium text-xs">Ollama (Offline Lokal)</span>
                  <span className="text-[9px] text-neutral-400 block mt-0.5 leading-tight">Optimalkan raw power RTX A2000 Anda</span>
                </button>
              </div>
            </div>

            {project.llmProvider === "ollama" && (
              <div className="space-y-3 p-3 bg-[#17171d] rounded-lg border border-[#202026] duration-150">
                <div className="flex items-start gap-1.5 text-[10px] text-[#ff5a1f] leading-normal bg-[#ff5a1f]/5 p-2 rounded">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Pastikan Anda telah menjalankan perintah <code>ollama run llama3</code> di komputer desktop local Anda (RTX A2000) agar server offline merespon kueri.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase">Endpoint URI Ollama Host</label>
                  <input
                    type="text"
                    className="w-full bg-[#101014] border border-[#2d2d37] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#ff5a1f]"
                    value={project.ollamaUrl || "http://127.0.0.1:11434"}
                    onChange={(e) => onUpdateProject({ ...project, ollamaUrl: e.target.value })}
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase">Model Identifier</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="bg-[#101014] border border-[#2d2d37] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#ff5a1f]"
                      value={["llama3", "llama3.2", "mistral", "gemma2", "phi3"].includes(project.ollamaModel || "llama3") ? (project.ollamaModel || "llama3") : "custom"}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          onUpdateProject({ ...project, ollamaModel: e.target.value });
                        }
                      }}
                    >
                      <option value="llama3">llama3</option>
                      <option value="llama3.2">llama3.2</option>
                      <option value="mistral">mistral</option>
                      <option value="gemma2">gemma2</option>
                      <option value="phi3">phi3</option>
                      <option value="custom">Kustom / Input Manual...</option>
                    </select>
                    
                    <input
                      type="text"
                      className="bg-[#101014] border border-[#2d2d37] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#ff5a1f]"
                      value={project.ollamaModel || "llama3"}
                      onChange={(e) => onUpdateProject({ ...project, ollamaModel: e.target.value })}
                      placeholder="Identitas model..."
                      title="Ketikkan nama model Ollama Anda secara manual jika berbeda"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono block">
                    Model aktif: <strong className="text-neutral-300">{project.ollamaModel || "llama3"}</strong>. Anda bisa mengetik manual seperti <code className="text-amber-500 font-bold">llama3.1</code> atau <code className="text-amber-500 font-bold">llama3.1:latest</code>.
                  </span>
                </div>

                {/* Connection Status Checker */}
                <div className="border-t border-[#2a2a35] pt-3 mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Cek Koneksi Ollama</span>
                    <button
                      type="button"
                      onClick={checkOllamaStatus}
                      disabled={checking}
                      className="px-2.5 py-1 bg-[#1c1c23] hover:bg-[#ff5a1f] hover:text-white text-neutral-300 rounded font-mono text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all active:scale-95 duration-100"
                    >
                      {checking ? <RefreshCw className="h-3 w-3 animate-spin text-[#ff5a1f]" /> : <Activity className="h-3 w-3 text-[#ff5a1f]" />}
                      <span>{checking ? "Mengecek..." : "Cek Status"}</span>
                    </button>
                  </div>

                  {status && (
                    <div className={`p-2.5 rounded text-xs leading-relaxed space-y-1.5 border transition-all ${
                      status.active 
                        ? "bg-emerald-950/20 border-emerald-900/35 text-emerald-300" 
                        : "bg-rose-950/20 border-rose-900/35 text-rose-300"
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase">
                        {status.active ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>OLLAMA AKTIF ({status.source === "server" ? "CONNECTED VIA SERVER" : "CONNECTED VIA BROWSER"})</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-400" />
                            <span>OLLAMA TIDAK DETEKSI</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] font-mono leading-tight">{status.message}</p>
                      
                      {status.active && status.models.length > 0 && (
                        <div className="pt-2 border-t border-emerald-900/20 space-y-1.5">
                          <span className="text-[9px] font-mono uppercase text-emerald-400 block font-bold">Model Lokal Terinstal (Klik untuk memilih):</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {status.models.map((mod, mIdx) => {
                              const isSelectedModelStyle = mod.toLowerCase() === (project.ollamaModel || "llama3").toLowerCase() || 
                                                           mod.toLowerCase().includes((project.ollamaModel || "llama3").toLowerCase()) ||
                                                           (project.ollamaModel || "llama3").toLowerCase().includes(mod.toLowerCase());
                              return (
                                <button 
                                  type="button"
                                  key={mIdx} 
                                  onClick={() => onUpdateProject({ ...project, ollamaModel: mod })}
                                  className={`text-[9px] font-mono px-2 py-0.5 rounded text-left transition-all duration-150 cursor-pointer ${
                                    isSelectedModelStyle 
                                      ? "bg-emerald-600 text-white font-bold border border-emerald-400 shadow-sm scale-105" 
                                      : "bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-100 border border-emerald-900/40"
                                  }`}
                                  title={`Klik untuk menggunakan model ${mod}`}
                                >
                                  {mod} {isSelectedModelStyle && "✓"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* WAN 2.2 Desktop Controller Block */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Radio className="h-4 w-4 text-[#ff5a1f]" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Koneksi Mesin Video WAN 2.2</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-neutral-400 uppercase">Endpoint URI WAN 2.2 Host</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-[#101014] border border-[#2d2d37] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#ff5a1f]"
                  value={project.wanUrl || "http://127.0.0.1:7860"}
                  onChange={(e) => onUpdateProject({ ...project, wanUrl: e.target.value })}
                  placeholder="e.g. http://127.0.0.1:7860"
                />
                <button
                  type="button"
                  onClick={checkWanStatus}
                  disabled={checkingWan}
                  className="px-3 py-1.5 bg-[#1c1c23] hover:bg-[#ff5a1f] hover:text-white text-neutral-300 rounded font-mono text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all active:scale-95 duration-100"
                >
                  {checkingWan ? <RefreshCw className="h-3 w-3 animate-spin text-[#ff5a1f]" /> : <Activity className="h-3 w-3 text-[#ff5a1f]" />}
                  <span>{checkingWan ? "Ping..." : "Test Link"}</span>
                </button>
              </div>
              <p className="text-[9px] text-neutral-500 font-mono mt-1">
                Port default Gradio/WebUI: <span className="text-neutral-400">7860</span> • ComfyUI: <span className="text-neutral-400">8188</span> • Custom API: <span className="text-neutral-400">8000</span>
              </p>
            </div>

            {wanStatus && (
              <div className={`p-2.5 rounded text-xs leading-relaxed space-y-1.5 border transition-all ${
                wanStatus.active 
                  ? "bg-emerald-950/20 border-emerald-900/35 text-emerald-300" 
                  : "bg-rose-950/20 border-rose-900/35 text-rose-300"
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase font-sans">
                  {wanStatus.active ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>WAN 2.2 DESKTOP ACTIVE</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-rose-400" />
                      <span>Sinyal WAN OFFLINE</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] font-mono leading-tight">{wanStatus.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sound overlay settings */}
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
