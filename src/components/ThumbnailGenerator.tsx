import React, { useState } from "react";
import { Sparkles, Eye, Image as ImageIcon, Check, Sliders, Type, ArrowUpRight, Smile } from "lucide-react";
import type { Project, ThumbnailConfig } from "../types";

interface ThumbnailGeneratorProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
}

export default function ThumbnailGenerator({ project, onUpdateProject }: ThumbnailGeneratorProps) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const defaultConfig: ThumbnailConfig = {
    title: project.title ? `RAHASIA BESAR: ${project.title}` : "MISTERI DUNIA YANG TERKUBUR!",
    style: "cinematic",
    characterType: "cyberpunk_monk",
    emotion: "shocked",
    hasRedArrow: true,
    hasCircle: true,
    shockExpression: true,
    textPlacement: "center",
    textColor: "#ffea00",
    bgColor: "#0f0f15",
  };

  const config = project.thumbnail || defaultConfig;

  const updateConfig = (newFields: Partial<ThumbnailConfig>) => {
    onUpdateProject({
      ...project,
      thumbnail: {
        ...config,
        ...newFields,
      },
    });
  };

  const styles = [
    { id: "cinematic", name: "Cinematic Dark" },
    { id: "glowing", name: "Neon Glowing" },
    { id: "horror", name: "Vintage Horror" },
    { id: "anime", name: "AI Anime Recap" },
    { id: "retro", name: "Retro Documentary" },
  ];

  const characters = [
    { id: "cyberpunk_monk", name: "Arkeolog Misterius" },
    { id: "ancient_soldier", name: "Prajurit Kuno" },
    { id: "scary_entity", name: "Entitas Astral" },
    { id: "shouting_man", name: "Pria Terkejut" },
    { id: "detective", name: "Detektif Klasik" },
  ];

  const colors = [
    { hex: "#ffea00", name: "Kuning CTR" },
    { hex: "#ff3333", name: "Merah Shocking" },
    { hex: "#ffffff", name: "Putih Bersih" },
    { hex: "#33ff33", name: "Hijau Neon" },
    { hex: "#33ccff", name: "Cyan Pop" },
  ];

  // Helper mock background images for thumbnails
  const placeholderBgs = [
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=640&q=80", // cinematic
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=640&q=80", // game neon
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80", // temple ruin
    "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=640&q=80", // scary storm
  ];

  const [bgIndex, setBgIndex] = useState(2);

  return (
    <div id="thumbnail-creator" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Controls & Tuner */}
      <div className="xl:col-span-1 space-y-6">
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Sliders className="h-4 w-4 text-[#ff5a1f]" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Perancang Thumbnail CTR</h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Title Text */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Judul Clickbait (CTR tinggi)</label>
              <textarea
                rows={2}
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none placeholder-neutral-600"
                placeholder="e.g., MISTERI INI AKAN MEMBUAT ANDA INSOMNIA!"
                value={config.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
              />
            </div>

            {/* Style selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Gaya Visual Estetika</label>
              <select
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
                value={config.style}
                onChange={(e) => updateConfig({ style: e.target.value })}
              >
                {styles.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Character template */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Subjek Karakter Sentral</label>
              <select
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
                value={config.characterType}
                onChange={(e) => updateConfig({ characterType: e.target.value })}
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Highlights Switches */}
            <div className="space-y-3 pt-2">
              <span className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Elemen Peningkat Atensi</span>

              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Gunakan Shock Expression Boost</span>
                <input
                  type="checkbox"
                  checked={config.shockExpression}
                  onChange={(e) => updateConfig({ shockExpression: e.target.checked })}
                  className="rounded border-[#2d2d37] bg-[#1c1c21] text-[#ff5a1f] focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Tambahkan Tanda Panah Merah</span>
                <input
                  type="checkbox"
                  checked={config.hasRedArrow}
                  onChange={(e) => updateConfig({ hasRedArrow: e.target.checked })}
                  className="rounded border-[#2d2d37] bg-[#1c1c21] text-[#ff5a1f] focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-300">Tambahkan Lingkaran Merah Sinyal</span>
                <input
                  type="checkbox"
                  checked={config.hasCircle}
                  onChange={(e) => updateConfig({ hasCircle: e.target.checked })}
                  className="rounded border-[#2d2d37] bg-[#1c1c21] text-[#ff5a1f] focus:ring-0 focus:ring-offset-0 h-4 w-4"
                />
              </div>
            </div>

            {/* Font color picks */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Warna Teks Utama</label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => updateConfig({ textColor: c.hex })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                      config.textColor === c.hex ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {config.textColor === c.hex && (
                      <Check className="h-3 w-3 text-black stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* BG picker */}
            <div className="space-y-1.5 pt-2">
              <span className="block text-[11px] font-mono text-neutral-400 uppercase tracking-widest">Kombinasi Gambar Latar</span>
              <div className="grid grid-cols-4 gap-2">
                {placeholderBgs.map((bg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBgIndex(idx)}
                    className={`aspect-video rounded overflow-hidden border-2 cursor-pointer ${
                      bgIndex === idx ? "border-[#ff5a1f]" : "border-transparent"
                    }`}
                  >
                    <img src={bg} alt="bg preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Sandbox Monitor */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#232329] pb-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#ff5a1f]" />
              <h3 className="font-sans font-medium text-white text-sm">Pratinjau Hasil Desain CTR Thumbnail (1280x720)</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500 bg-[#19191e] px-2.5 py-0.5 rounded-full">
              Kualitas: Ultra HD
            </span>
          </div>

          {/* Actual canvas preview simulation */}
          <div
            id="thumbnail-realtime-canvas"
            className="w-full aspect-video rounded-xl relative overflow-hidden bg-neutral-900 border border-neutral-800 shadow-2xl flex items-center justify-center"
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url(${placeholderBgs[bgIndex]})`,
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          >
            {/* Dark overlay effects based on styles */}
            {config.style === "horror" && (
              <div className="absolute inset-0 bg-red-950/10 pointer-events-none mix-blend-color-burn" />
            )}
            {config.style === "glowing" && (
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/10 to-transparent pointer-events-none" />
            )}

            {/* Render Red circle signal */}
            {config.hasCircle && (
              <div className="absolute left-[30%] top-[40%] w-24 h-24 border-[4px] border-red-500 rounded-full animate-pulse flex items-center justify-center shadow-lg">
                <span className="text-red-500 text-[10px] bg-black/60 px-1 text-center py-0.5 font-bold uppercase rounded leading-none">Misteri!</span>
              </div>
            )}

            {/* Red Arrow */}
            {config.hasRedArrow && (
              <div className="absolute right-[45%] top-[15%] text-red-500 drop-shadow-[0_4px_12px_rgba(255,0,0,0.8)] filter">
                <ArrowUpRight className="h-24 w-24 stroke-[4] origin-bottom-left rotate-[130deg] animate-bounce" />
              </div>
            )}

            {/* Central Subject Portrait simulation */}
            <div className="absolute bottom-0 right-4 h-[85%] aspect-[1/1.2] flex items-end justify-center pointer-events-none">
              <div className="relative h-full w-full">
                {/* Character visual based on selections */}
                <div className="absolute bottom-0 inset-x-0 h-full bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                <div className="w-full h-full bg-[#1b1b26]/50 border border-neutral-700/20 rounded-t-full overflow-hidden flex flex-col justify-end items-center relative gap-1">
                  {/* Mock beautiful silhouette avatar */}
                  <div className="absolute top-[30%] text-center px-4 space-y-1">
                    <Smile className={`h-16 w-16 mx-auto ${config.shockExpression ? "text-amber-400 scale-125" : "text-neutral-400"}`} />
                    <span className="text-[11px] font-mono text-neutral-400 block bg-black/60 px-2 py-0.5 rounded uppercase">
                      {config.characterType.replace("_", " ")}
                    </span>
                    {config.shockExpression && (
                      <span className="text-[9px] font-mono text-red-400 font-bold bg-black/70 px-1 py-0.5 rounded uppercase animate-bounce block">
                        90% CTR SHOCK BOOST
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drag text content at the top or bottom */}
            <div className="absolute inset-x-6 top-8 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] max-w-[70%]">
              <h2
                className="font-sans font-extrabold text-2xl md:text-3xl leading-tight uppercase select-none tracking-tight filter drop-shadow-[0_4px_8px_rgba(0,0,0,1)] text-[#ffee00]"
                style={{ color: config.textColor }}
              >
                {config.title || "TULIS KALIMAT CLICKBAIT DI SINI"}
              </h2>
              <div className="mt-2 inline-flex items-center gap-1 bg-[#ff5a1f] text-white text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded">
                <Sparkles className="h-3 w-3 fill-current" />
                <span>WAN 2.2 COGNITIVE GRAPHICS</span>
              </div>
            </div>

            {/* Grid helper layer to verify design balance */}
            <div className="absolute inset-0 bg-transparent flex flex-col pointer-events-none border border-neutral-800">
              <div className="flex-1 border-b border-white/5 flex">
                <div className="flex-1 border-r border-white/5" />
                <div className="flex-1 border-r border-white/5" />
                <div className="flex-1" />
              </div>
              <div className="flex-1 border-b border-white/5 flex">
                <div className="flex-1 border-r border-white/5" />
                <div className="flex-1 border-r border-white/5" />
                <div className="flex-1" />
              </div>
              <div className="flex-1 flex">
                <div className="flex-1 border-r border-white/5" />
                <div className="flex-1 border-r border-white/5" />
                <div className="flex-1" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                onUpdateProject({
                  ...project,
                  thumbnail: {
                    ...config,
                    customImage: placeholderBgs[bgIndex]
                  }
                });
                showToast("Aset Thumbnail CTR berhasil dirakit dan disimpan ke database proyek!");
              }}
              className="flex-1 bg-[#ff5a1f] hover:bg-[#e04a15] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer duration-150 transition-all select-none active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Simpan Thumbnail ke Project</span>
            </button>
            <button
              onClick={async () => {
                try {
                  showToast("Mempersiapkan penarikan latar belakang UHD...");
                  const imgUrl = placeholderBgs[bgIndex];
                  const res = await fetch(imgUrl);
                  const blob = await res.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = blobUrl;
                  a.download = `thumbnail_wan22_${project.id || "export"}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
                  showToast("Sukses mengunduh latar belakang proyek!");
                } catch (e) {
                  window.open(placeholderBgs[bgIndex], "_blank");
                  showToast("Latar UHD telah dibuka di tab baru untuk disimpan.");
                }
              }}
              className="bg-neutral-800 text-neutral-200 hover:bg-neutral-700 text-xs font-medium px-4 py-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95 select-none"
            >
              Ekspor Latar Belakang (.PNG)
            </button>
          </div>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121214] border border-[#ff5a1f] text-neutral-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="h-2 w-2 rounded-full bg-[#ff5a1f] animate-ping" />
          <span className="font-mono text-[11px] leading-none uppercase tracking-wide">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
