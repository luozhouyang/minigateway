import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { routesApi, servicesApi, type Route as RouteConfig, type Service } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/routes/")({
  component: RoutesList,
});

interface RouteFormData {
  name: string;
  serviceId?: string;
  protocols?: string[];
  methods?: string[];
  hosts?: string[];
  paths?: string[];
  headers?: Record<string, string | string[]>;
  stripPath?: boolean;
  preserveHost?: boolean;
  tags?: string;
}

function RoutesList() {
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<RouteFormData>({
    name: "",
    serviceId: "",
    protocols: [],
    methods: [],
    hosts: [],
    paths: [],
    headers: {},
    stripPath: false,
    preserveHost: false,
    tags: "",
  });

  useEffect(() => {
    void loadRoutes();
    void loadServices();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response = await routesApi.list();
      setRoutes(response || []);
    } catch (error) {
      toast.error("Failed to load routes", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await servicesApi.list();
      setServices(response || []);
    } catch (error) {
      toast.error("Failed to load services", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleOpenDialog = (route?: RouteConfig) => {
    if (route) {
      setEditingRoute(route);
      setFormData({
        name: route.name,
        serviceId: route.serviceId || "",
        protocols: route.protocols || [],
        methods: route.methods || [],
        hosts: route.hosts || [],
        paths: route.paths || [],
        headers: route.headers || {},
        stripPath: route.stripPath || false,
        preserveHost: route.preserveHost || false,
        tags: route.tags?.join(", ") || "",
      });
    } else {
      setEditingRoute(null);
      setFormData({
        name: "",
        serviceId: "",
        protocols: [],
        methods: [],
        hosts: [],
        paths: [],
        headers: {},
        stripPath: false,
        preserveHost: false,
        tags: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      serviceId: formData.serviceId || undefined,
      protocols: formData.protocols,
      methods: formData.methods,
      hosts: formData.hosts,
      paths: formData.paths,
      headers: formData.headers,
      stripPath: formData.stripPath,
      preserveHost: formData.preserveHost,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingRoute) {
        await routesApi.update(editingRoute.id, payload);
        toast.success("Route updated successfully");
      } else {
        await routesApi.create(payload);
        toast.success("Route created successfully");
      }
      setDialogOpen(false);
      void loadRoutes();
    } catch (error) {
      toast.error("Failed to save route", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete route "${name}"?`)) {
      return;
    }

    try {
      await routesApi.delete(id);
      toast.success("Route deleted successfully");
      void loadRoutes();
    } catch (error) {
      toast.error("Failed to delete route", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const filteredRoutes = routes.filter((route) =>
    route.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Routes</h1>
          <p className="text-sm text-muted-foreground">
            Manage your API routes and request routing
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoute ? "Edit" : "Create"} Route</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="my-route"
                  required
                />
              </div>
              <div>
                <Label htmlFor="serviceId">Service</Label>
                <select
                  id="serviceId"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">No service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Protocols (comma separated)</Label>
                <Input
                  value={formData.protocols?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      protocols: e.target.value
                        ? e.target.value
                            .split(",")
                            .map((p) => p.trim())
                            .filter(Boolean)
                        : [],
                    })
                  }
                  placeholder="http, https"
                />
              </div>
              <div>
                <Label>Methods (comma separated)</Label>
                <Input
                  value={formData.methods?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      methods: e.target.value
                        ? e.target.value
                            .split(",")
                            .map((m) => m.trim().toUpperCase())
                            .filter(Boolean)
                        : [],
                    })
                  }
                  placeholder="GET, POST, PUT, DELETE"
                />
              </div>
              <div>
                <Label>Hosts (comma separated)</Label>
                <Input
                  value={formData.hosts?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hosts: e.target.value
                        ? e.target.value
                            .split(",")
                            .map((h) => h.trim())
                            .filter(Boolean)
                        : [],
                    })
                  }
                  placeholder="api.example.com, example.com"
                />
              </div>
              <div>
                <Label>Paths (comma separated)</Label>
                <Input
                  value={formData.paths?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paths: e.target.value
                        ? e.target.value
                            .split(",")
                            .map((p) => p.trim())
                            .filter(Boolean)
                        : [],
                    })
                  }
                  placeholder="/api/users, /api/posts"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="stripPath"
                    type="checkbox"
                    checked={formData.stripPath}
                    onChange={(e) => setFormData({ ...formData, stripPath: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <Label htmlFor="stripPath" className="text-sm font-normal">
                    Strip Path
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="preserveHost"
                    type="checkbox"
                    checked={formData.preserveHost}
                    onChange={(e) => setFormData({ ...formData, preserveHost: e.target.checked })}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <Label htmlFor="preserveHost" className="text-sm font-normal">
                    Preserve Host
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags || ""}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="production, api"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingRoute ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search routes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Protocols</TableHead>
              <TableHead>Methods</TableHead>
              <TableHead>Paths</TableHead>
              <TableHead>Strip Path</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No routes found. Click "Add Route" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoutes.map((route) => {
                const serviceName = services.find((s) => s.id === route.serviceId)?.name || "-";
                return (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>{serviceName}</TableCell>
                    <TableCell>
                      {route.protocols && route.protocols.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {route.protocols.map((protocol, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                            >
                              {protocol}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {route.methods && route.methods.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {route.methods.map((method, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {route.paths && route.paths.length > 0 ? (
                        <div className="flex gap-1 flex-wrap text-xs">
                          {route.paths.map((path, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
                            >
                              {path}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{route.stripPath ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(route)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(route.id, route.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
