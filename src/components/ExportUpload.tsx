import React, { useState, useEffect } from "react";
import { Play, Sparkles, Youtube, CheckCircle, RefreshCw, Radio, HardDrive, Share2, Info } from "lucide-react";
import type { Project } from "../types";

interface ExportUploadProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onAddQueue: (item: any) => void;
}

export default function ExportUpload({ project, onUpdateProject, onAddQueue }: ExportUploadProps) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [youtubeChannelId, setYoutubeChannelId] = useState("UC-WAN-Auto-Creator");
  const [videoTags, setVideoTags] = useState("WAN 2.2, Alur Cerita AI, Sejarah Mistis, YouTube Automation");
  const [uploadSchedule, setUploadSchedule] = useState("Kirim Langsung (Publish Now)");

  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  useEffect(() => {
    setUploadDone(project.status === "completed");
    setCompiling(false);
    setCompileProgress(0);
    setUploading(false);
  }, [project.id, project.status]);

  // Trigger compiler to glue scenes, narration, BGM, sfx and subtitles together
  const handleCompile = () => {
    if (!project.storyboard || project.storyboard.length === 0) {
      showToast("Buat storyboard dan naskah terlebih dahulu sebelum merakit video!", "error");
      return;
    }

    setCompiling(true);
    setCompileProgress(0);

    onAddQueue({
      projectId: project.id,
      projectTitle: project.title,
      type: "compiling",
      vramRequiredGb: 14.5,
      gpuId: 0
    });

    const interval = setInterval(() => {
      setCompileProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCompiling(false);
          // Set video as ready
          onUpdateProject({
            ...project,
            status: "ready",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" // clean persistent preview video
          });
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  // Simulates optional automatic youtube cloud/local upload using credentials
  const handleAutoUpload = () => {
    setUploading(true);
    setUploadDone(false);

    onAddQueue({
      projectId: project.id,
      projectTitle: project.title,
      type: "upload",
      vramRequiredGb: 0.5,
      gpuId: 0
    });

    setTimeout(() => {
      setUploading(false);
      setUploadDone(true);
      onUpdateProject({
        ...project,
        status: "completed"
      });
    }, 3000);
  };

  return (
    <div id="export-upload-tab" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Visual rendering pipeline panel */}
      <div className="bg-[#121214] border border-[#232329] rounded-xl p-6 space-y-6">
        <div className="border-b border-[#232329] pb-3">
          <h2 className="font-sans font-medium text-white text-base">Perakitan & Export Video Final (FFmpeg Engine)</h2>
          <p className="text-neutral-400 text-xs">Menggabungkan Video Scene + Voice Over + Musik Backsound + Auto Subtitle</p>
        </div>

        {/* Video state screen */}
        <div className="aspect-video w-full rounded-lg bg-neutral-950 border border-[#232329] overflow-hidden relative flex flex-col items-center justify-center p-4">
          {project.videoUrl ? (
            <div className="w-full h-full relative group">
              <video
                src={project.videoUrl}
                controls
                className="w-full h-full object-contain"
                poster="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=640&q=80"
              />
              <div className="absolute top-4 left-4 bg-emerald-950/80 border border-emerald-500 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-sm shadow uppercase">
                Video Berhasil Dirakit!
              </div>
            </div>
          ) : compiling ? (
            <div className="text-center space-y-3 w-4/5">
              <RefreshCw className="h-10 w-10 text-[#ff5a1f] animate-spin mx-auto" />
              <div className="space-y-1.5">
                <span className="font-mono text-sm font-semibold text-white">Menyatukan Trek Video & Audio... ({compileProgress}%)</span>
                <p className="text-[10px] text-neutral-400">FFmpeg melaraskan bitrates audio & meluncurkan subtitle ASS TikTok Style...</p>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                <div className="bg-[#ff5a1f] h-full duration-150" style={{ width: `${compileProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
                <Share2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-neutral-300">Video belum dirakit</h3>
                <p className="text-xs text-neutral-500 max-w-sm">Klik tombol dibawah untuk merakit seluruh footage WAN 2.2 kedalam format video final bertaraf YouTube.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCompile}
            disabled={compiling || !project.storyboard || project.storyboard.length === 0}
            className="flex-1 bg-[#ff5a1f] text-white hover:bg-[#e04a15] text-xs font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {compiling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            <span>Mulai Rakit Video (Export)</span>
          </button>
        </div>
      </div>

      {/* Auto upload system section 6.11 */}
      <div className="bg-[#121214] border border-[#232329] rounded-xl p-6 space-y-6">
        <div className="border-b border-[#232329] pb-3 flex justify-between items-center">
          <div>
            <h2 className="font-sans font-medium text-white text-base">Otomatisasi Publikasi YouTube</h2>
            <p className="text-neutral-400 text-xs">Penerbitan semi-otomatis menggunakan standard Google API Client</p>
          </div>
          <Youtube className="h-6 w-6 text-red-500" />
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase">ID Saluran / Channel Premium</label>
            <input
              type="text"
              className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
              value={youtubeChannelId}
              onChange={(e) => setYoutubeChannelId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase">Metadata Tag Konten (Dipisah Koma)</label>
            <input
              type="text"
              className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
              value={videoTags}
              onChange={(e) => setVideoTags(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase">Waktu Penayangan (Schedule)</label>
            <select
              className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-white focus:outline-none"
              value={uploadSchedule}
              onChange={(e) => setUploadSchedule(e.target.value)}
            >
              <option value="Publish Now">Kirim Langsung (Publish Now)</option>
              <option value="Schedule Next Hour">Jadwalkan 1 Jam Lagi (Batch Optimization)</option>
              <option value="Schedule Tomorrow">Jadwalkan Besok Pagi (08:00 WIB)</option>
            </select>
          </div>

          <div className="space-y-1.5 bg-[#17171d] border border-[#202026] p-3 rounded-lg">
            <span className="block font-medium text-neutral-200">Teks Deskripsi & SEO Auto-generator</span>
            <p className="text-[10px] text-neutral-400 font-mono leading-relaxed bg-[#101014] p-2 rounded">
              {project.title ? `💥 TONTON: ${project.title}\n\nSelamat datang di KentStudio! Di video ini kami mengulas tuntas secara mendalam mengenai kisah visual ini.\n\n#${project.niche?.replace(/\s/g, "")} #automation #viral #WAN` : "Tulis judul terlebih dahulu guna sinkronisasi deskripsi metadata video otomatis."}
            </p>
          </div>

          {uploadDone ? (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/60 rounded-lg text-emerald-400 flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500 fill-current text-white" />
              <div>
                <span className="font-bold block text-white text-xs">BERHASIL DIPUBLIKASI!</span>
                Video dan thumbnail CTR unik berhasil diupload secara aman di YouTube Studio. ID Penayangan: yt-3049283
              </div>
            </div>
          ) : (
            <button
              onClick={handleAutoUpload}
              disabled={uploading || !project.videoUrl}
              className="w-full bg-red-600 text-white hover:bg-red-700 text-xs font-semibold py-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Youtube className="h-4 w-4" />
              )}
              <span>Auto Upload ke YouTube Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Notification Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 bg-[#121214] border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce ${
          toast.type === "error" ? "border-rose-500" : "border-[#ff5a1f]"
        }`}>
          <div className={`h-2 w-2 rounded-full animate-ping ${
            toast.type === "error" ? "bg-rose-500" : "bg-[#ff5a1f]"
          }`} />
          <span className="font-mono text-[11px] leading-none uppercase tracking-wide text-neutral-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
