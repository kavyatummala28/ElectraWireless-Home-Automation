import { useState } from "react";
import { Mic, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHome } from "@/lib/home/store";

const samples = [
  "Turn off all lights",
  "Set bedroom AC to 23 degrees",
  "Activate energy saver mode",
  "Activate night mode",
];

export function VoiceBar() {
  const { runVoiceCommand } = useHome();
  const [text, setText] = useState("");

  const send = (cmd: string) => {
    runVoiceCommand(cmd);
    setText("");
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Mic className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Ask ELLY… e.g. "Set bedroom AC to 23 degrees"'
            className="pl-9"
          />
        </div>
        <Button type="submit" size="icon" aria-label="Send command">
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
