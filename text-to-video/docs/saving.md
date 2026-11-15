# Saving, autosave and crash safety

Work is protected in three layers, from automatic to deliberate.

## 1. Panels can't take the whole app down (`components/ui/PanelBoundary.tsx`)

Library, preview, inspector and timeline each sit inside an error boundary. If one of them throws while
rendering, only that panel shows *"The … hit a problem — Try again"*; the others keep working. The project
lives in the stores, not in components, so retrying simply re-mounts the panel with nothing lost.

## 2. Autosave (IndexedDB) — automatic

- About **1 s after any change** (a clip edit, a new asset, a beat-grid change) the project is written to
  the browser's IndexedDB; it is also written immediately when you switch tabs or close the page.
- When ArticVid opens, the **last session is restored** ("Restored your last session…").
- The indicator next to *Project* shows `Autosave on` → `Saving…` → `Autosaved 14:32` (red on failure).
- Storage layout (`persistence/autosaveStorage.ts`): the manifest under one key, each media file under its
  asset id. Media is written once (assets never change after import) and removed when no longer used. The
  manifest is written *after* the media, so an interrupted save leaves the previous session intact.
- The app asks the browser to keep this storage persistent (`navigator.storage.persist()`), so it isn't
  evicted under storage pressure.
- Limits: autosave lives in **this browser on this computer**. Clearing site data removes it, and very large
  projects can hit the browser's storage quota — you get a clear message, and project files still work.

## 3. Project files (`.articvid`) — deliberate

*Project* menu (or shortcuts):

| Action | Shortcut | What it does |
| --- | --- | --- |
| New project | — | Starts empty (asks first if the current project isn't saved to a file) |
| Open… | `Ctrl O` | Opens a `.articvid` file |
| Save | `Ctrl S` | Saves; in Chrome/Edge the first save asks where, later saves overwrite that file in place |
| Save as… | `Ctrl ⇧ S` | Saves to a new file |

A `.articvid` file is a ZIP: `project.json` (the manifest) + `media/` with every imported file (stored
uncompressed — they're already compressed). It's self-contained: back it up, keep versions, or open it in
another browser or computer. Browsers without the File System Access API (Firefox, Safari) download the file
on save and use a normal file picker to open.

## The saved format (`persistence/schema.ts`, `snapshot.ts`)

Both layers share one snapshot:

```
{ format: "articvid", version: 1, savedAt, project, assets: [ { …analysis, media, mediaType } ] }
```

- **Saved:** the whole project (tracks, clips, marks, master), and per asset its analysis — beats and
  hand-made beat grids, lyrics, stem links — so nothing is re-analysed on load.
- **Not saved:** runtime state (object URLs, decoded audio, loading flags) and the undo history.
- **Stems** have no source file; they're encoded to WAV on first save and the WAV is reused afterwards.
- **Loading** decodes every media file again (fresh waveforms, thumbnails, audio buffers). Missing or broken
  media doesn't fail the load: the asset is marked as missing and you get a toast listing it.
- **Versioning:** `version` is checked — a file from a newer ArticVid is refused with a clear message, and
  `normalizeProject()` fills in fields older saves don't have (e.g. EQ, master bus), so old projects keep
  opening as features are added.
- **Safety when opening:** the file is fully read and validated *before* the current project is replaced,
  so a damaged file can't wipe what you have open. Autosave is paused while a project is being swapped in.
