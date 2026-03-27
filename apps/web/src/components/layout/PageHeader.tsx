import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function PageHeader(props: PageHeaderProps) {
  const Icon = props.icon;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.9rem] border border-border/70 bg-card/94 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_28px_72px_-36px_hsl(var(--primary)/0.35)] backdrop-blur-sm",
        props.className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_40%),radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_30%)]" />
      <div className="relative flex flex-col gap-6 px-6 py-6 md:px-8 md:py-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {Icon ? (
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-[1.1rem] border border-primary/20 bg-primary/12 text-primary shadow-sm md:flex">
              <Icon className="h-6 w-6" />
            </div>
          ) : null}

          <div className="min-w-0 space-y-3">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-[2rem]">
                {props.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-[15px]">
                {props.description}
              </p>
            </div>

            {props.meta ? (
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {props.meta}
              </div>
            ) : null}
          </div>
        </div>

        {props.actions ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">{props.actions}</div>
        ) : null}
      </div>
    </section>
  );
}
