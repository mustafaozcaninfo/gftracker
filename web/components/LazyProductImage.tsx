"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface LazyProductImageProps {
  src: string;
  alt: string;
}

export function LazyProductImage({ src, alt }: LazyProductImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[340/450] w-full overflow-hidden bg-neutral-100"
    >
      {visible ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-top"
          loading="lazy"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-neutral-200" />
      )}
    </div>
  );
}
