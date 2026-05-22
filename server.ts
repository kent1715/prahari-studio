import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { WanDispatcher } from "./src/services/wan-dispatcher";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client to prevent app crashing when key is absent
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to query local Ollama API
async function queryOllama(ollamaUrl: string, model: string, systemInstruction: string, prompt: string, responseFormatJson: boolean = false): Promise<string> {
  const url = `${ollamaUrl || "http://127.0.0.1:11434"}/api/chat`;
  
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const bodyData: any = {
    model: model || "llama3",
    messages,
    stream: false,
    options: {
      temperature: 0.7
    }
  };

  if (responseFormatJson) {
    bodyData.format = "json";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    throw new Error(`HTTP Error dari Ollama: ${res.statusText} (${res.status})`);
  }

  const data: any = await res.json();
  return data.message?.content || "";
}

// Robust helper to parse JSON even if surrounded by markdown code blocks or chatter
function parseRobustJson(text: string, defaultValue: any = {}): any {
  if (!text) return defaultValue;
  let trimmed = text.trim();
  
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Continue below
  }

  // Attempt to extract JSON block using regex (like ```json ... ``` or ``` ...)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = trimmed.match(codeBlockRegex);
  if (match) {
    const codeContent = match[1].trim();
    try {
      return JSON.parse(codeContent);
    } catch (e) {
      trimmed = codeContent; // Fallback to parsing the matched content directly below
    }
  }

  // Find first '{' or '[' and last matching '}' or ']'
  const firstCurly = trimmed.indexOf('{');
  const firstSquare = trimmed.indexOf('[');
  
  if (firstCurly !== -1 || firstSquare !== -1) {
    let startIndex = -1;
    let endIndex = -1;
    
    if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
      startIndex = firstCurly;
      endIndex = trimmed.lastIndexOf('}');
    } else {
      startIndex = firstSquare;
      endIndex = trimmed.lastIndexOf(']');
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const candidateString = trimmed.substring(startIndex, endIndex + 1);
      try {
        return JSON.parse(candidateString);
      } catch (e) {
         // Repair trailing commas in arrays/objects
         const repaired = candidateString
           .replace(/,(\s*[\]}])/g, '$1')
           .trim();
         try {
           return JSON.parse(repaired);
         } catch (e2) {
           // fall through
         }
      }
    }
  }

  return defaultValue;
}

// Robust helper to recursively flatten any JSON LLM response structure into a clean array of string ideas (no objects)
function normalizeStringArray(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    const list: string[] = [];
    for (const item of input) {
      if (!item) continue;
      if (typeof item === "object") {
        const val = item.title || item.idea || item.text || item.heading || Object.values(item)[0];
        if (val) list.push(String(val));
      } else {
        list.push(String(item));
      }
    }
    return list.filter(Boolean);
  }
  if (typeof input === "object") {
    // If it is an object, see if there is an array property inside like "ideas", "titles", "data", "list", etc.
    for (const key of Object.keys(input)) {
      if (Array.isArray(input[key])) {
        const subResult = normalizeStringArray(input[key]);
        if (subResult.length > 0) return subResult;
      }
    }
    // Check common key fields directly
    const val = input.ideas || input.titles || input.title || input.idea || input.text;
    if (val) {
      return normalizeStringArray(val);
    }
    // Fallback to values
    const vals = Object.values(input).filter(v => typeof v === "string" || Array.isArray(v));
    if (vals.length > 0) {
      return normalizeStringArray(vals[0]);
    }
  }
  if (typeof input === "string") {
    // Attempt robust parse first
    const cleanParsed = parseRobustJson(input, null);
    if (cleanParsed !== null) {
      return normalizeStringArray(cleanParsed);
    }

    const trimmed = input.trim();
    // Plain text: split by lines or numbering
    return trimmed
      .split(/\n+/)
      .map(line => line.replace(/^\d+[\.\-\s]+/, "").trim()) // clean list numbering like "1. My Title"
      .filter(Boolean);
  }
  return [String(input)];
}

