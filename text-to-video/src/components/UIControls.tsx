import BackgroundControls from './BackgroundControls';
import TextBoxEditor from './TextBoxEditor';
import type { BackgroundSettings, TextBox, VideoSettings } from '../types';

interface UIControlsProps {
  settings: VideoSettings;
  onTextBoxChange: <K extends keyof TextBox>(id: string, key: K, value: TextBox[K]) => void;
  onAddTextBox: () => void;
  onRemoveTextBox: (id: string) => void;
  onBackgroundChange: <K extends keyof BackgroundSettings>(key: K, value: BackgroundSettings[K]) => void;
}

export default function UIControls({
  settings,
  onTextBoxChange,
  onAddTextBox,
  onRemoveTextBox,
  onBackgroundChange,
}: UIControlsProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Text to video</h1>
        <p>Layer captions over a color, image, or video background.</p>
      </div>

      <BackgroundControls background={settings.background} onChange={onBackgroundChange} />

      <div className="textbox-list">
        {settings.textBoxes.map((box, i) => (
          <TextBoxEditor
            key={box.id}
            textBox={box}
            index={i}
            defaultOpen={i === 0}
            canRemove={settings.textBoxes.length > 1}
            onChange={onTextBoxChange}
            onRemove={onRemoveTextBox}
          />
        ))}
      </div>

      <button type="button" className="add-textbox-button" onClick={onAddTextBox}>
        + Add text box
      </button>
    </aside>
  );
}
