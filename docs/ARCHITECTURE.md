# Philips Ambilight Control & Integration Guide (MediaTek Google TV)

This document provides a technical reference for controlling the built-in Ambilight system on Philips Android TV / Google TV sets (MediaTek chassis, e.g. `PH3M_AL_T32`, `TPM215L`, Philips TA7 / PUG series running Android 11 to 14) via ADB, shell scripts, and Home Assistant.

---

## 1. System Architecture

Ambilight on Philips MediaTek Google TV platforms is managed by a low-level system daemon and a companion system settings APK:

- **Core Ambilight Daemon**: `org.droidtv.ambisvc` (located at `/system/app/ambisvc/ambisvc.apk`), running under `android.uid.system` (UID 1000).
- **Settings & OSD Interface**: `com.android.tv.settings` (specifically `TvSettingsPhilips.apk`), providing the visual overlay and D-pad navigable menus.
- **Hardware Communication**: MediaTek TV Config layer (`MtkTvConfig`) controlling SPI/PWM hardware registers:
  - `g_custom_base__amb_set_mode`
  - `g_custom_base__amb_set_follow_video_mode`
  - `g_custom_base__amb_set_lounge_tuning`
  - `g_custom_base__amb_set_static_pixel`
- **Legacy jointSPACE Ports (1925 / 1926)**: Closed by default on Google TV 14 MediaTek chassis. Control is performed over ADB (Port 5555) via standard Android Intent and service mechanisms.

---

## 2. Direct ADB Intents & Actions

### Ambilight Quick Style Picker Overlay
Opens the horizontal style selector on screen without interrupting playback or closing the active foreground application:
```bash
adb shell am start -a org.droidtv.ambilight.AMBILIGHTSTYLE
```
- **Component**: `com.android.tv.settings/.partnercustomizer.ambilight.AmbilightStyleActivity`
- **User Navigation**: Once open, standard D-pad keys (`KEYCODE_DPAD_LEFT`, `KEYCODE_DPAD_RIGHT`, `KEYCODE_DPAD_CENTER`, `KEYCODE_BACK`) navigate the options.

### Full Ambilight OSD / Settings Menu
Opens the complete configuration menu (Brightness, Saturation, Wall Colour, Lounge Light, etc.):
```bash
adb shell am start -a org.droidtv.ambilight.AMBILIGHTOSD
```
- **Component**: `com.android.tv.settings/.partnercustomizer.ambilight.AmbilightActivity`

### Lounge Light Mode (Ambient Mood Lighting)
Toggles or starts ambient mood lighting when the TV screen is turned off or in standby:
```bash
# Start or cycle Lounge Light styles:
adb shell am start-service -a org.droidtv.intent.action.LoungeMode

# Stop Lounge Light service:
adb shell am stopservice org.droidtv.ambisvc/.LoungeMode
```

---

## 3. Supported Styles & Internal Modes

Extracted from `Lorg/droidtv/tv/video/IAmbilightManager;`:

### Primary Styles (`ambilight_style`)
Stored in the `system` settings table (`settings get system ambilight_style`):

| ID | Style | Internal Constant | Description |
|---|---|---|---|
| `1` | **Off** | `AMBILIGHT_STYLE_OFF` | LEDs completely switched off |
| `2` | **Follow Video** | `AMBILIGHT_STYLE_FOLLOW_VIDEO` | Dynamically tracks screen pixel colors |
| `3` | **Follow Audio** | `AMBILIGHT_STYLE_FOLLOW_AUDIO` | Reacts to sound frequencies and volume |
| `4` | **Follow Color** | `AMBILIGHT_STYLE_FOLLOW_COLOR` | Displays static or cycling ambient shades |
| `5` | **Lounge Light** | `AMBILIGHT_STYLE_LOUNGE` | Mood lighting when screen is off |
| `6` | **Manual** | `AMBILIGHT_STYLE_MANUAL` | Custom RGB / coordinate lighting |
| `7` | **Expert / ISF** | `AMBILIGHT_STYLE_EXPERT` | ISF D65 reference white |

### Follow Video Sub-Modes
When `style = 2`, the following presets adjust algorithm dynamic response:

| ID | Name | Dynamic Characteristics |
|---|---|---|
| `1` | **Standard** | Neutral, smooth transitions for normal viewing |
| `2` | **Natural** | Color-accurate transitions matching real scenery |
| `3` | **Immersive** | High-contrast perimeter projection |
| `4` | **Vivid** | Saturated, high dynamic range tracing |
| `5` | **Game** | Ultra-low latency, instant edge-color reaction |
| `6` | **Comfort** | Warm, soft-edge transitions to minimize eye strain |
| `7` | **Relax** | Slow-dissolving ambient blending |