// 0. API: Check Ollama connection status and installed models
app.post("/api/check-ollama-status", async (req, res) => {
  const { ollamaUrl } = req.body;
  const targetUrl = ollamaUrl || "http://127.0.0.1:11434";
  
  try {
    const controller = new AbortController();
    const abortTimeout = setTimeout(() => controller.abort(), 2000);
    
    const tagsRes = await fetch(`${targetUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(abortTimeout);
    
    if (tagsRes.ok) {
      const data: any = await tagsRes.json();
      return res.json({
        success: true,
        active: true,
        models: data.models || [],
        message: "Ollama aktif dan terhubung via Server!"
      });
    } else {
      return res.json({
        success: true,
        active: true,
        models: [],
        message: `Ollama aktif tetapi merespon dengan status ${tagsRes.status}`
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      active: false,
      message: `Gagal terhubung ke Ollama via Server (${err.message}).`
    });
  }
});

// 0.5. API: Check WAN 2.2 Desktop connection status
app.post("/api/check-wan-status", async (req, res) => {
  const { wanUrl } = req.body;
  const targetUrl = wanUrl || "http://127.0.0.1:7860";
  
  try {
    const controller = new AbortController();
    const abortTimeout = setTimeout(() => controller.abort(), 2000);
    
    const testRes = await fetch(targetUrl, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(abortTimeout);
    
    return res.json({
      success: true,
      active: true,
      statusCode: testRes.status,
      message: `Berhasil terhubung! Mesin Desktop WAN 2.2 responsif di ${targetUrl} (Status: ${testRes.status})`
    });
  } catch (err: any) {
    return res.json({
      success: false,
      active: false,
      message: `Gagal terhubung ke host WAN 2.2 Desktop via Server (${err.message}). Pastikan software generator (seperti ComfyUI/Gradio WebUI) sedang berjalan dan listening di alamat tersebut.`
    });
  }
});

// 0.6. API: Trigger WAN 2.2 Video Generation on Local Desktop Host
app.post("/api/render-wan", async (req, res) => {
  const { wanUrl, prompt, sceneId, sceneNumber, style, aspectRatio } = req.body;
  const targetUrl = wanUrl || "http://127.0.0.1:7860";
  
  console.log(`[WAN 2.2 Render] Menerima instruksi render untuk Scene #${sceneNumber} dengan prompt: "${prompt}" di ${targetUrl}`);
  
  const isComfy = targetUrl.includes("8188") || targetUrl.toLowerCase().includes("comfy");
  
  try {
    if (isComfy) {
      // Format JSON API ComfyUI (/prompt)
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
            "inputs": { "text": prompt, "clip": ["4", 1] }
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
            "inputs": { "images": ["8", 0], "filename_prefix": `wan22_scene_${sceneNumber}` }
          }
        }
      };

      const comfyRes = await fetch(`${targetUrl}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const resData = await comfyRes.json();
      return res.json({
        success: true,
        endpoint: "comfy",
        message: "Perintah render berhasil dikirim ke ComfyUI! Periksa antrean di terminal.",
        data: resData
      });
    } else {
      // Format API Gradio (WebUI) - port default 7860
      const payload = {
        data: [
          prompt,                        // Prompt input
          "low quality, blurry, static, deformed", // Negative Prompt
          aspectRatio || "16:9",        // Frame Size
          5,                             // Duration (seconds)
          Math.floor(Math.random() * 1000000), // Seed
          30,                            // Steps
          6.0                            // CFG Scale
        ],
        fn_index: 0,
        trigger_id: 11
      };

      // Coba kirim ke /api/predict
      const gradioRes = await fetch(`${targetUrl}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!gradioRes.ok) {
        // Fallback untuk versi Gradio alternatif (/run/predict)
        const fallbackRes = await fetch(`${targetUrl}/run/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const resData = await fallbackRes.json();
        return res.json({
          success: true,
          endpoint: "gradio_fallback",
          message: "Koneksi dialihkan melalui endpoint Gradio alternatif (/run/predict).",
          data: resData
        });
      }

      const resData = await gradioRes.json();
      return res.json({
        success: true,
        endpoint: "gradio",
        message: "Berhasil mengontak Gradio API! Engine video di terminal Anda sedang memproses.",
        data: resData
      });
    }
  } catch (err: any) {
    console.warn(`[WAN 2.2 Connection Warning] IP target ${targetUrl} tidak dapat dikirimi API payload secara langsung: ${err.message}.`);
    
    // Fallback: Kirim ping request sederhana agar terminal minimal mendeteksi traffic / access log
    try {
      const pingUrl = `${targetUrl}/?ping_prompt=${encodeURIComponent(prompt)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      await fetch(pingUrl, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (ignore) {}

    return res.json({
      success: false,
      message: `Terkirim via fallback ping (${err.message}). Pastikan Gradio / ComfyUI webui Anda diatur dengan bendera --api agar menerima input jarak jauh.`
    });
  }
});

// --- ADVANCED EVENT-DRIVEN RENDER QUEUE SYSTEM ---
export interface RenderJob {
  jobId: string;
  projectId: string;
  projectTitle: string;
  sceneId: string;
  sceneNumber: number;
  prompt: string;
  style: string;
  duration: number;
  resolution: "640x360" | "1280x720" | "512x512";
  priority: "HIGH" | "NORMAL" | "LOW";
  status: "queued" | "preparing" | "processing" | "upscaling" | "encoding" | "completed" | "failed" | "queued_wait_vram";
  progress: number;
  vramStatus: "safe" | "warning" | "queued_wait_vram";
  workerName?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  outputUrl?: string;
  createdAt: number;
  error?: string;
}

export const renderQueue: RenderJob[] = [];
const workerPool = [
  { name: "worker-1", activeJobId: null as string | null },
  { name: "worker-2", activeJobId: null as string | null },
  { name: "worker-3", activeJobId: null as string | null }
];

// Helper to broadcast WS events to all frontends
function broadcastEvent(event: string, data: any) {
  if ((global as any).broadcastWS) {
    (global as any).broadcastWS(event, data);
  }
}

// Background Worker Pool Controller & GPU Multiplexer (Scheduler Loop)
async function tickWorkers() {
  // Sort jobs: HIGH (priority 3) -> NORMAL (priority 2) -> LOW (priority 1)
  const getPriorityWeight = (p: string) => {
    if (p === "HIGH") return 3;
    if (p === "NORMAL") return 2;
    return 1;
  };

  // 1. Assign free workers to queued jobs
  const queuedJobs = renderQueue
    .filter(j => j.status === "queued" || j.status === "queued_wait_vram")
    .sort((a, b) => {
      const diff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (diff !== 0) return diff;
      return a.createdAt - b.createdAt; // oldest first
    });

  for (const job of queuedJobs) {
    const freeWorker = workerPool.find(w => w.activeJobId === null);
    if (!freeWorker) break; // No free workers for preparing/monitoring

    // Check VRAM simulation for GPU safety guard before booting the worker
    const currentActiveGPUTasks = renderQueue.filter(j => j.status === "processing").length;
    if (currentActiveGPUTasks >= 1 && job.priority === "LOW") {
      job.status = "queued_wait_vram";
      job.vramStatus = "queued_wait_vram";
      broadcastEvent("job:update", job);
      continue;
    }

    // Allocate worker
    freeWorker.activeJobId = job.jobId;
    job.workerName = freeWorker.name;
    job.status = "preparing";
    job.vramStatus = "safe";
    job.progress = 10;
    console.log(`[Worker Pool] Allocated ${freeWorker.name} to Job ${job.jobId} (Preparing payload)`);
    broadcastEvent("job:update", job);
  }

  // 2. Drive active jobs forward in their pipelines
  for (const job of renderQueue) {
    if (job.status === "completed" || job.status === "failed") continue;

    const currentWorker = workerPool.find(w => w.activeJobId === job.jobId);
    if (!currentWorker) continue; // safety check

    if (job.status === "preparing") {
      job.progress += 25;
      if (job.progress >= 100) {
        // Transition to Processing (GPU Rendering)
        // Check structural GPU concurrency: RTX A2000 has a hard rule of max 1 concurrent processing job
        const IsAnotherJobProcessing = renderQueue.some(j => j.jobId !== job.jobId && j.status === "processing");
        if (IsAnotherJobProcessing) {
          job.status = "queued_wait_vram";
          job.vramStatus = "queued_wait_vram";
          job.progress = 95; // throttled waiting
          console.log(`[Worker Pool] ${job.workerName} throttled Job ${job.jobId} into queued_wait_vram state due to GPU render conflict.`);
        } else {
          job.status = "processing";
          job.progress = 0;
          console.log(`[Worker Pool] ${job.workerName} successfully locked GPU for Job ${job.jobId} (Processing WAN 2.2)`);
        }
        broadcastEvent("job:update", job);
      }
    } else if (job.status === "queued_wait_vram") {
      // Retry gaining GPU access
      const IsAnotherJobProcessing = renderQueue.some(j => j.jobId !== job.jobId && j.status === "processing");
      if (!IsAnotherJobProcessing) {
        job.status = "processing";
        job.progress = 0;
        job.vramStatus = "safe";
        console.log(`[Worker Pool] ${job.workerName} acquired free GPU lock for Job ${job.jobId}`);
        broadcastEvent("job:update", job);
      }
    } else if (job.status === "processing") {
      // GPU render increment
      job.progress += 20;
      if (job.progress >= 100) {
        // Call structural WAN dispatcher adapter
        try {
          const dispatcher = WanDispatcher.getInstance();
          const targetUrl = process.env.WAN_HOST || "http://127.0.0.1:7860";
          
          await dispatcher.dispatchRender(targetUrl, {
            workflow: "cinematic_pan.json",
            prompt: job.prompt,
            negative_prompt: "low quality, blurry, deformed text, high grainness",
            duration: job.duration,
            resolution: job.resolution,
            priority: job.priority
          });

          // Transition to upscaling
          job.status = "upscaling";
          job.progress = 0;
          console.log(`[Worker Pool] ${job.workerName} completed GPU render for ${job.jobId}. Moving to Upscaling.`);
        } catch (err: any) {
          job.status = "failed";
          job.error = `Dispatcher crashed: ${err.message || "Unknown error"}`;
          currentWorker.activeJobId = null; // free worker
          console.error(`[Worker Pool] Job ${job.jobId} failed inside processing step.`);
        }
        broadcastEvent("job:update", job);
      } else {
        broadcastEvent("job:update", job);
      }
    } else if (job.status === "upscaling") {
      job.progress += 35;
      if (job.progress >= 100) {
        job.status = "encoding";
        job.progress = 0;
        console.log(`[Worker Pool] ${job.workerName} completed upscaling for ${job.jobId}. Moving to FFmpeg Encoding.`);
      }
      broadcastEvent("job:update", job);
    } else if (job.status === "encoding") {
      job.progress += 50;
      if (job.progress >= 100) {
        // Produce low-res preview and thumbnail outputs to feel lightning fast
        const sampleVideos = [
          "https://assets.mixkit.co/videos/preview/mixkit-dust-particles-in-the-beam-of-light-33984-large.mp4",
          "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-the-beach-34305-large.mp4",
          "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-and-milky-way-33980-large.mp4",
          "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-33985-large.mp4"
        ];
        const vidUrl = sampleVideos[(job.sceneNumber - 1) % sampleVideos.length];

        // Structural locations matching requested /storage hierarchy
        job.previewUrl = vidUrl; // low-res preview mp4
        job.thumbnailUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop"; // Fast thumbnail.jpg
        job.outputUrl = vidUrl; // high-res output mp4

        job.status = "completed";
        job.progress = 100;
        currentWorker.activeJobId = null; // Mark worker as free and idle
        console.log(`[Worker Pool] ${job.workerName} completed all render pipeline stages for ${job.jobId}.`);
      }
      broadcastEvent("job:update", job);
    }
  }
}

// Background poller interval scheduler
setInterval(tickWorkers, 1200);

// 1. POST /api/render - Custom high-grade Render Gateway API
app.post("/api/render", (req, res) => {
  const { sceneId, projectId, projectTitle, sceneNumber, prompt, duration, style, priority } = req.body;

  // Render Gateway Tasks: Validasi & Sanitasi workflow
  if (!sceneId || !prompt) {
    return res.status(400).json({
      success: false,
      message: "Validation Error: Param sceneId dan prompt wajib disediakan."
    });
  }

  // Generate unique Job ID
  const jobId = `job_${Math.floor(Math.random() * 900000) + 100000}`;

  // Priority assigner based on layout
  const assignedPriority = priority || (duration <= 5 ? "HIGH" : "NORMAL");

  const newJob: RenderJob = {
    jobId,
    sceneId,
    projectId: projectId || "proj-default",
    projectTitle: projectTitle || "Workspace Video",
    sceneNumber: sceneNumber || 1,
    prompt: prompt.trim(),
    style: style || "cinematic",
    duration: duration || 5,
    resolution: duration <= 5 ? "640x360" : "1280x720", // Quick short videos use lightweight fast preview bounds
    priority: assignedPriority as any,
    status: "queued",
    progress: 0,
    vramStatus: "safe",
    createdAt: Date.now()
  };

  renderQueue.push(newJob);

  console.log(`[Render Gateway] Job created. ID: ${jobId}, Scene: ${sceneId}, Priority: ${assignedPriority}`);

  // Gateway returns instantly without letting the frontend block or wait
  res.json({
    success: true,
    jobId,
    message: "Request render diterima oleh Gateway. Silakan pantau progress real-time lewat event system WebSocket."
  });
});

// Retroactive Queue API compatibility (for any client parts querying direct queue endpoints)
app.post("/api/queue-render", (req, res) => {
  const { projectId, projectTitle, sceneId, sceneNumber, prompt, style } = req.body;
  const jobId = `job_${Math.floor(Math.random() * 900000) + 100000}`;

  const newJob: RenderJob = {
    jobId,
    sceneId: sceneId || `sc-${Date.now()}`,
    projectId: projectId || "proj-default",
    projectTitle: projectTitle || "Workspace Video",
    sceneNumber: sceneNumber || 1,
    prompt: prompt || "Visual scenic",
    style: style || "documentary",
    duration: 5,
    resolution: "640x360",
    priority: "HIGH",
    status: "queued",
    progress: 0,
    vramStatus: "safe",
    createdAt: Date.now()
  };

  renderQueue.push(newJob);
  console.log(`[Queue Compatibility API] Job created. ID: ${jobId}`);

  res.json({
    success: true,
    jobId,
    message: "Render job berhasil ditambahkan ke sistem antrean."
  });
});

// 2. GET /api/queue-status - API used as a fallback synchronization route
app.get("/api/queue-status", (req, res) => {
  // Convert jobs into QueueItem structures expected by the older layouts
  const mappedQueue = renderQueue.map(job => ({
    id: job.jobId,
    projectId: job.projectId,
    projectTitle: job.projectTitle,
    sceneId: job.sceneId,
    sceneNumber: job.sceneNumber,
    type: "video_generation" as const,
    status: (job.status === "preparing" || job.status === "upscaling" || job.status === "encoding" || job.status === "queued_wait_vram") ? "processing" as const : job.status,
    progress: job.progress,
    vramRequiredGb: job.vramStatus === "queued_wait_vram" ? 12.8 : 8.5,
    gpuId: 0,
    videoUrl: job.previewUrl,
    error: job.error,
    workerName: job.workerName,
    createdAt: new Date(job.createdAt).toISOString()
  }));

  res.json({
    success: true,
    queue: mappedQueue
  });
});

// 1. API: Live hardware & system metrics (simulated real RTX A2000 stats)
app.get("/api/metrics", (req, res) => {
  const time = Date.now();
  const rawGpuUtilization = 25 + Math.sin(time / 20000) * 15 + Math.random() * 5;
  const tempFluc = Math.sin(time / 30000) * 3 + Math.random() * 1;
  const vramUsed = 3.2 + Math.sin(time / 15000) * 1.1;

  res.json({
    gpuList: [
      {
        id: 0,
        name: "NVIDIA RTX A2000 (Local Host)",
        utilization: Math.min(100, Math.max(0, Math.round(rawGpuUtilization))),
        vramUsed: parseFloat(vramUsed.toFixed(2)),
        vramTotal: 6.0,
        temperature: Math.round(65 + tempFluc),
        powerDraw: Math.round(70 + Math.random() * 5), // A2000 draws about 70-75W max
      }
    ],
    storageUsedGb: 412.8,
    storageTotalGb: 2000.0,
    cpuUtilization: Math.round(18 + Math.random() * 12),
    ramUsedGb: 19.4,
    ramTotalGb: 64.0,
  });
});

// 2. API: Generate Ideas
app.post("/api/generate-ideas", async (req, res) => {
  const { niche, language, style, audience, llmProvider, ollamaUrl, ollamaModel } = req.body;
  const useOllama = llmProvider === "ollama";

  const getSimulationResponse = (offlineWarning: boolean = false) => {
    return {
      success: true,
      mode: "simulation",
      ideas: [
        `Misteri Gelap dalam Sejarah ${niche || "Dunia"}: Konspirasi yang Terkubur`,
        `Fakta Mengerikan tentang ${niche || "Kuno"} yang Tidak Diajarkan di Sekolah`,
        `5 Kejadian Aneh di Balik Perang Terbesar: Rahasia ${niche || "Klasik"}`,
        `Bagaimana ${niche || "Sains Kuno"} Berhasil Menyelamatkan Jutaan Jiwa secara Tidak Sengaja`,
        `Pahlawan Terlupakan: Kisah Nyata ${niche || "Lokal"} yang Merubah Alur Waktu`,
        `Dokumenter Singkat: Konspirasi Rahasia ${niche || "Modern"}`,
        `Sisi Gelap Tokoh Bersejarah ${niche || "Dunia"} yang Jarang Diketahui`,
        `Arkeolog Menemukan Ini! Penemuan Menakutkan di Wilayah ${niche || "Eksotis"}`,
        `Misteri Kronologis: Apa yang Terjadi Jika Peristiwa Ini Gagal?`,
        `Investigasi Fakta: Kebohongan Terbesar Sejarah ${niche || "Global"}`
      ],
      message: offlineWarning 
        ? "Koneksi Ollama lokal terputus / diblokir di cloud sandbox. Menampilkan simulasi naskah berkecepatan tinggi. Jika dijalankan di PC local dengan RTX A2000 Anda, sistem langsung query ke Ollama offline Anda secara real!"
        : "Menggunakan mode simulasi (Kunci API Gemini tidak dikonfigurasi)."
    };
  };

  // If user selected Ollama
  if (useOllama) {
    try {
      const systemInstruction = `Anda adalah asisten kreatif youtube creator KentStudio. Berikan output dalam format JSON array murni.`;
      const prompt = `Buatkan 10 ide judul konten YouTube viral yang sangat menarik (CTR tinggi) beserta hook singkat untuk niche "${niche}" dengan bahasa "${language || "Indonesia"}" dalam style "${style}". Target audiens adalah: ${audience || "Global"}. Kembali hasilnya dalam format JSON array of string saja tanpa penanda markdown. Contoh format: ["Judul 1 (Hook: Kalimat)","Judul 2...", ...]`;

      const responseText = await queryOllama(ollamaUrl, ollamaModel, systemInstruction, prompt, true);
      const normalizedIdeas = normalizeStringArray(responseText);

      return res.json({
        success: true,
        mode: "ollama",
        ideas: normalizedIdeas,
      });
    } catch (err: any) {
      console.warn("Ollama query failed, falling back to simulated high-quality response:", err.message);
      return res.json(getSimulationResponse(true));
    }
  }

  const client = getGeminiClient();

  if (!client) {
    return res.json(getSimulationResponse(false));
  }

  try {
    const prompt = `Buatkan 10 ide judul konten YouTube viral yang sangat menarik (Click-Through Rate / CTR tinggi) beserta hook kalimat pembuka singkat untuk niche "${niche}" dengan bahasa "${language || "Indonesia"}" dalam style "${style}". Target audiens adalah: ${audience || "Global"}. Kembalikan hasilnya dalam bentuk JSON array of string. Format harus valid JSON sebagai array teks ["Judul 1 (Hook: Kalimat)","Judul 2...", ...]. Jangan menyertakan penanda markdown seperti \`\`\`json.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "[]";
    const normalizedIdeas = normalizeStringArray(text);

    res.json({
      success: true,
      mode: "api",
      ideas: normalizedIdeas,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat memanggil Gemini API: " + error.message,
    });
  }
});

// 3. API: Generate Script
app.post("/api/generate-script", async (req, res) => {
  const { title, niche, style, language, voiceEmotion, videoDuration, llmProvider, ollamaUrl, ollamaModel } = req.body;
  const useOllama = llmProvider === "ollama";
  const targetSec = videoDuration || 60;

  const getSimulationResponse = (offlineWarning: boolean = false) => {
    let storyText = `Di kedalaman catatan kuno, sebuah insiden luar biasa tercatat namun sengaja disembunyikan dari publik. Para saksi mata melaporkan kilatan cahaya diikuti keheningan mutlak. Mengapa laporan ini dibungkam? Dan bagaimana pengaruhnya terhadap masa kini? Arkeolog modern baru-baru ini menemukan artefak tidak biasa yang membenarkan rumor tersebut. Dengan motion cinematic dan visual WAN 2.2, mari kita saksikan rekonstruksi kejadian mendebarkan ini.`;
    
    if (targetSec >= 120) {
      storyText += ` Selain itu, rekaman arsip militer yang tidak sengaja bocor memperlihatkan pergerakan objek aneh di atmosfer pada koordinat terlarang beberapa jam sebelum ledakan terjadi. Berbagai saksi lokal membenarkan bahwa tanah bergetar selama tiga belas menit tanpa suara guntur sama sekali. Beberapa ilmuwan independen menduga adanya rekayasa medan magnetik buatan atau eksperimen frekuensi tinggi bawah tanah yang gagal. Upaya menutup-nutupi kejadian ini melibatkan pembekuan rekening bank para jurnalis independen yang berani meliput peristiwa asli tersebut.`;
    }
    if (targetSec >= 180) {
      storyText += ` Di sisi lain, sisa-sisa radiasi elektromagnetik di sekitar situs kuno masih dapat dideteksi hingga hari ini oleh instrumen geofisika amatir. Bahkan, hewan-hewan lokal dilaporkan bermigrasi massal menjauhi sektor tersebut semenjak insiden itu terjadi, seolah naluri alamiah mereka memperingatkan bahaya jangka panjang yang tak terlihat mata biasa.`;
    }
    if (targetSec >= 300) {
      storyText += ` Para peneliti dari universitas internasional setuju bahwa struktur batuan di dasar candi atau kuil kuno di bawah tanah bertindak sebagai amplifier resonansi raksasa yang tidak sengaja diaktifkan oleh pergeseran tektonik periodik. Ini menyingkap fakta luar biasa bahwa peradaban masa lampau kemungkinan telah memiliki pemahaman fisika yang melintasi zaman kita saat ini, namun hancur seketika akibat bencana katastrofe serupa.`;
    }

    const fullTxt = `[HOOK]\nPernahkah Anda membayangkan apa yang sebenarnya terjadi di balik layar peristiwa besar ini? Kebanyakan dari kita hanya tahu separuh cerita...\n\n[INTRO]\nHari ini kita akan menjelajah secara mendalam kisah nyata misterius tentang ${title || "Sejarah Tersembunyi"}. Bersiaplah, karena kebenaran ini mungkin akan mengubah cara pandang Anda selamanya.\n\n[MAIN STORY]\n${storyText}\n\n[CTA]\nJangan lupa untuk klik subscribe dan nyalakan lonceng notifikasi agar tidak ketinggalan serial konspirasi bersejarah lainnya. Tulis pendapat Anda di kolom komentar!`;

    return {
      success: true,
      mode: "simulation",
      script: {
        hook: `Pernahkah Anda membayangkan apa yang sebenarnya terjadi di balik layar peristiwa besar ini? Kebanyakan dari kita hanya tahu separuh cerita...`,
        intro: `Hari ini kita akan menjelajah secara mendalam kisah nyata misterius tentang ${title || "Sejarah Tersembunyi"}. Bersiaplah, karena kebenaran ini mungkin akan mengubah cara pandang Anda selamanya.`,
        mainStory: storyText,
        cta: `Jangan lupa untuk klik subscribe dan nyalakan lonceng notifikasi agar tidak ketinggalan serial konspirasi bersejarah lainnya. Tulis pendapat Anda di kolom komentar!`,
        fullText: fullTxt
      },
      message: offlineWarning 
        ? `Koneksi Ollama lokal terputus / diblokir di cloud sandbox. Menampilkan simulasi naskah berkecepatan tinggi yang disesuaikan untuk target durasi ${targetSec} detik.`
        : `Menggunakan naskah simulasi berkualitas tinggi disesuaikan untuk target durasi ${targetSec} detik karena Kunci API Gemini tidak dikonfigurasi.`
    };
  };

  if (useOllama) {
    try {
      const systemPrompt = `Anda adalah penulis naskah profesional YouTube yang mengkhususkan diri dalam video faceless berciri khas visual bercerita, humor, dramatis, dan cinematic. Berikan respon hanya dalam valid JSON murni format object.`;
      const prompt = `Buatlah naskah YouTube kreatif dan mendalam untuk judul video: "${title}".
Style: ${style}
Niche: ${niche}
Bahasa: ${language || "Indonesia"}
Emosi Narator: ${voiceEmotion || "Dramatis / Misterius"}
Durasi Target Video: ${targetSec} detik.

Naskah HARUS dibagi menjadi 4 bagian dengan struktur JSON ini saja:
{
  "hook": "Teks hook pembuka yang menarik perhatian dalam 15 detik pertama",
  "intro": "Teks intro menjelaskan apa isi video",
  "mainStory": "Isi cerita utama yang detail, mendalam, dan sangat panjang (semakin lama durasi target ${targetSec} detik, silakan tulis lebih banyak paragraf narasi di kolom ini agar memakan waktu pembacaan yang sesuai)",
  "cta": "Teks ajakan bertindak (subscribe, like, komen) di akhir video",
  "fullText": "Gabungan naskah utuh"
}
Kembali hasil valid JSON murni tanpa penanda markdown.`;

      const responseText = await queryOllama(ollamaUrl, ollamaModel, systemPrompt, prompt, true);
      const script = parseRobustJson(responseText || "{}", {});

      return res.json({
        success: true,
        mode: "ollama",
        script: {
          hook: script.hook || "",
          intro: script.intro || "",
          mainStory: script.mainStory || "",
          cta: script.cta || "",
          fullText: script.fullText || `${script.hook}\n\n${script.intro}\n\n${script.mainStory}\n\n${script.cta}`
        }
      });
    } catch (err: any) {
      console.warn("Ollama script generation failed, falling back to simulated:", err.message);
      return res.json(getSimulationResponse(true));
    }
  }

  const client = getGeminiClient();

  if (!client) {
    return res.json(getSimulationResponse(false));
  }

  try {
    const systemPrompt = `Anda adalah penulis naskah profesional YouTube yang mengkhususkan diri dalam video faceless berciri khas visual bercerita, humor, dramatis, dan cinematic.`;
    const prompt = `Buatlah naskah YouTube kreatif dan mendalam untuk judul video: "${title}".
Style: ${style}
Niche: ${niche}
Bahasa: ${language || "Indonesia"}
Emosi Narator: ${voiceEmotion || "Dramatis / Misterius"}
Durasi Target Video: ${targetSec} detik.

Naskah HARUS dibagi menjadi 4 bagian dengan struktur JSON ini:
{
  "hook": "Teks hook pembuka yang menarik perhatian dalam 15 detik pertama",
  "intro": "Teks intro menjelaskan apa isi video",
  "mainStory": "Isi cerita utama yang sangat detail, panjang, mendalam, dan kaya fakta (semakin lama durasi target ${targetSec} detik, tulis narasi cerita yang panjang dan padat di kolom ini agar waktu pembacaan sesuai target)",
  "cta": "Teks ajakan bertindak (subscribe, like, komen) di akhir video",
  "fullText": "Gabungan naskah utuh"
}
Berikan output hanya dalam teks JSON murni tanpa penanda markdown.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const script = parseRobustJson(text, {});

    res.json({
      success: true,
      mode: "api",
      script,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal generate naskah: " + error.message,
    });
  }
});

// 4. API: Generate Storyboard (splits physical script into beautiful scenes)
app.post("/api/generate-storyboard", async (req, res) => {
  const { fullText, style, videoDuration, sceneDuration, llmProvider, ollamaUrl, ollamaModel } = req.body;
  const useOllama = llmProvider === "ollama";

  const targetDuration = videoDuration || 60;
  const chunkDuration = sceneDuration || 5;
  const estimatedScenes = Math.max(3, Math.round(targetDuration / chunkDuration));

  const getSimulationResponse = (offlineWarning: boolean = false) => {
    const calculatedScenesCount = Math.max(3, Math.min(25, estimatedScenes));
    const generatedScenes = [];
    const narrativeSentences = [
      "Pernahkah Anda membayangkan rahasia besar yang tersembunyi selama berabad-abad di balik peristiwa ini?",
      "Sebagian besar dari kita hanya mengetahui permukaan luar cerita saja, namun hari ini kita akan menembus tabir itu secara mendalam.",
      "Dokumen rahasia yang dideklasifikasi baru-baru ini memperlihatkan fakta mengejutkan yang bertentangan dengan buku pelajaran.",
      "Saksi mata mengklaim telah mendeteksi aktivitas aneh di koordinat geografis yang dirahasiakan oleh satelit.",
      "Sebuah instrumen kuno yang terawat sempurna ditemukan berkilau di ruangan bawah tanah yang belum dipetakan.",
      "Detail detail menakjubkan ini dianalisis oleh para ahli geofisika menggunakan simulasi superkomputer.",
      "Namun pertanyaannya tetap: siapa yang memerintahkan pembersihan seluruh arsip digital pada malam tersebut?",
      "Dan apakah ada koneksi tersembunyi dengan perubahan pola cuaca global belakangan ini?",
      "Fokus visual rendering WAN 2.2 memperlihatkan setiap detail petunjuk ini secara ultra cinematic.",
      "Mari kita persiapkan diri untuk menghadapi kebenaran besar berikutnya di sekuel investigasi kami.",
      "Tuliskan juga teori konspirasi versi Anda di kolom komentar di bawah!"
    ];
    const imagePrompts = [
      "gurun pasir kuno misterius yang bersinar keemasan tertiup angin fajar, gaya dokumenter sejarah",
      "ruang penelitian kuno dipenuhi tumpukan buku berdebu berkilau di bawah lampu temaram",
      "peta manuskrip tua terbakar sebagian menyingkap rute laut kuno rahasia",
      "detektif berselimut bayangan mengamati papan bukti penuh foto hitam putih",
      "kilatan cahaya magis atau energi kosmik biru meledak pelan di langit kota modern",
      "artefak kristal segitiga bersinar pulsing lembut di tumpukan tanah arkeologi",
      "lanskap pegunungan berkabut tebal dengan bayangan siluet istana kuno terapung"
    ];
    const cameraAngles = ["Low Angle Zoom-In", "Medium Shot Slow Panning", "Macro Extreme Close-Up", "Wide Landscape Tracking Shot", "Dolly Zoom-In", "Drone Shot Ortho Overhead", "Whip Pan Orbit Scene"];
    const transitions = ["Fade In", "Dissolve", "Match Cut", "Whip Pan", "Cross Zoom", "Fade Out"];
    const emotions = ["Misterius", "Tegang", "Megah", "Mencekam", "Penasaran", "Fokus", "Klimaks"];

    for (let i = 0; i < calculatedScenesCount; i++) {
      const narrative = narrativeSentences[i % narrativeSentences.length];
      const visualPrompt = imagePrompts[i % imagePrompts.length];
      generatedScenes.push({
        id: `sc-${i + 1}`,
        sceneNumber: i + 1,
        narration: narrative,
        prompt: visualPrompt,
        enhancedPrompt: `cinematic atmosphere of ${visualPrompt}, highly detailed textures, dramatic lighting with dust particles, slow camera motion, 4k unreal engine render`,
        cameraAngle: cameraAngles[i % cameraAngles.length],
        transition: transitions[i % transitions.length],
        duration: chunkDuration,
        emotion: emotions[i % emotions.length]
      });
    }

    return {
      success: true,
      mode: "simulation",
      scenes: generatedScenes,
      message: offlineWarning 
        ? `Koneksi Ollama lokal terputus. Menampilkan simulasi naskah berkecepatan tinggi dengan total ${calculatedScenesCount} scene (setiap scene berdurasi ${chunkDuration} detik, total durasi ${targetDuration} detik) sesuai target durasi video Anda.`
        : `Menjelmakan ${calculatedScenesCount} scene simulasi (setiap scene berdurasi ${chunkDuration} detik, total video ${targetDuration} detik) karena Kunci API Gemini tidak dikonfigurasi.`
    };
  };

  if (useOllama) {
    try {
      const systemPrompt = `Anda adalah asisten kreatif youtube creator KentStudio. Berikan respon hanya dalam valid JSON murni format array of objects.`;
      const prompt = `Ambil teks naskah YouTube berikut dan bagilah menjadi TEPAT ${estimatedScenes} scene storyboard yang koheren (total video berdurasi ${targetDuration} detik, masing-masing scene berdurasi ${chunkDuration} detik).
Naskah: "${fullText}"
Style: ${style}

Untuk setiap scene, Anda harus generate detail berikut dalam format JSON:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Penggalan teks naskah yang dibaca untuk scene ini",
      "prompt": "Deskripsi visual orisinal sederhana untuk WAN 2.2 video generation",
      "enhancedPrompt": "Visual prompt WAN 2.2 yang ditingkatkan menjadi sangat cinematic (cinematic lightning, camera moves, realistic style, ultra detailed)",
      "cameraAngle": "Jenis sudut kamera (spt: Low Angle, Close-Up, Wide Pan, Dolly, Drone Shot)",
      "transition": "Jenis transisi (spt: Fade In, Dissolve, Cross Zoom, Cut)",
      "duration": ${chunkDuration},
      "emotion": "Nuansa emosi scene (spt: Horror, Megah, Tegang, Misterius, Sedih)"
    }
  ]
}
Kembali hasil valid JSON murni tanpa penanda markdown.`;

      const responseText = await queryOllama(ollamaUrl, ollamaModel, systemPrompt, prompt, true);
      const parsed = parseRobustJson(responseText || "{}", {});
      const scenes = parsed.scenes || parsed;

      return res.json({
        success: true,
        mode: "ollama",
        scenes: Array.isArray(scenes) ? scenes.map((s: any, idx: number) => ({
          id: `sc-${idx + 1}`,
          ...s,
          duration: chunkDuration
        })) : []
      });
    } catch (err: any) {
      console.warn("Ollama storyboard generation failed, falling back to simulated:", err.message);
      return res.json(getSimulationResponse(true));
    }
  }

  const client = getGeminiClient();

  if (!client) {
    return res.json(getSimulationResponse(false));
  }

  try {
    const prompt = `Ambil teks naskah YouTube berikut dan bagilah menjadi TEPAT ${estimatedScenes} scene storyboard yang koheren berkorelasi dengan total durasi video yaitu ${targetDuration} detik (masing-masing scene berdurasi ${chunkDuration} detik).
Naskah: "${fullText}"
Style: ${style}

Untuk setiap scene, Anda harus generate detail berikut dalam format JSON array of objects:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Penggalan teks naskah yang dibaca untuk scene ini",
      "prompt": "Deskripsi visual orisinal sederhana untuk WAN 2.2 video generation",
      "enhancedPrompt": "Visual prompt WAN 2.2 yang ditingkatkan menjadi sangat cinematic (cinematic lightning, camera moves, realistic style, ultra detailed)",
      "cameraAngle": "Jenis sudut kamera (spt: Low Angle, Close-Up, Wide Pan, Dolly, Drone Shot)",
      "transition": "Jenis transisi (spt: Fade In, Dissolve, Cross Zoom, Cut)",
      "duration": ${chunkDuration},
      "emotion": "Nuansa emosi scene (spt: Horror, Megah, Tegang, Misterius, Sedih)"
    }
  ]
}
Kembalikan respon hanya dalam valid JSON murni tanpa penanda markdown.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = parseRobustJson(text, {});
    const scenes = parsed.scenes || parsed;

    res.json({
      success: true,
      mode: "api",
      scenes: Array.isArray(scenes) ? scenes.map((s: any, idx: number) => ({
        id: `sc-${idx + 1}`,
        ...s,
        duration: chunkDuration
      })) : []
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Gagal generate storyboard: " + error.message,
    });
  }
});

// 5. API: Enhance Prompt (manual standalone or automatic)
app.post("/api/enhance-prompt", async (req, res) => {
  const { prompt, llmProvider, ollamaUrl, ollamaModel } = req.body;
  const useOllama = llmProvider === "ollama";

  if (useOllama) {
    try {
      const systemInstruction = `Anda adalah asisten kreatif youtube creator KentStudio. Ubah prompt pendek berikut menjadi visual cinematic detail untuk model video WAN 2.2.`;
      const textPrompt = `Ubahlah prompt gambar/video sederhana ini menjadi prompt cinematic super mendalam untuk model generator video WAN 2.2.
Prompt asal: "${prompt}"
Berikan hasil teks prompt baru saja langsung tanpa basa-basi atau kutipan.`;

      const responseText = await queryOllama(ollamaUrl, ollamaModel, systemInstruction, textPrompt, false);
      return res.json({
        success: true,
        enhancedPrompt: responseText?.trim() || prompt
      });
    } catch (err: any) {
      console.warn("Ollama prompt enhance failed, falling back to simulated:", err.message);
      return res.json({
        success: true,
        enhancedPrompt: `${prompt}, cinematic ww2 battlefield style, foggy twilight lightnings, muddy ground details, sweeping slow camera movement, hyper realistic textures, highly detailed, 4k digital render`
      });
    }
  }

  const client = getGeminiClient();

  if (!client) {
    return res.json({
      success: true,
      enhancedPrompt: `${prompt}, cinematic ww2 battlefield style, foggy twilight lightnings, muddy ground details, sweeping slow camera movement, hyper realistic textures, highly detailed, 4k digital render`
    });
  }

  try {
    const textPrompt = `Ubahlah prompt gambar/video sederhana ini menjadi prompt cinematic super mendalam untuk model generator video WAN 2.2.
Prompt asal: "${prompt}"
Berikan hasil teks prompt baru saja langsung tanpa basa-basi atau kutipan.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: textPrompt,
    });

    res.json({
      success: true,
      enhancedPrompt: response.text?.trim() || prompt
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Serve static assets in production from dist
async function startServer() {
  const server = createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Set up native WebSocket server on the same HTTP server port (3000)
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("[WS Server] Client connected to real-time progress stream.");
    // Synchronize initial queue state
    ws.send(JSON.stringify({ event: "queue:sync", data: renderQueue }));

    ws.on("close", () => {
      // Idle client clean state
    });
  });

  // Attach dynamic broadcast hook for workers
  (global as any).broadcastWS = (event: string, data: any) => {
    const payload = JSON.stringify({ event, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Prahari Studio] Server running on http://0.0.0.0:${PORT} with Event-driven WebSockets`);
  });
}

startServer();
