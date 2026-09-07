import type { HomeState } from "./types";
import { CreateMLCEngine } from "@mlc-ai/web-llm";

let conversationHistory: { role: "user" | "elly" | "system", text: string, intent?: string }[] = [];
let mlcEngine: any = null;

export async function initWebLLMEngine(onProgress?: (progress: any) => void) {
  if (!mlcEngine) {
    mlcEngine = await CreateMLCEngine("TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", { 
      initProgressCallback: onProgress 
    });
  }
  return mlcEngine;
}

export async function handleLocalChat(
  text: string, 
  state: HomeState, 
  dispatch: any, 
  runVoiceCommand: (t: string, opts?: { silent?: boolean }) => boolean
) {
  const t = text.trim();
  if (!t) return { reply: "Yes?", emotion: "calm" };

  conversationHistory.push({ role: "user", text: t, intent: "local_llm" });
  if (conversationHistory.length > 20) conversationHistory.shift();

  const rep = (msg: string, emotion: string = 'normal') => {
    conversationHistory.push({ role: "elly", text: msg, intent: "fallback" });
    return { reply: msg, emotion };
  };

  if (mlcEngine) {
    try {
      const onDevices = state.devices.filter(d => d.on);
      const totalWatts = onDevices.reduce((acc, d) => acc + d.watts, 0);
      const onDevicesList = onDevices.length > 0 ? onDevices.map(d => d.name).join(", ") : "None";
      const timeStr = new Date().toLocaleTimeString();

      const systemPrompt = `You are ELLY, a highly advanced, futuristic smart home AI assistant. Keep answers brief and conversational. Do not use emojis.
CURRENT STATE: Time is ${timeStr}. House drawing ${totalWatts}W. Active devices: ${onDevicesList}.
CRITICAL: To physically alter the smart home, you MUST output a command block like [CMD: turn off the lights]. Multiple commands are allowed.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.filter(m => m.role === "user" || m.role === "elly").map(m => ({
          role: m.role === "elly" ? "assistant" : m.role,
          content: m.text
        }))
      ];

      const reply = await mlcEngine.chat.completions.create({
        messages,
        temperature: 0.7,
      });

      let answer = reply.choices[0].message.content;

      if (answer) {
        // Parse commands
        let cmdMatches;
        const cmdRegex = /\[CMD:\s*(.*?)\]/ig;
        while ((cmdMatches = cmdRegex.exec(answer)) !== null) {
          if (cmdMatches[1]) {
            runVoiceCommand(cmdMatches[1].trim(), { silent: true });
          }
        }
        answer = answer.replace(/\[CMD:\s*(.*?)\]/ig, '');

        const cleanAnswer = answer.replace(/[*#_]/g, '').trim();
        conversationHistory.push({ role: "elly", text: cleanAnswer, intent: "local_llm" });
        return { reply: cleanAnswer, emotion: 'normal' };
      }
    } catch (err) {
      console.error("Local LLM failed:", err);
    }
  }

  // Basic regex fallback if WebLLM hasn't loaded or crashes
  const acted = runVoiceCommand(t.toLowerCase(), { silent: true });
  if (acted) {
    if (t.match(/\b(night|sleep)\b/i)) return rep("Night mode is on.", 'calm');
    if (t.match(/\b(away|leaving)\b/i)) return rep("House secured.");
    if (t.match(/\b(eco|saver)\b/i)) return rep("Power saving activated.");
    if (t.match(/\b(emergency|red alert)\b/i)) return rep("Emergency mode active!", 'urgent');
    if (t.match(/\b(off)\b/i)) return rep("Powered down.");
    if (t.match(/\b(on)\b/i)) return rep("Powered up.");
    if (t.match(/\b(ac|air con)\b/i)) return rep("Climate adjusted.");
    if (t.match(/\b(light|lights|lamp)\b/i)) return rep("Lights updated.");
    if (t.match(/\b(fan)\b/i)) return rep("Fan adjusted.");
    if (t.match(/\b(tv|television)\b/i)) return rep("TV toggled.");
    if (t.match(/\b(plug|socket)\b/i)) return rep("Plug toggled.");
    return rep("Executed.");
  }

  if (t.match(/\b(status|how is the house)\b/i)) {
    const onDevices = state.devices.filter(d => d.on);
    return rep(`There are ${onDevices.length} devices running right now.`);
  }

  if (t.match(/\b(time)\b/i)) {
    return rep(`It is currently ${new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}`);
  }

  return rep("I'm running in basic mode because the local AI model is still loading or failed. Try a direct command like 'turn on the lights'.", 'sad');
}
