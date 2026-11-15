import { DEFAULT_TRANSFORM } from '../../config/defaults';
import type { Transform } from '../../types/project';
import { Button } from '../ui/Button';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';

interface TransformSectionProps {
  transform: Transform;
  onChange: (transform: Transform, key: string) => void;
  scaleLabel?: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Shared by visual and text clips. */
export function TransformSection({ transform, onChange, scaleLabel = 'Scale' }: TransformSectionProps) {
  const set = <K extends keyof Transform>(key: K) => (value: Transform[K]) => onChange({ ...transform, [key]: value }, `transform.${key}`);
  return (
    <Section
      title="Transform"
      icon="layers"
      aside={
        <Button size="sm" variant="ghost" onClick={() => onChange({ ...DEFAULT_TRANSFORM }, 'transform.reset')}>
          Reset
        </Button>
      }
    >
      <Slider label={scaleLabel} value={transform.scale} min={0.1} max={4} step={0.01} defaultValue={1} format={pct} onChange={set('scale')} />
      <div className="field-row">
        <Slider label="Position X" value={transform.x} min={-1} max={1} step={0.005} defaultValue={0} format={pct} onChange={set('x')} />
        <Slider label="Position Y" value={transform.y} min={-1} max={1} step={0.005} defaultValue={0} format={pct} onChange={set('y')} />
      </div>
      <Slider label="Rotation" value={transform.rotation} min={-180} max={180} step={1} defaultValue={0} format={(v) => `${v}°`} onChange={set('rotation')} />
      <Slider label="Opacity" value={transform.opacity} min={0} max={1} step={0.01} defaultValue={1} format={pct} onChange={set('opacity')} />
      <p className="panel-note">Tip: drag the element directly on the preview to reposition it.</p>
    </Section>
  );
}
