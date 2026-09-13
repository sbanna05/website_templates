import { useState } from 'react';
import type { AnimationStyle, EffectType, TextBox } from '../types';

interface TextBoxEditorProps {
  textBox: TextBox;
  index: number;
  defaultOpen: boolean;
  canRemove: boolean;
  onChange: <K extends keyof TextBox>(id: string, key: K, value: TextBox[K]) => void;
  onRemove: (id: string) => void;
}

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Lucida Console', value: '"Lucida Console", monospace' },
  { label: 'Brush Script MT', value: '"Brush Script MT", cursive' },
  { label: 'Pacifico', value: '"Pacifico", cursive' }
];

const ANIMATION_OPTIONS: { label: string; value: AnimationStyle }[] = [
  { label: 'Fade in', value: 'fade' },
  { label: 'Zoom pop', value: 'zoom' },
  { label: 'Typewriter', value: 'typewriter' },
  { label: 'Bounce in', value: 'bounce' },
  { label: 'Slide up', value: 'slide-up' },
  { label: 'Blur in', value: 'blur-in' },
  { label: 'Karaoke highlight', value: 'karaoke' },
];

const EFFECT_OPTIONS: { label: string; value: EffectType }[] = [
  { label: 'None', value: 'none' },
  { label: 'Neon glow', value: 'neon' },
  { label: 'Glitch', value: 'glitch' },
  { label: 'Shake', value: 'shake' },
  { label: 'Wave', value: 'wave' },
  { label: 'Rainbow', value: 'rainbow' },
  { label: 'Outline', value: 'outline' },
];

export default function TextBoxEditor({
  textBox,
  index,
  defaultOpen,
  canRemove,
  onChange,
  onRemove,
}: TextBoxEditorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const preview = textBox.text.trim() || `Text box ${index + 1}`;
  const title = preview.length > 26 ? `${preview.slice(0, 26)}…` : preview;

  return (
    <div className="textbox-editor">
      <button type="button" className="textbox-editor-header" onClick={() => setIsOpen((v) => !v)}>
        <span className="textbox-editor-title">{title}</span>
        <span className="textbox-editor-chevron" data-open={isOpen}>
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="textbox-editor-body">
          <div className="control-group">
            <label htmlFor={`text-${textBox.id}`}>Text</label>
            <textarea
              id={`text-${textBox.id}`}
              rows={3}
              value={textBox.text}
              onChange={(e) => onChange(textBox.id, 'text', e.target.value)}
              placeholder="Type this box's text..."
            />
          </div>

          <div className="control-group">
            <label htmlFor={`anim-${textBox.id}`}>Animation style</label>
            <select
              id={`anim-${textBox.id}`}
              value={textBox.animationStyle}
              onChange={(e) => onChange(textBox.id, 'animationStyle', e.target.value as AnimationStyle)}
            >
              {ANIMATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor={`effect-${textBox.id}`}>Effect</label>
            <select
              id={`effect-${textBox.id}`}
              value={textBox.effect}
              onChange={(e) => onChange(textBox.id, 'effect', e.target.value as EffectType)}
            >
              {EFFECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor={`font-${textBox.id}`}>Font</label>
            <select
              id={`font-${textBox.id}`}
              value={textBox.fontFamily}
              onChange={(e) => onChange(textBox.id, 'fontFamily', e.target.value)}
            >
              {FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group control-row">
            <label htmlFor={`color-${textBox.id}`}>Font color</label>
            <input
              id={`color-${textBox.id}`}
              type="color"
              value={textBox.fontColor}
              onChange={(e) => onChange(textBox.id, 'fontColor', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label htmlFor={`size-${textBox.id}`}>
              Font size <span className="control-value">{textBox.fontSize}px</span>
            </label>
            <input
              id={`size-${textBox.id}`}
              type="range"
              min={32}
              max={160}
              step={2}
              value={textBox.fontSize}
              onChange={(e) => onChange(textBox.id, 'fontSize', Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label htmlFor={`speed-${textBox.id}`}>
              Speed <span className="control-value">{textBox.speed}/10</span>
            </label>
            <input
              id={`speed-${textBox.id}`}
              type="range"
              min={1}
              max={10}
              step={1}
              value={textBox.speed}
              onChange={(e) => onChange(textBox.id, 'speed', Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label htmlFor={`pos-${textBox.id}`}>
              Vertical position <span className="control-value">{textBox.verticalPosition}%</span>
            </label>
            <input
              id={`pos-${textBox.id}`}
              type="range"
              min={10}
              max={90}
              step={1}
              value={textBox.verticalPosition}
              onChange={(e) => onChange(textBox.id, 'verticalPosition', Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label htmlFor={`delay-${textBox.id}`}>
              Starts at <span className="control-value">{textBox.startDelaySeconds}s</span>
            </label>
            <input
              id={`delay-${textBox.id}`}
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={textBox.startDelaySeconds}
              onChange={(e) => onChange(textBox.id, 'startDelaySeconds', Number(e.target.value))}
            />
          </div>

          {canRemove && (
            <button type="button" className="textbox-editor-remove" onClick={() => onRemove(textBox.id)}>
              Remove this text box
            </button>
          )}
        </div>
      )}
    </div>
  );
}
