import dotenv from "dotenv";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize dotenv and log status for debugging local environments
let dotenvResult = dotenv.config();
console.log("[Dotenv Debug] Current working directory:", process.cwd());
if (dotenvResult.error) {
  const parentEnvPath = path.resolve(process.cwd(), "..", ".env");
  console.log("[Dotenv Debug] .env not found in CWD. Trying parent path:", parentEnvPath);
  dotenvResult = dotenv.config({ path: parentEnvPath });
}

if (dotenvResult.error) {
  console.error("[Dotenv Debug] Failed to load .env file from CWD or parent:", dotenvResult.error.message);
} else if (dotenvResult.parsed) {
  console.log("[Dotenv Debug] Successfully loaded .env file.");
  console.log("[Dotenv Debug] Keys found in .env:", Object.keys(dotenvResult.parsed));
} else {
  console.warn("[Dotenv Debug] .env file was empty or not found.");
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Set up body parsing with high limits for video base64 data
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Google Gen AI client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here" || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY environment variable is missing or has a placeholder value in your workspace secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper to pause execution for a given number of milliseconds
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to wrap any Promise with a timeout limit to prevent hanging network operations
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Format raw errors into friendly, professional troubleshooting suggestions
function formatFriendlyError(error: any): string {
  const message = error?.message || String(error);
  const status = error?.status || error?.code || "";
  const details = error?.details || (error?.error ? JSON.stringify(error.error) : "");
  const errText = `${message} ${status} ${details}`.toLowerCase();

  if (errText.includes("api_key_invalid") || errText.includes("api key not valid") || errText.includes("invalid api key") || errText.includes("unauthorized") || status === 401 || status === 403) {
    return "The Gemini API Key provided is invalid, expired, or unauthorized. Please verify you have provided a correct API key in the workspace settings.";
  }
  if (errText.includes("quota") || errText.includes("limit") || errText.includes("exhausted") || status === 429) {
    return "The Gemini API rate limit has been exceeded (Quota Exceeded). If you are using the Gemini free tier (15 RPM limit), please wait a moment before trying again, or configure a paid key in settings.";
  }
  if (errText.includes("503") || errText.includes("unavailable") || errText.includes("overloaded") || errText.includes("busy")) {
    return "The Gemini AI service is temporarily overloaded or unavailable (503 Service Unavailable). Please retry your request in a few seconds.";
  }
  if (errText.includes("not found") || errText.includes("not_found") || errText.includes("unsupported") || status === 404) {
    return "The requested Gemini model could not be found or is not supported.";
  }
  if (errText.includes("size") || errText.includes("too large") || errText.includes("limit exceeded") || status === 413) {
    return "The uploaded media file is too large or exceeds the model's token capacity. Please choose a smaller file.";
  }
  return message || "An unexpected error occurred during caption generation.";
}

// Helper function to handle transient API errors with exponential backoff and jitter
async function generateWithRetry(ai: any, params: any, retries = 3, baseDelayMs = 1500) {
  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const apiPromise = ai.models.generateContent(params);
      return await withTimeout(apiPromise, 15000, `Gemini API request for model ${params.model} timed out after 15s`);
    } catch (error: any) {
      lastError = error;
      const message = error.message || "";
      const code = error.code || error.status || "";
      const details = error.details || (error.error ? JSON.stringify(error.error) : "");
      const errText = `${message} ${code} ${details} ${String(error)}`.toLowerCase();
      
      const isTransient = 
        errText.includes("demand") || 
        errText.includes("503") || 
        errText.includes("unavailable") || 
        errText.includes("rate") || 
        errText.includes("limit") || 
        errText.includes("overloaded") ||
        errText.includes("resource_exhausted") ||
        errText.includes("exhausted");

      const isModelError =
        errText.includes("not found") ||
        errText.includes("not_found") ||
        errText.includes("unsupported") ||
        code === 404;

      // Do not retry transiently if it is a model not found / unsupported error
      if (isTransient && !isModelError && attempt < retries) {
        // Exponential backoff: 1.5s, 3s, 6s... with random jitter up to 500ms
        const sleepTime = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[Transient Error] Model ${params.model} is experiencing heavy load (Attempt ${attempt}/${retries}). Retrying in ${Math.round(sleepTime)}ms...`);
        await delay(sleepTime);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// Helper function to handle fallback when a model is temporarily unavailable or overloaded
async function generateContentWithFallback(ai: any, params: any) {
  // Ordered list of candidate models to try for general/multimodal tasks
  const candidateModels = [
    params.model,              // Primary model: e.g. gemini-3.5-flash
    "gemini-flash-latest",     // Sturdy standard alias
    "gemini-3.1-flash-lite"    // High-availability lightweight option
  ];

  // De-duplicate in case the params.model is already a candidate model
  const uniqueModels = Array.from(new Set(candidateModels)).filter(Boolean);
  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      console.log(`[API Cascade] Attempting generation with model: ${modelName}...`);
      const modelParams = { ...params, model: modelName };
      
      // Attempt generation with up to 3 exponential backoff retries per model
      return await generateWithRetry(ai, modelParams, 3, 1500);
    } catch (error: any) {
      lastError = error;
      console.warn(`[API Cascade] Model ${modelName} failed or exceeded retry limit. Cascading to next candidate...`);
      
      // Extract details to determine if we should fail fast (e.g., bad parameter / auth)
      const message = error.message || "";
      const code = error.code || error.status || "";
      const details = error.details || (error.error ? JSON.stringify(error.error) : "");
      const errText = `${message} ${code} ${details} ${String(error)}`.toLowerCase();
      
      const isTransient = 
        errText.includes("demand") || 
        errText.includes("503") || 
        errText.includes("unavailable") || 
        errText.includes("rate") || 
        errText.includes("limit") || 
        errText.includes("overloaded") ||
        errText.includes("resource_exhausted") ||
        errText.includes("exhausted");

      const isModelError =
        errText.includes("not found") ||
        errText.includes("not_found") ||
        errText.includes("unsupported") ||
        code === 404;

      const shouldCascade = isTransient || isModelError;

      // If it is a non-transient error (like bad request format, auth issue, etc.), throw immediately
      if (!shouldCascade) {
        throw error;
      }
    }
  }

  // If all Gemini models failed or were exhausted, let's attempt Fireworks as a final savior fallback!
  const fireworksKey = process.env.FIREWORKS_API_KEY;
  if (fireworksKey && fireworksKey !== "your_fireworks_api_key_here" && fireworksKey.trim() !== "") {
    try {
      console.warn("[API Cascade] All Gemini models failed or were exhausted. Initiating ultimate Fireworks fallback...");
      
      // Extract prompt text from params
      let textPrompt = "";
      if (typeof params.contents === "string") {
        textPrompt = params.contents;
      } else if (params.contents && params.contents.parts) {
        const parts = Array.isArray(params.contents.parts) ? params.contents.parts : [params.contents.parts];
        textPrompt = parts.map((p: any) => p.text || "").join("\n").trim();
      } else if (Array.isArray(params.contents)) {
        textPrompt = params.contents.map((c: any) => {
          if (typeof c === "string") return c;
          if (c.parts) {
            return (Array.isArray(c.parts) ? c.parts : [c.parts]).map((p: any) => p.text || "").join("\n");
          }
          return "";
        }).join("\n").trim();
      }

      if (textPrompt) {
        console.log("[API Cascade] Calling generateWithFireworks as final failover...");
        const isJson = params.config?.responseMimeType === "application/json";
        const fireworksResult = await generateWithFireworks(textPrompt, params.config?.temperature || 0.7, isJson);
        
        // Return a mock response object resembling GenerateContentResponse
        return {
          text: fireworksResult
        };
      }
    } catch (fwErr: any) {
      console.error("[API Cascade] Ultimate Fireworks fallback also failed:", fwErr);
    }
  }

  // If all models failed or were exhausted, raise the last encountered error
  throw lastError;
}

// Clean markdown blocks from JSON strings returned by LLMs
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }
  return cleaned;
}

let cachedFireworksModels: string[] | null = null;

async function getAvailableFireworksModels(apiKey: string): Promise<string[]> {
  if (cachedFireworksModels && cachedFireworksModels.length > 0) {
    return cachedFireworksModels;
  }
  try {
    const response = await fetch("https://api.fireworks.ai/inference/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      const models = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => id.includes("instruct") || id.includes("llama") || id.includes("qwen") || id.includes("mixtral"));
      
      if (models.length > 0) {
        cachedFireworksModels = models;
        console.log(`[Fireworks] Successfully pre-fetched and cached ${models.length} compatible models.`);
        return models;
      }
    }
  } catch (err) {
    console.warn("[Fireworks] Failed to pre-fetch available models:", err);
  }
  return [];
}

// Call Fireworks AI utilizing standard OpenAI compatible endpoint natively via fetch
// Implements advanced model cascading to ensure high-availability if specific models are not deployed/accessible on the user's account.
async function generateWithFireworks(promptText: string, temperature = 0.7, jsonFormat = true) {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey || apiKey === "your_fireworks_api_key_here" || apiKey.trim() === "") {
    throw new Error("FIREWORKS_API_KEY environment variable is missing or has a placeholder value.");
  }

  // Pre-fetch actually accessible and active models from the user's API Key to maximize chance of success
  const availableModels = await getAvailableFireworksModels(apiKey);

  // Pre-configured list of robust serverless and custom models in priority order
  const configuredModel = process.env.FIREWORKS_MODEL;
  const candidateModels = [
    configuredModel,
    ...availableModels,
    "accounts/fireworks/models/llama-v3p3-70b-instruct",
    "accounts/fireworks/models/llama-v3p1-70b-instruct",
    "accounts/fireworks/models/llama-v3p1-8b-instruct",
    "accounts/fireworks/models/llama-v3-70b-instruct"
  ].filter(Boolean) as string[];

  // Deduplicate candidates
  const uniqueModels = Array.from(new Set(candidateModels));
  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      console.log(`[Fireworks AI Cascade] Routing generation to model: ${modelName}...`);
      const fetchPromise = fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: promptText
            }
          ],
          temperature: temperature,
          response_format: jsonFormat ? { type: "json_object" } : undefined
        })
      });

      const response = await withTimeout(fetchPromise, 15000, `Fireworks API request for model ${modelName} timed out after 15s`);

      if (!response.ok) {
        const errText = await response.text();
        const status = response.status;
        const err = new Error(`Status ${status} - ${errText}`);
        (err as any).status = status;
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Fireworks returned an empty response.");
      }
      return content;
    } catch (error: any) {
      lastError = error;
      const status = error.status || error.code;
      const errMessage = (error.message || "").toLowerCase();

      // If the error is an authorization error (Status 401), fail fast immediately
      if (status === 401 || errMessage.includes("unauthorized") || errMessage.includes("api key") || errMessage.includes("invalid api key")) {
        console.error(`[Fireworks AI Cascade] Unauthorized access (401) for model ${modelName}. Aborting cascade.`);
        throw new Error("Your Fireworks API key is unauthorized or invalid. Please check your credentials.");
      }

      const is404Or403 = 
        status === 404 || status === 403 ||
        errMessage.includes("404") || 
        errMessage.includes("403") || 
        errMessage.includes("not found") || 
        errMessage.includes("inaccessible") ||
        errMessage.includes("not deployed");

      if (is404Or403) {
        console.warn(`[Fireworks AI Cascade] Model ${modelName} is not deployed or accessible on this account (Error: ${error.message}). Cascading to next candidate...`);
      } else {
        console.warn(`[Fireworks AI Cascade] Request failed for model ${modelName} with message: ${error.message}. Cascading to next candidate...`);
      }
    }
  }

  throw new Error(`All Fireworks candidate models failed or were inaccessible. Last error: ${lastError?.message}`);
}

// Check configuration status of Gemini and Fireworks API Keys safely
app.get("/api/config-status", async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const fireworksKey = process.env.FIREWORKS_API_KEY;

  const isGeminiSet = !!geminiKey && geminiKey !== "your_gemini_api_key_here" && geminiKey.trim() !== "";
  const isFireworksSet = !!fireworksKey && fireworksKey !== "your_fireworks_api_key_here" && fireworksKey.trim() !== "";

  let models: string[] = [];
  if (isFireworksSet) {
    try {
      models = await getAvailableFireworksModels(fireworksKey);
    } catch (err) {
      console.warn("Failed to retrieve fireworks models in config-status route:", err);
    }
  }

  res.json({
    geminiConfigured: isGeminiSet,
    fireworksConfigured: isFireworksSet,
    fireworksModel: process.env.FIREWORKS_MODEL || "accounts/fireworks/models/llama-v3p3-70b-instruct",
    availableModels: models
  });
});

// 1. Generate Captions Route with Advanced Dual-Engine Cascade Architecture
app.post("/api/generate-captions", async (req, res) => {
  try {
    const { description, videoBase64, videoMimeType, temperature, customPrompt, engine = "hybrid" } = req.body;

    let desc = description || "";
    if (!desc && !videoBase64) {
      return res.status(400).json({
        error: "Please provide either a video file, a preset, or a description."
      });
    }

    if (!desc) {
      desc = "A video clip uploaded by the user.";
    }

    const temp = temperature !== undefined ? Number(temperature) : 0.7;

    // --- CASE A: PURE FIREWORKS TEXT PATH ---
    // If the user selects Pure Fireworks, we can process immediately. If video was uploaded,
    // we use the text overlay description as context since Fireworks is text-based.
    if (engine === "fireworks") {
      console.log("[Dual Engine API] Pure Fireworks Selected. Processing text-only translation...");
      const stylingPrompt = `You are an expert comedic video captioner and narrator.
I will provide you with a description of what happens in a video clip. Generate exactly four highly creative, distinct, and engaging captioned narratives in these styles:

1. formal: A clear, objective, professional description of what occurs in the video. Ideal for accessibility, archiving, and indexing.
2. sarcastic: A dry, cynical, humorous, eye-rolling caption that makes fun of the situations, human reactions, or objects shown.
3. humorousTech: An amusing narration geared toward software engineers and tech-savvy people. Fill this with coder memes, stack overflow frustrations, compiler errors, spaghetti code references, or server crashes.
4. humorousNonTech: A relatable, slice-of-life comedic caption targeting a general audience. Use everyday analogies, human awkwardness, dramatic over-exaggeration, or funny comparisons.

Visual Scene Description: "${desc}"
${customPrompt ? `Apply these additional custom guidelines: "${customPrompt}"` : ""}

Make each caption around 2 to 4 sentences long. Ensure they represent their specific style perfectly. Respond with ONLY a valid, parsable JSON object matching this schema:
{
  "formal": "A clear, objective, professional description of what is shown.",
  "sarcastic": "A dry, cynical, eye-rolling caption making fun of what is shown.",
  "humorousTech": "An amusing caption geared toward developers with coder jokes.",
  "humorousNonTech": "An everyday comedy/slice-of-life caption for a general audience."
}`;

      try {
        const fireworksResponse = await generateWithFireworks(stylingPrompt, temp, true);
        const cleaned = cleanJsonResponse(fireworksResponse);
        const result = JSON.parse(cleaned);
        return res.json(result);
      } catch (fireworksErr: any) {
        console.warn("[Dual Engine API] Pure Fireworks path failed. Falling back to Gemini as safety net...", fireworksErr);
        // Do not return, let it flow down to the Case C Gemini fallback!
      }
    }

    // --- CASE B: HYBRID ENGINE (GEMINI VISION + LLAMA STYLING) ---
    if (engine === "hybrid") {
      console.log("[Dual Engine API] Hybrid Cascade Engine selected. Step 1: Querying Gemini for Factual Visual Description...");
      let factualDescription = desc;

      if (videoBase64 && videoMimeType) {
        try {
          const ai = getGeminiClient();
          const parts: any[] = [
            {
              inlineData: {
                data: videoBase64,
                mimeType: videoMimeType
              }
            },
            {
              text: "Analyze this video clip and describe exactly what happens in detail (in 2-3 sentences). Focus strictly on factual events, visual cues, objects, and people. Do not add style or jokes yet."
            }
          ];

          // Use the fast Gemini model with a simple prompt to get the visual description
          const visualResponse: any = await generateContentWithFallback(ai, {
            model: "gemini-3.5-flash",
            contents: { parts }
          });
          
          if (visualResponse.text) {
            factualDescription = visualResponse.text.trim();
            console.log("[Dual Engine API] Gemini Visual Description acquired successfully.");
          }
        } catch (visionErr: any) {
          console.warn("[Dual Engine API] Gemini visual analysis overloaded/failed. Falling back to text overlay input...", visionErr);
          // If Gemini vision fails due to 503, fallback to manual description
          if (!factualDescription) {
            throw new Error(`Gemini is currently busy or overloaded, and no visual description was provided to fallback on: ${visionErr.message}`);
          }
        }
      }

      console.log("[Dual Engine API] Step 2: Querying Fireworks Llama 3.1 70B for fast styling...");
      const stylingPrompt = `You are an expert comedic video captioner and narrator.
Using this factual description of what happens in a video, generate exactly four highly creative, distinct, and engaging captioned narratives in these styles:

1. formal: A clear, objective, professional description of what occurs in the video.
2. sarcastic: A dry, cynical, humorous, eye-rolling caption that makes fun of the situations.
3. humorousTech: An amusing narration geared toward software engineers and tech-savvy people. Use coder memes, stack overflow frustrations, compiler errors, etc.
4. humorousNonTech: A relatable, slice-of-life comedic caption targeting a general audience. Use everyday analogies or dramatic exaggerations.

Factual Scene Description: "${factualDescription}"
${customPrompt ? `Apply these additional custom guidelines: "${customPrompt}"` : ""}

Make each caption around 2 to 4 sentences long. Respond with ONLY a valid, parsable JSON object matching this schema:
{
  "formal": "...",
  "sarcastic": "...",
  "humorousTech": "...",
  "humorousNonTech": "..."
}`;

      try {
        const fireworksResponse = await generateWithFireworks(stylingPrompt, temp, true);
        const cleaned = cleanJsonResponse(fireworksResponse);
        const result = JSON.parse(cleaned);
        return res.json(result);
      } catch (fireworksErr: any) {
        console.warn("[Dual Engine API] Fireworks Styling failed. Falling back to Gemini full-styled pipeline...", fireworksErr);
        // Fall back to Pure Gemini as a final safety net!
      }
    }

    // --- CASE C: PURE GEMINI MULTIMODAL (OR GENERAL FINAL FALLBACK) ---
    console.log("[Dual Engine API] Using Gemini Multimodal (or final fallback) for captioning...");
    const ai = getGeminiClient();
    const parts: any[] = [];

    if (videoBase64 && videoMimeType) {
      parts.push({
        inlineData: {
          data: videoBase64,
          mimeType: videoMimeType
        }
      });
    }

    const promptText = `You are an expert video captioner, visual analyst, and comedic narrator.
Analyze the provided visual contents of the video (and/or visual description) and generate exactly four distinct captioned narratives in these styles:

1. formal: A clear, objective, professional description of what occurs in the video.
2. sarcastic: A dry, cynical, humorous, eye-rolling caption that makes fun of the situations.
3. humorousTech: An amusing narration geared toward software engineers. Fill this with coder memes, spaghetti code references, etc.
4. humorousNonTech: A relatable, slice-of-life comedic caption targeting a general audience.

${desc ? `Visual Content Description: ${desc}` : "Analyze the uploaded video file directly."}
${customPrompt ? `Apply these additional custom guidelines: "${customPrompt}"` : ""}

Make each caption around 2 to 4 sentences long. Respond in a valid JSON structure matching this schema:
{
  "formal": "...",
  "sarcastic": "...",
  "humorousTech": "...",
  "humorousNonTech": "..."
}`;

    parts.push({ text: promptText });

    const response: any = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: { parts: parts },
      config: {
        temperature: temp,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formal: { type: Type.STRING },
            sarcastic: { type: Type.STRING },
            humorousTech: { type: Type.STRING },
            humorousNonTech: { type: Type.STRING }
          },
          required: ["formal", "sarcastic", "humorousTech", "humorousNonTech"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini.");
    }

    const result = JSON.parse(responseText.trim());
    res.json(result);

  } catch (err: any) {
    console.error("Caption generation failed:", err);
    res.status(500).json({
      error: "Caption generation failed",
      details: formatFriendlyError(err)
    });
  }
});

// 2. Generate Text-to-Speech Route
const ttsCache = new Map<string, string>();

app.post("/api/generate-tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for Text-to-Speech." });
    }

    // Map voice name to valid Gemini TTS voices: Puck, Charon, Kore, Fenrir, Zephyr
    let voiceName = "Kore";
    if (voice) {
      const v = voice.toLowerCase();
      if (v.includes("puck")) voiceName = "Puck";
      else if (v.includes("charon")) voiceName = "Charon";
      else if (v.includes("fenrir")) voiceName = "Fenrir";
      else if (v.includes("zephyr")) voiceName = "Zephyr";
    }

    // Check Cache first for ultra-low latency playback
    const cacheKey = `${voiceName}_${text.trim()}`;
    if (ttsCache.has(cacheKey)) {
      console.log(`[TTS Cache Hit] Returning cached audio instantly for key: ${voiceName}`);
      return res.json({ audioBase64: ttsCache.get(cacheKey) });
    }

    console.log(`Generating TTS with Gemini using voice: ${voiceName}...`);
    const ai = getGeminiClient();
    let response: any;

    try {
      response = await generateWithRetry(ai, {
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      }, 3, 1000);
    } catch (ttsErr: any) {
      console.warn(`[TTS Voice Error] TTS failed for voice ${voiceName}. Retrying with default voice 'Kore'...`, ttsErr);
      // Fallback to default Kore voice
      voiceName = "Kore";
      response = await generateWithRetry(ai, {
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" }
            }
          }
        }
      }, 3, 1000);
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini TTS model.");
    }

    // Save to Cache
    ttsCache.set(cacheKey, base64Audio);

    res.json({ audioBase64: base64Audio });

  } catch (err: any) {
    console.error("TTS generation failed:", err);
    res.status(500).json({
      error: "TTS generation failed",
      details: formatFriendlyError(err)
    });
  }
});

// 3. Refine Submission Route
app.post("/api/refine-submission", async (req, res) => {
  try {
    const { mode, projectData } = req.body;
    if (!mode || !projectData) {
      return res.status(400).json({ error: "Mode and projectData are required." });
    }

    let promptText = "";
    if (mode === "refine-description") {
      promptText = `Review and refine the following draft descriptions for a hackathon project.
Title: ${projectData.title}
Short Description (draft): ${projectData.shortDescription}
Long Description (draft): ${projectData.longDescription}
Technology Tags: ${projectData.tags}

Task: Output a highly polished, professional, and exciting:
1. Short Description (max 150 characters, punched with high-impact value proposition)
2. Long Description (comprehensive, explaining the problem solved, unique video analysis pipeline, and user benefit)
3. Suggested Tags (add any missing modern technology tags related to this)

Respond in a clear, clean Markdown format with headers.`;
    } else if (mode === "readme") {
      promptText = `Generate a stunning, professional, and comprehensive README.md file for the following hackathon submission.
Title: ${projectData.title}
Short Description: ${projectData.shortDescription}
Long Description: ${projectData.longDescription}
Technology Tags: ${projectData.tags}
GitHub Repository: ${projectData.githubUrl || "To be configured"}
Live Application URL: ${projectData.appUrl || "To be configured"}

Your generated README.md MUST include:
- A stylish project header and logo placeholder
- Key Features (emphasizing the four distinct captioning styles: formal, sarcastic, humorous-tech, and humorous-non-tech)
- Architecture overview (Node.js Express backend using Google Gemini API, and Vite React 19 SPA frontend with Tailwind CSS)
- Local Setup & Installation Instructions (clear step-by-step commands for setting up, installing node packages, and npm run dev)
- Docker Containerization instructions (how to build and run the Docker image safely, in keeping with lablab.ai containerized requirements)
- Usage Walkthrough
- Submission Details & Credits

Make it highly organized, utilizing clean Markdown tables, code blocks, and visual dividers.`;
    } else if (mode === "docker") {
      promptText = `Create a production-ready Dockerfile and docker-compose.yml configuration for containerizing this Node.js Express + Vite React full-stack application.
Project Title: ${projectData.title}
Server framework: Node.js Express (TypeScript)
Client framework: Vite React 19 SPA (served statically in production or compiled to dist/)
Start command: npm run start
Internal port: 3000

Task:
1. Provide a step-by-step explained Dockerfile using a multi-stage build (build stage for React and Express server, and production stage running node) to keep the image lightweight.
2. Provide a docker-compose.yml configuration that sets up the port mapping 3000:3000 and references the environment variable GEMINI_API_KEY.
3. Provide simple instructions on how to build and run the container locally.

Output the code blocks clearly.`;
    } else {
      return res.status(400).json({ error: "Invalid refinement mode specified." });
    }

    console.log(`Refining submission (${mode}) with Gemini...`);
    const ai = getGeminiClient();
    const response: any = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: promptText
    });

    const refinedText = response.text || "";
    res.json({ refinedText });

  } catch (err: any) {
    console.error("Submission refinement failed:", err);
    res.status(500).json({
      error: "Submission refinement failed",
      details: formatFriendlyError(err)
    });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});



// Vite middleware and static asset serving
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
    console.log(`Express server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
