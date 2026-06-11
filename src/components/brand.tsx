import { cn } from "@/lib/utils";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-extrabold tracking-tight", className)}>
      <span className={light ? "text-white" : "text-loca-600"}>LOCA</span>
      <span className="inline-block h-2 w-2 rounded-full bg-lima-400" />
    </span>
  );
}

export function EvaAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-loca-500 to-loca-700 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      E
    </span>
  );
}
