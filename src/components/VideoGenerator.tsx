import React, { useState } from "react";
import { Sparkles, FileText, Compass, ListRestart, Sliders, RefreshCw, AlertCircle, Play, CheckCircle, HelpCircle, Film, Edit3, Volume2 } from "lucide-react";
import type { Project, StoryboardScene, VideoStyle } from "../types";

interface VideoGeneratorProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onAddQueue: (item: any) => void;
}

export default function VideoGenerator({
  project,
  onUpdateProject,
  onAddQueue
}: VideoGeneratorProps) {
  // Local state for UI action configurations
  const [topicPrompt, setTopicPrompt] = useState(project.niche || "");
  const [targetAudience, setTargetAudience] = useState("Auditorium Remaja & Dewasa");
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");

  const [ideas, setIdeas] = useState<string[]>(project.ideas || []);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [ideasMessage, setIdeasMessage] = useState("");

  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptText, setScriptText] = useState({
    hook: project.script?.hook || "",
    intro: project.script?.intro || "",
    mainStory: project.script?.mainStory || "",
    cta: project.script?.cta || "",
  });

  const [loadingStoryboard, setLoadingStoryboard] = useState(false);
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>(project.storyboard || []);

  const [enhancingSceneId, setEnhancingSceneId] = useState<string | null>(null);
  const [renderingSceneId, setRenderingSceneId] = useState<string | null>(null);

  // 1. Generate Business Ideas from Topic Niche
  const handleGenerateIdeas = async () => {
    if (!topicPrompt.trim()) return;
    setLoadingIdeas(true);
    setIdeasMessage("");
    try {
      const res = await fetch("/api/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: topicPrompt,
          language: project.language,
          style: project.style,
          audience: targetAudience
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas);
        if (data.mode === "simulation") {
          setIdeasMessage("Mode Simulasi: Hubungkan kunci API Gemini Anda untuk respon dinamis.");
        }
        // Save to project
        onUpdateProject({
          ...project,
          niche: topicPrompt,
          ideas: data.ideas
        });
      }
    } catch (e: any) {
      setIdeasMessage("Gagal memanggil API: " + e.message);
    } finally {
      setLoadingIdeas(false);
    }
  };

  // 2. Click Idea to Auto-Title Project
  const handleUseIdea = (ideaText: string) => {
    // Extract cleaner title if hook includes (Hook: ...)
    const cleanTitle = ideaText.split("(Hook:")[0].trim();
    onUpdateProject({
      ...project,
      title: cleanTitle
    });
  };

  // 3. Generate Complete Script from Title
  const handleGenerateScript = async () => {
    if (!project.title.trim()) {
      alert("Pilih judul video terlebih dahulu! Anda bisa memilih dari ide kreatif.");
      return;
    }
    setLoadingScript(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          niche: topicPrompt || project.niche,
          style: project.style,
          language: project.language,
          voiceEmotion: project.voiceEmotion
        })
      });
      if (res.ok) {
        const data = await res.json();
        const sc = data.script;
        setScriptText({
          hook: sc.hook,
          intro: sc.intro,
          mainStory: sc.mainStory,
          cta: sc.cta,
        });

        onUpdateProject({
          ...project,
          script: {
            hook: sc.hook,
            intro: sc.intro,
            mainStory: sc.mainStory,
            cta: sc.cta,
            fullText: sc.fullText || `${sc.hook}\n\n${sc.intro}\n\n${sc.mainStory}\n\n${sc.cta}`
          }
        });
      }
    } catch (e) {
      alert("Gagal generate naskah.");
    } finally {
      setLoadingScript(false);
    }
  };

  // 4. Split Script into Storyboard scenes
  const handleGenerateStoryboard = async () => {
    const fullText = `${scriptText.hook}\n\n${scriptText.intro}\n\n${scriptText.mainStory}\n\n${scriptText.cta}`;
    if (!fullText.replace(/\s/g, "")) {
      alert("Tulis atau generate naskah drama terlebih dahulu!");
      return;
    }
    setLoadingStoryboard(true);
    try {
      const res = await fetch("/api/generate-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText,
          style: project.style
        })
      });
      if (res.ok) {
        const data = await res.json();
        const mappedScenes = data.scenes.map((s: any) => ({
          ...s,
          duration: selectedDuration,
          videoStatus: "pending",
          videoProgress: 0
        }));
        setStoryboardScenes(mappedScenes);
        onUpdateProject({
          ...project,
          storyboard: mappedScenes
        });
      }
    } catch (e) {
      alert("Gagal membagi naskah menjadi storyboard.");
    } finally {
      setLoadingStoryboard(false);
    }
  };

  // 5. Enhance Scene prompts stand-alone
  const handleEnhancePrompt = async (sceneId: string, currentPrompt: string) => {
    setEnhancingSceneId(sceneId);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = storyboardScenes.map((sz) => {
          if (sz.id === sceneId) {
            return { ...sz, enhancedPrompt: data.enhancedPrompt };
          }
          return sz;
        });
        setStoryboardScenes(updated);
        onUpdateProject({ ...project, storyboard: updated });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnhancingSceneId(null);
    }
  };

  // 6. Manual edit field change
  const handleEditScene = (sceneId: string, fields: Partial<StoryboardScene>) => {
    const updated = storyboardScenes.map((sz) => {
      if (sz.id === sceneId) {
        return { ...sz, ...fields };
      }
      return sz;
    });
    setStoryboardScenes(updated);
    onUpdateProject({ ...project, storyboard: updated });
  };

  // 7. Simulating single scene rendering on local GPU
  const handleRenderScene = (sceneId: string) => {
    setRenderingSceneId(sceneId);

    const targetScene = storyboardScenes.find(s => s.id === sceneId);
    if (!targetScene) return;

    // Push into global UI queue monitor
    onAddQueue({
      projectId: project.id,
      projectTitle: project.title,
      sceneId: sceneId,
      type: "video_generation",
      vramRequiredGb: 12.8,
      gpuId: 0
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      const updated = storyboardScenes.map((sz) => {
        if (sz.id === sceneId) {
          return {
            ...sz,
            videoStatus: progress >= 100 ? "ready" : "generating",
            videoProgress: Math.min(100, progress)
          };
        }
        return sz;
      });
      setStoryboardScenes(updated);

      if (progress >= 100) {
        clearInterval(interval);
        setRenderingSceneId(null);
        // Save to project list
        onUpdateProject({
          ...project,
          storyboard: updated
        });
      }
    }, 400);
  };

  // 8. Auto split and speak scene narration on browser using custom TTS API or Speech synthesis
  const handleTTSPreview = (narration: string) => {
    if (!narration) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(narration);
      // Attempt to setting language matching
      if (project.language.toLowerCase().includes("indonesia")) {
        utterance.lang = "id-ID";
      } else {
        utterance.lang = "en-US";
      }
      utterance.rate = project.voiceSpeed || 1.0;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Browser Anda tidak mendukung suara sintesis web.");
    }
  };

  return (
    <div id="video-generator-panel" className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Core Setup Pane */}
      <div className="xl:col-span-1 space-y-6">
        {/* Step A: Niche & Target Panel */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Compass className="h-4 w-4 text-[#ff5a1f]" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Arah Ide Konten</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase">Kategori / Niche</label>
              <input
                type="text"
                placeholder="e.g., Konspirasi Antariksa"
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-400 mb-1.5 uppercase">Target Audience</label>
              <input
                type="text"
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-[#ff5a1f] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <button
              onClick={handleGenerateIdeas}
              disabled={loadingIdeas || !topicPrompt.trim()}
              className="w-full bg-[#1c1c21] hover:bg-[#ff5a1f] hover:text-white border border-[#2d2d37] hover:border-transparent text-neutral-300 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingIdeas ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#ff5a1f]" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Generate Ide Judul</span>
            </button>
          </div>

          {ideasMessage && (
            <div className="text-[10px] text-amber-400 font-mono bg-amber-950/20 p-2 rounded">
              {ideasMessage}
            </div>
          )}
        </div>

        {/* List of generated ideas */}
        {ideas.length > 0 && (
          <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-mono text-neutral-300 border-b border-[#232329] pb-1.5 uppercase tracking-wider">Ide Judul Viral</h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-xs">
              {ideas.map((id, index) => (
                <div
                  key={index}
                  onClick={() => handleUseIdea(id)}
                  className="p-2.5 bg-[#17171d] rounded border border-[#202026] hover:border-[#ff5a1f] text-neutral-300 hover:text-white cursor-pointer transition-colors"
                >
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Render Config Options */}
        <div className="bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#232329] pb-2">
            <Sliders className="h-4 w-4 text-cyan-500" />
            <h3 className="font-sans font-medium text-white text-xs uppercase tracking-wider">Format WAN 2.2</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase">Rasio Aspek Layar</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAspectRatio("16:9")}
                  className={`py-2 rounded border font-sans text-center transition-all cursor-pointer ${
                    aspectRatio === "16:9"
                      ? "bg-cyan-950/30 border-cyan-500 text-cyan-400 font-medium"
                      : "bg-[#1c1c21] border-[#2d2d37] text-neutral-400"
                  }`}
                >
                  <span className="block text-sm font-semibold">16 : 9</span>
                  <span className="text-[9px] font-mono">YouTube Standard</span>
                </button>
                <button
                  onClick={() => setAspectRatio("9:16")}
                  className={`py-2 rounded border font-sans text-center transition-all cursor-pointer ${
                    aspectRatio === "9:16"
                      ? "bg-cyan-950/30 border-cyan-500 text-cyan-400 font-medium"
                      : "bg-[#1c1c21] border-[#2d2d37] text-neutral-400"
                  }`}
                >
                  <span className="block text-sm font-semibold">9 : 16</span>
                  <span className="text-[9px] font-mono">Shorts / TikTok</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase">Lama Video / Scene</label>
              <select
                className="w-full bg-[#1c1c21] border border-[#2d2d37] focus:border-cyan-500 rounded-lg px-3 py-2 text-white focus:outline-none"
                value={selectedDuration}
                onChange={(e) => {
                  const d = parseInt(e.target.value);
                  setSelectedDuration(d);
                  if (storyboardScenes.length > 0) {
                    const up = storyboardScenes.map(sz => ({ ...sz, duration: d }));
                    setStoryboardScenes(up);
                    onUpdateProject({ ...project, storyboard: up });
                  }
                }}
              >
                <option value={5}>5 Detik (Instan / Populer)</option>
                <option value={10}>10 Detik (Cinematic)</option>
                <option value={20}>20 Detik (Panjang/Seni)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Interactive Workspace */}
      <div className="xl:col-span-3 space-y-6">
        {/* Title Input Bar */}
        <div className="bg-[#121214] border border-[#ff5a1f]/30 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full space-y-1">
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#ff5a1f] uppercase block">Judul Project Aktif</span>
            <input
              type="text"
              placeholder="Berikan Judul Konten Viral..."
              className="w-full bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-[#ff5a1f] pb-1 text-lg font-sans font-medium text-white focus:outline-none placeholder-neutral-600"
              value={project.title}
              onChange={(e) => onUpdateProject({ ...project, title: e.target.value })}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleGenerateScript}
              disabled={loadingScript || !project.title.trim()}
              className="px-4 py-2.5 bg-[#ff5a1f] text-white hover:bg-[#e04a15] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingScript ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span>Generate Naskah AI</span>
            </button>
          </div>
        </div>

        {/* Script & Storyboard Tabs layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Naskah / Script Module */}
          <div className="lg:col-span-2 bg-[#121214] border border-[#232329] rounded-xl p-4 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#232329] pb-2">
                <span className="text-xs font-mono font-bold text-neutral-400 uppercase">Script Naskah Editor</span>
                <span className="text-[10px] font-mono text-neutral-500">Humanized & Anti-Banned</span>
              </div>

              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {/* Hook Box */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[#ff5a1f] uppercase tracking-wider block">1. Hook Pembuka (0-15s)</span>
                  <textarea
                    rows={2}
                    className="w-full bg-[#17171c] border border-[#282832] rounded p-2 text-xs text-neutral-300 focus:outline-none focus:border-[#ff5a1f]"
                    value={scriptText.hook}
                    onChange={(e) => {
                      const updated = { ...scriptText, hook: e.target.value };
                      setScriptText(updated);
                      onUpdateProject({
                        ...project,
                        script: { ...project.script!, hook: e.target.value, fullText: `${e.target.value}\n\n${scriptText.intro}\n\n${scriptText.mainStory}\n\n${scriptText.cta}` }
                      });
                    }}
                  />
                </div>

                {/* Intro Box */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">2. Pengenalan / Intro</span>
                  <textarea
                    rows={2}
                    className="w-full bg-[#17171c] border border-[#282832] rounded p-2 text-xs text-neutral-300 focus:outline-none focus:border-[#ff5a1f]"
                    value={scriptText.intro}
                    onChange={(e) => {
                      const updated = { ...scriptText, intro: e.target.value };
                      setScriptText(updated);
                      onUpdateProject({
                        ...project,
                        script: { ...project.script!, intro: e.target.value, fullText: `${scriptText.hook}\n\n${e.target.value}\n\n${scriptText.mainStory}\n\n${scriptText.cta}` }
                      });
                    }}
                  />
                </div>

                {/* Main Story */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">3. Cerita Utama / Main Story</span>
                  <textarea
                    rows={6}
                    className="w-full bg-[#17171c] border border-[#282832] rounded p-2 text-xs text-neutral-300 focus:outline-none focus:border-[#ff5a1f]"
                    value={scriptText.mainStory}
                    onChange={(e) => {
                      const updated = { ...scriptText, mainStory: e.target.value };
                      setScriptText(updated);
                      onUpdateProject({
                        ...project,
                        script: { ...project.script!, mainStory: e.target.value, fullText: `${scriptText.hook}\n\n${scriptText.intro}\n\n${e.target.value}\n\n${scriptText.cta}` }
                      });
                    }}
                  />
                </div>

                {/* CTA */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">4. Call to Action (CTA) / Penutup</span>
                  <textarea
                    rows={2}
                    className="w-full bg-[#17171c] border border-[#282832] rounded p-2 text-xs text-neutral-300 focus:outline-none focus:border-[#ff5a1f]"
                    value={scriptText.cta}
                    onChange={(e) => {
                      const updated = { ...scriptText, cta: e.target.value };
                      setScriptText(updated);
                      onUpdateProject({
                        ...project,
                        script: { ...project.script!, cta: e.target.value, fullText: `${scriptText.hook}\n\n${scriptText.intro}\n\n${scriptText.mainStory}\n\n${e.target.value}` }
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2">
              <button
                onClick={handleGenerateStoryboard}
                disabled={loadingStoryboard || !scriptText.hook}
                className="w-full bg-[#1c1c21] border border-[#2d2d37] hover:border-cyan-500 text-neutral-300 hover:text-cyan-400 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loadingStoryboard ? <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" /> : <Film className="h-4 w-4" />}
                <span>Pecah Jadi Storyboard</span>
              </button>
            </div>
          </div>

          {/* Storyboard Panel */}
          <div className="lg:col-span-3 bg-[#121214] border border-[#232329] rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex justify-between items-center border-b border-[#232329] pb-2">
                <span className="text-xs font-mono font-semibold text-neutral-400 uppercase">Scene List & WAN 2.2 Prompts</span>
                <span className="text-[10px] font-mono text-[#ff5a1f]">{storyboardScenes.length} Scenes</span>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[500px] flex-1 pr-1">
                {storyboardScenes.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500 text-xs font-sans">
                    Naskah belum dipecah. Klik "Pecah Jadi Storyboard" untuk mulai generate footage video per-scene.
                  </div>
                ) : (
                  storyboardScenes.map((scene, sIdx) => (
                    <div key={scene.id} className="bg-[#17171d] border border-[#23232a] rounded-lg p-3 space-y-3">
                      {/* Header Scene Info */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white">SCENE #{scene.sceneNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                            {scene.cameraAngle}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                            {scene.duration}s
                          </span>
                        </div>
                      </div>

                      {/* Narration Textarea */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">Naskah Narasi Penuturan</span>
                        <div className="flex items-start gap-2">
                          <textarea
                            rows={2}
                            className="flex-1 bg-[#121215] border border-[#282831] text-xs text-neutral-300 p-1.5 rounded focus:outline-none"
                            value={scene.narration}
                            onChange={(e) => handleEditScene(scene.id, { narration: e.target.value })}
                          />
                          <button
                            onClick={() => handleTTSPreview(scene.narration)}
                            className="p-2 bg-neutral-800 text-neutral-400 hover:text-white rounded flex items-center justify-center cursor-pointer"
                            title="Preview Suara (TTS)"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Prompt WAN 2.2 */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                          <span>WAN 2.2 RAW PROMPT</span>
                          <button
                            onClick={() => handleEnhancePrompt(scene.id, scene.prompt)}
                            disabled={enhancingSceneId === scene.id}
                            className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                          >
                            {enhancingSceneId === scene.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            <span>Cinematic Enhance AI</span>
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          className="w-full bg-[#121215] border border-[#282831] text-xs text-neutral-300 p-1.5 rounded focus:outline-none focus:border-[#ff5a1f]"
                          value={scene.prompt}
                          onChange={(e) => handleEditScene(scene.id, { prompt: e.target.value })}
                        />
                      </div>

                      {/* Enhanced display box */}
                      {scene.enhancedPrompt && (
                        <div className="bg-cyan-950/20 border border-cyan-900/35 p-2 rounded text-[11px] text-cyan-300 font-mono">
                          <span className="font-bold text-[9px] uppercase tracking-wider text-cyan-400 block mb-0.5">Enhanced Screenplay Prompt:</span>
                          {scene.enhancedPrompt}
                        </div>
                      )}

                      {/* Scene Clip status and rendering triggering */}
                      <div className="flex justify-between items-center pt-2 border-t border-[#232328]/50">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          {scene.videoStatus === "ready" ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 fill-current text-emerald-500 text-white" />
                              <span> Footage Siap ({scene.duration}s)</span>
                            </span>
                          ) : scene.videoStatus === "generating" ? (
                            <span className="text-amber-400 flex items-center gap-1 animate-pulse font-mono">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
                              <span>Rendering {scene.videoProgress}%</span>
                            </span>
                          ) : (
                            <span className="text-neutral-500 font-mono">Footage pending</span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRenderScene(scene.id)}
                          disabled={renderingSceneId !== null}
                          className="px-3 py-1.5 bg-[#1e1e24] text-neutral-300 hover:bg-[#ff5a1f] hover:text-white rounded text-xs font-mono font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {scene.videoStatus === "ready" ? "Re-Generate Clip" : "Generate Clip"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
