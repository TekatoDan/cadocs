import { cn } from "@/lib/utils";

type BrandLoaderProps = {
  className?: string;
  label?: string;
};

export function BrandLoader({
  className,
  label = "Loading CADOCS",
}: BrandLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-navy-950",
        className
      )}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <div className="relative flex h-36 w-36 items-center justify-center">
        <div
          className="absolute inset-7 rounded-full bg-[#075ee8]/15 blur-2xl dark:bg-cyan-400/10"
          aria-hidden="true"
        />
        <img
          src="/cadocs-loader.gif"
          alt=""
          className="relative h-32 w-32 object-contain"
          draggable={false}
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
