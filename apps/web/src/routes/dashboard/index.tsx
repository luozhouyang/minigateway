import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routesApi, servicesApi, upstreamsApi, consumersApi, pluginsApi } from "@/lib/api/client";
import {
  Server,
  Route as RouteIcon,
  Settings,
  Users,
  Plug,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: Dashboard,
});

interface DashboardStats {
  services: number;
  routes: number;
  upstreams: number;
  consumers: number;
  plugins: number;
}

interface RecentItem {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    services: 0,
    routes: 0,
    upstreams: 0,
    consumers: 0,
    plugins: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load all stats in parallel
      const [services, routes, upstreams, consumers, plugins] = await Promise.all([
        servicesApi.list(),
        routesApi.list(),
        upstreamsApi.list(),
        consumersApi.list(),
        pluginsApi.list(),
      ]);

      setStats({
        services: services.length,
        routes: routes.length,
        upstreams: upstreams.length,
        consumers: consumers.length,
        plugins: plugins.length,
      });

      // Combine and sort recent items
      const allItems: RecentItem[] = [
        ...services.map((s) => ({
          id: s.id,
          name: s.name,
          type: "Service",
          createdAt: s.createdAt,
        })),
        ...routes.map((r) => ({ id: r.id, name: r.name, type: "Route", createdAt: r.createdAt })),
        ...upstreams.map((u) => ({
          id: u.id,
          name: u.name,
          type: "Upstream",
          createdAt: u.createdAt,
        })),
        ...consumers.map((c) => ({
          id: c.id,
          name: c.username || c.id,
          type: "Consumer",
          createdAt: c.createdAt,
        })),
        ...plugins.map((p) => ({ id: p.id, name: p.name, type: "Plugin", createdAt: p.createdAt })),
      ];

      // Sort by creation date (newest first) and take latest 10
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentItems(allItems.slice(0, 10));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Services",
      value: stats.services,
      icon: Server,
      description: "Backend services configured",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Routes",
      value: stats.routes,
      icon: RouteIcon,
      description: "API routes configured",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Upstreams",
      value: stats.upstreams,
      icon: Settings,
      description: "Load balancers configured",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Consumers",
      value: stats.consumers,
      icon: Users,
      description: "API consumers registered",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Plugins",
      value: stats.plugins,
      icon: Plug,
      description: "Plugins installed",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
  ];

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your Token Gateway infrastructure
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">All systems operational</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.services > 0 ? `${stats.services} services running` : "No services configured"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Configuration Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="font-medium">{stats.routes}</span> routes across{" "}
              <span className="font-medium">{stats.upstreams || stats.services}</span>{" "}
              {stats.upstreams || stats.services ? "backends" : "backends"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.plugins > 0 ? `${stats.plugins} plugins active` : "No plugins configured"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Consumer Activity</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="font-medium">{stats.consumers}</span> registered consumers
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.consumers > 0 ? "Ready to handle authenticated requests" : "No consumers yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Items</CardTitle>
          <CardDescription>Latest created resources across your gateway</CardDescription>
        </CardHeader>
        <CardContent>
          {recentItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentItems.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium">
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No items yet. Start by creating a Service or Route.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
