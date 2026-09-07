import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Wifi, Activity, Map as MapIcon, X, ChevronRight } from "lucide-react";
import { useHome } from "@/lib/home/store";
import { deviceIcon } from "@/components/home/device-icons";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  const { state, toggleDevice, canEdit } = useHome();
  const [viewMode, setViewMode] = useState<"control" | "network">("control");
  const [zoomedRoomId, setZoomedRoomId] = useState<string | null>(null);

  // Contiguous real estate flat layout with dimensions and furniture types
  const roomsLayout: Record<string, { top: string, left: string, width: string, height: string, area: string, dimW: string, dimH: string, doors: { top?: string, left?: string, bottom?: string, right?: string, type: string, label?: string }[], furn: string }> = {
    "living-room": { top: "10%", left: "10%", width: "50%", height: "45%", area: "450 sq.ft.", dimW: "24' 0\"", dimH: "20' 6\"", 
      doors: [
        { top: "100%", left: "70%", type: "bottom" }, // Door to Bedroom
        { top: "0%", left: "20%", type: "top", label: "MAIN ENTRY" } // External door
      ], 
      furn: "sofa" },
    "kitchen": { top: "10%", left: "60%", width: "30%", height: "45%", area: "210 sq.ft.", dimW: "12' 6\"", dimH: "20' 6\"", 
      doors: [
        { top: "60%", left: "0%", type: "left" } // Door to Living Room
      ], 
      furn: "kitchen" },
    "office": { top: "55%", left: "10%", width: "35%", height: "35%", area: "180 sq.ft.", dimW: "16' 0\"", dimH: "14' 0\"", 
      doors: [
        { top: "0%", left: "50%", type: "top" } // Door to Living Room
      ], 
      furn: "desk" },
    "bedroom": { top: "55%", left: "45%", width: "45%", height: "35%", area: "320 sq.ft.", dimW: "20' 6\"", dimH: "14' 0\"", 
      doors: [], // Accessed from Living Room door above
      furn: "bed" }
  };

  // Calculate transform origin for the zoomed room
  let transformOrigin = "50% 50%";
  if (zoomedRoomId && roomsLayout[zoomedRoomId as keyof typeof roomsLayout]) {
    const layout = roomsLayout[zoomedRoomId as keyof typeof roomsLayout];
    const x = parseFloat(layout.left) + parseFloat(layout.width) / 2;
    const y = parseFloat(layout.top) + parseFloat(layout.height) / 2;
    transformOrigin = `${x}% ${y}%`;
  }

  // Helper to draw furniture
  const renderFurniture = (type: string) => {
    switch(type) {
      case 'sofa': return (
        <div className="absolute top-[15%] right-[15%] w-[45%] h-[20%] border-[2px] border-border/40 rounded-sm pointer-events-none flex flex-col justify-between overflow-hidden">
           <div className="h-[25%] border-b-[2px] border-border/40"></div>
           <div className="flex-1 flex">
             <div className="flex-1 border-r-[2px] border-border/40"></div>
             <div className="flex-1 border-r-[2px] border-border/40"></div>
             <div className="flex-1"></div>
           </div>
           {/* TV Unit opposite */}
           <div className="absolute top-[180%] left-[20%] w-[60%] h-[15%] border-[2px] border-border/40 rounded-sm flex items-center justify-center">
             <div className="w-[80%] h-[2px] bg-white/10"></div>
           </div>
        </div>
      );
      case 'kitchen': return (
        <>
          <div className="absolute top-0 right-0 w-[40%] h-[100%] border-l-[2px] border-border/40 pointer-events-none bg-white/[0.02]">
             {/* Sink */}
             <div className="absolute top-[30%] left-[50%] w-[16px] h-[16px] rounded-full border-[2px] border-border/40 -translate-x-1/2"></div>
             {/* Hob */}
             <div className="absolute top-[60%] left-[50%] w-[20px] h-[30px] border-[2px] border-border/40 -translate-x-1/2 grid grid-cols-2 grid-rows-2 gap-[2px] p-[2px]">
               <div className="bg-white/10 rounded-full"></div><div className="bg-white/10 rounded-full"></div>
               <div className="bg-white/10 rounded-full"></div><div className="bg-white/10 rounded-full"></div>
             </div>
          </div>
          <div className="absolute top-[10%] left-[10%] w-[35%] h-[30%] border-[2px] border-border/40 rounded-sm"></div>
        </>
      );
      case 'desk': return (
        <div className="absolute top-[15%] right-[15%] w-[45%] h-[25%] border-[2px] border-border/40 pointer-events-none">
           <div className="absolute top-[110%] left-[50%] -translate-x-1/2 w-[35%] h-[45%] border-[2px] border-border/40 rounded-full"></div>
        </div>
      );
      case 'bed': return (
        <div className="absolute top-[15%] left-[15%] w-[35%] h-[55%] border-[2px] border-border/40 rounded-md pointer-events-none overflow-hidden">
           {/* Pillows */}
           <div className="absolute top-1 left-[10%] w-[35%] h-[15%] border-[2px] border-border/40 rounded-sm"></div>
           <div className="absolute top-1 right-[10%] w-[35%] h-[15%] border-[2px] border-border/40 rounded-sm"></div>
           {/* Blanket */}
           <div className="absolute bottom-[25%] left-0 w-full border-t-[2px] border-border/40"></div>
           {/* Side tables */}
           <div className="absolute top-0 left-[-40%] w-[30%] h-[15%] border-[2px] border-border/40 rounded-sm"></div>
           <div className="absolute top-0 right-[-40%] w-[30%] h-[15%] border-[2px] border-border/40 rounded-sm"></div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground text-muted-foreground pb-20 font-mono transition-colors">
      <div className="flex items-center gap-4 p-6 pt-10 font-sans">
        <Link to="/" className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 shadow-sm border border-border/40 hover:hover:bg-secondary/20 transition-colors">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Property Plan</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Scale 1:100 · 1160 SQ.FT</p>
        </div>
      </div>

      <div className="px-6 pb-6 flex gap-3 font-sans">
        <div className="flex flex-1 rounded-full bg-white dark:bg-white/5 p-1.5 border border-border/40 shadow-sm backdrop-blur-md">
          <button 
            onClick={() => setViewMode("control")}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-wider font-bold transition-all", viewMode === "control" ? "bg-purple-500 dark:bg-white text-white dark:text-black shadow-lg" : "text-muted-foreground hover:text-slate-900 dark:hover:text-white")}
          >
            <MapIcon className="h-4 w-4" /> Layout
          </button>
          <button 
            onClick={() => setViewMode("network")}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-wider font-bold transition-all", viewMode === "network" ? "bg-teal-500 text-white dark:text-black shadow-[0_0_20px_rgba(20,184,166,0.4)]" : "text-muted-foreground hover:text-slate-900 dark:hover:text-white")}
          >
            <Wifi className="h-4 w-4" /> Topology
          </button>
        </div>
        {zoomedRoomId && (
          <button 
            onClick={() => setZoomedRoomId(null)}
            className="px-5 rounded-full bg-secondary text-foreground font-bold text-xs uppercase tracking-wider border border-border/40 hover:hover:bg-secondary/20 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="relative flex-1 mx-6 mb-6 rounded-sm bg-background border-[4px] border-[#2a2a35] overflow-hidden shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
        {/* The zooming container */}
        <div 
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.3,0,0.2,1)]"
          style={{
            transform: zoomedRoomId ? 'scale(2.2)' : 'scale(1)',
            transformOrigin
          }}
        >
          {/* Architectural Blueprint Grid */}
          <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>

          {/* Central Router / Hub (Only visible in network mode) */}
          {viewMode === "network" && (
             <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-none transition-opacity duration-300">
               <div className="relative flex items-center justify-center">
                 <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                 <div className="h-10 w-10 sm:h-16 sm:w-16 rounded-full bg-teal-500/30 border border-teal-400/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_40px_rgba(20,184,166,0.4)]">
                    <Activity className="h-5 w-5 sm:h-7 sm:w-7 text-teal-300" />
                 </div>
               </div>
               {!zoomedRoomId && (
                 <div className="text-[7px] sm:text-[10px] text-teal-300 font-bold mt-2 sm:mt-3 bg-black/80 px-2 sm:px-3 py-1 rounded-full border border-teal-500/40 backdrop-blur-md">MAIN HUB</div>
               )}
             </div>
          )}

          {/* Room Boxes */}
          {state.rooms.map((room) => {
            const layout = roomsLayout[room.id as keyof typeof roomsLayout] || { top: "20%", left: "20%", width: "30%", height: "30%", area: "", doors: [], dimW: "", dimH: "", furn: "" };
            const isZoomed = zoomedRoomId === room.id;
            const isOtherZoomed = zoomedRoomId !== null && !isZoomed;
            const roomDevices = state.devices.filter(d => d.roomId === room.id);
            const activeCount = roomDevices.filter(d => d.on).length;

            return (
              <div 
                key={room.id}
                onClick={() => !zoomedRoomId && setZoomedRoomId(room.id)}
                className={cn(
                  "absolute border-[4px] border-[#2a2a35] flex flex-col cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.3,0,0.2,1)]",
                  isZoomed ? "bg-background z-30 shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "bg-background z-10 hover:bg-secondary",
                  isOtherZoomed && "opacity-40"
                )}
                style={{ top: layout.top, left: layout.left, width: layout.width, height: layout.height }}
              >
                {/* Furniture Outlines */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 overflow-hidden">
                  {renderFurniture(layout.furn)}
                </div>

                {/* Dimensions */}
                <div className="absolute top-[2px] left-0 right-0 flex items-center justify-center opacity-30 pointer-events-none overflow-hidden">
                   <div className="h-[1px] w-4 bg-[#8a8a9e]"></div>
                   <span className="text-[5px] mx-1 text-[#8a8a9e]">{layout.dimW}</span>
                   <div className="h-[1px] w-4 bg-[#8a8a9e]"></div>
                </div>
                <div className="absolute left-[2px] top-0 bottom-0 flex flex-col items-center justify-center opacity-30 pointer-events-none overflow-hidden" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                   <div className="w-[1px] h-4 bg-[#8a8a9e]"></div>
                   <span className="text-[5px] my-1 text-[#8a8a9e]">{layout.dimH}</span>
                   <div className="w-[1px] h-4 bg-[#8a8a9e]"></div>
                </div>
                {/* Architectural Doors */}
                {layout.doors.map((door, idx) => (
                  <div key={idx} className="absolute z-20 pointer-events-none overflow-hidden" 
                       style={{ 
                         top: door.top, left: door.left, 
                         width: (door.type === 'top' || door.type === 'bottom') ? '40px' : '30px', 
                         height: (door.type === 'left' || door.type === 'right') ? '40px' : '30px',
                         transform: 'translate(-50%, -50%)',
                         backgroundColor: '#09090b', // Punch out the wall
                       }}>
                     {/* Door swing arc */}
                     <div className="absolute w-[30px] h-[30px] border border-dashed border-[#555566]"
                          style={{
                             ...(door.type === 'bottom' && { top: '0', left: '0', borderRadius: '0 0 30px 0', borderLeft: 'none', borderTop: 'none' }),
                             ...(door.type === 'top' && { bottom: '0', right: '0', borderRadius: '30px 0 0 0', borderRight: 'none', borderBottom: 'none' }),
                             ...(door.type === 'left' && { top: '0', right: '0', borderRadius: '0 30px 0 0', borderBottom: 'none', borderLeft: 'none' }),
                          }}>
                     </div>
                     {/* Actual door panel */}
                     <div className="absolute bg-white/70"
                          style={{
                             ...(door.type === 'bottom' && { top: '0', left: '0', width: '2px', height: '30px' }),
                             ...(door.type === 'top' && { bottom: '0', right: '0', width: '30px', height: '2px' }),
                             ...(door.type === 'left' && { bottom: '0', right: '0', width: '30px', height: '2px' }),
                          }}>
                     </div>
                     {door.label && (
                        <div className="absolute top-[110%] left-1/2 -translate-x-1/2 text-[4px] text-[#8a8a9e] tracking-widest uppercase whitespace-nowrap">
                          {door.label}
                        </div>
                     )}
                  </div>
                ))}

                {/* Architectural Details (Windows) */}
                {(room.id === 'living-room' || room.id === 'bedroom') && (
                   <div className="absolute top-[-4px] left-[20%] w-[30%] h-[4px] bg-[#60a5fa] opacity-60"></div>
                )}
                {room.id === 'kitchen' && (
                   <div className="absolute top-[20%] right-[-4px] w-[4px] h-[40%] bg-[#60a5fa] opacity-60"></div>
                )}
                
                {/* Room Blueprint Label */}
                <div className="absolute bottom-2 right-2 text-right pointer-events-none opacity-40">
                  <div className="text-[7px] sm:text-[9px] uppercase tracking-[0.2em]">{room.name}</div>
                  <div className="text-[6px] sm:text-[7px] text-[#8a8a9e] tracking-wider">{layout.area}</div>
                </div>
                
                {/* Devices view (visible only when zoomed) */}
                <div className={cn("flex-1 flex flex-wrap content-center justify-center gap-1 sm:gap-2 p-2 sm:p-4 z-10 relative transition-opacity duration-500", isZoomed ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  {isZoomed && roomDevices.map((device, i) => {
                    const Icon = deviceIcon[device.type];
                    const isOnline = device.online;
                    const ping = Math.floor(Math.random() * 20) + 5;
                    const signal = Math.floor(Math.random() * 20) + 80;

                    return (
                      <div key={device.id} className="relative transition-all duration-500 ease-out group" style={{ transform: `scale(${isZoomed ? 0.45 : 1})` }}>
                        {viewMode === "control" ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); canEdit && toggleDevice(device.id); }}
                            className={`flex flex-col items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full transition-all active:scale-95 ${
                              device.on 
                                ? "bg-white text-black shadow-[0_0_40px_rgba(255,255,255,1)] border-[3px] border-[#09090b]" 
                                : "bg-[#181820]/90 text-muted-foreground border-[3px] border-border/40 backdrop-blur-md hover:bg-white/10"
                            }`}
                          >
                            <Icon className="h-8 w-8" />
                          </button>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-[3px] ${isOnline ? 'border-teal-400/80 bg-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'border-red-500/50 bg-red-500/10'}`}>
                              <Icon className={`h-6 w-6 ${isOnline ? 'text-teal-300' : 'text-red-400'}`} />
                              {isOnline && <div className="absolute -inset-2 rounded-full border-2 border-teal-400/40 animate-ping opacity-30" style={{ animationDuration: '2s', animationDelay: `${i * 0.3}s` }} />}
                            </div>
                            {isOnline ? (
                               <div className="mt-2 text-center leading-tight bg-black/80 px-3 py-1.5 rounded-md border border-border/40 backdrop-blur-md scale-90">
                                 <div className="text-[12px] sm:text-[14px] font-bold text-teal-300">{signal}%</div>
                                 <div className="text-[10px] sm:text-[11px] text-teal-500">{ping}ms</div>
                               </div>
                            ) : (
                               <div className="mt-2 text-[12px] font-bold text-red-400 bg-black/80 px-2 py-1 rounded-md border border-border/40 scale-90">ERR</div>
                            )}
                          </div>
                        )}
                        <p className="text-center mt-2 text-[12px] sm:text-[14px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-3 py-1.5 rounded-md border border-border/40 z-50">
                          {device.name}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Macro view (visible when not zoomed) */}
                <div className={cn("absolute inset-0 flex flex-col items-center justify-center z-0 transition-opacity duration-300 pointer-events-none", isZoomed ? "opacity-0" : "opacity-100")}>
                    <div className="text-center z-10 px-2">
                      <div className="mt-1 sm:mt-2 flex items-center justify-center gap-1 sm:gap-1.5 opacity-60">
                         <span className="text-[7px] sm:text-[9px] font-medium text-muted-foreground tracking-[0.2em]">{roomDevices.length} DEV</span>
                      </div>
                      {viewMode === "control" && activeCount > 0 && (
                        <div className="mt-1.5 sm:mt-3 inline-flex items-center bg-white px-2 py-0.5 text-[7px] sm:text-[8px] font-bold text-black font-sans rounded-sm">
                          {activeCount} ON
                        </div>
                      )}
                    </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
