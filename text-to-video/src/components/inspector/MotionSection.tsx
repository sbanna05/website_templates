import { memo } from 'react';
import { MOTION_CURVE_OPTIONS, MOTION_OPTIONS, type MotionOption } from '../../config/options';
import { sampleCurve } from '../../engine/motion';
import type { MotionCurve, VisualClip } from '../../types/project';
import { Section } from '../ui/Section';
import { Slider } from '../ui/Slider';

const GROUPS: MotionOption['group'][] = ['Zoom', 'Pan', 'Turn', 'Organic'];
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Tiny position-over-time graph, so "ease in" vs "hang" is visible at a glance. */
const CurveGlyph = memo(function CurveGlyph({ curve }: { curve: MotionCurve }) {
  const d =
    curve === 'on-beat'
      ? 'M2 30 H10 V22 H18 V14 H26 V6 H34'
      : sampleCurve(curve)
          .map((y, i, all) => `${i === 0 ? 'M' : 'L'}${(2 + (i / (all.length - 1)) * 32).toFixed(1)} ${(30 - y * 24).toFixed(1)}`)
          .join(' ');
  return (
    <svg viewBox="0 0 36 32" className="curve-glyph" aria-hidden="true">
      <path d="M2 30 H34" className="curve-glyph__axis" />
      <path d={d} className="curve-glyph__line" />
    </svg>
  );
});

interface MotionSectionProps {
  clip: VisualClip;
  patch: (patch: Partial<VisualClip>, key?: string) => void;
}

export function MotionSection({ clip, patch }: MotionSectionProps) {
  return (
    <Section title="Motion" icon="sparkle">
      {GROUPS.map((group) => (
        <div className="field" key={group}>
          <span className="field__label">{group}</span>
          <div className="motion-grid" role="radiogroup" aria-label={`${group} motions`}>
            {MOTION_OPTIONS.filter((o) => o.group === group).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={clip.motion === option.value}
                className={`motion-tile ${clip.motion === option.value ? 'is-active' : ''}`}
                onClick={() => patch({ motion: option.value })}
              >
                <span className="motion-tile__glyph" aria-hidden="true">
                  {option.glyph}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {clip.motion !== 'none' && (
        <>
          <Slider
            label="Amount"
            value={clip.motionAmount}
            min={0.02}
            max={1}
            step={0.01}
            defaultValue={0.12}
            format={pct}
            onChange={(motionAmount) => patch({ motionAmount }, 'motionAmount')}
          />
          <div className="field">
            <span className="field__label">
              <span>Pace</span>
              <span className="field__value">{MOTION_CURVE_OPTIONS.find((o) => o.value === clip.motionCurve)?.hint}</span>
            </span>
            <div className="curve-grid" role="radiogroup" aria-label="Motion pace">
              {MOTION_CURVE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={clip.motionCurve === option.value}
                  title={option.hint}
                  className={`curve-tile ${clip.motionCurve === option.value ? 'is-active' : ''}`}
                  onClick={() => patch({ motionCurve: option.value })}
                >
                  <CurveGlyph curve={option.value} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
