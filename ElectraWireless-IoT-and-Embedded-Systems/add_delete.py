import os

def add_remove_device_action():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # 1. Add REMOVE_DEVICE to types.ts action? Wait, store.tsx Action type
    # Wait, where is Action defined? Let's check `types.ts`
    old_action = '  | { type: "ADD_DEVICE"; device: Device }'
    new_action = '  | { type: "ADD_DEVICE"; device: Device }\n  | { type: "REMOVE_DEVICE"; id: string }'
    if "REMOVE_DEVICE" not in code:
        code = code.replace(old_action, new_action)

    # 2. Add case to reducer
    old_case = '    case "ADD_DEVICE": {'
    new_case = """    case "REMOVE_DEVICE": {
      const d = state.devices.find((x) => x.id === action.id);
      return pushLog(
        { ...state, devices: state.devices.filter((x) => x.id !== action.id) },
        log(`Device "${d?.name}" deleted`, "manual")
      );
    }
    case "ADD_DEVICE": {"""
    if 'case "REMOVE_DEVICE":' not in code:
        code = code.replace(old_case, new_case)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def add_delete_button():
    path = "D:/17_ElectraWireless_Elly_IoT/src/routes/device.$deviceId.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Add Trash icon import
    if "Trash2" not in code:
        code = code.replace('import { Bluetooth, RefreshCw, Unlink, Link2, Loader2 } from "lucide-react";',
                            'import { Bluetooth, RefreshCw, Unlink, Link2, Loader2, Trash2 } from "lucide-react";')

    # Add Delete Button at the very end of the page
    old_end = """          </div>
        </div>

      </div>
    </div>
  );"""
    
    new_end = """          </div>
        </div>

        <div className="flex justify-center mt-12 mb-8">
          <Button 
            variant="destructive" 
            className="w-full max-w-sm font-bold bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white"
            onClick={() => {
              if (confirm("Are you sure you want to delete this device? This action cannot be undone.")) {
                dispatch({ type: "REMOVE_DEVICE", id: device.id });
                router.navigate({ to: "/" });
                toast.success(`${device.name} deleted successfully.`);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Device completely
          </Button>
        </div>
      </div>
    </div>
  );"""
    
    if "Delete Device completely" not in code:
        code = code.replace(old_end, new_end)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    add_remove_device_action()
    add_delete_button()
    print("Done")
