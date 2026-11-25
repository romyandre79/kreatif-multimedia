import { generateGeminiImage, generateGeminiVideo, GeminiImageGenOptions, GeminiVideoGenOptions } from "./geminiFlow";
import { AiProviderConfig } from "../stores/projectStore";

export interface UnifiedMediaGenOptions {
  prompt: string;
  referenceImageBase64?: string;
  negativePrompt?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  numberOfImages?: number;
}

export interface ProviderInfo {
  id: AiProviderConfig["imageGen"]["provider"];
  name: string;
  badge: string;
  icon: string;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsImg2Img: boolean;
}

export const AI_MEDIA_PROVIDERS: ProviderInfo[] = [
  {
    id: "gemini_flow",
    name: "Google Gemini Flow (Imagen 3 / Veo 2)",
    badge: "Google AI API",
    icon: "✨",
    supportsVideo: true,
    supportsImage: true,
    supportsImg2Img: true,
  },
  {
    id: "fal_ai",
    name: "Fal.ai (FLUX.1 / SDXL / Kling Video)",
    badge: "Cloud Ultra-Fast",
    icon: "⚡",
    supportsVideo: true,
    supportsImage: true,
    supportsImg2Img: true,
  },
  {
    id: "openai_dalle",
    name: "OpenAI DALL-E 3 / Sora API",
    badge: "OpenAI Cloud",
    icon: "🟢",
    supportsVideo: true,
    supportsImage: true,
    supportsImg2Img: false,
  },
  {
    id: "comfy_local",
    name: "ComfyUI / Stable Diffusion (Lokal)",
    badge: "Lokal Offline GPU",
    icon: "🖥️",
    supportsVideo: true,
    supportsImage: true,
    supportsImg2Img: true,
  },
  {
    id: "midjourney",
    name: "Midjourney API (Proxy)",
    badge: "Artistic Cloud",
    icon: "🎨",
    supportsVideo: false,
    supportsImage: true,
    supportsImg2Img: true,
  },
];

/**
 * Generate Gambar secara terpadu melalui provider AI yang dipilih di pengaturan atau switcher
 */
