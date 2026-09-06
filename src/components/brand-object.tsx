import Image from "next/image";
import { BRAND } from "@/lib/brand";

export function BrandObject({ size = 72 }: { size?: number }) {
  return (
    <Image
      className="brand-object"
      src={BRAND.objectPath}
      alt=""
      width={size}
      height={Math.round(size * 1.03)}
    />
  );
}
