import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment.");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

// Runs a chat completion and returns the raw text content.
export async function chatText(args: {
  system: string;
  user: string;
  temperature?: number;
  responseJson?: boolean;
}): Promise<string> {
  const client = getOpenAI();
  const model = getModel();
  const resp = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.2,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: args.responseJson ? { type: "json_object" } : undefined,
  });
  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI.");
  return content;
}
