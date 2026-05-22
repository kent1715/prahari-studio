export type VideoStyle = "documentary" | "recap" | "horror" | "history" | "motivation" | "crime" | "storytelling";

export interface StoryboardScene {
  id: string;
  sceneNumber: number;
  narration: string;
  prompt: string;
  enhancedPrompt: string;
  cameraAngle: string;
  transition: string;
  duration: number; // in seconds, typically 5, 10, 20
  emotion: string;
  videoStatus: "pending" | "generating" | "ready" | "failed";
  videoProgress: number;
  videoUrl?: string;
  audioUrl?: string;
}

export interface ThumbnailConfig {
  title: string;
  style: string;
  characterType: string;
  emotion: string;
  hasRedArrow: boolean;
  hasCircle: boolean;
  shockExpression: boolean;
  textPlacement: "top" | "center" | "bottom";
  textColor: string;
  bgColor: string;
  customImage?: string;
}

export interface Project {
  id: string;
  title: string;
  niche: string;
  style: VideoStyle;
  language: string;
  status: "draft" | "generating" | "ready" | "completed";
  script?: {
    hook: string;
    intro: string;
    mainStory: string;
    cta: string;
    fullText: string;
  };
  ideas?: string[];
  storyboard?: StoryboardScene[];
  voiceEngine: "XTTS" | "Fish Speech" | "Edge TTS" | "ElevenLabs" | "Kokoro TTS";
  voiceName: string;
  voiceSpeed: number;
  voiceEmotion: string;
  subtitleStyle: "tiktok" | "documentary" | "cinematic" | "karaoke";
  subtitleBurn: boolean;
  musicMood: string;
  musicVolume: number;
  thumbnail?: ThumbnailConfig;
  videoUrl?: string; // final compiled video URL
  llmProvider?: "gemini" | "ollama";
  ollamaUrl?: string;
  ollamaModel?: string;
  createdAt: string;
}

export interface QueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  sceneId?: string;
  type: "video_generation" | "voice_over" | "compiling" | "thumbnail" | "upload";
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  vramRequiredGb: number;
  gpuId: number;
  error?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: "music" | "sfx" | "character" | "preset";
  category: string;
  url: string;
  duration?: number;
}

export interface GPUStats {
  id: number;
  name: string;
  utilization: number; // %
  vramUsed: number; // GB
  vramTotal: number; // GB
  temperature: number; // C
  powerDraw: number; // W
}

export interface SystemMetrics {
  gpuList: GPUStats[];
  storageUsedGb: number;
  storageTotalGb: number;
  cpuUtilization: number;
  ramUsedGb: number;
  ramTotalGb: number;
}
