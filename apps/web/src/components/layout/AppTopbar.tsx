import { useLocation } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ThemeToggle from "@/components/ThemeToggle";

const ROUTE_META = [
  {
    match: (pathname: string) => pathname.startsWith("/dashboard"),
    title: "Dashboard",
    description: "Monitor gateway health, resource inventory, and recent changes.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/routes"),
    title: pathnameTitle("Routes", "Route Details"),
    description: "Define request matching rules and manage traffic policies.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/services"),
    title: pathnameTitle("Services", "Service Details"),
    description: "Manage upstream destinations and service-scoped plugins.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/upstreams"),
    title: "Upstreams",
    description: "Configure balancing groups and their target pools.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/consumers"),
    title: pathnameTitle("Consumers", "Consumer Details"),
    description: "Review identities, credentials, and consumer-scoped plugins.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/plugins"),
    title: pathnameTitle("Plugins", "Plugin Details"),
    description: "Inspect policy bindings, scope, and plugin configuration.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/llm"),
    title: pathnameTitle("LLM Resources", "LLM Resource Details"),
    description: "Manage providers, models, and router-facing LLM inventory.",
  },
  {
    match: (pathname: string) => pathname.startsWith("/settings"),
    title: "Settings",
    description: "Tune dashboard behavior and validate admin API connectivity.",
  },
];

export function AppTopbar() {
  const location = useLocation();
  const meta = ROUTE_META.find((item) => item.match(location.pathname)) || ROUTE_META[0];
  const resolvedTitle =
    typeof meta.title === "function" ? meta.title(location.pathname) : meta.title;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/72 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1600px] items-center gap-4 px-4 md:px-8">
        <div className="md:hidden">
          <SidebarTrigger className="h-10 w-10 rounded-2xl border border-border/70 bg-background/80 shadow-sm" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="truncate text-base font-semibold text-foreground">{resolvedTitle}</h2>
          </div>
          <p className="hidden text-xs text-muted-foreground md:block">{meta.description}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function pathnameTitle(collectionTitle: string, detailTitle: string) {
  return (pathname: string) => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.length > 1 ? detailTitle : collectionTitle;
  };
}
