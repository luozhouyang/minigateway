import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Server, Route, Network, Users, Plug, Settings } from "lucide-react";

const navigation = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard },
  { name: "Services", to: "/services", icon: Server },
  { name: "Routes", to: "/routes", icon: Route },
  { name: "Upstreams", to: "/upstreams", icon: Network },
  { name: "Consumers", to: "/consumers", icon: Users },
  { name: "Plugins", to: "/plugins", icon: Plug },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[var(--chip-line)] bg-white dark:bg-[var(--chip-bg)]">
      <div className="flex h-16 items-center border-b border-[var(--chip-line)] px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
          <span className="text-base font-bold text-[var(--sea-ink)]">Token Gateway</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-4">
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
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--chip-bg)] text-[var(--sea-ink)]"
                  : "text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)]/50 hover:text-[var(--sea-ink)]",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive
                    ? "text-[var(--sea-ink)]"
                    : "text-[var(--sea-ink-soft)] group-hover:text-[var(--sea-ink)]",
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--chip-line)] p-4">
        <button
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--chip-bg)]/50 hover:text-[var(--sea-ink)]",
          )}
        >
          <Settings className="h-5 w-5 transition-colors" />
          Settings
        </button>
      </div>
    </aside>
  );
}
