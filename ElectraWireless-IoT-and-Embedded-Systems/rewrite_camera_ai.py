import os
import re

file_path = "D:/17_ElectraWireless_Elly_IoT/src/routes/camera.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Lower confidence threshold
content = content.replace("det.score > 0.5", "det.score > 0.25")

# 2. Inject global frame analysis
detect_line = "const detections = await objectDetector.detect(video);"
global_analysis_injection = """
          const detections = await objectDetector.detect(video);
          
          try {
            const globalPredictions = await model.classify(video);
            if (globalPredictions && globalPredictions.length > 0) {
              const topLabel = globalPredictions[0].className.split(',')[0].toUpperCase();
              const topScore = Math.round(globalPredictions[0].probability * 100);
              currentDetectionsHtml += `
                <div class="flex justify-between items-center bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg mb-2 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                  <span class="text-xs font-bold text-slate-900 dark:text-white tracking-wider">GLOBAL SCENE: ${topLabel}</span>
                  <span class="text-[10px] font-mono text-blue-500 bg-blue-500/20 px-1.5 py-0.5 rounded">${topScore}%</span>
                </div>
              `;
            }
          } catch(e) {}
"""
content = content.replace(detect_line, global_analysis_injection)

# 3. Add deleteFace function
delete_face_func = """
  const deleteFace = (id: string) => {
    const updatedFaces = customFaces.filter(f => f.id !== id);
    setCustomFaces(updatedFaces);
    const serializable = updatedFaces.map(f => ({
      ...f,
      embeddings: f.embeddings.map(e => Array.from(e))
    }));
    localStorage.setItem("elly_registered_faces", JSON.stringify(serializable));
    toast.success("Face removed");
  };
"""
content = content.replace("  const clearDatabase = () => {", delete_face_func + "\n  const clearDatabase = () => {")

# 4. Update the Modal UI to map users
modal_ui_search = """              <button
                type="button"
                onClick={clearDatabase}
                className="w-full rounded-xl bg-red-500/20 px-4 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/30"
              >
                Wipe Face Database
              </button>"""

modal_ui_replacement = """              
              {customFaces.length > 0 && (
                <div className="mt-4 border-t border-slate-200 dark:border-white/10 pt-4">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-3">Registered Users</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    {customFaces.map((face) => (
                      <div key={face.id} className="flex justify-between items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-2 px-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{face.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">ID: #{face.id}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteFace(face.id)}
                          className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={clearDatabase}
                className="w-full rounded-xl bg-red-500/20 px-4 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/30 mt-4"
              >
                Wipe All Data
              </button>"""

content = content.replace(modal_ui_search, modal_ui_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated camera.tsx with AI and Face UI")
