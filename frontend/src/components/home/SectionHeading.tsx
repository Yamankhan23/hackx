import type { ReactNode } from "react";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";

type Props = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "reveal max-w-3xl",
        inView && "reveal-visible",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-200/80">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.6rem] md:leading-[1.15]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
