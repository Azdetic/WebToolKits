// ai-provider.js
// universal AI provider with auto-detection
// supports: OpenAI, Google Gemini, Groq, DeepSeek, and any OpenAI-compatible API

const QUIZ_SYSTEM_PROMPT = `You are a quiz-answering assistant. You will receive a multiple-choice question with options. Your task is to determine the correct answer.

RULES:
1. Analyze the question carefully, including any code or images provided.
2. Return ONLY a JSON object in this exact format: {"answer":"A","explanation":"brief reason"}
3. The "answer" field must be the letter (A, B, C, D, etc.) of the correct choice.
4. Keep explanation concise (1 sentence max).
5. If there's code in an image, analyze it carefully for the output/result.
6. Do NOT include any text outside the JSON object.`;

function formatQuestionPrompt(questionText, choices) {
  let prompt = `Question: ${questionText}\n\nChoices:\n`;
  choices.forEach((c) => {
    prompt += `${c.letter}. ${c.text}\n`;
  });
  prompt += `\nRespond with ONLY a JSON object: {"answer":"LETTER","explanation":"reason"}`;
  return prompt;
}

// ====== AUTO-DETECT PROVIDER FROM API KEY ======
const PROVIDER_REGISTRY = [
  {
    id: "gemini",
    name: "Google Gemini",
    detect: (key) => key.startsWith("AIza"),
    vision: true,
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (free, fast)" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (best)" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    detect: (key) => key.startsWith("gsk_"),
    baseUrl: "https://api.groq.com/openai/v1",
    vision: true,
    defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    models: [
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B (free, multimodal)" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (free, fast)" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    detect: (key) => key.startsWith("sk-") && key.length > 40 && key.length < 60,
    baseUrl: "https://api.deepseek.com",
    vision: false, // DeepSeek does not support vision/image_url
    defaultModel: "deepseek-chat",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    detect: (key) => key.startsWith("sk-"),
    baseUrl: "https://api.openai.com/v1",
    vision: true,
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini (cheap, fast)" },
      { id: "gpt-4o", name: "GPT-4o (best quality)" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano (cheapest)" },
    ],
  },
];

// detect provider from API key
function detectProvider(apiKey) {
  if (!apiKey) return null;
  for (const p of PROVIDER_REGISTRY) {
    if (p.detect(apiKey)) return p;
  }
  return null;
}

// ====== GEMINI API (different format) ======
async function callGemini(apiKey, model, questionText, choices, imageBase64) {
  const modelName = model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const parts = [];
  if (imageBase64) {
    const match = imageBase64.match(/^data:(.+?);base64,(.+)$/);
    if (match) {
      parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
    }
  }
  parts.push({
    text: QUIZ_SYSTEM_PROMPT + "\n\n" + formatQuestionPrompt(questionText, choices),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini error ${response.status}: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return parseAIResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

async function testGemini(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini: ${err.error?.message || response.statusText}`);
  }
  return { success: true, provider: "gemini", message: "Google Gemini API key valid ✅" };
}

// ====== OPENAI-COMPATIBLE API (OpenAI, Groq, DeepSeek, Custom) ======
async function callOpenAICompatible(baseUrl, apiKey, model, questionText, choices, imageBase64, supportsVision = true) {
  const messages = [{ role: "system", content: QUIZ_SYSTEM_PROMPT }];

  const promptText = formatQuestionPrompt(questionText, choices);

  if (imageBase64 && supportsVision) {
    // vision-capable: send image + text as content array
    messages.push({ role: "user", content: [
      { type: "image_url", image_url: { url: imageBase64, detail: "high" } },
      { type: "text", text: promptText },
    ]});
  } else {
    // text-only: send plain string (compatible with all providers)
    let textContent = promptText;
    if (imageBase64 && !supportsVision) {
      textContent = "[Note: This question contains an image that cannot be displayed. Answer based on the text only.]\n\n" + promptText;
    }
    messages.push({ role: "user", content: textContent });
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 200,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return parseAIResponse(data.choices?.[0]?.message?.content || "");
}

async function testOpenAICompatible(baseUrl, apiKey) {
  const url = `${baseUrl.replace(/\/+$/, "")}/models`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API: ${err.error?.message || response.statusText}`);
  }
  return { success: true };
}

// ====== SHARED UTILS ======
function parseAIResponse(text) {
  console.log("🤖 Raw AI response:", text);

  const jsonMatch = text.match(/\{[\s\S]*?"answer"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: (parsed.answer || "").toUpperCase().trim(),
        explanation: parsed.explanation || "",
        raw: text,
      };
    } catch (e) {
      console.log("⚠️ JSON parse failed, trying regex");
    }
  }

  const letterMatch = text.match(/(?:answer|jawaban|correct)[:\s]*([A-D])/i);
  if (letterMatch) {
    return { answer: letterMatch[1].toUpperCase(), explanation: text.substring(0, 100), raw: text };
  }

  const standaloneMatch = text.match(/\b([A-D])\b/);
  if (standaloneMatch) {
    return { answer: standaloneMatch[1].toUpperCase(), explanation: text.substring(0, 100), raw: text };
  }

  return { answer: "", explanation: "Could not parse AI response", raw: text };
}

// ====== MAIN DISPATCHERS ======

// ask AI — auto-detect provider from settings
async function askAI(settings, questionText, choices, imageBase64) {
  const { apiKey, model, customEndpoint } = settings;
  let { provider } = settings;

  // auto-detect if provider not set or is "auto"
  if (!provider || provider === "auto") {
    const detected = detectProvider(apiKey);
    if (detected) {
      provider = detected.id;
      console.log(`🔍 Auto-detected provider: ${detected.name}`);
    } else if (customEndpoint) {
      provider = "custom";
    } else {
      throw new Error("Could not detect AI provider from API key. Please set provider manually or add a custom endpoint.");
    }
  }

  // route to the right API
  if (provider === "gemini") {
    return callGemini(apiKey, model, questionText, choices, imageBase64);
  }

  // everything else is OpenAI-compatible
  const providerInfo = PROVIDER_REGISTRY.find(p => p.id === provider);
  const baseUrl = customEndpoint || providerInfo?.baseUrl || "https://api.openai.com/v1";
  const finalModel = model || providerInfo?.defaultModel || "gpt-4o-mini";
  const supportsVision = providerInfo?.vision !== false;

  return callOpenAICompatible(baseUrl, apiKey, finalModel, questionText, choices, imageBase64, supportsVision);
}

// test connection — auto-detect provider
async function testAIConnection(settings) {
  const { apiKey, customEndpoint } = settings;
  let { provider } = settings;

  if (!provider || provider === "auto") {
    const detected = detectProvider(apiKey);
    if (detected) {
      provider = detected.id;
    } else if (customEndpoint) {
      provider = "custom";
    } else {
      return { success: false, error: "Could not detect provider from API key. Try adding a custom endpoint." };
    }
  }

  const detected = detectProvider(apiKey);
  const providerName = detected?.name || provider;

  try {
    if (provider === "gemini") {
      const result = await testGemini(apiKey);
      return { ...result, provider, providerName };
    }

    const providerInfo = PROVIDER_REGISTRY.find(p => p.id === provider);
    const baseUrl = customEndpoint || providerInfo?.baseUrl || "https://api.openai.com/v1";
    await testOpenAICompatible(baseUrl, apiKey);
    return { success: true, provider, providerName, message: `${providerName} API key valid ✅` };
  } catch (error) {
    return { success: false, provider, error: error.message };
  }
}

// get models for a provider (or auto-detected)
function getModelsForProvider(providerOrKey) {
  // if it looks like an API key, detect the provider
  if (providerOrKey && providerOrKey.length > 10) {
    const detected = detectProvider(providerOrKey);
    if (detected) return { provider: detected.id, name: detected.name, models: detected.models };
  }
  // otherwise look up by id
  const info = PROVIDER_REGISTRY.find(p => p.id === providerOrKey);
  if (info) return { provider: info.id, name: info.name, models: info.models };
  return { provider: "custom", name: "Custom", models: [{ id: "default", name: "Default model" }] };
}

// all models keyed by provider
const AI_MODELS = {};
PROVIDER_REGISTRY.forEach(p => { AI_MODELS[p.id] = p.models; });
AI_MODELS.custom = [{ id: "default", name: "Default model" }];

export { askAI, testAIConnection, AI_MODELS, detectProvider, getModelsForProvider, PROVIDER_REGISTRY };
