# Auto lyrics (speech to text)

TikTok-style auto captions, entirely in the browser: no server, no upload, no API key.

## Using it

1. Select a song (or a video with sound) → **Auto lyrics**.
2. Pick **Fast** or **Accurate**, the language (or *Detect automatically*), and keep **Vocal focus** on for music.
3. **Detect words**. The first run downloads the model once (cached by the browser afterwards).
4. Click any detected word to jump to it. Choose **Phrases**, **Word by word** or **Karaoke**, a text style,
   and optionally **Snap captions to the beat** → **Add … words as captions**.
5. Captions land on a new **Lyrics** text track; edit them like any text. *Redo* clears the words so you can
   detect again with the other model.

## Pipeline

```
AudioBuffer ─► prepareSpeech()                         lyricsClient.ts (main thread)
               • cut the part this clip plays (inPoint … inPoint + duration × speed)
               • vocal focus: high-pass 150 Hz + low-pass 5 kHz
               • OfflineAudioContext at 16 kHz mono (L+R = centre, where vocals sit)
            ─► lyrics.worker.ts                         (Web Worker)
               • transformers.js pipeline('automatic-speech-recognition', model)
               • device: WebGPU if available, else WASM
               • return_timestamps: 'word', 30 s chunks with 5 s stride
            ─► words [{ text, start, end }] (+ part offset → source seconds)
            ─► asset.lyrics = { words, from, to, language, model }
```

`store/lyricsStore.ts` orchestrates this and exposes progress (*Preparing → Downloading % → Starting →
Listening*) without touching the undo history.

## Models

| Option | Model | Download | Notes |
| --- | --- | --- | --- |
| Fast | `onnx-community/whisper-tiny_timestamped` | ≈ 65 MB | fp32 encoder + 8-bit decoder |
| Accurate | `onnx-community/whisper-base_timestamped` | ≈ 140 MB | better on fast or unclear vocals |

The `_timestamped` exports include the cross-attention alignment heads Whisper needs for **word-level**
timestamps. On WebGPU the decoder uses 4-bit weights.

## From words to captions (`engine/captions.ts`)

1. `cleanWords` — trims and drops non-speech tags Whisper emits on music (`[Music]`, `(applause)`, `♪`).
2. `wordsOnTimeline(words, clip)` — source → timeline time, keeping only words inside the clip.
3. `buildCaptions(words, options)`:
   - **words**: one caption per word;
   - **phrases / karaoke**: start a new caption after `maxWords` (4 / 6), a pause longer than 0.7 s, or a
     word ending in punctuation;
   - optional beat snap: a start moves to the nearest beat within ±0.15 s;
   - each caption ends 0.35 s after its last word but never after the next starts, and lasts ≥ 0.25 s.
4. `addCaptions` (editor store) creates the text clips with the chosen preset, places them in the lower third,
   and sets the word **stagger to the real average spacing of the sung words**, so words pop in as they are sung.

## Limits

Clear vocals transcribe well; dense mixes, heavy effects or very fast rap can miss or mishear words —
try *Accurate*, keep *Vocal focus* on, or fix the text afterwards.
