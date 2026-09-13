# 🎬 Text-to-Video Generator

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Remotion](https://img.shields.io/badge/Remotion-black?style=for-the-badge&logo=remotion)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

A powerful, browser-based React application powered by [Remotion](https://www.remotion.dev/) that transforms text scripts into dynamic, fast-paced vertical videos. Designed specifically for the algorithmic pacing of TikTok, Instagram Reels, and YouTube Shorts (1080x1920), this tool allows creators to generate typography-driven shorts synchronously and deterministically.

---

## ✨ Key Features

*   📱 **Mobile-First Canvas:** Pre-configured for a 9:16 aspect ratio (1080x1920 @ 30FPS), perfect for modern short-form platforms.
*   ⚡ **Real-Time Video Preview:** Instant playback via `@remotion/player` with auto-play, looping, and interactive scrubbing.
*   🎛️ **Advanced Multi-Track Editor:** Add, remove, and layer multiple text boxes. Each text element operates independently with its own start delay, vertical position, and styling.
*   ⏱️ **Algorithmic Timing:** Word-by-word animation automatically calculates timing based on your chosen speed settings.
*   🎯 **Deterministic Rendering:** Frame-by-frame exactness. All visual effects (even randomized ones like Glitch) use Remotion's seeded `random()` tied to specific frames, ensuring zero flickering upon final MP4 export.

---

## 🎨 Extensive Customization

Tailor every aspect of your text layers via the built-in UI editor.

### 🔠 Typography & Layout

*   **Fonts:** Inter, Poppins, Montserrat, Bebas Neue, Georgia, Times New Roman, Arial, Verdana, Courier New, Lucida Console.
*   **Size & Color:** Granular font sizing (32px to 160px) and full hex color picking.
*   **Positioning:** Adjust vertical placement from 10% (top) to 90% (bottom) of the screen.

### 🎭 Animation Styles (Entrance)

*   `Zoom pop`: Physics-based spring scaling that bounces words aggressively into the frame.
*   `Fade in`: Smooth, cinematic opacity transitions.
*   `Typewriter`: Code-style, character-by-character revelation.
*   `Bounce in`: Elements drop or scale in with a pronounced overshoot.
*   `Slide up`: Words translate smoothly on the Y-axis from below.
*   `Blur in`: Transitions from heavily unfocused to sharp typography.
*   `Karaoke`: Highlight colors synchronously across the text, mimicking lyric videos.

### 💫 Visual Effects (Persistent)

*   `Neon glow`: Multi-layered, pulsing colored drop-shadows driven by sine-wave math.
*   `Glitch`: Cyberpunk-style horizontal jitter and chromatic aberration (cyan/magenta).
*   `Shake`: High-energy rotational and translational jittering.
*   `Wave`: Characters vertically oscillate in a smooth wave pattern.
*   `Rainbow`: Continuous cycling of the font color through the hue spectrum.
*   `Outline`: Bold exterior strokes for maximum readability against complex backgrounds.

---
