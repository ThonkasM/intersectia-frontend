"use client";

import Image from "next/image";
import { useState } from "react";

export default function MemberAvatar({
  src,
  alt,
  initials,
}: {
  src: string;
  alt: string;
  initials: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border border-amber-400/30 bg-amber-400/10 font-mono text-base text-accent-text lg:size-28">
      {!loaded && initials}
      <Image
        src={src}
        alt={alt}
        width={112}
        height={112}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 size-full object-cover transition-opacity ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}
