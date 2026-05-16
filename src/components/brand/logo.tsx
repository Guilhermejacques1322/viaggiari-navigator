import logoSrc from "@/assets/viaggiari-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export function Logo({ size = 40, className, withWordmark = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoSrc}
        alt="Viaggiari Travel"
        width={size}
        height={size}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span className="brand-title text-base hidden sm:inline">Viaggiari Travel</span>
      )}
    </div>
  );
}
