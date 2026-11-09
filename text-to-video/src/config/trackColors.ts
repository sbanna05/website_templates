import type { IconName } from '../components/ui/Icon';
import type { StemName, Track, TrackKind } from '../types/project';

/** Muted track colours — chosen to stay apart from each other on a dark timeline without glowing. */
export const TRACK_COLORS = [
  { value: '#6f8fa8', name: 'Steel' },
  { value: '#5f9a9a', name: 'Tide' },
  { value: '#7fa892', name: 'Sage' },
  { value: '#93a578', name: 'Moss' },
  { value: '#b09a6e', name: 'Sand' },
  { value: '#b38667', name: 'Clay' },
  { value: '#b07f78', name: 'Rosewood' },
  { value: '#a0889d', name: 'Mauve' },
  { value: '#8b7fa3', name: 'Lavender' },
  { value: '#5d6f7c', name: 'Slate' },
  { value: '#9aa6ad', name: 'Fog' },
  { value: '#c8ced2', name: 'Bone' },
] as const;

/** What a track looks like when no colour was picked. */
export const KIND_COLORS: Record<TrackKind, string> = { visual: '#46789b', text: '#55876f', audio: '#437a7b' };

export const trackColor = (track: Pick<Track, 'color' | 'kind'>): string => track.color ?? KIND_COLORS[track.kind];

export const KIND_ICON: Record<TrackKind, IconName> = { visual: 'film', text: 'text', audio: 'music' };

export const STEM_ICON: Record<StemName, IconName> = { vocals: 'mic', drums: 'beat', bass: 'curve', other: 'sparkle' };

export const trackIcon = (track: Pick<Track, 'kind' | 'stem'>): IconName => (track.stem ? STEM_ICON[track.stem] : KIND_ICON[track.kind]);

/** Muted colour for a chord root (12 hues around the wheel), so repeating progressions read as a pattern. */
export const chordColor = (root: number): string => (root < 0 ? 'rgba(152, 168, 178, 0.18)' : `hsl(${(root * 30 + 200) % 360} 24% 40%)`);
