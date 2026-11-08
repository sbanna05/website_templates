import { glueSettings } from '../../audio/master';
import { useEditor } from '../../store/editorStore';
import { LevelMeter } from '../ui/LevelMeter';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';
import { EqEditor } from './EqEditor';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** The master bus: the final volume, tone and dynamics of the whole mix (preview and export). */
export function MasterInspector() {
  const master = useEditor((s) => s.project.master);
  const updateMaster = useEditor((s) => s.updateMaster);
  const glue = glueSettings(master.glue);

  return (
    <>
      <Section title="Output" icon="volume">
        <div className="master-output">
          <Slider label="Master volume" value={master.volume} min={0} max={1.5} defaultValue={1} format={pct} onChange={(volume) => updateMaster({ volume }, 'volume')} />
          <LevelMeter />
        </div>
        <Toggle
          label="Limiter"
          hint="Catches peaks just below 0 dB so loud mixes never distort in the export"
          checked={master.limiter}
          onChange={(limiter) => updateMaster({ limiter })}
        />
      </Section>

      <Section title="Glue" icon="layers">
        <Slider
          label="Bus compression"
          value={master.glue}
          min={0}
          max={1}
          defaultValue={0}
          format={(v) => (v === 0 ? 'Off' : `${glue.ratio.toFixed(1)}:1 at ${Math.round(glue.threshold)} dB`)}
          onChange={(value) => updateMaster({ glue: value }, 'glue')}
        />
        <p className="panel-note">Gently evens out the levels of every track so the mix sounds like one piece — how producers “glue” a mix together.</p>
      </Section>

      <Section title="Master EQ" icon="sliders">
        <EqEditor label="Master EQ" eq={master.eq} onChange={(eq, key) => updateMaster({ eq }, key)} />
      </Section>
    </>
  );
}
