import os
import re

file_path = "D:/17_ElectraWireless_Elly_IoT/src/routes/camera.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add clear faces function inside the component
clear_faces_func = """
  const clearDatabase = () => {
    localStorage.removeItem("elly_registered_faces");
    setCustomFaces([]);
    toast.success("Face Database Wiped");
    setIsRegisteringFace(false);
  };
"""
# Insert after registerNewFace
content = content.replace("    setScanProgress(0);\n  };\n", "    setScanProgress(0);\n  };\n" + clear_faces_func)

# Add "Wipe Database" button inside the modal
modal_buttons = """              <button
                type="submit"
                disabled={!newUserName.trim() || scanProgress > 0}
                className="w-full rounded-xl bg-purple-600 px-4 py-3 font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {scanProgress > 0 ? "Scanning..." : "Start Scan"}
              </button>
              
              <button
                type="button"
                onClick={clearDatabase}
                className="w-full rounded-xl bg-red-500/20 px-4 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/30"
              >
                Wipe Face Database
              </button>"""
content = content.replace("""              <button
                type="submit"
                disabled={!newUserName.trim() || scanProgress > 0}
                className="w-full rounded-xl bg-purple-600 px-4 py-3 font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {scanProgress > 0 ? "Scanning..." : "Start Scan"}
              </button>""", modal_buttons)

# Fix Light Mode styling classes in camera.tsx
content = content.replace("bg-[#111116]", "bg-white dark:bg-[#111116]")
content = content.replace("bg-[#181820]", "bg-slate-50 dark:bg-[#181820]")
content = content.replace("text-white", "text-slate-900 dark:text-white")
content = content.replace("text-neutral-400", "text-slate-500 dark:text-neutral-400")
content = content.replace("text-neutral-500", "text-slate-400 dark:text-neutral-500")
content = content.replace("border-white/5", "border-slate-200 dark:border-white/5")
content = content.replace("border-white/10", "border-slate-200 dark:border-white/10")
content = content.replace("bg-white/5", "bg-slate-100 dark:bg-white/5")
content = content.replace("bg-white/10", "bg-slate-200 dark:bg-white/10")
content = content.replace("hover:bg-[#181820]", "hover:bg-slate-100 dark:hover:bg-[#181820]")

# But we need to revert `text-white` for buttons that explicitly need to be white in light mode too
# (like bg-purple-600 text-white).
content = content.replace("text-slate-900 dark:text-white transition-colors hover:bg-purple-700", "text-white transition-colors hover:bg-purple-700")
content = content.replace('bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]', 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated camera.tsx")
