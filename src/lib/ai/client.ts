import Anthropic from "@anthropic-ai/sdk";
import { getSetting } from "@/lib/repo/settings";
import { recordAiLog } from "@/lib/repo/ai-logs";

export function getAnthropicClientFromSettings(): Anthropic | null {
  const apiKey = getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function getConfiguredAnthropicModel(defaultModel = "claude-sonnet-4-5"): string {
  return getSetting("anthropic_model") || defaultModel;
}

export interface TrackedAnthropicCallParams {
  feature: string;
  model?: string;
  maxTokens: number;
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  toolChoice?: Anthropic.ToolChoice;
  metadata?: Record<string, unknown>;
}

/**
 * Executes an Anthropic Messages API call and records latency, token usage,
 * estimated cost and errors into `ai_logs`.
 */
export async function runTrackedAnthropicCall(
  params: TrackedAnthropicCallParams
): Promise<Anthropic.Message> {
  const client = getAnthropicClientFromSettings();
  if (!client) {
    throw new Error(
      "No hay ninguna clave de API de Anthropic configurada. Añádela en Configuración."
    );
  }
  const model = params.model || getConfiguredAnthropicModel();
  const startedAt = Date.now();

  try {
    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
      ...(params.tools ? { tools: params.tools } : {}),
      ...(params.toolChoice ? { tool_choice: params.toolChoice } : {}),
    });

    recordAiLog({
      feature: params.feature,
      provider: "anthropic",
      model,
      status: "ok",
      latencyMs: Date.now() - startedAt,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      metadata: params.metadata ?? null,
    });

    return response;
  } catch (err) {
    recordAiLog({
      feature: params.feature,
      provider: "anthropic",
      model,
      status: "error",
      latencyMs: Date.now() - startedAt,
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: params.metadata ?? null,
    });
    throw err;
  }
}

export interface StructuredAnthropicParams<T> {
  feature: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Anthropic.Tool.InputSchema;
  validate: (raw: unknown) => T;
  fallbackTextParser?: (text: string) => unknown;
  model?: string;
  maxTokens: number;
  system: string;
  messages: Anthropic.MessageParam[];
  metadata?: Record<string, unknown>;
}

/**
 * Forces structured output via Anthropic tool calling and validates the payload.
 * Both API errors and schema validation failures are logged into `ai_logs`.
 */
export async function callAnthropicStructured<T>(
  params: StructuredAnthropicParams<T>
): Promise<T> {
  const client = getAnthropicClientFromSettings();
  if (!client) {
    throw new Error(
      "No hay ninguna clave de API de Anthropic configurada. Añádela en Configuración para poder leer PDFs o imágenes."
    );
  }
  const model = params.model || getConfiguredAnthropicModel();
  const startedAt = Date.now();
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
      tools: [
        {
          name: params.toolName,
          description: params.toolDescription,
          input_schema: params.inputSchema,
        },
      ],
      tool_choice: { type: "tool", name: params.toolName },
    });

    inputTokens = response.usage?.input_tokens ?? null;
    outputTokens = response.usage?.output_tokens ?? null;

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === params.toolName
    );

    let candidate: unknown = toolBlock?.input;
    if (candidate === undefined && params.fallbackTextParser) {
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        candidate = params.fallbackTextParser(textBlock.text);
      }
    }

    if (candidate === undefined || candidate === null) {
      throw new Error(`La IA no invocó la herramienta estructurada "${params.toolName}".`);
    }

    const validated = params.validate(candidate);

    recordAiLog({
      feature: params.feature,
      provider: "anthropic",
      model,
      status: "ok",
      latencyMs: Date.now() - startedAt,
      inputTokens,
      outputTokens,
      metadata: { ...(params.metadata ?? {}), tool: params.toolName },
    });

    return validated;
  } catch (err) {
    recordAiLog({
      feature: params.feature,
      provider: "anthropic",
      model,
      status: "error",
      latencyMs: Date.now() - startedAt,
      inputTokens,
      outputTokens,
      errorMessage: err instanceof Error ? err.message : String(err),
      metadata: { ...(params.metadata ?? {}), tool: params.toolName },
    });
    throw err;
  }
}
