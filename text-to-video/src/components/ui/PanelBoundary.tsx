import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from './Icon';

interface PanelBoundaryProps {
  /** Shown in the fallback ("The timeline hit a problem"). */
  name: string;
  /** Grid-area class of the panel, so the fallback takes its place in the layout. */
  className: string;
  children: ReactNode;
}

interface PanelBoundaryState {
  error: Error | null;
}

/**
 * Keeps a crash inside one panel. The project lives in the stores, not in the
 * components, so nothing is lost: "Try again" simply re-mounts the panel.
 */
export class PanelBoundary extends Component<PanelBoundaryProps, PanelBoundaryState> {
  state: PanelBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PanelBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ArticVid] ${this.props.name} crashed`, error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <section className={`panel panel-crash ${this.props.className}`} role="alert">
        <Icon name="close" size={22} />
        <strong>The {this.props.name} hit a problem</strong>
        <p>Your project is safe — it is kept (and autosaved) outside this panel.</p>
        <code>{error.message}</code>
        <button type="button" className="btn btn--primary btn--sm" onClick={this.retry}>
          <span>Try again</span>
        </button>
      </section>
    );
  }
}
