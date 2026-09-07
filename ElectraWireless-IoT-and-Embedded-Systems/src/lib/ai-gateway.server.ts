import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createOpenAIProvider(
  apiKey: string,
  baseURL: string = "http://localhost:11434/v1",
) {
  return createOpenAICompatible({
    name: "openai",
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
