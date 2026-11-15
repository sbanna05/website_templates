import { PreviewStage } from './PreviewStage';
import { TransportBar } from './TransportBar';

export function PreviewPanel() {
  return (
    <section className="panel preview" aria-label="Preview">
      <PreviewStage />
      <TransportBar />
    </section>
  );
}
