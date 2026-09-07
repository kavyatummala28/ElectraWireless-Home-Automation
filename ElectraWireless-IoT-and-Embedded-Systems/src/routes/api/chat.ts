import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createOpenAIProvider } from "@/lib/ai-gateway.server";

type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatBody = {
  messages?: ChatTurn[];
  homeSummary?: string;
};

const Result = z.object({
  reply: z
    .string()
    .describe(
      "A helpful, warm, conversational reply to the user. Answer ANY question naturally, not just smart-home topics.",
    ),
  command: z
    .string()
    .nullable()
    .describe(
      "If, and only if, the user wants to control the smart home, output a short plain control phrase. Examples: 'turn off all lights', 'turn on all the lights', 'turn off the lights in the kitchen', 'turn on the bedroom fan', 'turn off the tv plug', 'set bedroom ac to 23 degrees', 'turn everything off', 'activate night mode', 'activate energy saver mode', 'activate away mode'. For any non-control message (general questions, chit-chat, advice), set this to null.",
    ),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatBody;
        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) {
          throw new Error("Missing OPENAI_API_KEY");
        }

        const baseURL = process.env.OPENAI_BASE_URL;
        const provider = createOpenAIProvider(key, baseURL);
        const model = provider("gpt-4o-mini");

        const system = [
          "You are ELLY, a friendly, intelligent AI assistant inside the ElectraWireless smart home app.",
          "You are a general-purpose assistant: answer ANY question the user asks, on any topic, helpfully and warmly. Do not refuse or say you can only do smart-home tasks.",
          "On top of conversation, you can also control the home. When the user clearly asks to change a device or mode, fill the command field with a short control phrase; otherwise leave it null and just reply.",
          "You can control individual devices, rooms, lights, fans, plugs, the TV, and the AC, as well as turn everything on or off, and activate night, away, or energy saver modes.",
          "Keep replies concise but complete. Never use the em dash character. Use commas, periods, or short sentences instead.",
          "CRITICAL: You MUST respond with ONLY a valid JSON object containing exactly two keys: 'reply' (your conversational response) and 'command' (the control phrase or null). Do NOT wrap the JSON in markdown code blocks, do not include any prefix or suffix text. Just the raw JSON object.",
          body.homeSummary ? `Current home state: ${body.homeSummary}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const convo = messages
          .map((m) => `${m.role === "user" ? "User" : "ELLY"}: ${m.content}`)
          .join("\n");

        try {
          const { text } = await generateText({
            model,
            system,
            prompt: `${convo}\n\nReply as ELLY. Output ONLY raw JSON.`,
          });
          
          let parsed;
          try {
            parsed = JSON.parse(text.trim());
          } catch(e) {
            const match = text.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : { reply: text, command: null };
          }

          const clean = (s: string) => s.replace(/\s*\u2014\s*/g, ", ").replace(/\u2014/g, " ");
          return Response.json({
            reply: clean(parsed.reply || "Done."),
            command: parsed.command ? clean(parsed.command) : null,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          const status = /rate|429/i.test(message) ? 429 : /402|credit/i.test(message) ? 402 : 500;
          return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
