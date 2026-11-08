import { fontByFamily } from '../../config/fonts';
import { TEXT_IN_OPTIONS, TEXT_LOOP_OPTIONS, TEXT_OUT_OPTIONS, TEXT_UNIT_OPTIONS } from '../../config/options';
import { EASE_OPTIONS } from '../../lib/easing';
import type { TextAnimation, TextClip, TextStyle } from '../../types/project';
import { ColorField } from '../ui/ColorField';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { FontPicker } from './FontPicker';
import { TextMusicSection } from './TextMusicSection';
import { TransformSection } from './TransformSection';
import { useClipPatch } from './useClipPatch';

const secs = (v: number) => `${v.toFixed(2)}s`;

export function TextInspector({ clip }: { clip: TextClip }) {
  const patch = useClipPatch(clip);
  const { style, animation } = clip;
  const setStyle = <K extends keyof TextStyle>(key: K, coalesce = true) => (value: TextStyle[K]) =>
    patch((c) => ({ style: { ...c.style, [key]: value } }), coalesce ? `style.${key}` : undefined);
  const setAnim = <K extends keyof TextAnimation>(key: K, coalesce = true) => (value: TextAnimation[K]) =>
    patch((c) => ({ animation: { ...c.animation, [key]: value } }), coalesce ? `anim.${key}` : undefined);
  const weights = fontByFamily(style.fontFamily).weights;

  return (
    <>
      <Section title="Content" icon="text">
        <div className="field">
          <label className="field__label" htmlFor={`text-${clip.id}`}>
            <span>Text</span>
            <span className="field__value">Enter = new line</span>
          </label>
          <textarea
            id={`text-${clip.id}`}
            rows={3}
            value={clip.text}
            onChange={(e) => patch({ text: e.target.value }, 'text')}
            placeholder="Type something…"
          />
        </div>
        <Slider label="Duration" value={clip.duration} min={0.3} max={30} step={0.1} format={secs} onChange={(duration) => patch({ duration }, 'duration')} />
      </Section>

      <Section title="Typography" icon="text">
        <FontPicker
          value={style.fontFamily}
          onChange={(family) => patch((c) => ({ style: { ...c.style, fontFamily: family } }))}
        />
        {weights.length > 1 && (
          <Segmented label="Weight" value={weights.includes(style.fontWeight) ? style.fontWeight : weights[weights.length - 1]}
            options={weights.map((w) => ({ label: String(w), value: w }))} onChange={setStyle('fontWeight', false)} />
        )}
        <Slider label="Size" value={style.fontSize} min={24} max={260} step={1} defaultValue={92} format={(v) => `${v}px`} onChange={setStyle('fontSize')} />
        <div className="field-row">
          <Slider label="Letter spacing" value={style.letterSpacing} min={-10} max={40} step={0.5} defaultValue={0} format={(v) => `${v}px`} onChange={setStyle('letterSpacing')} />
          <Slider label="Line height" value={style.lineHeight} min={0.8} max={2} step={0.05} defaultValue={1.15} format={(v) => v.toFixed(2)} onChange={setStyle('lineHeight')} />
        </div>
        <Slider label="Wrap width" value={style.maxWidth} min={0.2} max={1} step={0.01} defaultValue={0.84} format={(v) => `${Math.round(v * 100)}%`} onChange={setStyle('maxWidth')} />
        <Segmented
          label="Align"
          value={style.align}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ]}
          onChange={setStyle('align', false)}
        />
        <div className="field-row">
          <Toggle label="UPPERCASE" checked={style.uppercase} onChange={setStyle('uppercase', false)} />
          <Toggle label="Italic" checked={style.italic} onChange={setStyle('italic', false)} />
        </div>
      </Section>

      <Section title="Color & outline" icon="sliders">
        <ColorField label="Fill" value={style.color} onChange={setStyle('color')} />
        {animation.in === 'karaoke' && <ColorField label="Karaoke highlight" value={style.highlightColor} onChange={setStyle('highlightColor')} />}
        <Slider label="Outline" value={style.strokeWidth} min={0} max={16} step={0.5} defaultValue={0} format={(v) => `${v}px`} onChange={setStyle('strokeWidth')} />
        {style.strokeWidth > 0 && <ColorField label="Outline color" value={style.strokeColor} onChange={setStyle('strokeColor')} />}
        <Slider label="Shadow" value={style.shadowBlur} min={0} max={60} step={1} defaultValue={18} format={(v) => `${v}px`} onChange={setStyle('shadowBlur')} />
        <Segmented
          label="Background"
          value={style.background}
          options={[
            { label: 'None', value: 'none' },
            { label: 'Box', value: 'box' },
            { label: 'Pill', value: 'pill' },
          ]}
          onChange={setStyle('background', false)}
        />
        {style.background !== 'none' && <ColorField label="Background color" value={style.backgroundColor} onChange={setStyle('backgroundColor')} />}
      </Section>

      <Section title="Animation" icon="sparkle">
        <div className="field-row">
          <Select label="Entrance" value={animation.in} options={TEXT_IN_OPTIONS} onChange={setAnim('in', false)} />
          <Select label="Ease" value={animation.ease} options={EASE_OPTIONS} onChange={setAnim('ease', false)} />
        </div>
        <Segmented label="Animate by" value={animation.unit} options={TEXT_UNIT_OPTIONS} onChange={setAnim('unit', false)} />
        <div className="field-row">
          <Slider label="Entrance length" value={animation.inDuration} min={0.05} max={2} step={0.05} defaultValue={0.35} format={secs} onChange={setAnim('inDuration')} />
          <Slider label="Stagger" value={animation.stagger} min={0} max={1} step={0.01} defaultValue={0.12} format={secs} onChange={setAnim('stagger')} />
        </div>
        <div className="field-row">
          <Select label="Exit" value={animation.out} options={TEXT_OUT_OPTIONS} onChange={setAnim('out', false)} />
          <Slider label="Exit length" value={animation.outDuration} min={0.05} max={2} step={0.05} defaultValue={0.3} format={secs} onChange={setAnim('outDuration')} />
        </div>
        <Select label="Loop / beat effect" value={animation.loop} options={TEXT_LOOP_OPTIONS} onChange={setAnim('loop', false)} />
      </Section>

      <TextMusicSection clip={clip} patch={patch} />

      <TransformSection transform={clip.transform} onChange={(transform, key) => patch({ transform }, key)} />
    </>
  );
}
