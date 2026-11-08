import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface SectionProps {
  title: string;
  icon?: IconName;
  defaultOpen?: boolean;
  aside?: ReactNode;
  children: ReactNode;
}

/** Collapsible inspector group. */
export function Section({ title, icon, defaultOpen = true, aside, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`section ${open ? 'is-open' : ''}`}>
      <header className="section__header">
        <button type="button" className="section__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {icon && <Icon name={icon} size={15} />}
          <span>{title}</span>
          <Icon name="chevron" size={14} className="section__chevron" />
        </button>
        {aside}
      </header>
      {open && <div className="section__body">{children}</div>}
    </section>
  );
}
