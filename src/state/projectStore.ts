import { create } from 'zustand';

export type TimeRange = [number, number];

export type TrackKind = 'effect' | 'transition';

export interface Keyframe {
  t: number; // seconds
  v: number;
  ease?: 'linear' | 'cubic' | 'quint' | 'elastic';
}

export interface Automation {
  keyframes?: Keyframe[];
  audioLink?: { band: string; scale?: number; offset?: number; clamp?: [number, number]; attack?: number; release?: number };
}

export interface Track {
  id: string;
  kind: TrackKind;
  module: string; // module id (e.g. @pack/wire-morph)
  range: TimeRange;
  params: Record<string, any>;
}

export interface TransitionTrack extends Track {
  kind: 'transition';
  fromTrackId?: string; // ID of the effect track transitioning from
  toTrackId?: string; // ID of the effect track transitioning to
  duration: number; // transition duration in seconds
}

export interface ProjectMeta {
  title: string;
  fps: number;
  resolution: [number, number];
  duration: number;
  bpm: number;
}

export interface Project {
  schema: number;
  meta: ProjectMeta;
  audio?: { src?: string; offset?: number; gain?: number; analysis?: any };
  tracks: Track[];
  post: { pass: string; params?: Record<string, any> }[];
}

export interface TransportState {
  playing: boolean;
  time: number; // seconds
  loop: [number, number] | null;
  playbackMode: 'edit' | 'playback';
}

interface ProjectState {
  project: Project;
  transport: TransportState;
  selectedTrackId: string | null;
  setTime: (t: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  addTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  updateTrackRange: (trackId: string, range: TimeRange) => void;
  getActiveTracks: (time: number) => { effects: Track[]; transitions: TransitionTrack[] };
  getActiveTrack: (time: number) => Track | null; // For backward compatibility
  selectTrack: (trackId: string | null) => void;
  setPlaybackMode: (mode: 'edit' | 'playback') => void;
}

const defaultProject: Project = {
  schema: 1,
  meta: { title: 'My Demo', fps: 60, resolution: [1280, 720], duration: 20, bpm: 120 },
  tracks: [
    { id: 'fx1', kind: 'effect', module: '@pack/wire-morph', range: [0, 10], params: { morph: 0.0, autoRotate: true, palette: 0 } },
    { id: 'fx2', kind: 'effect', module: '@pack/particle-grid', range: [5, 15], params: { seed: 42, grid: 32, spacing: 0.1, amplitude: 0.8, speed: 1.5, pointSize: 0.03, palette: 1 } },
    { id: 'trans1', kind: 'transition', module: '@trans/cross-fade', range: [5, 7], params: { curve: 'linear' }, fromTrackId: 'fx1', toTrackId: 'fx2', duration: 2 }
  ],
  post: [
    { pass: 'Bloom', params: { strength: 0.8, radius: 0.2, threshold: 0.8 } }
  ]
};

export const useProjectStore = create<ProjectState>((set) => ({
  project: defaultProject,
  transport: { playing: false, time: 0, loop: null, playbackMode: 'edit' },
  selectedTrackId: null,
  setTime: (t) => set((s) => ({ transport: { ...s.transport, time: Math.max(0, Math.min(t, s.project.meta.duration)) } })),
  play: () => set((s) => ({ transport: { ...s.transport, playing: true } })),
  pause: () => set((s) => ({ transport: { ...s.transport, playing: false } })),
  stop: () => set((s) => ({ transport: { ...s.transport, playing: false, time: 0 } })),
  addTrack: (track) => set((s) => ({ project: { ...s.project, tracks: [...s.project.tracks, track] } })),
  removeTrack: (trackId) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.filter(t => t.id !== trackId) } })),
  updateTrackRange: (trackId, range) => set((s) => ({ project: { ...s.project, tracks: s.project.tracks.map(t => t.id === trackId ? { ...t, range } : t) } })),
  getActiveTrack: (time) => {
    // For backward compatibility, return the first active effect
    const state = useProjectStore.getState();
    return state.project.tracks.find(track =>
      track.kind === 'effect' && time >= track.range[0] && time < track.range[1]
    ) || null;
  },
  selectTrack: (trackId) => set((s) => ({ selectedTrackId: trackId })),
  setPlaybackMode: (mode) => set((s) => ({ transport: { ...s.transport, playbackMode: mode } })),
}));

