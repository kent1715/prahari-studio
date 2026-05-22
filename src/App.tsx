import React, { useState } from "react";
import { Film, LayoutDashboard, Sliders, Type, ExternalLink, Settings, Shield, Cpu, RefreshCw, Layers } from "lucide-react";
import type { Project, QueueItem } from "./types";
import Dashboard from "./components/Dashboard";
import VideoGenerator from "./components/VideoGenerator";
import ThumbnailGenerator from "./components/ThumbnailGenerator";
import SettingsPanel from "./components/SettingsPanel";
import ExportUpload from "./components/ExportUpload";

const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-1",
    title: "Misteri Terkubur di Balik Borobudur",
    niche: "Sejarah Dunia",
    style: "documentary",
    language: "Indonesia",
    status: "ready",
    script: {
      hook: "Pernahkah Anda membayangkan rahasia astronomi kuno di balik susunan batu candi Borobudur?",
      intro: "Hari ini kita akan menguak teori tersembunyi yang jarang dibicarakan di buku pelajaran biasa.",
      mainStory: "Batu candi Borobudur ternyata tersusun mengikuti peredaran bintang spesifik secara presisi astronomis. Arkeolog dunia tercengang dengan keselarasan matematika kuno ini.",
      cta: "Klik subscribe jika Anda menyukai info sejarah orisinal ini dan bantu bagikan video ini!",
      fullText: "Pernahkah Anda membayangkan rahasia astronomi kuno di balik susunan batu candi Borobudur?\n\nHari ini kita akan menguak teori tersembunyi yang jarang dibicarakan di buku pelajaran biasa.\n\nBatu candi Borobudur ternyata tersusun mengikuti peredaran bintang spesifik secara presisi astronomis. Arkeolog dunia tercengang dengan keselarasan matematika kuno ini.\n\nKlik subscribe jika Anda menyukai info sejarah orisinal ini dan bantu bagikan video ini!"
    },
    storyboard: [
      {
        id: "sc-borobudur-1",
        sceneNumber: 1,
        narration: "Pernahkah Anda membayangkan rahasia astronomi kuno di balik susunan candi?",
        prompt: "candi borobudur saat fajar berkabut tebal, burung beterbangan, gaya sinematik dokumenter sejarah",
        enhancedPrompt: "cinematic historic Borobudur temple ruins at moody misty sunrise, cinematic low panoramic sweeps, ultra realistic, dramatic cinematic light rays, 4k resolution",
        cameraAngle: "Low Angle Wide Shot",
        transition: "Fade In",
        duration: 5,
        videoStatus: "ready",
        videoProgress: 100,
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
      },
      {
        id: "sc-borobudur-2",
        sceneNumber: 2,
        narration: "Hari ini kita akan menguak teori tersembunyi yang jarang dibicarakan.",
        prompt: "skema mandala bintang kuno bersinar keemasan di atas meja kayu arkeolog tua",
        enhancedPrompt: "glowing cosmic mystic mandala circle geometry blueprint on old wooden table, dramatic candle shadows, floating dust particles, macro focus, cinematic shot",
        cameraAngle: "Macro Extreme Close-Up",
        transition: "Dissolve",
        duration: 5,
        videoStatus: "ready",
        videoProgress: 100,
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4"
      }
    ],
    voiceEngine: "Edge TTS",
    voiceName: "id-ID-ArdiNeural",
    voiceSpeed: 1,
    voiceEmotion: "Dramatis & Misterius",
    subtitleStyle: "tiktok",
    subtitleBurn: true,
    musicMood: "suspense_dark",
    musicVolume: 15,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "proj-2",
    title: "Alur Cerita Film: Penjelajah Waktu Terakhir",
    niche: "Alur Cerita Film",
    style: "recap",
    language: "Indonesia",
    status: "draft",
    voiceEngine: "Kokoro TTS",
    voiceName: "en-US-Amy",
    voiceSpeed: 1.05,
    voiceEmotion: "Semangat & Inspiratif",
    subtitleStyle: "documentary",
    subtitleBurn: true,
    musicMood: "epic_orchestral",
    musicVolume: 20,
    createdAt: new Date().toISOString(),
  }
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>("proj-1");
  const [activeTab, setActiveTab] = useState<"dashboard" | "studio" | "thumbnail" | "settings" | "export">("dashboard");
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Create Project Callback
  const handleCreateProject = (niche: string, style: any) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: "",
      niche: niche,
      style: style,
      language: "Indonesia",
      status: "draft",
      voiceEngine: "Edge TTS",
      voiceName: "id-ID-ArdiNeural",
      voiceSpeed: 1.0,
      voiceEmotion: "Dramatis & Misterius",
      subtitleStyle: "tiktok",
      subtitleBurn: true,
      musicMood: "suspense_dark",
      musicVolume: 12,
      createdAt: new Date().toISOString(),
    };
    setProjects([newProj, ...projects]);
    setActiveProjectId(newProj.id);
    setActiveTab("studio");
  };

  // Select project
  const handleSelectProject = (project: Project) => {
    setActiveProjectId(project.id);
    setActiveTab("studio");
  };

  // Update Project state attributes locally
  const handleUpdateProject = (updated: Project) => {
    setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Delete Project callback function
  const handleDeleteProject = (id: string) => {
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id && filtered.length > 0) {
      setActiveProjectId(filtered[0].id);
    }
  };

  // Clear global Queue
  const handleClearQueue = () => {
    setQueue([]);
  };

  // Add rendering action to queue list
  const handleAddQueue = (item: Partial<QueueItem>) => {
    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      projectId: item.projectId || "p",
      projectTitle: item.projectTitle || "Project",
      type: item.type || "video_generation",
      status: "processing",
      progress: 0,
      vramRequiredGb: item.vramRequiredGb || 12.0,
      gpuId: 0,
      createdAt: new Date().toISOString(),
    };
    setQueue((prev) => [newItem, ...prev]);

    // Simulate item updating progress
    let prog = 0;
    const tracking = setInterval(() => {
      prog += 20;
      setQueue((prevQueue) =>
        prevQueue.map((qi) => {
          if (qi.id === newItem.id) {
            return {
              ...qi,
              progress: Math.min(100, prog),
              status: prog >= 100 ? "completed" : "processing",
            };
          }
          return qi;
        })
      );
      if (prog >= 100) {
        clearInterval(tracking);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-200 font-sans antialiased selection:bg-[#ff5a1f]/30">
      {/* Decorative background visual lights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-b from-[#ff5a1f]/5 via-transparent to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-gradient-to-t from-cyan-500/5 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Top Application Desktop Navigation Bar */}
      <header className="border-b border-[#1c1c22] bg-[#0c0c0e]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#ff5a1f] to-amber-500 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-md">
              KS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-bold text-[#f4f4f5] tracking-tight text-sm">KentStudio</h1>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 font-mono px-1.5 py-0.5 rounded uppercase font-semibold">
                  WAN 2.2 Local V2
                </span>
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                AI Video-Faceless Content factory &bull; Desktop Workstation
              </p>
            </div>
          </div>

          {/* Quick Info HUD bar */}
          <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
            <div className="hidden md:flex items-center gap-1.5 bg-[#141418] border border-[#23232a] px-3 py-1 rounded-full text-[11px]">
              <Cpu className="h-3.5 w-3.5 text-[#ff5a1f]" />
              <span>NVIDIA RTX A2000 Host:</span>
              <span className="text-white font-bold">ONLINE</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 bg-[#141418] border border-[#23232a] px-3 py-1 rounded-full text-[11px]">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>VRAM Weights:</span>
              <span className="text-white font-bold">FP16 Loaded</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Controller HUD bar */}
      <nav id="workspace-navigator" className="bg-[#0b0b0d] border-b border-[#191920]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-1.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 flex items-center gap-2 ${
              activeTab === "dashboard"
                ? "bg-[#18181c] text-white border border-[#262631]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Dashboard Utama</span>
          </button>
          
          <button
            onClick={() => setActiveTab("studio")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 flex items-center gap-2 ${
              activeTab === "studio"
                ? "bg-[#18181c] text-white border border-[#262631]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>Studio Video Generator</span>
          </button>

          <button
            onClick={() => setActiveTab("thumbnail")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 flex items-center gap-2 ${
              activeTab === "thumbnail"
                ? "bg-[#18181c] text-white border border-[#262631]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Thumbnail Creator</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-[#18181c] text-white border border-[#262631]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Setelan Audio & Subtitle</span>
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 flex items-center gap-2 ${
              activeTab === "export"
                ? "bg-[#18181c] text-white border border-[#262631]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            <span>Ekspor & Auto-Upload</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace Frame container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
        {/* Direct warnings when there are no projects */}
        {projects.length === 0 ? (
          <div className="bg-[#121214] border border-[#232329] p-8 rounded-xl text-center space-y-4 max-w-lg mx-auto my-12">
            <Film className="h-10 w-10 text-neutral-600 mx-auto stroke-1" />
            <div>
              <h3 className="text-white font-bold">Belum ada project aktif</h3>
              <p className="text-neutral-400 text-xs mt-1">Luncurkan project baru pertama Anda lewat tombol cepat atau dashboard untuk mulai berkreasi menggunakan WAN 2.2.</p>
            </div>
            <button
              onClick={() => handleCreateProject("Sains Kuno", "documentary")}
              className="bg-[#ff5a1f] text-white hover:bg-[#e04a15] rounded-lg text-xs font-semibold px-4 py-2.5 mx-auto block cursor-pointer transition-colors"
            >
              Mulai Cepat: Sains Kuno
            </button>
          </div>
        ) : (
          <div>
            {/* Active project quick summary layout header */}
            {activeTab !== "dashboard" && (
              <div className="mb-6 bg-[#121214] border border-[#232329] rounded-xl px-5 py-3.5 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="space-y-1 w-full md:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-mono bg-[#1d1d23] border border-[#282832] text-neutral-300 font-semibold px-1.5 py-0.5 rounded">
                      {activeProject.style.toUpperCase()}
                    </span>
                    <h2 className="text-sm font-semibold text-white">
                      {activeProject.title || `Draft #${activeProject.id.slice(0, 5)}`}
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Niche: <span className="font-semibold text-neutral-300">{activeProject.niche}</span> &bull; Suara: {activeProject.voiceEngine} &bull; Subtitle: {activeProject.subtitleStyle}
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto justify-end">
                  <select
                    className="bg-[#17171d] border border-[#22222b] rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none"
                    value={activeProject.id}
                    onChange={(e) => setActiveProjectId(e.target.value)}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || `Draft Niche: ${p.niche}`}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className="px-2.5 py-1.5 bg-neutral-800 text-xs font-medium rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                  >
                    Ganti Project
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic tab view routing rendering */}
            <div className="space-y-6">
              {activeTab === "dashboard" && (
                <Dashboard
                  projects={projects}
                  queue={queue}
                  onCreateProject={handleCreateProject}
                  onSelectProject={handleSelectProject}
                  onDeleteProject={handleDeleteProject}
                  onClearQueue={handleClearQueue}
                />
              )}

              {activeTab === "studio" && (
                <VideoGenerator
                  project={activeProject}
                  onUpdateProject={handleUpdateProject}
                  onAddQueue={handleAddQueue}
                />
              )}

              {activeTab === "thumbnail" && (
                <ThumbnailGenerator
                  project={activeProject}
                  onUpdateProject={handleUpdateProject}
                />
              )}

              {activeTab === "settings" && (
                <SettingsPanel
                  project={activeProject}
                  onUpdateProject={handleUpdateProject}
                />
              )}

              {activeTab === "export" && (
                <ExportUpload
                  project={activeProject}
                  onUpdateProject={handleUpdateProject}
                  onAddQueue={handleAddQueue}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sticky footer telemetry indicators */}
      <footer className="mt-16 border-t border-[#16161b] bg-[#070708] py-8 text-neutral-500 font-mono text-[10px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div>
            KentStudio desktop edition v1.0.0-beta. Built for high-rate mass automation.
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>GPU TensorRT scheduler: IDLE</span>
            </div>
            <span>VRAM cache pool: clean</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
