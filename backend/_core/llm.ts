export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = { type: "text"; text: string };
export type ImageContent = { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };
export type FileContent = { type: "file_url"; file_url: { url: string; mime_type?: string } };
export type MessageContent = string | TextContent | ImageContent | FileContent;
export type Message = { role: Role; content: MessageContent | MessageContent[]; name?: string; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } };
export type ToolChoice = "none" | "auto" | "required" | { name: string } | { type: "function"; function: { name: string } };
export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat = { type: "text" } | { type: "json_object" } | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: Role; content: string | Array<TextContent | ImageContent | FileContent> | null; tool_calls?: ToolCall[] };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export const CURRENT_GEMINI_MODEL = "gemini-3.7-flash";
const DEPRECATED_GEMINI_MODELS = new Set(["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-2.0-flash-001"]);
export function resolveGeminiModel(requested?: string | null) {
  const model = requested?.trim();
  return model && !DEPRECATED_GEMINI_MODELS.has(model) ? model : CURRENT_GEMINI_MODEL;
}
const DEFAULT_MODEL = resolveGeminiModel(process.env.GEMINI_MODEL);

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function geminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(geminiSchema);
  if (!schema || typeof schema !== "object") return schema;
  const source = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === "type" && typeof value === "string") result.type = value.toUpperCase();
    else if (key === "properties" && value && typeof value === "object") {
      result.properties = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, child]) => [name, geminiSchema(child)]));
    } else if (key === "items" || key === "additionalProperties") result[key] = geminiSchema(value);
    else if (key !== "name" && key !== "strict" && key !== "$schema") result[key] = geminiSchema(value);
  }
  return result;
}

function dataUrlToInlineData(url: string) {
  const match = url.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) throw new Error("Gemini image input must be a base64 data URL");
  return { inlineData: { mimeType: match[1], data: match[2] } } as const;
}

function toGeminiPart(content: MessageContent): GeminiPart {
  if (typeof content === "string") return { text: content };
  if (content.type === "text") return { text: content.text };
  if (content.type === "image_url") return dataUrlToInlineData(content.image_url.url);
  throw new Error("Gemini does not support file inputs in this integration");
}

function toGeminiMessages(messages: Message[]) {
  const system = messages.filter(message => message.role === "system").map(message => message.content).flat().map(toGeminiPart);
  const contents: GeminiContent[] = messages.filter(message => message.role !== "system").map(message => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: (Array.isArray(message.content) ? message.content : [message.content]).map(toGeminiPart),
  }));
  return { systemInstruction: system.length ? { parts: system } : undefined, contents };
}

function geminiResponseToInvokeResult(body: any, model: string): InvokeResult {
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((part: any) => typeof part?.text === "string").map((part: any) => part.text).join("");
  const usage = body?.usageMetadata;
  return {
    id: body?.responseId ?? `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: "assistant", content: text || null }, finish_reason: body?.candidates?.[0]?.finishReason ?? null }],
    ...(usage ? { usage: { prompt_tokens: usage.promptTokenCount ?? 0, completion_tokens: usage.candidatesTokenCount ?? 0, total_tokens: usage.totalTokenCount ?? 0 } } : {}),
  };
}

async function invokeGemini(params: InvokeParams): Promise<InvokeResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model = resolveGeminiModel(params.model ?? DEFAULT_MODEL);
  const responseFormat = params.response_format ?? params.responseFormat ?? (params.output_schema || params.outputSchema ? {
    type: "json_schema" as const,
    json_schema: params.output_schema ?? params.outputSchema!,
  } : undefined);
  const generationConfig: Record<string, unknown> = {};
  if (params.max_tokens ?? params.maxTokens) generationConfig.maxOutputTokens = params.max_tokens ?? params.maxTokens;
  if (responseFormat?.type === "json_object" || responseFormat?.type === "json_schema") {
    generationConfig.responseMimeType = "application/json";
    if (responseFormat.type === "json_schema") generationConfig.responseSchema = geminiSchema(responseFormat.json_schema.schema);
  }
  const { systemInstruction, contents } = toGeminiMessages(params.messages);
  const payload = { ...(systemInstruction ? { systemInstruction } : {}), contents, ...(Object.keys(generationConfig).length ? { generationConfig } : {}) };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const bodyText = await response.text();
  let body: any;
  try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = { error: { message: bodyText } }; }
  if (!response.ok) {
    const detail = body?.error?.message ?? response.statusText;
    throw new Error(`Gemini request failed (${response.status}): ${detail}`);
  }
  return geminiResponseToInvokeResult(body, model);
}

function manusEndpoint() {
  const base = process.env.BUILT_IN_FORGE_API_URL;
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!base || !key) throw new Error("Manus built-in LLM service is not configured");
  return { url: `${base.replace(/\/$/, "")}/v1/chat/completions`, key };
}

function normalizeParams(params: InvokeParams) {
  const responseFormat = params.response_format ?? params.responseFormat ?? (params.output_schema || params.outputSchema ? {
    type: "json_schema" as const,
    json_schema: params.output_schema ?? params.outputSchema!,
  } : undefined);
  return {
    model: resolveGeminiModel(params.model),
    messages: params.messages,
    ...(params.tools ? { tools: params.tools } : {}),
    ...(params.tool_choice || params.toolChoice ? { tool_choice: params.tool_choice ?? params.toolChoice } : {}),
    ...(params.max_tokens || params.maxTokens ? { max_tokens: params.max_tokens ?? params.maxTokens } : {}),
    ...(responseFormat ? { response_format: responseFormat } : {}),
    ...(params.thinking ? { thinking: params.thinking } : {}),
    ...(params.reasoning ? { reasoning: params.reasoning } : {}),
  };
}

async function manusRequest(path: string, init?: RequestInit) {
  const { url, key } = manusEndpoint();
  const target = path ? `${url.replace(/\/chat\/completions$/, "")}${path}` : url;
  const response = await fetch(target, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.text();
  let parsed: unknown;
  try { parsed = body ? JSON.parse(body) : {}; } catch { parsed = { error: body }; }
  if (!response.ok) {
    const detail = typeof parsed === "object" && parsed && "error" in parsed ? String((parsed as { error: unknown }).error) : response.statusText;
    throw new Error(`Built-in LLM request failed (${response.status}): ${detail}`);
  }
  return parsed as InvokeResult;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  // Gemini is the primary provider when a key is configured. Manus Forge remains a
  // local/managed-preview fallback so development does not fail before the key is added.
  return process.env.GEMINI_API_KEY ? invokeGemini(params) : manusRequest("", { method: "POST", body: JSON.stringify(normalizeParams(params)) });
}

export type ModelInfo = { id: string; object: string; created: number; owned_by: string; pricing?: unknown; capabilities?: unknown };
export type ModelsResponse = { object: string; data: ModelInfo[] };

export async function listLLMModels(): Promise<ModelsResponse> {
  return manusRequest("/models", { method: "GET" }) as unknown as Promise<ModelsResponse>;
}
