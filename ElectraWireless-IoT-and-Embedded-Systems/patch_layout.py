import os

def patch_layout_components():
    # 1. Fix Drawer
    drawer_path = "D:/17_ElectraWireless_Elly_IoT/src/components/ui/drawer.tsx"
    with open(drawer_path, "r", encoding="utf-8") as f:
        code = f.read()
    code = code.replace('"fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",',
                        '"fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background mx-auto max-w-md",')
    with open(drawer_path, "w", encoding="utf-8") as f:
        f.write(code)

    # 2. Fix Dialog
    dialog_path = "D:/17_ElectraWireless_Elly_IoT/src/components/ui/dialog.tsx"
    with open(dialog_path, "r", encoding="utf-8") as f:
        code = f.read()
    # It's centered with left-50 top-50 translate, but max-w-lg. We can change max-w-lg to max-w-[calc(100%-2rem)] sm:max-w-md
    code = code.replace('w-full max-w-lg', 'w-[calc(100%-2rem)] max-w-md')
    with open(dialog_path, "w", encoding="utf-8") as f:
        f.write(code)

    # 3. Fix AlertDialog
    alert_path = "D:/17_ElectraWireless_Elly_IoT/src/components/ui/alert-dialog.tsx"
    with open(alert_path, "r", encoding="utf-8") as f:
        code = f.read()
    code = code.replace('w-full max-w-lg', 'w-[calc(100%-2rem)] max-w-md')
    with open(alert_path, "w", encoding="utf-8") as f:
        f.write(code)

    # 4. Fix Camera registering overlay
    camera_path = "D:/17_ElectraWireless_Elly_IoT/src/routes/camera.tsx"
    with open(camera_path, "r", encoding="utf-8") as f:
        code = f.read()
    code = code.replace('<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">',
                        '<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 max-w-md mx-auto">')
    with open(camera_path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    patch_layout_components()
