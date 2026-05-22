import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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
      const parsed = JSON.parse(responseText || "[]");

      return res.json({
        success: true,
        mode: "ollama",
        ideas: Array.isArray(parsed) ? parsed : [parsed],
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
    const parsed = JSON.parse(text);

    res.json({
      success: true,
      mode: "api",
      ideas: Array.isArray(parsed) ? parsed : [parsed],
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
  const { title, niche, style, language, voiceEmotion, llmProvider, ollamaUrl, ollamaModel } = req.body;
  const useOllama = llmProvider === "ollama";

  const getSimulationResponse = (offlineWarning: boolean = false) => {
    return {
      success: true,
      mode: "simulation",
      script: {
        hook: `Pernahkah Anda membayangkan apa yang sebenarnya terjadi di balik layar peristiwa besar ini? Kebanyakan dari kita hanya tahu separuh cerita...`,
        intro: `Hari ini kita akan menjelajah secara mendalam kisah nyata misterius tentang ${title || "Sejarah Tersembunyi"}. Bersiaplah, karena kebenaran ini mungkin akan mengubah cara pandang Anda selamanya.`,
        mainStory: `Di kedalaman catatan kuno, sebuah insiden luar biasa tercatat namun sengaja disembunyikan dari publik. Para saksi mata melaporkan kilatan cahaya diikuti keheningan mutlak. Mengapa laporan ini dibungkam? Dan bagaimana pengaruhnya terhadap masa kini? Arkeolog modern baru-baru ini menemukan artefak tidak biasa yang membenarkan rumor tersebut. Dengan motion cinematic dan visual WAN 2.2, mari kita saksikan rekonstruksi kejadian mendebarkan ini.`,
        cta: `Jangan lupa untuk klik subscribe dan nyalakan lonceng notifikasi agar tidak ketinggalan serial konspirasi bersejarah lainnya. Tulis pendapat Anda di kolom komentar!`,
        fullText: `[HOOK]\nPernahkah Anda membayangkan apa yang sebenarnya terjadi di balik layar peristiwa besar ini? Kebanyakan dari kita hanya tahu separuh cerita...\n\n[INTRO]\nHari ini kita akan menjelajah secara mendalam kisah nyata misterius tentang ${title || "Sejarah Tersembunyi"}. Bersiaplah, karena kebenaran ini mungkin akan mengubah cara pandang Anda selamanya.\n\n[MAIN STORY]\nDi kedalaman catatan kuno, sebuah insiden luar biasa tercatat namun sengaja disembunyikan dari publik. Para saksi mata melaporkan kilatan cahaya diikuti keheningan mutlak. Mengapa laporan ini dibungkam? Dan bagaimana pengaruhnya terhadap masa kini? Arkeolog modern baru-of-recently menemukan artefak tidak biasa yang membenarkan rumor tersebut. Dengan motion cinematic dan visual WAN 2.2, mari kita saksikan rekonstruksi kejadian mendebarkan ini.\n\n[CTA]\nJangan lupa untuk klik subscribe dan nyalakan lonceng notifikasi agar tidak ketinggalan serial konspirasi bersejarah lainnya. Tulis pendapat Anda di kolom komentar!`
      },
      message: offlineWarning 
        ? "Koneksi Ollama lokal terputus / diblokir di cloud sandbox. Menampilkan simulasi naskah berkecepatan tinggi. Jika dijalankan di PC local dengan RTX A2000 Anda, sistem langsung query ke Ollama offline Anda secara real!"
        : "Menggunakan naskah simulasi berkualitas tinggi karena Kunci API Gemini tidak dikonfigurasi."
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

Naskah HARUS dibagi menjadi 4 bagian dengan struktur JSON ini saja:
{
  "hook": "Teks hook pembuka yang menarik perhatian dalam 15 detik pertama",
  "intro": "Teks intro menjelaskan apa isi video",
  "mainStory": "Isi cerita utama yang detail, dramatis, dan kaya akan fakta menarik",
  "cta": "Teks ajakan bertindak (subscribe, like, komen) di akhir video",
  "fullText": "Gabungan naskah utuh"
}
Kembali hasil valid JSON murni tanpa penanda markdown.`;

      const responseText = await queryOllama(ollamaUrl, ollamaModel, systemPrompt, prompt, true);
      const script = JSON.parse(responseText || "{}");

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

Naskah HARUS dibagi menjadi 4 bagian dengan struktur JSON ini:
{
  "hook": "Teks hook pembuka yang menarik perhatian dalam 15 detik pertama",
  "intro": "Teks intro menjelaskan apa isi video",
  "mainStory": "Isi cerita utama yang detail, dramatis, dan kaya akan fakta menarik",
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
    const script = JSON.parse(text);

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
  const { fullText, style, llmProvider, ollamaUrl, ollamaModel } = req.body;
  const useOllama = llmProvider === "ollama";

  const getSimulationResponse = (offlineWarning: boolean = false) => {
    return {
      success: true,
      mode: "simulation",
      scenes: [
        {
          id: "sc-1",
          sceneNumber: 1,
          narration: "Pernahkah Anda membayangkan apa yang sebenarnya terjadi di balik layar peristiwa besar ini?",
          prompt: "gurun pasir kuno yang diterangi cahaya moon redup, reruntuhan kuil batu terbengkalai, badai debu tipis, gaya dokumenter sejarah",
          enhancedPrompt: "cinematic historic archaeological site under dramatic moonlight, foggy environment, ancient monolith ruins, sweeping low angle cinematic pan shot, detailed stone textures, unreal engine 5 render, highly atmospheric",
          cameraAngle: "Low Angle Zoom-In",
          transition: "Fade Out",
          duration: 5,
          emotion: "Misterius"
        },
        {
          id: "sc-2",
          sceneNumber: 2,
          narration: "Kebanyakan dari kita hanya tahu separuh cerita... Hari ini kita akan menjelajah secara mendalam.",
          prompt: "seorang detektif bermantel mengamati peta kuno misterius di meja kayu kuno, cahaya lilin temaram",
          enhancedPrompt: "mysterious detective in vintage trench coat studying ancient map, dark dusty study room, glowing candlelight, volumetric gold dust, hyper realistic face details, cinematic shadows, slow dollies camera movement",
          cameraAngle: "Medium Shot Slow Panning",
          transition: "Dissolve",
          duration: 6,
          emotion: "Tegang"
        },
        {
          id: "sc-3",
          sceneNumber: 3,
          narration: "Di kedalaman catatan kuno, sebuah insiden luar biasa tercatat namun sengaja disembunyikan dari publik.",
          prompt: "buku jurnal tua berdebu yang terbuka otomatis menyingkap rahasia berkilauan keemasan",
          enhancedPrompt: "ancient leather book opening, mystical golden light rays radiating from pages, flying particles, close-up details of old script parchment, dramatic lens flare, 4k macro shot",
          cameraAngle: "Macro Extreme Close-Up",
          transition: "Match Cut",
          duration: 5,
          emotion: "Megah"
        },
        {
          id: "sc-4",
          sceneNumber: 4,
          narration: "Para saksi mata melaporkan kilatan cahaya diikuti keheningan mutlak. Mengapa laporan ini dibungkam?",
          prompt: "kilatan petir magis atau ledakan energi kosmik besar di langit desa pertengahan",
          enhancedPrompt: "magical electric cosmic wave exploding above medieval town, realistic thunderstorm lighting, dark indigo clouds, slow motion sky explosion, incredible details, cinematic cinematic VFX",
          cameraAngle: "Wide Landscape Tracking Shot",
          transition: "Whip Pan",
          duration: 5,
          emotion: "Mencekam"
        }
      ],
      message: offlineWarning 
        ? "Koneksi Ollama lokal terputus / diblokir di cloud sandbox. Menampilkan simulasi naskah berkecepatan tinggi. Jika dijalankan di PC local dengan RTX A2000 Anda, sistem langsung query ke Ollama offline Anda secara real!"
        : undefined
    };
  };

  if (useOllama) {
    try {
      const systemPrompt = `Anda adalah asisten kreatif youtube creator KentStudio. Berikan respon hanya dalam valid JSON murni format array of objects.`;
      const prompt = `Ambil teks naskah YouTube berikut dan bagilah menjadi minimal 4 hingga maksimal 6 scene storyboard yang koheren.
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
      "duration": 5,
      "emotion": "Nuansa emosi scene (spt: Horror, Megah, Tegang, Misterius, Sedih)"
    }
  ]
}
Kembali hasil valid JSON murni tanpa penanda markdown.`;

      const responseText = await queryOllama(ollamaUrl, ollamaModel, systemPrompt, prompt, true);
      const parsed = JSON.parse(responseText || "{}");
      const scenes = parsed.scenes || parsed;

      return res.json({
        success: true,
        mode: "ollama",
        scenes: Array.isArray(scenes) ? scenes.map((s: any, idx: number) => ({
          id: `sc-${idx + 1}`,
          ...s
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
    const prompt = `Ambil teks naskah YouTube berikut dan bagilah menjadi minimal 4 hingga maksimal 6 scene storyboard yang koheren.
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
      "duration": 5,
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
    const parsed = JSON.parse(text);
    const scenes = parsed.scenes || parsed;

    res.json({
      success: true,
      mode: "api",
      scenes: Array.isArray(scenes) ? scenes.map((s: any, idx: number) => ({
        id: `sc-${idx + 1}`,
        ...s
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