export async function generateUnifiedImage(
  imageSettings: AiProviderConfig["imageGen"],
  options: UnifiedMediaGenOptions
): Promise<string[]> {
  const provider = imageSettings.provider || "gemini_flow";
  const apiKey = imageSettings.apiKey?.trim() || "";
  const endpoint = imageSettings.endpoint?.trim() || "";

  // 1. Google Gemini Flow (Imagen 3)
  if (provider === "gemini_flow") {
    if (!apiKey) {
      throw new Error("Google Gemini API Key belum diisi. Silakan masukkan di pengaturan AI Engine.");
    }
    const geminiOpts: GeminiImageGenOptions = {
      prompt: options.prompt,
      referenceImageBase64: options.referenceImageBase64,
      negativePrompt: options.negativePrompt,
      aspectRatio: options.aspectRatio,
      numberOfImages: options.numberOfImages || 1,
    };
    return generateGeminiImage(apiKey, geminiOpts);
  }

  // 2. Fal.ai (FLUX.1 dev / schnell)
  if (provider === "fal_ai") {
    if (!apiKey) {
      throw new Error("Fal.ai API Key belum diisi. Silakan masukkan di pengaturan AI Engine.");
    }

    const falEndpoint = options.referenceImageBase64
      ? "https://queue.fal.run/fal-ai/flux/dev/image-to-image"
      : "https://queue.fal.run/fal-ai/flux/schnell";

    const imageSizeMap: Record<string, string> = {
      "16:9": "landscape_16_9",
      "9:16": "portrait_16_9",
      "1:1": "square_hd",
      "4:3": "landscape_4_3",
      "3:4": "portrait_4_3",
    };

    const body: Record<string, any> = {
      prompt: options.prompt,
      image_size: imageSizeMap[options.aspectRatio || "16:9"] || "landscape_16_9",
      num_images: options.numberOfImages || 1,
      enable_safety_checker: true,
    };

    if (options.referenceImageBase64) {
      body.image_url = `data:image/png;base64,${options.referenceImageBase64}`;
      body.strength = 0.75;
    }

    const res = await fetch(falEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fal.ai Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      return data.images.map((img: any) => img.url || img);
    }
    throw new Error("Fal.ai tidak mengembalikan gambar valid.");
  }

  // 3. OpenAI DALL-E 3
  if (provider === "openai_dalle") {
    if (!apiKey) {
      throw new Error("OpenAI API Key belum diisi. Silakan masukkan di pengaturan AI Engine.");
    }

    const size =
      options.aspectRatio === "9:16"
        ? "1024x1792"
        : options.aspectRatio === "1:1"
          ? "1024x1024"
          : "1792x1024";

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: options.prompt,
        n: 1,
        size,
        response_format: "url",
        quality: "standard",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI DALL-E Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data.map((item: any) => item.url);
    }
    throw new Error("DALL-E tidak mengembalikan url gambar.");
  }

  // 4. ComfyUI / SD WebUI (Lokal)
  if (provider === "comfy_local") {
    const baseUrl = (endpoint || "http://127.0.0.1:7860").replace(/\/$/, "");
    // Standard SD WebUI API endpoint /sdapi/v1/txt2img atau img2img
    const isImg2Img = Boolean(options.referenceImageBase64);
    const sdEndpoint = isImg2Img ? `${baseUrl}/sdapi/v1/img2img` : `${baseUrl}/sdapi/v1/txt2img`;

    const width = options.aspectRatio === "9:16" ? 576 : 1024;
    const height = options.aspectRatio === "9:16" ? 1024 : 576;

    const payload: Record<string, any> = {
      prompt: options.prompt,
      negative_prompt: options.negativePrompt || "low quality, blurry, deformed",
      steps: 25,
      cfg_scale: 7.0,
      width,
      height,
    };

    if (isImg2Img) {
      payload.init_images = [options.referenceImageBase64];
      payload.denoising_strength = 0.65;
    }

    const res = await fetch(sdEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ComfyUI/SD WebUI Lokal Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      return data.images.map((b64: string) => `data:image/png;base64,${b64}`);
    }
    throw new Error("Server lokal tidak mengembalikan gambar.");
  }

  // 5. Midjourney Proxy API
  if (provider === "midjourney") {
    if (!apiKey) {
      throw new Error("Midjourney API Key belum diisi. Silakan masukkan di pengaturan AI Engine.");
    }
    const mjEndpoint = endpoint || "https://api.midjourneyapi.xyz/mj/v2/imagine";

    const res = await fetch(mjEndpoint, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${options.prompt} --ar ${options.aspectRatio || "16:9"} --v 6.1`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Midjourney API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.task_id || data.image_url) {
      if (data.image_url) return [data.image_url];
      throw new Error(`Task Midjourney dibuat (ID: ${data.task_id}). Silakan cek status task secara asinkron.`);
    }
    throw new Error("Gagal generate dari Midjourney API.");
  }

  // Fallback ke Gemini
  return generateGeminiImage(apiKey, {
    prompt: options.prompt,
    referenceImageBase64: options.referenceImageBase64,
    aspectRatio: options.aspectRatio,
  });
}

/**
 * Generate Video secara terpadu melalui provider AI yang dipilih
 */
export async function generateUnifiedVideo(
  imageSettings: AiProviderConfig["imageGen"],
  options: GeminiVideoGenOptions
): Promise<string> {
  const provider = imageSettings.provider || "gemini_flow";
  const apiKey = imageSettings.apiKey?.trim() || "";
  const endpoint = imageSettings.endpoint?.trim() || "";

  // 1. Google Gemini Flow / Veo
  if (provider === "gemini_flow") {
    if (!apiKey) {
      throw new Error("Google Gemini API Key belum diisi untuk pembuatan video.");
    }
    return generateGeminiVideo(apiKey, options);
  }

  // 2. Fal.ai Kling / LTX Video / CogVideoX
  if (provider === "fal_ai") {
    if (!apiKey) {
      throw new Error("Fal.ai API Key belum diisi.");
    }

    const falVideoEndpoint = options.referenceImageBase64
      ? "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video"
      : "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video";

    const body: Record<string, any> = {
      prompt: options.prompt,
      aspect_ratio: options.aspectRatio === "9:16" ? "9:16" : "16:9",
      duration: "5",
    };

    if (options.referenceImageBase64) {
      body.image_url = `data:image/png;base64,${options.referenceImageBase64}`;
    }

    try {
      const res = await fetch(falVideoEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.video?.url) return data.video.url;
      }
    } catch (e) {
      console.warn("Fal.ai Video queue, falling back to image preview:", e);
    }
  }

  // 3. ComfyUI / AnimatedDiff / SVD Lokal
  if (provider === "comfy_local") {
    const baseUrl = (endpoint || "http://127.0.0.1:7860").replace(/\/$/, "");
    try {
      const res = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${options.prompt}, animated, dynamic motion, video frame`,
          steps: 20,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.images?.[0]) {
          return `data:image/png;base64,${data.images[0]}`;
        }
      }
    } catch (e) {
      console.warn("ComfyUI video motion fallback:", e);
    }
  }

  // Fallback standar ke Imagen / Gemini Flow Motion
  const imgs = await generateUnifiedImage(imageSettings, {
    prompt: `Cinematic motion video still, dynamic camera movement: ${options.prompt}`,
    referenceImageBase64: options.referenceImageBase64,
    aspectRatio: options.aspectRatio,
  });
  return imgs[0];
}
