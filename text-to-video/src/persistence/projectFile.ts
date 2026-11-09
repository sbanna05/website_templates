import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { downloadBlob, sanitizeFilename } from '../lib/download';
import type { Asset, Project } from '../types/project';
import { SaveFormatError, parseSaved, type SavedProject } from './schema';
import { createSnapshot } from './snapshot';

/*
 * Project files (.articvid): a ZIP with `project.json` (the manifest) and a
 * `media/` folder holding every imported file. Self-contained, so a project can
 * be backed up, moved to another computer or opened in another browser.
 */

export const PROJECT_EXTENSION = '.articvid';
const MANIFEST = 'project.json';
const PICKER_TYPES = [{ description: 'ArticVid project', accept: { 'application/zip': [PROJECT_EXTENSION] } }];

const extensionOf = (name: string) => /\.[a-z0-9]{1,5}$/i.exec(name)?.[0] ?? '';

export async function encodeProjectFile(project: Project, assets: Record<string, Asset>): Promise<Blob> {
  const { manifest, media } = createSnapshot(project, assets, (asset) => `media/${asset.id}${extensionOf(asset.name)}`);
  const entries: Zippable = { [MANIFEST]: [strToU8(JSON.stringify(manifest)), { level: 6 }] };
  for (const [path, blob] of media) {
    // Media is already compressed (MP4, MP3, JPG…), so it's stored as is — fast and no bigger.
    entries[path] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  }
  return new Blob([zipSync(entries)], { type: 'application/zip' });
}

/** A validated project file, ready to restore. Reading it has no side effects, so a bad file can't harm the open project. */
export interface ProjectSource {
  saved: SavedProject;
  readMedia: (key: string) => Promise<Blob | undefined>;
}

export async function readProjectFile(file: Blob): Promise<ProjectSource> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new SaveFormatError('This file is not an ArticVid project (or it is damaged).');
  }
  if (!files[MANIFEST]) throw new SaveFormatError('This file is not an ArticVid project (project.json is missing).');
  const saved = parseSaved(JSON.parse(strFromU8(files[MANIFEST])));
  return { saved, readMedia: async (path) => (files[path] ? new Blob([files[path] as Uint8Array<ArrayBuffer>]) : undefined) };
}

export const projectFileName = (projectName: string) => `${sanitizeFilename(projectName)}${PROJECT_EXTENSION}`;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

/**
 * Where "Save" writes. With the File System Access API (Chrome, Edge) the user
 * picks a file once and later saves overwrite it in place; elsewhere every save
 * is a download.
 */
export class ProjectFileTarget {
  private handle: FileSystemFileHandle | null = null;

  get name(): string | null {
    return this.handle?.name ?? null;
  }

  forget(): void {
    this.handle = null;
  }

  /** Writes the blob; returns the file name, or null when the user cancelled the picker. */
  async write(blob: Blob, suggestedName: string, saveAs: boolean): Promise<string | null> {
    if (!window.showSaveFilePicker) {
      downloadBlob(blob, suggestedName);
      return suggestedName;
    }
    try {
      if (saveAs || !this.handle) this.handle = await window.showSaveFilePicker({ suggestedName, types: PICKER_TYPES });
      const writable = await this.handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return this.handle.name;
    } catch (error) {
      if (isAbort(error)) return null;
      throw error;
    }
  }

  /** Lets the user pick a project file; remembers it so "Save" writes back to it. Null when cancelled. */
  async pick(): Promise<File | null> {
    if (!window.showOpenFilePicker) {
      this.handle = null;
      return pickWithInput();
    }
    try {
      const [handle] = await window.showOpenFilePicker({ types: PICKER_TYPES, multiple: false });
      this.handle = handle;
      return handle.getFile();
    } catch (error) {
      if (isAbort(error)) return null;
      throw error;
    }
  }
}

function pickWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = PROJECT_EXTENSION;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
