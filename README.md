# Philips Ambilight Controller & Home Assistant Integration

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Android: 11-14](https://img.shields.io/badge/Android%20TV-11--14-brightgreen.svg)]()
[![Platform: MediaTek](https://img.shields.io/badge/Hardware-MediaTek%20TA7%20%2F%20PUG-orange.svg)]()

A lightweight, modern web controller, live diagnostics console, and Home Assistant integration suite for built-in Ambilight on **Philips Android TV & Google TV** devices (MediaTek chassis, e.g. TA7, PUG7406, PH3M_AL_T32).

Because legacy jointSPACE HTTP ports (`1925` / `1926`) are closed on recent Philips Google TV builds, this tool directly uses ADB intent dispatches and system service triggers (`org.droidtv.ambisvc`).

---

## ✨ Features

- **⚡ Direct System Overlays**:
  - `org.droidtv.ambilight.AMBILIGHTSTYLE`: Instantly trigger the horizontal style selector on screen without closing apps or interrupting video.
  - `org.droidtv.ambilight.AMBILIGHTOSD`: Full on-screen Ambilight settings menu.
- **🛋️ Lounge Light / Ambient Mode**:
  - `org.droidtv.intent.action.LoungeMode`: Turn your Ambilight LEDs into ambient room lighting when the TV screen is off or in standby.
- **🎬 Follow Video Presets**: Quick access to Standard, Natural, Immersive, Vivid, Game (Ultra-Low Latency), Comfort, and Relax.
- **🎵 Follow Audio Presets**: Colora, Lumina, UV Meter, Spectrum Analyser, Retro, Rhythm, and Party.
- **🎨 Lounge Mood Tones**: Hot Lava (Crimson), Deep Water (Oceanic Blue), Fresh Nature (Green), Sunset Warm White, and ISF Reference D65 White.
- **💻 Live Embedded Diagnostics Terminal**:
  - Live console showing timestamped ADB execution, round-trip latency in milliseconds, and TV responses.
  - Interactive shell prompt to test custom ADB commands directly.
- **🏡 Home Assistant Integration**: Ready-to-use template light entity, shell commands, and automation scripts.

---

## 🚀 Quick Start

### 1. Requirements
- Python 3.9+
- Target Philips TV with **USB / Network Debugging** enabled (*Settings → System → Developer Options*)

### 2. Installation
```bash
git clone https://github.com/victormantuaneli/philips-ambilight-controller.git
cd philips-ambilight-controller
pip install -r requirements.txt
```

### 3. Launch
**On Windows:**
Double click `run.bat` or execute:
```cmd
python server.py --ip 192.168.4.148
```

**On Linux / macOS:**
```bash
python3 server.py --ip 192.168.4.148
```

Open your browser at **`http://127.0.0.1:8765`**.

---

## 📱 Home Assistant Setup

Copy the configurations from [`home_assistant/configuration.yaml`](home_assistant/configuration.yaml) into your Home Assistant configuration:

```yaml
shell_command:
  ambilight_style_overlay: "adb -s <TV_IP>:5555 shell am start -a org.droidtv.ambilight.AMBILIGHTSTYLE"
  ambilight_osd_menu: "adb -s <TV_IP>:5555 shell am start -a org.droidtv.ambilight.AMBILIGHTOSD"
  ambilight_lounge_toggle: "adb -s <TV_IP>:5555 shell am start-service -a org.droidtv.intent.action.LoungeMode"
  ambilight_lounge_stop: "adb -s <TV_IP>:5555 shell am stopservice org.droidtv.ambisvc/.LoungeMode"

template:
  - light:
      - name: "Philips TV Ambilight Mood"
        unique_id: "philips_tv_ambilight_mood"
        icon: "mdi:television-ambient-light"
        turn_on:
          service: shell_command.ambilight_lounge_toggle
        turn_off:
          service: shell_command.ambilight_lounge_stop
```

---

## 📖 Architecture & Findings

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full reverse-engineered method signatures, `IAmbilightManager` enums, MediaTek `MtkTvConfig` register keys, and system parameters.

---

## 📄 License

MIT © [Victor Mantuaneli](https://github.com/victormantuaneli)
