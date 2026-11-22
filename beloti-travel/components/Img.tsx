import type { CSSProperties } from "react";

type Props = {
  name: string; // nome base em /public/img
  alt: string;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  family?: boolean; // conjunto 480/960
  width?: number;
  height?: number;
};

/** <picture> responsivo AVIF → WebP → JPG, gerado por scripts/build-images.mjs */
export function Img({ name, alt, sizes = "100vw", className, style, priority, family, width = 1600, height = 1000 }: Props) {
  const ws = family ? [480, 960] : [640, 1280, 1920];
  const set = (ext: string) => ws.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(", ");
  const fallback = `/img/${name}-${ws[1]}.jpg`;
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
