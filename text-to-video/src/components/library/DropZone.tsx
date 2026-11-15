import { useRef, useState, type DragEvent } from 'react';
import { ACCEPTED_MEDIA } from '../../media/assetLoader';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../ui/Icon';

interface DropZoneProps {
  accept?: string;
  title: string;
  hint: string;
}

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes('Files');

export function DropZone({ accept = ACCEPTED_MEDIA, title, hint }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const importFiles = useEditor((s) => s.importFiles);

  const onDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    void importFiles([...event.dataTransfer.files]);
  };

  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''}`}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <button type="button" className="dropzone__button" onClick={() => inputRef.current?.click()}>
        <span className="dropzone__icon">
          <Icon name="upload" size={20} />
        </span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => {
          void importFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
