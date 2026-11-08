interface ShinyTextProps {
  text: string;
  className?: string;
}

/** A slow metallic sheen sweeping across text — inspired by react-bits' ShinyText. */
export function ShinyText({ text, className = '' }: ShinyTextProps) {
  return (
    <span className={`shiny-text ${className}`} data-text={text}>
      {text}
    </span>
  );
}