### Follow Audio Sub-Modes
When `style = 3`, the following music algorithms are available:

| ID | Name | Internal Mode | Behavior |
|---|---|---|---|
| `101` | **Colora** | `ENERGY_ADAPTIVE_BRIGHTNESS` | Brightness pulses to audio dynamics |
| `102` | **Lumina** | `ENERGY_ADAPTIVE_COLORS` | Color palette shifts according to sound frequency |
| `103` | **UV Meter** | `UV_METER` | LEDs rise and fall like an analog VU meter |
| `104` | **Spectrum** | `SPECTRUM_ANALYSER` | Frequency-band graphic equalizer emulation |
| `105` | **Retro** | `KNIGHT_RIDER_CLOCKWISE` | Clockwise cyclical beat-tracing sweep |
| `106` | **Rhythm** | `KNIGHT_RIDER_ALTERNATING` | Alternating horizontal beat tracer |
| `110` | **Party** | `RANDOM` | High-tempo energetic strobe and multi-color bursts |

### Follow Color & Lounge Mood Presets
When `style = 4` or `5`:

| ID | Name | Visual Ambience |
|---|---|---|
| `201` | **Hot Lava** | Deep red and ember tones |
| `202` | **Deep Water** | Calming oceanic azure and indigo blues |
| `203` | **Fresh Nature** | Earthy forest greens |
| `204` | **Warm White** | Incandescent candle-like sunset glow |
| `207` | **ISF Warm White** | Calibrated 6500K reference studio white |
| `208` | **Custom Color** | User-defined RGB spectrum |

---

## 4. Hardware Parameters & Features

| Feature Key | Internal ID | Settings Code | Range / Values |
|---|---|---|---|
| **Brightness** | `AMBILIGHT_FEATURE_BRIGHTNESS` | `5` | `0` to `10` (UI) / `0` to `255` (HW) |
| **Saturation** | `AMBILIGHT_FEATURE_SATURATION` | `6` | `-2` to `+2` |
| **Color Boost** | `AMBILIGHT_FEATURE_COLORBOOST` | `10` | `0` (Off) / `1` (On) |
| **Halo Size** | `AMBILIGHT_FEATURE_HALO_SIZE` | `12` | `1` (Min), `2` (Medium), `3` (Max) |
| **Sunset Mode** | `AMBILIGHT_FEATURE_SUNSET` | `7` | `1` (Fade out to Off), `2` (Instant Off) |

---

## 5. Home Assistant Integration

### A. Shell Command Integration
Add the following commands to your Home Assistant `configuration.yaml`:

```yaml
shell_command:
  ambilight_style_overlay: "adb -s <tv_ip>:5555 shell am start -a org.droidtv.ambilight.AMBILIGHTSTYLE"
  ambilight_osd_menu: "adb -s <tv_ip>:5555 shell am start -a org.droidtv.ambilight.AMBILIGHTOSD"
  ambilight_lounge_toggle: "adb -s <tv_ip>:5555 shell am start-service -a org.droidtv.intent.action.LoungeMode"
  ambilight_lounge_stop: "adb -s <tv_ip>:5555 shell am stopservice org.droidtv.ambisvc/.LoungeMode"
```

### B. Template Light Entity
Create a Home Assistant light entity to turn Lounge Light mood mode on and off:

```yaml
template:
  - light:
      - name: "TV Ambilight Mood"
        unique_id: "philips_tv_ambilight_mood"
        icon: "mdi:television-ambient-light"
        turn_on:
          service: shell_command.ambilight_lounge_toggle
        turn_off:
          service: shell_command.ambilight_lounge_stop
```

### C. Android TV Integration Presets
If using Home Assistant's official `androidtv` integration (`media_player.philips_tv`), execute presets via `androidtv.adb_command`:

```yaml
script:
  ambilight_quick_style:
    alias: "Ambilight: Open Style Menu"
    sequence:
      - service: androidtv.adb_command
        target:
          entity_id: media_player.philips_tv
        data:
          command: "am start -a org.droidtv.ambilight.AMBILIGHTSTYLE"

  ambilight_select_game_mode:
    alias: "Ambilight: Set Game Mode"
    sequence:
      - service: androidtv.adb_command
        target:
          entity_id: media_player.philips_tv
        data:
          command: "am start -a org.droidtv.ambilight.AMBILIGHTSTYLE && sleep 0.4 && input keyevent KEYCODE_DPAD_RIGHT && input keyevent KEYCODE_DPAD_CENTER"
```
