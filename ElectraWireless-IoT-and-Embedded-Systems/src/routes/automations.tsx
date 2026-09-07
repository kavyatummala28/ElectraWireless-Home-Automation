import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Sparkles, Clock, GitBranch, Radar, Zap, Footprints } from "lucide-react";
import { SciFiCard } from "@/components/ui/sci-fi-card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useHome } from "@/lib/home/store";
import type { Automation } from "@/lib/home/types";

export const Route = createFileRoute("/automations")({
  head: () => ({
    meta: [
      { title: "Automations, ELLY Home Automation" },
      {
        name: "description",
        content: "Time, condition, sensor, energy and presence-based automation rules.",
      },
    ],
  }),
  component: AutomationsPage,
});

const typeIcon = {
  time: Clock,
  condition: GitBranch,
  sensor: Radar,
  energy: Zap,
  presence: Footprints,
};

function AutomationsPage() {
  const { state, dispatch, canEdit } = useHome();
  const [suggestionOpen, setSuggestionOpen] = useState(true);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Automations</h1>
        </div>
        {canEdit && <NewAutomation />}
      </div>

      {/* ELLY suggestion */}
      {suggestionOpen && (
        <SciFiCard color="fuchsia" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-accent text-accent-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="flex-1 text-sm">
            <span className="font-semibold">High usage</span> 2 to 4 PM daily. Auto-optimize?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!canEdit}
              onClick={() => {
                dispatch({
                  type: "ADD_AUTOMATION",
                  automation: {
                    id: Math.random().toString(36).slice(2),
                    name: "Afternoon Optimization",
                    type: "energy",
                    description: "2 to 4 PM, reduce non-critical loads automatically.",
                    enabled: true,
                  },
                });
                setSuggestionOpen(false);
                toast.success("Suggestion approved");
              }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSuggestionOpen(false);
                toast("Suggestion dismissed");
              }}
            >
              Dismiss
            </Button>
          </div>
        </SciFiCard>
      )}

      <div className="space-y-3">
        {state.automations.map((a) => {
          const Icon = typeIcon[a.type];
          return (
            <SciFiCard key={a.id} color="purple" className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-secondary text-secondary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.name}</p>
                  <Badge variant="secondary" className="capitalize">
                    {a.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{a.description}</p>
              </div>
              <Switch
                checked={a.enabled}
                disabled={!canEdit}
                onCheckedChange={() => dispatch({ type: "TOGGLE_AUTOMATION", id: a.id })}
              />
            </SciFiCard>
          );
        })}
      </div>
    </div>
  );
}

function NewAutomation() {
  const { dispatch } = useHome();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Automation["type"]>("time");
  const [description, setDescription] = useState("");

  const create = () => {
    if (!name.trim()) return toast.error("Give your automation a name");
    dispatch({
      type: "ADD_AUTOMATION",
      automation: {
        id: Math.random().toString(36).slice(2),
        name,
        type,
        description: description || "Custom rule.",
        enabled: true,
      },
    });
    toast.success("Automation created");
    setName("");
    setDescription("");
    setType("time");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New Rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Automation</DialogTitle>
          <DialogDescription>Set a rule. ELLY runs and logs it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Routine"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger type</Label>
            <Select value={type} onValueChange={(v) => setType(v as Automation["type"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time-based</SelectItem>
                <SelectItem value="condition">Condition-based</SelectItem>
                <SelectItem value="sensor">Sensor-triggered</SelectItem>
                <SelectItem value="energy">Energy threshold</SelectItem>
                <SelectItem value="presence">Presence detection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="If … then …"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
