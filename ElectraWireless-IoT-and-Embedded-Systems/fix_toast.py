import os

def fix_toast():
    path = "D:/17_ElectraWireless_Elly_IoT/src/lib/home/store.tsx"
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()

    old_code = 'toast("Bluetooth not linked. Redirecting to setup...");'
    new_code = 'toast.error("Bluetooth not linked! Please link a device in the Bluetooth Setup section.");'
    
    code = code.replace(old_code, new_code)

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

if __name__ == "__main__":
    fix_toast()
    print("Done")
