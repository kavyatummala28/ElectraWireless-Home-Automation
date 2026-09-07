import re

def refactor_camera():
    path = "D:/17_ElectraWireless_Elly_IoT/src/routes/camera.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Find the section starting with `{isRegisteringFace && (` and ending at the last div of the modal.
    # The modal starts around `if (isRegisteringFace) {` wait, no, it's `{isRegisteringFace && (`
    
    start_str = "{isRegisteringFace && ("
    start_idx = code.find(start_str)
    if start_idx == -1:
        print("Could not find modal")
        return
        
    end_str = "      )}\n\n    </div>\n  );\n}\n"
    end_idx = code.find(end_str)
    
    if end_idx == -1:
        print("Could not find modal end")
        return
        
    modal_jsx = code[start_idx:end_idx + 8] # up to `)}`
    
    # We will replace `const [newUserName, setNewUserName] = useState("");` in CameraPage with nothing.
    code = code.replace('const [newUserName, setNewUserName] = useState("");\n', '')
    
    # Update `registerNewFace` to take the name as argument instead of React Event
    old_register = """  const registerNewFace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !model || !videoRef.current) return;"""
    
    new_register = """  const registerNewFace = async (nameToRegister: string) => {
    if (!nameToRegister.trim() || !model || !videoRef.current) return;
    const newUserName = nameToRegister;"""
    
    code = code.replace(old_register, new_register)
    
    # Now create the FaceManagerDialog component at the end of the file.
    
    dialog_component = """

function FaceManagerDialog({ 
  onClose, 
  onRegister, 
  scanProgress, 
  customFaces, 
  onDeleteFace, 
  onClearDatabase 
}: { 
  onClose: () => void, 
  onRegister: (name: string) => void, 
  scanProgress: number, 
  customFaces: any[], 
  onDeleteFace: (id: string) => void, 
  onClearDatabase: () => void 
}) {
  const [localName, setLocalName] = useState("");
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-white dark:bg-[#111116] p-6 shadow-2xl border border-slate-200 dark:border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-400" /> Face Management
          </h3>
          <button onClick={onClose} className="text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onRegister(localName); }} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider pl-1">Person's Name</label>
            <input 
              type="text" 
              placeholder="e.g. Adil Sukumar"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>

          {scanProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white/50">
                <span>Scanning...</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!localName.trim() || scanProgress > 0}
            className="w-full rounded-xl bg-purple-600 px-4 py-3 font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
          >
            {scanProgress > 0 ? "Scanning..." : "Start Scan"}
          </button>
          
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
                      onClick={() => onDeleteFace(face.id)}
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
            onClick={onClearDatabase}
            className="w-full rounded-xl bg-red-500/20 px-4 py-3 font-bold text-red-500 transition-colors hover:bg-red-500/30 mt-4"
          >
            Wipe All Data
          </button>
        </form>
      </div>
    </div>
  );
}
"""
    
    # Replace the modal usage in CameraPage
    new_modal_usage = """{isRegisteringFace && (
          <FaceManagerDialog 
            onClose={() => setIsRegisteringFace(false)}
            onRegister={registerNewFace}
            scanProgress={scanProgress}
            customFaces={customFaces}
            onDeleteFace={deleteFace}
            onClearDatabase={clearDatabase}
          />
        )}"""
        
    code = code[:start_idx] + new_modal_usage + code[end_idx:]
    
    code += dialog_component
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    refactor_camera()
    print("Camera UI Refactored")
