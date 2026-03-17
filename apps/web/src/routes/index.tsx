import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Route as RouteIcon, Network, Users, Plug } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const stats = [
  {
    name: "Services",
    value: 0,
    icon: Server,
    href: "/services",
  },
  {
    name: "Routes",
    value: 0,
    icon: RouteIcon,
    href: "/routes",
  },
  {
    name: "Upstreams",
    value: 0,
    icon: Network,
    href: "/upstreams",
  },
  {
    name: "Consumers",
    value: 0,
    icon: Users,
    href: "/consumers",
  },
  {
    name: "Plugins",
    value: 0,
    icon: Plug,
    href: "/plugins",
  },
];

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--sea-ink)]">Dashboard</h1>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Overview of your Token Gateway resources
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <a key={stat.name} href={stat.href} className="no-underline">
              <Card className="transition-colors hover:bg-[var(--chip-bg)]/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                  <Icon className="h-4 w-4 text-[var(--sea-ink-soft)]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[var(--sea-ink)]">{stat.value}</div>
                  <p className="text-xs text-[var(--sea-ink-soft)]">Click to manage</p>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-[var(--sea-ink-soft)]">
            <li>
              Start by creating a{" "}
              <a href="/services" className="text-[var(--sea-ink)] underline">
                Service
              </a>{" "}
              to define your upstream API
            </li>
            <li>
              Create a{" "}
              <a href="/routes" className="text-[var(--sea-ink)] underline">
                Route
              </a>{" "}
              to map incoming requests to your Service
            </li>
            <li>
              Optionally configure{" "}
              <a href="/upstreams" className="text-[var(--sea-ink)] underline">
                Upstreams
              </a>{" "}
              for load balancing
            </li>
            <li>
              Add{" "}
              <a href="/consumers" className="text-[var(--sea-ink)] underline">
                Consumers
              </a>{" "}
              to manage API consumers and their credentials
            </li>
            <li>
              Enable{" "}
              <a href="/plugins" className="text-[var(--sea-ink)] underline">
                Plugins
              </a>{" "}
              for additional functionality like authentication, rate limiting, etc.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
