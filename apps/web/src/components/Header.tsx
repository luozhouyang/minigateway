import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { LayoutDashboard, Server, Route, Network, Users, Plug, Bot } from "lucide-react";

const navigation = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard },
  { name: "Services", to: "/services", icon: Server },
  { name: "Routes", to: "/routes", icon: Route },
  { name: "Upstreams", to: "/upstreams", icon: Network },
  { name: "Consumers", to: "/consumers", icon: Users },
  { name: "Plugins", to: "/plugins", icon: Plug },
  { name: "LLM", to: "/llm", icon: Bot },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--chip-line)] bg-white/80 dark:bg-[var(--chip-bg)]/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-6">
        <nav className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.to}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]"
                    : "text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)]/50 hover:text-[var(--sea-ink)]",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive
                      ? "text-[var(--sea-ink)]"
                      : "text-[var(--sea-ink-soft)] group-hover:text-[var(--sea-ink)]",
                  )}
                />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
