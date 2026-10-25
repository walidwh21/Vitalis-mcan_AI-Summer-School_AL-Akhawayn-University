import { APP_NAME } from "@/config";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-9 w-9", className)} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d="M32 50C20 41 14 33.5 14 25.5 14 19.7 18.5 15 24.2 15c3.4 0 6.4 1.7 7.8 4.3C33.4 16.7 36.4 15 39.8 15 45.5 15 50 19.7 50 25.5 50 33.5 44 41 32 50Z"
        className="fill-primary-foreground"
      />
      <path
        d="M20 29h7l3-6 5 11 3-5h6"
        fill="none"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ tagline }: { tagline?: string }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-lg font-bold text-primary">{APP_NAME}</div>
        {tagline && <div className="text-xs text-muted-foreground">{tagline}</div>}
      </div>
    </div>
  );
}
