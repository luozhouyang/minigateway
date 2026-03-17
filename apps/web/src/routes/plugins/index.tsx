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
import { pluginsApi, type Plugin } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/plugins/")({
  component: PluginsList,
});

interface PluginFormData {
  name: string;
  serviceId?: string;
  routeId?: string;
  consumerId?: string;
  config?: string;
  enabled: boolean;
  tags?: string;
}

function PluginsList() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<PluginFormData>({
    name: "",
    serviceId: "",
    routeId: "",
    consumerId: "",
    config: "{}",
    enabled: true,
    tags: "",
  });

  useEffect(() => {
    void loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const response = await pluginsApi.list();
      setPlugins(response || []);
    } catch (error) {
      toast.error("Failed to load plugins", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (plugin?: Plugin) => {
    if (plugin) {
      setEditingPlugin(plugin);
      setFormData({
        name: plugin.name || "",
        serviceId: plugin.serviceId || "",
        routeId: plugin.routeId || "",
        consumerId: plugin.consumerId || "",
        config: JSON.stringify(plugin.config || {}, null, 2),
        enabled: plugin.enabled ?? true,
        tags: plugin.tags?.join(", ") || "",
      });
    } else {
      setEditingPlugin(null);
      setFormData({
        name: "",
        serviceId: "",
        routeId: "",
        consumerId: "",
        config: "{}",
        enabled: true,
        tags: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let parsedConfig = {};
    try {
      parsedConfig = formData.config ? JSON.parse(formData.config) : {};
    } catch {
      toast.error("Invalid JSON", {
        description: "Plugin config must be valid JSON",
      });
      return;
    }

    const payload = {
      name: formData.name,
      serviceId: formData.serviceId || undefined,
      routeId: formData.routeId || undefined,
      consumerId: formData.consumerId || undefined,
      config: parsedConfig,
      enabled: formData.enabled,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingPlugin) {
        await pluginsApi.update(editingPlugin.id, payload);
        toast.success("Plugin updated successfully");
      } else {
        await pluginsApi.create(payload);
        toast.success("Plugin created successfully");
      }
      setDialogOpen(false);
      void loadPlugins();
    } catch (error) {
      toast.error("Failed to save plugin", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete plugin "${name}"?`)) {
      return;
    }

    try {
      await pluginsApi.delete(id);
      toast.success("Plugin deleted successfully");
      void loadPlugins();
    } catch (error) {
      toast.error("Failed to delete plugin", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleToggleEnabled = async (plugin: Plugin) => {
    try {
      await pluginsApi.update(plugin.id, { enabled: !plugin.enabled });
      toast.success(`Plugin ${!plugin.enabled ? "enabled" : "disabled"}`);
      void loadPlugins();
    } catch (error) {
      toast.error("Failed to update plugin", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const filteredPlugins = plugins.filter(
    (plugin) =>
      plugin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plugins</h1>
          <p className="text-sm text-muted-foreground">Manage API plugins and extensions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Plugin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlugin ? "Edit" : "Create"} Plugin</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Plugin Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="rate-limiting"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="serviceId">Service ID</Label>
                  <Input
                    id="serviceId"
                    value={formData.serviceId || ""}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="routeId">Route ID</Label>
                  <Input
                    id="routeId"
                    value={formData.routeId || ""}
                    onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="consumerId">Consumer ID</Label>
                  <Input
                    id="consumerId"
                    value={formData.consumerId || ""}
                    onChange={(e) => setFormData({ ...formData, consumerId: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="config">Config (JSON)</Label>
                <textarea
                  id="config"
                  value={formData.config || "{}"}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  className="flex h-32 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags || ""}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="production, security"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingPlugin ? "Update" : "Create"}</Button>
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
              placeholder="Search plugins..."
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
              <TableHead>Scope</TableHead>
              <TableHead>Config</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredPlugins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No plugins found. Click "Add Plugin" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filteredPlugins.map((plugin) => (
                <TableRow key={plugin.id}>
                  <TableCell className="font-medium">{plugin.name || "-"}</TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {plugin.serviceId && (
                        <div>
                          <span className="font-medium">Service:</span> {plugin.serviceId}
                        </div>
                      )}
                      {plugin.routeId && (
                        <div>
                          <span className="font-medium">Route:</span> {plugin.routeId}
                        </div>
                      )}
                      {plugin.consumerId && (
                        <div>
                          <span className="font-medium">Consumer:</span> {plugin.consumerId}
                        </div>
                      )}
                      {!plugin.serviceId && !plugin.routeId && !plugin.consumerId && (
                        <span className="text-muted-foreground">Global</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plugin.config && Object.keys(plugin.config).length > 0 ? (
                      <pre className="text-xs bg-muted rounded px-2 py-1 max-w-[200px] overflow-auto">
                        {JSON.stringify(plugin.config, null, 2)}
                      </pre>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {plugin.tags && plugin.tags.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {plugin.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium"
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
                    <Button variant="ghost" size="icon" onClick={() => handleToggleEnabled(plugin)}>
                      {plugin.enabled ? (
                        <ToggleLeft className="h-5 w-5 text-green-500" />
                      ) : (
                        <ToggleRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plugin)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plugin.id, plugin.name || plugin.id)}
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
