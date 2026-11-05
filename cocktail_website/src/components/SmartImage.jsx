import { useState } from "react";

/**
 * <img> with lazy loading and a graceful placeholder when the source is missing
 * or a remote API image fails – no more broken-image icons.
 */
export default function SmartImage({ src, alt, className = "", fallbackIcon = "ri-goblet-line", ...rest }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <span className={`img-fallback ${className}`} role="img" aria-label={alt || "Image unavailable"}>
        <i className={fallbackIcon} aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      {...rest}
    />
  );
}
