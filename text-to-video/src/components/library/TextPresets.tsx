import { TEXT_PRESETS } from '../../config/presets';
import { closestWeight } from '../../config/fonts';
import { useEditor } from '../../store/editorStore';
import { usePlayback } from '../../store/playbackStore';
import { Button } from '../ui/Button';
import { SpotlightCard } from '../ui/SpotlightCard';

export function TextPresets() {
  const addText = useEditor((s) => s.addText);
  const addAtPlayhead = (presetIndex?: number) =>
    addText(usePlayback.getState().time, presetIndex === undefined ? undefined : TEXT_PRESETS[presetIndex]);

  return (
    <div className="text-presets">
      <Button variant="primary" icon="text" onClick={() => addAtPlayhead()}>
        Add text layer
      </Button>
      <p className="panel-note">Presets combine a font, style and animation. Everything stays editable.</p>
      <div className="text-presets__grid">
        {TEXT_PRESETS.map((preset, i) => (
          <SpotlightCard key={preset.id} className="preset-card" onClick={() => addAtPlayhead(i)} role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && addAtPlayhead(i)}>
            <span
              className="preset-card__sample"
              style={{
                fontFamily: `"${preset.style.fontFamily ?? 'Montserrat'}"`,
                fontWeight: closestWeight(preset.style.fontFamily ?? 'Montserrat', preset.style.fontWeight ?? 900),
                textTransform: preset.style.uppercase ? 'uppercase' : 'none',
                color: preset.style.color,
                background: preset.style.background && preset.style.background !== 'none' ? preset.style.backgroundColor : undefined,
                WebkitTextStroke: preset.style.strokeWidth ? `1px ${preset.style.strokeColor}` : undefined,
              }}
            >
              {preset.sample}
            </span>
            <span className="preset-card__name">{preset.name}</span>
          </SpotlightCard>
        ))}
      </div>
    </div>
  );
}
