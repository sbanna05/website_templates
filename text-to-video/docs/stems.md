# Stems (AI source separation)

Splits a song into **vocals, drums, bass and melody** (everything else: synths, guitars, keys…) with a
neural network, entirely in the browser. This is real separation, not the old "centre-channel" trick that
only *turned down* vocals panned in the middle.

## Using it

1. Select a song → **Stems** → **Split into stems**. The first time, the model (≈172 MB) downloads and is
   kept in the browser's Cache Storage; later splits start straight away.
2. When it's done, the panel turns into a **stem mixer**:
   - presets: **Full song**, **Instrumental** (no vocals), **Acapella** (vocals only), **Beat only**
     (drums + bass), **No drums**;
   - per stem: **M**ute, **S**olo (solo wins over mute, like a mixing desk) and a volume fader (0–150 %,
     double-click resets).
3. The clip on the timeline shows its four stems as stacked lanes; muted ones are dimmed.
4. **Put stems on separate tracks** replaces the clip with four clips — one per stem, each on its own track,
   same timing — so you can cut, move, EQ or curve each stem on its own.
5. The stems also appear in the Music library under their song (tagged *Stem*) to drag anywhere.

Each clip has its own stem mix, so the same song can be the full mix in the verse and an acapella in the
chorus. Speed, pitch, EQ, effects, volume curves and fades all still apply on top.

## Pipeline

```
song AudioBuffer ─► prepareStereo()              stemsClient.ts (main thread)
                    OfflineAudioContext → 44.1 kHz stereo (mono files are spread to both sides)
                 ─► stems.worker.ts              Web Worker
                    • model bytes from Cache Storage, else fetched once with progress
                    • ONNX Runtime Web: WebGPU when available, else WebAssembly
                      (multi-threaded when the page is cross-origin isolated)
                    • demucs-web: 7.8 s segments with 25 % overlap, STFT in/out, cross-faded back together
                 ─► { vocals, drums, bass, other } × { left, right }   (transferred, not copied)
                 ─► stemsStore: 4 AudioBuffers → 4 stem assets (waveform, the song's beat grid,
                    stemOf = { song, stem }) and song.stems = { vocals: id, drums: id, … }
```

| | |
| --- | --- |
| Model | HTDemucs (Meta's Hybrid Transformer Demucs) exported to ONNX: `timcsy/demucs-web-onnx` on Hugging Face |
| Libraries | `demucs-web` (pre/post-processing), `onnxruntime-web` (inference) |
| Files | `stems/protocol.ts`, `stems/stems.worker.ts`, `stems/stemsClient.ts`, `store/stemsStore.ts`, `engine/stems.ts` |
| Progress | *Preparing → Downloading % → Starting the model on the GPU/CPU → Separating % · time left* |
| Cancel | Terminates the worker (the only way to stop an inference); the cached model makes the next start quick |

Stems are generated audio: they live only as `AudioBuffer`s in the media registry (no `File`), and they
share the song's timing exactly, so a stem can stand in for its song in any clip.

## Playing a stem mix (`engine/stems.ts`, `audio/mixer.ts`)

`stemGains(mix)` turns the mixer into one gain per stem: if any stem is soloed, only soloed stems play;
otherwise muted stems are 0 and the rest play at their fader level. `clipLayers(clip, asset)` returns the
**layers** a clip plays:

- the song itself, while it isn't split or the mix is the full song;
- otherwise one layer per audible stem, `{ assetId: stemId, gain }`.

The mixer starts one buffer source per layer, sums them into the clip's envelope, and from there the chain is
identical (automation → EQ → effects). Speed/pitch processing is cached per stem, like any other file.

## Stems and other features

- **Auto lyrics** transcribe the vocal stem when the song has been split — no beat for the model to mishear.
- **Beat grid** edits apply to the song and all its stems together.
- **Merge** bakes the stem mix into the merged file.
- Removing the song removes its stems; removing one stem unlinks the set from the song.

## Performance and limits

- A 3-minute song takes roughly a minute on a recent GPU (WebGPU in Chrome/Edge) and several minutes on CPU.
  Memory is the real limit: the worker holds the song plus four stems (≈ 4 × 60 MB for 3 minutes of
  float stereo) while it works.
- **Cross-origin isolation** (`Cross-Origin-Opener-Policy: same-origin` +
  `Cross-Origin-Embedder-Policy: credentialless`) lets the CPU path use up to 4 threads. The dev and preview
  servers send these headers (`vite.config.ts`); set the same two headers on your production host to get
  the speed-up there.
- Separation quality is state of the art but not perfect: expect faint bleed (a bit of hi-hat in the vocals,
  reverb tails in "melody") on dense mixes.
