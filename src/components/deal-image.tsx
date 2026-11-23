"use client";

import Image from "next/image";
import { useState } from "react";
import { MaterialIcon } from "./material-icon";

export function DealImage({
  src,
  alt,
  sizes,
  className,
  loading = "lazy",
  fetchPriority = "auto",
  priority = false,
  fallbackSize = 22
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
  priority?: boolean;
  fallbackSize?: number;
}) {
  const [failedSource, setFailedSource] = useState<string>();

  if (failedSource === src) {
    return <MaterialIcon name="image_not_supported" size={fallbackSize} label="상품 이미지 없음" />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      loading={priority ? "eager" : loading}
      fetchPriority={priority ? "high" : fetchPriority}
      priority={priority}
      onError={() => setFailedSource(src)}
    />
  );
}
