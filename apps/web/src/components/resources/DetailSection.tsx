import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stringifyJson } from "@/lib/dashboard-utils";

export interface DetailSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DetailSection(props: DetailSectionProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 bg-card/95 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.32)]",
        props.className,
      )}
    >
      <CardHeader className="gap-4 border-b border-border/60 bg-muted/20 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>{props.title}</CardTitle>
          {props.description ? <CardDescription>{props.description}</CardDescription> : null}
        </div>
        {props.actions ? <div className="flex flex-wrap gap-2">{props.actions}</div> : null}
      </CardHeader>
      <CardContent className="p-6">{props.children}</CardContent>
    </Card>
  );
}

export interface DetailFieldProps {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}

export function DetailField(props: DetailFieldProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {props.label}
      </div>
      <div
        className={
          props.mono
            ? "mt-2 break-all font-mono text-sm text-foreground"
            : "mt-2 text-sm text-foreground"
        }
      >
        {props.value ?? "—"}
      </div>
    </div>
  );
}

export function TagList({ tags }: { tags?: string[] | null }) {
  if (!tags?.length) {
    return <div className="text-sm text-muted-foreground">No tags</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="rounded-full bg-background/80">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

export interface JsonPreviewProps {
  value: unknown;
  emptyLabel?: string;
}

export function JsonPreview(props: JsonPreviewProps) {
  const text = stringifyJson(props.value);
  const isEmptyObject = text === "{}";

  if (isEmptyObject && props.emptyLabel) {
    return <div className="text-sm text-muted-foreground">{props.emptyLabel}</div>;
  }

  return (
    <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-muted/20 p-4 font-mono text-xs leading-6 text-foreground">
      {text}
    </pre>
  );
}
