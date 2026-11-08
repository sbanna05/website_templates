import { getAudioContext } from '../audio/audioContext';
import type { Asset, AssetKind } from '../types/project';
import { mediaRegistry } from './mediaRegistry';
import { computePeaks } from './waveform';

export const ACCEPTED_MEDIA = 'image/*,video/*,audio/*';

export function kindOf(file: File): AssetKind | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image);
}

function loadVideoMetadata(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error('This video format is not supported by your browser.'));
    video.src = url;
  });
}

async function videoThumbnail(video: HTMLVideoElement): Promise<string> {
  await new Promise<void>((resolve) => {
    video.onseeked = () => resolve();
    video.currentTime = Math.min(0.5, video.duration / 3);
  });
  const canvas = document.createElement('canvas');
  const scale = 240 / Math.max(video.videoWidth, video.videoHeight);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
}

async function decodeAudio(file: File): Promise<AudioBuffer | undefined> {
  try {
    return await getAudioContext().decodeAudioData(await file.arrayBuffer());
  } catch {
    return undefined; // e.g. a silent video with no audio track
  }
}

/** Reads a dropped file into an Asset (serializable) plus its runtime handle. */
export async function loadAsset(id: string, file: File): Promise<Asset> {
  const kind = kindOf(file);
  if (!kind) throw new Error(`"${file.name}" is not an image, video or audio file.`);
  const url = URL.createObjectURL(file);
  const base = { id, kind, name: file.name, status: 'ready' as const };

  try {
    if (kind === 'image') {
      const image = await loadImage(url);
      mediaRegistry.set(id, { kind, file, url, image });
      return { ...base, duration: 0, width: image.naturalWidth, height: image.naturalHeight, hasAudio: false, thumbnail: url };
    }

    if (kind === 'video') {
      const [video, audio] = await Promise.all([loadVideoMetadata(url), decodeAudio(file)]);
      const thumbnail = await videoThumbnail(video);
      mediaRegistry.set(id, { kind, file, url, audio });
      return {
        ...base,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        hasAudio: Boolean(audio),
        thumbnail,
        waveform: audio ? computePeaks(audio) : undefined,
      };
    }

    const audio = await decodeAudio(file);
    if (!audio) throw new Error(`Could not decode "${file.name}".`);
    mediaRegistry.set(id, { kind, file, url, audio });
    return { ...base, duration: audio.duration, width: 0, height: 0, hasAudio: true, waveform: computePeaks(audio) };
  } catch (error) {
    URL.revokeObjectURL(url);
    mediaRegistry.remove(id);
    throw error;
  }
}
