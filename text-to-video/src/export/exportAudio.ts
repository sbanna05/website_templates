import {
  AudioBufferSource,
  BufferTarget,
  FlacOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  OggOutputFormat,
  Output,
  Quality,
  WavOutputFormat,
  canEncodeAudio,
  type AudioCodec,
  type OutputFormat,
} from 'mediabunny';
import { projectDuration } from '../engine/timeline';
import type { Asset, Project } from '../types/project';
import { EXPORT_FORMATS, EXPORT_SAMPLE_RATE, isLosslessAudio, type AudioExportSettings, type AudioFormatId, type ProgressCallback } from './formats';
import { audioChunks, renderAudioMix, throwIfAborted } from './shared';

interface AudioContainerSpec {
  create: () => OutputFormat;
  codec: (settings: AudioExportSettings) => AudioCodec;
  /** Registers a WASM fallback encoder when the browser has no native one. */
  polyfill?: () => Promise<void>;
}

const pcmCodec = (settings: AudioExportSettings): AudioCodec => (settings.bitDepth === 24 ? 'pcm-s24' : 'pcm-s16');

const CONTAINERS: Record<AudioFormatId, AudioContainerSpec> = {
  wav: { create: () => new WavOutputFormat(), codec: pcmCodec },
  flac: {
    create: () => new FlacOutputFormat(),
    codec: () => 'flac',
    polyfill: async () => (await import('@mediabunny/flac-encoder')).registerFlacEncoder(),
  },
  mp3: {
    create: () => new Mp3OutputFormat(),
    codec: () => 'mp3',
    polyfill: async () => (await import('@mediabunny/mp3-encoder')).registerMp3Encoder(),
  },
  m4a: { create: () => new Mp4OutputFormat({ fastStart: 'in-memory' }), codec: () => 'aac' },
  ogg: { create: () => new OggOutputFormat(), codec: () => 'opus' },
};

const registered = new Set<AudioFormatId>();

/** Bitrates tried, highest first, when the encoder rejects the requested one. */
const FALLBACK_KBPS = [320, 256, 192, 160, 128] as const;

interface ResolvedEncoding {
  codec: AudioCodec;
  /** Undefined for PCM / lossless codecs. */
  quality?: Quality;
}

/**
 * Finds an encodable configuration: the requested bitrate, or the highest lower
 * one the encoder accepts (e.g. many AAC encoders cap at 192 kbit/s). Registers
 * the bundled WASM encoder when the browser has no native one.
 */
async function resolveEncoding(settings: AudioExportSettings): Promise<ResolvedEncoding | null> {
  const spec = CONTAINERS[settings.format];
  const codec = spec.codec(settings);
  const candidates: (Quality | undefined)[] = isLosslessAudio(settings.format)
    ? [undefined]
    : [settings.bitrateKbps, ...FALLBACK_KBPS.filter((kbps) => kbps < settings.bitrateKbps)].map((kbps) => new Quality({ bitrate: kbps * 1000 }));

  const firstEncodable = async (): Promise<ResolvedEncoding | null> => {
    for (const quality of candidates) {
      if (await canEncodeAudio(codec, { numberOfChannels: 2, sampleRate: EXPORT_SAMPLE_RATE, quality })) return { codec, quality };
    }
    return null;
  };

  const native = await firstEncodable();
  if (native || !spec.polyfill) return native;
  if (!registered.has(settings.format)) {
    await spec.polyfill();
    registered.add(settings.format);
  }
  return firstEncodable();
}

const unsupportedMessage = (format: AudioFormatId) => `Your browser can't encode ${EXPORT_FORMATS[format].label} audio. Try WAV or MP3.`;

/** Returns a user-facing reason when the chosen audio format can't be encoded here, otherwise null. */
export async function ensureAudioEncoder(settings: AudioExportSettings): Promise<string | null> {
  return (await resolveEncoding(settings)) ? null : unsupportedMessage(settings.format);
}

/** Renders the mix (with the master bus) and encodes it to an audio-only file. */
export async function exportAudio(
  project: Project,
  assets: Record<string, Asset>,
  settings: AudioExportSettings,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<Blob> {
  const info = EXPORT_FORMATS[settings.format];
  const spec = CONTAINERS[settings.format];

  onProgress({ phase: 'preparing', progress: 0 });
  const encoding = await resolveEncoding(settings);
  if (!encoding) throw new Error(unsupportedMessage(settings.format));

  onProgress({ phase: 'audio', progress: 0.05 });
  const mix = await renderAudioMix(project, assets, projectDuration(project));
  if (!mix) throw new Error('There is no audio to export — add music or a video with sound.');
  throwIfAborted(signal);

  const output = new Output({ format: spec.create(), target: new BufferTarget() });
  try {
    output.setMetadataTags({ title: project.name });
    const source = new AudioBufferSource(encoding);
    output.addAudioTrack(source);
    await output.start();
    for await (const { chunk, done } of audioChunks(mix, signal)) {
      await source.add(chunk);
      onProgress({ phase: 'encoding', progress: 0.3 + 0.65 * done });
    }
    onProgress({ phase: 'finalizing', progress: 0.97 });
    await output.finalize();
  } catch (error) {
    if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel();
    throw error;
  }

  const buffer = output.target.buffer;
  if (!buffer) throw new Error('Export produced no data.');
  onProgress({ phase: 'finalizing', progress: 1 });
  return new Blob([buffer], { type: info.mimeType });
}
