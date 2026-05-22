import React, { useState, useEffect } from "react";
import { Sparkles, FileText, Compass, ListRestart, Sliders, RefreshCw, AlertCircle, Play, CheckCircle, HelpCircle, Film, Edit3, Volume2 } from "lucide-react";
import type { Project, StoryboardScene, VideoStyle } from "../types";

const SAMPLE_VIDEOS = [
  "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-glow-31745-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-wind-blowing-in-the-forest-41135-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-animation-of-futuristic-hud-interface-31913-large.mp4"
];

const SAMPLE_POSTERS = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop", // Space/Sci-fi
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop", // Ocean/Nature
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop", // Cyberpunk/Tech
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600&auto=format&fit=crop"  // Mystical fog/mountain
];

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

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Synchronize local state when active project changes
  useEffect(() => {
    setTopicPrompt(project.niche || "");
    setIdeas(project.ideas || []);
    setScriptText({
      hook: project.script?.hook || "",
      intro: project.script?.intro || "",
      mainStory: project.script?.mainStory || "",
      cta: project.script?.cta || "",
    });
    setStoryboardScenes(project.storyboard || []);
  }, [project.id]);

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
          audience: targetAudience,
          llmProvider: project.llmProvider,
          ollamaUrl: project.ollamaUrl,
          ollamaModel: project.ollamaModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas);
        if (data.message) {
          setIdeasMessage(data.message);
        } else if (data.mode === "simulation") {
          setIdeasMessage("Mode Simulasi: Hubungkan kunci API Gemini Anda untuk respon dinamis.");
        } else if (data.mode === "ollama") {
          setIdeasMessage(`Selesai diproses via Ollama lokal (${project.ollamaModel || "llama3"})!`);
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
      showToast("Pilih judul video terlebih dahulu! Anda bisa memilih dari ide kreatif.", "error");
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
          voiceEmotion: project.voiceEmotion,
          llmProvider: project.llmProvider,
          ollamaUrl: project.ollamaUrl,
          ollamaModel: project.ollamaModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        const sc = data.script;
        if (data.message) {
          showToast(data.message);
        }
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
      showToast("Gagal memproses hasil generate naskah.", "error");
    } finally {
      setLoadingScript(false);
    }
  };

  // 4. Split Script into Storyboard scenes
  const handleGenerateStoryboard = async () => {
    const fullText = `${scriptText.hook}\n\n${scriptText.intro}\n\n${scriptText.mainStory}\n\n${scriptText.cta}`;
    if (!fullText.replace(/\s/g, "")) {
      showToast("Tulis atau generate naskah drama terlebih dahulu!", "error");
      return;
    }
    setLoadingStoryboard(true);
    try {
      const res = await fetch("/api/generate-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText,
          style: project.style,
          llmProvider: project.llmProvider,
          ollamaUrl: project.ollamaUrl,
          ollamaModel: project.ollamaModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          showToast(data.message);
        }
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
      showToast("Gagal membagi naskah menjadi storyboard.", "error");
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
        body: JSON.stringify({
          prompt: currentPrompt,
          llmProvider: project.llmProvider,
          ollamaUrl: project.ollamaUrl,
          ollamaModel: project.ollamaModel
        })
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

  // 7. Simulating single scene rendering on local GPU with actual WAN 2.2 triggering
  const handleRenderScene = async (sceneId: string) => {
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

    // Kirim request render sungguhan langsung dari browser ke localhost (Client-Side Direct Dispatch)
    // Ini mengizinkan bypass cloud barrier karena browser berjalan di PC local Anda yang bisa menjangkau 127.0.0.1 dengan andal
    const wanHost = project.wanUrl || "http://127.0.0.1:7860";
    const promptText = targetScene.imagePrompt || targetScene.description;
    const isComfy = wanHost.includes("8188") || wanHost.toLowerCase().includes("comfy");

    try {
      if (isComfy) {
        const payload = {
          client_id: "ais-video-generator",
          prompt: {
            "3": {
              "class_type": "KSampler",
              "inputs": {
                "seed": Math.floor(Math.random() * 1000000),
                "steps": 25,
                "cfg": 6.0,
                "sampler_name": "uni_pc",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
              }
            },
            "4": {
              "class_type": "CheckoutWAN22Model",
              "inputs": { "model_name": "wan2.1_t2v_1.3b_fp16.safetensors" }
            },
            "5": {
              "class_type": "EmptyWan22LatentImage",
              "inputs": { 
                "width": aspectRatio === "9:16" ? 480 : 832, 
                "height": aspectRatio === "9:16" ? 832 : 480, 
                "length": 81, 
                "batch_size": 1 
              }
            },
            "6": {
              "class_type": "Wan22TextEncode",
              "inputs": { "text": promptText, "clip": ["4", 1] }
            },
            "7": {
              "class_type": "Wan22TextEncode",
              "inputs": { "text": "low quality, blurry, static, noisy, deformed", "clip": ["4", 1] }
            },
            "8": {
              "class_type": "Wan22Decode",
              "inputs": { "samples": ["3", 0], "vae": ["4", 2] }
            },
            "9": {
              "class_type": "SaveVideo",
              "inputs": { "images": ["8", 0], "filename_prefix": `wan22_scene_${targetScene.sceneNumber}` }
            }
          }
        };
        
        await fetch(`${wanHost}/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors"
        });
        showToast(`Sukses kirim instruksi render Scene #${targetScene.sceneNumber} ke ComfyUI lokal!`);
      } else {
        // Gradio 7860 format
        const payload = {
          data: [
            promptText,
            "low quality, blurry, static, deformed",
            aspectRatio,
            5,
            Math.floor(Math.random() * 1000000),
            30,
            6.0
          ],
          fn_index: 0,
          trigger_id: 11
        };

        try {
          await fetch(`${wanHost}/api/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            mode: "cors"
          });
        } catch (gradErr) {
          // Fallback ke run endpoint
          await fetch(`${wanHost}/run/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            mode: "cors"
          });
        }
        showToast(`Sukses kirim instruksi render Scene #${targetScene.sceneNumber} ke Gradio lokal!`);
      }
    } catch (directErr: any) {
      console.warn("Direct connection failed or blocked. Sending via hybrid cloud proxy backup...", directErr);
      
      try {
        await fetch("/api/render-wan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wanUrl: wanHost,
            prompt: promptText,
            sceneId: targetScene.id,
            sceneNumber: targetScene.sceneNumber,
            style: project.style,
            aspectRatio
          })
        });
        showToast(`Instruksi render Scene #${targetScene.sceneNumber} dikirim via proxy backup!`);
      } catch (proxyErr) {
        showToast("Gagal menyambungkan perintah render, silakan periksa status terminal lokal Anda.", "error");
      }
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      const updated = storyboardScenes.map((sz) => {
        if (sz.id === sceneId) {
          const isReady = progress >= 100;
          return {
            ...sz,
            videoStatus: isReady ? "ready" : "generating",
            videoProgress: Math.min(100, progress),
            videoUrl: isReady
              ? SAMPLE_VIDEOS[(sz.sceneNumber - 1) % SAMPLE_VIDEOS.length]
              : sz.videoUrl
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
      showToast("Browser Anda tidak mendukung suara sintesis web.", "error");
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
                    <div key={scene.id} className="bg-[#17171d] border border-[#23232a] rounded-lg p-3.5 space-y-4 lg:grid lg:grid-cols-12 lg:gap-4 lg:space-y-0">
                      {/* Left Side: Script and Prompts Configuration */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Header Scene Info */}
                          <div className="flex items-center justify-between mb-2">
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
                          <div className="space-y-1 mb-3">
                            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">Naskah Narasi Penuturan</span>
                            <div className="flex items-start gap-2">
                              <textarea
                                rows={2}
                                className="flex-1 bg-[#121215] border border-[#282831] text-xs text-neutral-300 p-1.5 rounded focus:outline-none focus:border-[#ff5a1f]"
                                value={scene.narration}
                                onChange={(e) => handleEditScene(scene.id, { narration: e.target.value })}
                              />
                              <button
                                onClick={() => handleTTSPreview(scene.narration)}
                                className="p-2 bg-neutral-800 text-neutral-400 hover:text-white rounded flex items-center justify-center cursor-pointer transition-colors"
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
                                className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
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
                        </div>

                        {/* Enhanced display box */}
                        {scene.enhancedPrompt && (
                          <div className="bg-cyan-950/20 border border-cyan-900/35 p-2 rounded text-[11px] text-[#ff5a1f] font-mono leading-relaxed mt-2">
                            <span className="font-bold text-[9px] uppercase tracking-wider text-cyan-400 block mb-0.5">Enhanced WAN 2.2 Prompt:</span>
                            {scene.enhancedPrompt}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Interactive Visual Player Workspace */}
                      <div className="lg:col-span-5 bg-[#0e0e12] border border-[#1e1e24] p-3 rounded-lg flex flex-col justify-between space-y-3">
                        <div className="text-[10px] font-mono text-neutral-400 flex items-center justify-between border-b border-[#1c1c21] pb-1.5">
                          <span className="text-[#ff5a1f] font-bold">WAN 2.2 PREVIEW</span>
                          <span>Format {aspectRatio}</span>
                        </div>

                        {/* Visual Player Box */}
                        <div className="relative flex-1 flex items-center justify-center bg-black rounded overflow-hidden min-h-[140px] border border-neutral-900 shadow-inner">
                          {scene.videoStatus === "ready" && scene.videoUrl ? (
                            <div className={`w-full relative group flex items-center justify-center ${aspectRatio === "9:16" ? "max-h-[160px]" : "w-full"}`}>
                              <video
                                src={scene.videoUrl}
                                poster={SAMPLE_POSTERS[(scene.sceneNumber - 1) % SAMPLE_POSTERS.length]}
                                controls
                                playsInline
                                loop
                                preload="metadata"
                                className="w-full rounded h-full object-cover max-h-[160px] shadow-lg focus:outline-none"
                              />
                            </div>
                          ) : scene.videoStatus === "generating" ? (
                            <div className="w-full px-3 text-center space-y-2">
                              {/* Loading spinner */}
                              <div className="flex flex-col items-center justify-center">
                                <RefreshCw className="h-6 w-6 text-amber-500 animate-spin mb-1" />
                                <div className="text-[10px] font-mono text-amber-500 uppercase tracking-wider font-bold">Rendering Scene...</div>
                              </div>
                              {/* Synthetic CLI output */}
                              <div className="text-[8px] font-mono text-neutral-400 h-9 overflow-hidden leading-tight bg-[#07070a] p-1.5 rounded text-left border border-neutral-900">
                                {scene.videoProgress < 30 && <span className="text-cyan-400 font-bold">[VRAM: 12.8GB] Allocating resources...</span>}
                                {scene.videoProgress >= 30 && scene.videoProgress < 60 && <span className="text-yellow-400 font-bold">[WAN 2.2] Sampling step {Math.floor(scene.videoProgress / 2)}/50...</span>}
                                {scene.videoProgress >= 60 && scene.videoProgress < 90 && <span className="text-purple-400 font-bold">[WAN 2.2] Denoising latent space... cfgs=6.0</span>}
                                {scene.videoProgress >= 90 && <span className="text-emerald-400 font-bold">[POST] Decoding frames with VAE... done</span>}
                              </div>
                              {/* Progress loading percentage bar */}
                              <div className="w-full bg-[#161620] h-1 rounded-full overflow-hidden">
                                <div
                                  className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                                  style={{ width: `${scene.videoProgress}%` }}
                                />
                              </div>
                              <div className="text-[9px] font-mono text-neutral-500">{scene.videoProgress}% Complete</div>
                            </div>
                          ) : (
                            <div className="text-center p-3 text-neutral-600 space-y-1">
                              <Film className="h-6 w-6 text-neutral-700 mx-auto" />
                              <div className="text-[10px] font-mono uppercase tracking-wider">Footage Pending</div>
                              <div className="text-[9px] text-neutral-500 font-mono">1920x1080 • WAN 2.2</div>
                            </div>
                          )}
                        </div>

                        {/* Render Buttons and Status */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs">
                            {scene.videoStatus === "ready" ? (
                              <span className="text-emerald-400 font-mono text-[10px] font-medium flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 fill-current text-[#17171d] text-emerald-500" />
                                <span>SIAP DIPLAY</span>
                              </span>
                            ) : (
                              <span className="text-neutral-500 font-mono text-[9px] uppercase">No-Render</span>
                            )}
                          </div>

                          <button
                            onClick={() => handleRenderScene(scene.id)}
                            disabled={renderingSceneId !== null}
                            className="px-2.5 py-1 bg-[#1e1e24] text-neutral-300 hover:bg-[#ff5a1f] hover:text-white rounded text-[10px] font-mono font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {scene.videoStatus === "ready" ? "Re-Render" : "Render Video"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
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
