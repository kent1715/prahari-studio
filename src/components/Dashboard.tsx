import React, { useEffect, useState } from "react";
import { Cpu, Database, Play, AlertCircle, HardDrive, RefreshCw, Film, Sliders, Layers, Trash2, Video } from "lucide-react";
import type { Project, QueueItem, SystemMetrics } from "../types";

interface DashboardProps {
  projects: Project[];
  queue: QueueItem[];
  onCreateProject: (niche: string, style: any) => void;
  onSelectProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onClearQueue: () => void;
  metrics: SystemMetrics;
}

export default function Dashboard({
  projects,
  queue,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  onClearQueue,
  metrics,
}: DashboardProps) {
  const [quickNiche, setQuickNiche] = useState("Sejarah Kuno");
  const [quickStyle, setQuickStyle] = useState("documentary");

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Main Panel Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project List Directory */}
        <div id="projects-directory" className="lg:col-span-2 bg-[#121214] border border-[#232329] r-panel rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#232329] bg-[#161619] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-[#ff5a1f]" />
              <h2 className="font-sans font-medium text-white text-sm">Direktori Project KentStudio</h2>
            </div>
            <span className="text-xs font-mono text-neutral-500 bg-[#1e1e23] px-2.5 py-0.5 rounded-full">
              {projects.length} Total
            </span>
          </div>

          {/* Quick Create Project */}
          <div className="p-4 border-b border-[#232329] bg-[#141417]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickNiche.trim()) return;
                onCreateProject(quickNiche, quickStyle);
                setQuickNiche("");
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Masukkan Kategori/Niche (e.g., Kisah Horror Komedi, Sains Kuno, Rangkum Film)..."
                  className="w-full bg-[#1c1c21] border border-[#2d2d37] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#ff5a1f]"
                  value={quickNiche}
                  onChange={(e) => setQuickNiche(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-44">
                <select
                  className="w-full bg-[#1c1c21] border border-[#2d2d37] rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none focus:border-[#ff5a1f]"
                  value={quickStyle}
                  onChange={(e) => setQuickStyle(e.target.value)}
                >
                  <option value="documentary">Dokumenter AI</option>
                  <option value="recap">Alur Cerita Film</option>
                  <option value="horror">Cerita Mistis/Horor</option>
                  <option value="history">Sejarah Dunia</option>
                  <option value="motivation">Pengembangan Diri</option>
                  <option value="crime">Kasus Kriminal Sebenarnya</option>
                  <option value="storytelling">Dongeng & Cerita</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-[#ff5a1f] text-white hover:bg-[#e04a15] rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer duration-150"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Mulai</span>
              </button>
            </form>
          </div>

          <div className="divide-y divide-[#1b1b20] overflow-y-auto max-h-[360px] flex-1">
            {projects.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-sm font-sans flex flex-col items-center gap-3">
                <Video className="h-8 w-8 text-neutral-600 stroke-1" />
                <p>Belum ada draft project, luncurkan project baru Anda di atas!</p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 hover:bg-[#18181c] flex items-center justify-between group transition-colors cursor-pointer"
                  onClick={() => onSelectProject(project)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-sans font-medium text-sm text-white group-hover:text-[#ff5a1f] truncate">
                        {project.title || `Draft #${project.id.slice(0, 5)}`}
                      </h3>
                      <span className="text-[10px] uppercase font-mono font-semibold tracking-wider bg-[#26262f] text-neutral-300 px-2 py-0.5 rounded-md">
                        {project.style}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                        project.status === "completed" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" :
                        project.status === "generating" ? "bg-amber-950/40 text-amber-400 border border-amber-900/30 animate-pulse" :
                        "bg-[#23232d] text-neutral-400"
                      }`}>
                        {project.status === "completed" ? "Selesai" :
                         project.status === "generating" ? "Proses Render" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate">
                      Niche: <span className="font-medium text-neutral-300">{project.niche}</span> &bull; Pelindung Copyright: Aktif &bull; {project.language}
                    </p>
                    <div className="text-[10px] font-mono text-neutral-500">
                      Dibuat pada: {new Date(project.createdAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(project);
                      }}
                      className="bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white rounded px-2.5 py-1 text-xs font-medium cursor-pointer"
                    >
                      Buka
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="text-neutral-500 hover:text-red-400 p-1.5 rounded hover:bg-neutral-800/40 cursor-pointer"
                      title="Hapus Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Queue Monitor & GPU Scheduler */}
        <div id="queue-monitor" className="bg-[#121214] border border-[#232329] rounded-xl flex flex-col justify-between overflow-hidden">
          <div className="px-4 py-3 border-b border-[#232329] bg-[#161619] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-500" />
              <h2 className="font-sans font-medium text-white text-sm">GPU Render Queue</h2>
            </div>
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-neutral-500 hover:text-[#ff5a1f] text-xs font-mono"
              >
                Reset All
              </button>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[300px] space-y-3">
            {queue.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-xs font-sans">
                Aktivitas render kosong. Antrean GPU terjaga.
              </div>
            ) : (
              queue.map((item) => (
                <div key={item.id} className="bg-[#17171c] border border-[#23232a] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-medium text-neutral-200 max-w-[130px] truncate">{item.projectTitle}</span>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      item.status === "completed" ? "text-emerald-400 bg-emerald-950/40" :
                      item.status === "processing" ? "text-amber-400 bg-amber-950/40 animate-pulse" :
                      item.status === "failed" ? "text-red-400 bg-red-950/40" : "text-neutral-400 bg-[#282833]"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="capitalize">{item.type.replace("_", " ")}</span>
                    <span className="font-mono">{item.progress}%</span>
                  </div>

                  {/* Queue progress slider bar */}
                  <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full duration-300 ${
                        item.status === "completed" ? "bg-emerald-500" :
                        item.status === "failed" ? "bg-red-500" :
                        item.type === "video_generation" ? "bg-[#ff5a1f]" : "bg-cyan-500"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500">
                    <span>VRAM: {item.vramRequiredGb} GB req</span>
                    <span>GPU: Core #{item.gpuId}</span>
                  </div>

                  {item.error && (
                    <div className="text-[10px] text-red-400 font-mono bg-red-950/20 p-1.5 rounded flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span>{item.error}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-[#232329] bg-[#161619] text-xs font-mono text-neutral-500 space-y-1">
            <div className="flex justify-between">
              <span>ACTIVE PIPELINE:</span>
              <span className="text-neutral-400">WAN 2.2 COGNITIVE V2</span>
            </div>
            <div className="flex justify-between">
              <span>SCHEDULER ENGINE:</span>
              <span className="text-neutral-400">TensorRT Low Latency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
