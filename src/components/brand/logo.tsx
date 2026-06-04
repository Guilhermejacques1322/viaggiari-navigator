import logoAsset from "@/assets/viaggiari-logo-full.png.asset.json";
import monogramAsset from "@/assets/viaggiari-monogram.png.asset.json";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  /** When true, renders the full wordmark logo. When false, renders the VG monogram. */
  withWordmark?: boolean;
}

export function Logo({ size = 40, className, withWordmark = false }: LogoProps) {
  if (withWordmark) {
    // Full wordmark — keep aspect ratio, scale by height
    const height = size;
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={logoAsset.url}
          alt="Viaggiari"
          height={height}
          className="object-contain"
          style={{ height, width: "auto" }}
        />
      </div>
    );
  }

  // VG monogram (square)
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src={monogramAsset.url}
        alt="Viaggiari"
        width={size}
        height={size}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
