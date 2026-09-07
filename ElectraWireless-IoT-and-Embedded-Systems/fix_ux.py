import os

def fix_store():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # Change the return type of toggleDevice in Ctx
    code = code.replace("toggleDevice: (id: string) => Promise<void>;", 'toggleDevice: (id: string) => Promise<boolean | "REDIRECT">;')

    # Change the implementation of toggleDevice
    old_impl = """  const toggleDevice = async (id: string) => {
    const d = state.devices.find((x) => x.id === id);
    if (!d) return;
    
    let success = false;
    if (d.connectionType === "third-party") {
      if (!d.macAddress) {
        toast("Bluetooth not linked. Redirecting to setup...");
        setTimeout(() => { window.location.href = `/device/${d.id}`; }, 500);
        return;
      } else {"""
      
    new_impl = """  const toggleDevice = async (id: string): Promise<boolean | "REDIRECT"> => {
    const d = state.devices.find((x) => x.id === id);
    if (!d) return false;
    
    let success = false;
    if (d.connectionType === "third-party") {
      if (!d.macAddress) {
        toast("Bluetooth not linked. Redirecting to setup...");
        return "REDIRECT";
      } else {"""
      
    if "return \"REDIRECT\";" not in code:
        code = code.replace(old_impl, new_impl)

    # Change the return values at the end of toggleDevice
    old_end = """    if (success) {
      // If hardware acknowledges, update the UI
      dispatch({ type: "TOGGLE_DEVICE", id });
    } else {
      toast.error(`Failed to send command to ${d.name} over Bluetooth. Ensure it is powered on and in range.`);
    }
  };"""
  
    new_end = """    if (success) {
      // If hardware acknowledges, update the UI
      dispatch({ type: "TOGGLE_DEVICE", id });
      return true;
    } else {
      toast.error(`Failed to send command to ${d.name} over Bluetooth. Ensure it is powered on and in range.`);
      return false;
    }
  };"""
    
    if "return false;" not in code.split("toggleDevice = ")[1]:
        code = code.replace(old_end, new_end)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def fix_device_tile():
    path = "D:/17_ElectraWireless_Elly_IoT/src/components/home/DeviceTile.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    # import useRouter
    if "useRouter" not in code:
        code = code.replace('import { Link } from "@tanstack/react-router";', 'import { Link, useRouter } from "@tanstack/react-router";')

    # add router hook
    if "const router = useRouter();" not in code:
        code = code.replace('export function DeviceTile({ device }: { device: Device }) {', 'export function DeviceTile({ device }: { device: Device }) {\n  const router = useRouter();')

    # update onClickCapture
    old_click = '<div onClickCapture={() => toggleDevice(device.id)}>'
    new_click = """<div onClickCapture={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const res = await toggleDevice(device.id);
            if (res === "REDIRECT") {
              router.navigate({ to: "/device/$deviceId", params: { deviceId: device.id } });
            }
          }}>"""
    
    if "res === \"REDIRECT\"" not in code:
        code = code.replace(old_click, new_click)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

def fix_root():
    path = "D:/17_ElectraWireless_Elly_IoT/src/routes/__root.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    if "ScrollRestoration" not in code:
        code = code.replace('useRouter,\n} from "@tanstack/react-router";', 'useRouter,\n  ScrollRestoration,\n} from "@tanstack/react-router";')
        code = code.replace('<Outlet />\n          </Layout>', '<ScrollRestoration />\n            <Outlet />\n          </Layout>')

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    fix_store()
    fix_device_tile()
    fix_root()
    print("Done")
