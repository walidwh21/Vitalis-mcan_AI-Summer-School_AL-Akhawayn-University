import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  className?: string;
  trackClassName?: string;
}

export function Slider({ value, onChange, min, max, step, label, className, trackClassName }: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      onValueChange={([v]) => onChange(v ?? min)}
      min={min}
      max={max}
      step={step}
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className={cn("absolute h-full bg-primary", trackClassName)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className="block h-5 w-5 rounded-full border-2 border-primary bg-card shadow transition-transform hover:scale-110"
      />
    </SliderPrimitive.Root>
  );
}
