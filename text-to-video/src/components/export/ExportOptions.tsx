import {
  formatsOfKind,
  isLosslessAudio,
  type AudioExportSettings,
  type AudioFormatId,
  type GifExportSettings,
  type StillExportSettings,
  type VideoExportSettings,
  type VideoFormatId,
} from '../../export/formats';
import { Segmented } from '../ui/Segmented';

interface OptionsProps<T> {
  value: T;
  onChange: (patch: Partial<T>) => void;
}

const formatOptions = <T extends string>(kind: 'video' | 'audio') =>
  formatsOfKind(kind).map((f) => ({ label: f.label, value: f.id as T, title: f.hint }));

const VIDEO_FORMATS = formatOptions<VideoFormatId>('video');
const AUDIO_FORMATS = formatOptions<AudioFormatId>('audio');

const RESOLUTIONS = [
  { label: '720p', value: 720 },
  { label: '1080p', value: 1080 },
  { label: '1440p', value: 1440 },
  { label: '4K', value: 2160 },
] as const;

export function VideoOptions({ value, onChange }: OptionsProps<VideoExportSettings>) {
  return (
    <>
      <Segmented label="Format" value={value.format} options={VIDEO_FORMATS} onChange={(format) => onChange({ format })} />
      <Segmented label="Resolution" value={value.shortSide} options={RESOLUTIONS} onChange={(shortSide) => onChange({ shortSide })} />
      <Segmented
        label="Frame rate"
        value={value.fps}
        options={[
          { label: '24', value: 24 },
          { label: '30', value: 30 },
          { label: '60', value: 60 },
        ]}
        onChange={(fps) => onChange({ fps })}
      />
      <Segmented
        label="Quality"
        value={value.quality}
        options={[
          { label: 'Smaller file', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Max', value: 'very-high' },
        ]}
        onChange={(quality) => onChange({ quality })}
      />
    </>
  );
}

export function GifOptions({ value, onChange }: OptionsProps<GifExportSettings>) {
  return (
    <>
      <Segmented
        label="Size"
        value={value.shortSide}
        options={[
          { label: '320p', value: 320 },
          { label: '480p', value: 480 },
          { label: '720p', value: 720 },
        ]}
        onChange={(shortSide) => onChange({ shortSide })}
      />
      <Segmented
        label="Frame rate"
        value={value.fps}
        options={[
          { label: '10', value: 10 },
          { label: '15', value: 15 },
          { label: '20', value: 20 },
          { label: '25', value: 25 },
        ]}
        onChange={(fps) => onChange({ fps })}
      />
      <Segmented
        label="Colour"
        value={value.dither ? 'smooth' : 'flat'}
        options={[
          { label: 'Flat & crisp', value: 'flat', title: 'Best for text and solid colours; smallest file' },
          { label: 'Smooth gradients', value: 'smooth', title: 'Ordered dithering hides banding in footage and light effects' },
        ]}
        onChange={(mode) => onChange({ dither: mode === 'smooth' })}
      />
    </>
  );
}

export function AudioOptions({ value, onChange }: OptionsProps<AudioExportSettings>) {
  return (
    <>
      <Segmented label="Format" value={value.format} options={AUDIO_FORMATS} onChange={(format) => onChange({ format })} />
      {isLosslessAudio(value.format) ? (
        <Segmented
          label="Bit depth"
          value={value.bitDepth}
          options={[
            { label: '16-bit · CD', value: 16 },
            { label: '24-bit · studio', value: 24 },
          ]}
          onChange={(bitDepth) => onChange({ bitDepth })}
        />
      ) : (
        <Segmented
          label="Bitrate"
          value={value.bitrateKbps}
          options={[
            { label: '128k', value: 128 },
            { label: '192k', value: 192 },
            { label: '256k', value: 256 },
            { label: '320k', value: 320 },
          ]}
          onChange={(bitrateKbps) => onChange({ bitrateKbps })}
        />
      )}
    </>
  );
}

export function StillOptions({ value, onChange }: OptionsProps<StillExportSettings>) {
  return <Segmented label="Resolution" value={value.shortSide} options={RESOLUTIONS} onChange={(shortSide) => onChange({ shortSide })} />;
}
