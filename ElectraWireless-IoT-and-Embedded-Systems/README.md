<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Version-1.2.0-orange.svg?style=for-the-badge" alt="Version">
  <br><br>
  <h1>🏡 ELLY: Intelligent Home Automation by ElectraWireless ⚡</h1>
  <p><strong>A lightning-fast, local-first IoT dashboard and conversational AI assistant for the ultimate smart home experience.</strong></p>
</div>

<br/>

## 🌟 Overview

Welcome to the future of smart home control. **ELLY** is an advanced environmental and automation layer designed specifically for modern smart homes. Built by **ElectraWireless**, this project completely re-imagines how we interact with our homes. 

Say goodbye to slow, cloud-dependent dashboards. ELLY uses a 100% localized state management architecture and a lightning-fast local AI parser to give you **instantaneous** feedback and control over every appliance, light, and climate system in your house.

---

## ✨ Key Features

### 📡 Unified Native Device Discovery
ELLY features a custom-built, dual-band discovery engine designed to seamlessly detect real hardware on your network with **Zero Setup**:
- **Panasonic Smart TV Integration**: Automatically sweeps the local Wi-Fi subnet (Port 55000) to discover Panasonic Viera TVs. It instantly hooks into the native SOAP XML interface to provide a fully functional D-Pad remote, volume control, and app launcher. 
- **Native Bluetooth Low Energy (BLE)**: Bypasses browser sandboxes to scan for and connect to active smart home peripherals (like smart plugs and bulbs) in pairing mode.

### 🤖 Local-First Conversational AI
Why click when you can just talk? ELLY features a beautifully integrated conversational portal that operates **without** relying on slow, rate-limited cloud LLMs.
- 💬 **Advanced Semantic Parsing**: Understands dozens of natural language variations, complex aliases (like "climate" vs "ac", "bulb" vs "light"), and conversational small talk.
- 🧠 **Dynamic Fallback Logic**: Instead of generic errors, ELLY actively attempts to guide you with randomized, context-aware suggestions if a command isn't recognized.
- ⚡ **Zero-Latency Execution**: Saying "Turn off all lights" instantly triggers the event bus to shut off devices with zero network latency.

### 🎨 Stunning UI/UX & Responsive Design
- 💎 **Premium Glassmorphism**: The entire application is built using advanced glassmorphic design principles with dynamic blur effects, sleek squircles, and floating cards.
- 🌓 **Vibrant Color System**: Beautiful deep blacks with soft, luminous pastel purple accents tailored for OLED displays and modern sensibilities.
- 📱 **Mobile-First App Experience**: Designed to feel like a native iOS/Android application, but scales perfectly to desktop environments.

### 🏠 Quick Scenes & Automation Modes
One-tap access to powerful environment macros:
- 🌙 **Night Mode**: Dims the lights, lowers the AC temperature, and activates perimeter sensors.
- 🌿 **Eco/Saver Mode**: Optimizes high-draw appliances to reduce your carbon footprint and save electricity.
- 🚶 **Away Mode**: Arms the security system, turns off all unnecessary devices, and locks the doors.

---

## 🛠️ Technology Stack

ELLY is built on the bleeding edge of modern web and mobile technologies:

*   **Framework**: React 19 / Vite SPA
*   **Routing**: TanStack Router (Client-side, fully type-safe)
*   **Styling**: TailwindCSS v4 with custom Glassmorphism tokens
*   **Icons**: Lucide React
*   **Mobile Engine**: Capacitor (for Native iOS & Android hardware access)

---

## 📱 Installation & Deployment

### Run on the Web (Development)
Make sure you have [Node.js](https://nodejs.org) or [Bun](https://bun.sh) installed.
```bash
git clone https://github.com/adilsukumar/ElectraWireless-IoT-and-Embedded-Systems.git
cd ElectraWireless-IoT-and-Embedded-Systems
npm install
npm run dev
```

### Build for Android (Native)
To unlock the true power of ELLY (including Native Bluetooth and Wi-Fi Scanning), build the Android APK:
```bash
npx cap sync android
npx cap open android
```
*(Requires Android Studio)*

### Build for iOS (Native via GitHub Actions)
Don't have a Mac? No problem! This repository is configured with a **Cloud CI/CD Pipeline**.
1. Navigate to the **Actions** tab on this GitHub repository.
2. Select the **Build iOS IPA (Unsigned)** workflow.
3. Click **Run workflow**.
4. Once completed, download the `Elly-iOS-App` artifact (which contains the `.ipa` file).
5. Sideload the app onto your iPhone using AltStore or Sideloadly from your Windows PC!

---

## 📝 Architecture Notes

This project was built from the ground up to be **100% local**, specifically architected without any external cloud dependencies to guarantee absolute privacy, security, and maximum performance.

*   **State Management**: React Context merged with persisted `localStorage` for offline-first reliability.
*   **Event Bus**: The AI command parsing engine integrates directly into the global dispatch system for immediate, localized execution without API latency.

<br/>

<div align="center">
  <p><b>Created by Adil Sukumar & Snehal Dixit from ElectraWireless</b></p>
</div>
