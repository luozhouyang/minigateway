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
import { servicesApi, type Service } from "@/lib/api/client";
import { toast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/services/")({
  component: ServicesList,
});

interface ServiceFormData {
  name: string;
  url?: string;
  protocol?: "http" | "https" | "grpc" | "grpcs";
  host?: string;
  port?: number;
  path?: string;
  connectTimeout?: number;
  writeTimeout?: number;
  readTimeout?: number;
  retries?: number;
  tags?: string;
}

function ServicesList() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    url: "",
    protocol: "http",
    host: "",
    port: undefined,
    path: "",
    connectTimeout: 60000,
    writeTimeout: 60000,
    readTimeout: 60000,
    retries: 5,
    tags: "",
  });

  useEffect(() => {
    void loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await servicesApi.list();
      setServices(response || []);
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load services",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        url: service.url || "",
        protocol: (service.protocol as ServiceFormData["protocol"]) || "http",
        host: service.host || "",
        port: service.port || undefined,
        path: service.path || "",
        connectTimeout: service.connectTimeout,
        writeTimeout: service.writeTimeout,
        readTimeout: service.readTimeout,
        retries: service.retries,
        tags: service.tags?.join(", ") || "",
      });
    } else {
      setEditingService(null);
      setFormData({
        name: "",
        url: "",
        protocol: "http",
        host: "",
        port: undefined,
        path: "",
        connectTimeout: 60000,
        writeTimeout: 60000,
        readTimeout: 60000,
        retries: 5,
        tags: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      port: formData.port ? Number(formData.port) : undefined,
      connectTimeout: formData.connectTimeout ? Number(formData.connectTimeout) : undefined,
      writeTimeout: formData.writeTimeout ? Number(formData.writeTimeout) : undefined,
      readTimeout: formData.readTimeout ? Number(formData.readTimeout) : undefined,
      retries: formData.retries ? Number(formData.retries) : undefined,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingService) {
        await servicesApi.update(editingService.id, payload);
        toast.success({
          title: "Success",
          description: "Service updated successfully",
        });
      } else {
        await servicesApi.create(payload);
        toast.success({
          title: "Success",
          description: "Service created successfully",
        });
      }
      setDialogOpen(false);
      void loadServices();
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save service",
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete service "${name}"?`)) {
      return;
    }

    try {
      await servicesApi.delete(id);
      toast.success({
        title: "Success",
        description: "Service deleted successfully",
      });
      void loadServices();
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete service",
      });
    }
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.host?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sea-ink)]">Services</h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">Manage your upstream services</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit" : "Create"} Service</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="my-service"
                  required
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url || ""}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="http://localhost:8080"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <select
                    id="protocol"
                    value={formData.protocol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        protocol: e.target.value as ServiceFormData["protocol"],
                      })
                    }
                    className="flex h-10 w-full rounded-lg border border-[var(--chip-line)] bg-transparent px-3 py-2 text-sm text-[var(--sea-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sea-ink)]"
                  >
                    <option value="http">http</option>
                    <option value="https">https</option>
                    <option value="grpc">grpc</option>
                    <option value="grpcs">grpcs</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={formData.host || ""}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        port: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="8080"
                  />
                </div>
                <div>
                  <Label htmlFor="path">Path</Label>
                  <Input
                    id="path"
                    value={formData.path || ""}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="/api"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="connectTimeout">Connect Timeout</Label>
                  <Input
                    id="connectTimeout"
                    type="number"
                    value={formData.connectTimeout || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        connectTimeout: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="60000"
                  />
                </div>
                <div>
                  <Label htmlFor="writeTimeout">Write Timeout</Label>
                  <Input
                    id="writeTimeout"
                    type="number"
                    value={formData.writeTimeout || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        writeTimeout: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="60000"
                  />
                </div>
                <div>
                  <Label htmlFor="readTimeout">Read Timeout</Label>
                  <Input
                    id="readTimeout"
                    type="number"
                    value={formData.readTimeout || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        readTimeout: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="60000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="retries">Retries</Label>
                <Input
                  id="retries"
                  type="number"
                  value={formData.retries || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      retries: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="5"
                />
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
                <Button type="submit">{editingService ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
            <Input
              placeholder="Search services..."
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
              <TableHead>Protocol</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-[var(--sea-ink-soft)]">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-[var(--sea-ink-soft)]">
                  No services found. Click "Add Service" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.protocol || "-"}</TableCell>
                  <TableCell>{service.host || "-"}</TableCell>
                  <TableCell>{service.port || "-"}</TableCell>
                  <TableCell>{service.path || "-"}</TableCell>
                  <TableCell>
                    {service.tags && service.tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {service.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-md bg-[var(--chip-bg)] px-2 py-1 text-xs font-medium text-[var(--sea-ink)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(service.id, service.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
