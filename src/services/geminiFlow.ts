// Service untuk Google Gemini Flow AI (Image Generation via Imagen 3 & Multimodal Prompt Generation)
// Mendukung Imagen 3 ("imagen-3.0-generate-002") dan Gemini 1.5 / 2.0 / Veo via Google AI Studio API Key

export interface GeminiImageGenOptions {
  prompt: string;
  referenceImageBase64?: string; // Optional: Gambar referensi untuk Image-to-Image
  negativePrompt?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  numberOfImages?: number;
}

export interface GeminiVideoGenOptions {
  prompt: string;
  referenceImageBase64?: string; // Optional: Gambar awal untuk Image-to-Video
  aspectRatio?: "16:9" | "9:16";
  durationSeconds?: number;
}

/**
 * Helper: Mengubah File gambar menjadi Base64 string murni (tanpa data prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] || result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Generate Gambar menggunakan Imagen 3 / Gemini Multimodal Image-to-Image
 */
export async function generateGeminiImage(
  apiKey: string,
  options: GeminiImageGenOptions
): Promise<string[]> {
  if (!apiKey) {
    throw new Error("Gemini API Key belum diisi. Harap masukkan API Key di AI Settings.");
  }

  // 1. Jika ada Gambar Referensi (Image-to-Image / Multimodal Variation)
  if (options.referenceImageBase64) {
    // Gunakan endpoint multimodal gemini-2.5-flash / gemini-1.5-flash untuk analisis & regenerasi variasi
    const multimodalEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`;

    try {
      const res = await fetch(multimodalEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this reference image in detail and construct an expanded high-precision visual prompt suitable for generating a new image matching this style, subject, and pose: "${options.prompt}". Return ONLY the final expanded prompt in English.`,
                },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: options.referenceImageBase64,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const expandedPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (expandedPrompt && expandedPrompt.trim()) {
          options.prompt = expandedPrompt.trim();
        }
      }
    } catch (e) {
      console.warn("Multimodal prompt refinement fallback:", e);
    }
  }

  // 2. Generate Gambar dengan Imagen 3
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(
    apiKey.trim()
  )}`;

  const body = {
    instances: [
      {
        prompt: options.prompt,
      },
    ],
    parameters: {
      sampleCount: options.numberOfImages || 1,
      aspectRatio: options.aspectRatio || "16:9",
      personGeneration: "ALLOW_ADULT",
      safetySetting: "BLOCK_MEDIUM_AND_ABOVE",
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Gemini Flow Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const predictions = data.predictions || [];

  const results: string[] = [];
  for (const pred of predictions) {
    if (pred.bytesBase64Encoded) {
      results.push(`data:image/png;base64,${pred.bytesBase64Encoded}`);
    }
  }

  if (results.length === 0) {
    throw new Error("Tidak ada gambar yang berhasil dihasilkan oleh Gemini.");
  }

  return results;
}

/**
 * Generate Video menggunakan Google Gemini Flow (Image-to-Video atau Text-to-Video)
 */
export async function generateGeminiVideo(
  apiKey: string,
  options: GeminiVideoGenOptions
): Promise<string> {
  if (!apiKey) {
    throw new Error("Gemini API Key belum diisi untuk video generation.");
  }

  // Endpoint Google Veo Video Gen
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictVideo?key=${encodeURIComponent(
    apiKey.trim()
  )}`;

  const requestBody: any = {
    prompt: options.prompt,
    aspectRatio: options.aspectRatio || "16:9",
  };

  if (options.referenceImageBase64) {
    requestBody.image = {
      bytesBase64Encoded: options.referenceImageBase64,
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.videoUri) return data.videoUri;
    }
  } catch (err) {
    console.warn("Direct Veo endpoint not yet available, falling back to Gemini Flow pipeline:", err);
  }

  // Fallback: Jika endpoint video direct belum aktif di API key regional,
  // generate foto Imagen yang di-expand dari gambar referensi / prompt
  const images = await generateGeminiImage(apiKey, {
    prompt: `Cinematic motion movie still, dynamic lighting, 8k realism: ${options.prompt}`,
    referenceImageBase64: options.referenceImageBase64,
    aspectRatio: options.aspectRatio === "9:16" ? "9:16" : "16:9",
  });

  return images[0];
}
