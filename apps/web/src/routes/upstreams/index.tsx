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
import { upstreamsApi, targetsApi, type Upstream, type Target } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Server } from "lucide-react";

export const Route = createFileRoute("/upstreams/")({
  component: UpstreamsList,
});

interface UpstreamFormData {
  name: string;
  algorithm?: string;
  hashOn?: string;
  hashFallback?: string;
  slots?: number;
  tags?: string;
}

interface TargetFormData {
  target: string;
  weight?: number;
  tags?: string;
}

function UpstreamsList() {
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [targets, setTargets] = useState<Record<string, Target[]>>({});
  const [_loading, _setLoading] = useState(true);
  const [upstreamDialogOpen, setUpstreamDialogOpen] = useState(false);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingUpstream, setEditingUpstream] = useState<Upstream | null>(null);
  const [editingTarget, setEditingTarget] = useState<{
    upstreamId: string;
    target: Target | null;
  } | null>(null);
  const [selectedUpstream, setSelectedUpstream] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [upstreamFormData, setUpstreamFormData] = useState<UpstreamFormData>({
    name: "",
    algorithm: "round-robin",
    hashOn: "none",
    hashFallback: "none",
    slots: 10000,
    tags: "",
  });

  const [targetFormData, setTargetFormData] = useState<TargetFormData>({
    target: "",
    weight: 100,
    tags: "",
  });

  useEffect(() => {
    void loadUpstreams();
  }, []);

  const loadUpstreams = async () => {
    try {
      _setLoading(true);
      const response = await upstreamsApi.list();
      setUpstreams(response || []);
      // Load targets for each upstream
      for (const upstream of response || []) {
        await loadTargets(upstream.id);
      }
    } catch (error) {
      toast.error("Failed to load upstreams", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      _setLoading(false);
    }
  };

  const loadTargets = async (upstreamId: string) => {
    try {
      const response = await targetsApi.list(upstreamId);
      setTargets((prev) => ({ ...prev, [upstreamId]: response || [] }));
    } catch {
      // Silently fail for targets
    }
  };

  const handleOpenUpstreamDialog = (upstream?: Upstream) => {
    if (upstream) {
      setEditingUpstream(upstream);
      setUpstreamFormData({
        name: upstream.name,
        algorithm: upstream.algorithm || "round-robin",
        hashOn: upstream.hashOn || "none",
        hashFallback: upstream.hashFallback || "none",
        slots: upstream.slots || 10000,
        tags: upstream.tags?.join(", ") || "",
      });
    } else {
      setEditingUpstream(null);
      setUpstreamFormData({
        name: "",
        algorithm: "round-robin",
        hashOn: "none",
        hashFallback: "none",
        slots: 10000,
        tags: "",
      });
    }
    setUpstreamDialogOpen(true);
  };

  const handleOpenTargetDialog = (upstreamId: string, target?: Target) => {
    setSelectedUpstream(upstreamId);
    if (target) {
      setEditingTarget({ upstreamId, target });
      setTargetFormData({
        target: target.target,
        weight: target.weight || 100,
        tags: target.tags?.join(", ") || "",
      });
    } else {
      setEditingTarget({ upstreamId, target: null });
      setTargetFormData({
        target: "",
        weight: 100,
        tags: "",
      });
    }
    setTargetDialogOpen(true);
  };

  const handleUpstreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: upstreamFormData.name,
      algorithm: upstreamFormData.algorithm,
      hashOn: upstreamFormData.hashOn,
      hashFallback: upstreamFormData.hashFallback,
      slots: upstreamFormData.slots,
      tags: upstreamFormData.tags
        ? upstreamFormData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingUpstream) {
        await upstreamsApi.update(editingUpstream.id, payload);
        toast.success("Upstream updated successfully");
      } else {
        await upstreamsApi.create(payload);
        toast.success("Upstream created successfully");
      }
      setUpstreamDialogOpen(false);
      void loadUpstreams();
    } catch (error) {
      toast.error("Failed to save upstream", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUpstream) return;

    const payload = {
      target: targetFormData.target,
      weight: targetFormData.weight,
      tags: targetFormData.tags
        ? targetFormData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingTarget?.target) {
        await targetsApi.update(selectedUpstream, editingTarget.target.id, payload);
        toast.success("Target updated successfully");
      } else {
        await targetsApi.create(selectedUpstream, payload);
        toast.success("Target created successfully");
      }
      setTargetDialogOpen(false);
      await loadTargets(selectedUpstream);
    } catch (error) {
      toast.error("Failed to save target", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteUpstream = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete upstream "${name}"?`)) {
      return;
    }

    try {
      await upstreamsApi.delete(id);
      toast.success("Upstream deleted successfully");
      void loadUpstreams();
    } catch (error) {
      toast.error("Failed to delete upstream", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteTarget = async (upstreamId: string, id: string, target: string) => {
    if (!confirm(`Are you sure you want to delete target "${target}"?`)) {
      return;
    }

    try {
      await targetsApi.delete(upstreamId, id);
      toast.success("Target deleted successfully");
      await loadTargets(upstreamId);
    } catch (error) {
      toast.error("Failed to delete target", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const filteredUpstreams = upstreams.filter((upstream) =>
    upstream.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upstreams & Targets</h1>
          <p className="text-sm text-muted-foreground">
            Manage load balancing upstreams and their targets
          </p>
        </div>
        <Dialog open={upstreamDialogOpen} onOpenChange={setUpstreamDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenUpstreamDialog()}>
              <Plus className="h-4 w-4" />
              Add Upstream
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUpstream ? "Edit" : "Create"} Upstream</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpstreamSubmit} className="space-y-4">
              <div>
                <Label htmlFor="upstreamName">Name *</Label>
                <Input
                  id="upstreamName"
                  value={upstreamFormData.name}
                  onChange={(e) =>
                    setUpstreamFormData({ ...upstreamFormData, name: e.target.value })
                  }
                  placeholder="my-upstream"
                  required
                />
              </div>
              <div>
                <Label htmlFor="algorithm">Algorithm</Label>
                <select
                  id="algorithm"
                  value={upstreamFormData.algorithm}
                  onChange={(e) =>
                    setUpstreamFormData({
                      ...upstreamFormData,
                      algorithm: e.target.value,
                    })
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  <option value="round-robin">round-robin</option>
                  <option value="least-connections">least-connections</option>
                  <option value="hash">hash</option>
                </select>
              </div>
              <div>
                <Label htmlFor="hashOn">Hash On</Label>
                <select
                  id="hashOn"
                  value={upstreamFormData.hashOn}
                  onChange={(e) =>
                    setUpstreamFormData({
                      ...upstreamFormData,
                      hashOn: e.target.value,
                    })
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  <option value="none">none</option>
                  <option value="consumer">consumer</option>
                  <option value="ip">ip</option>
                  <option value="header">header</option>
                  <option value="cookie">cookie</option>
                </select>
              </div>
              <div>
                <Label htmlFor="hashFallback">Hash Fallback</Label>
                <select
                  id="hashFallback"
                  value={upstreamFormData.hashFallback}
                  onChange={(e) =>
                    setUpstreamFormData({
                      ...upstreamFormData,
                      hashFallback: e.target.value,
                    })
                  }
                  className="flex h-10 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  <option value="none">none</option>
                  <option value="consumer">consumer</option>
                  <option value="ip">ip</option>
                  <option value="header">header</option>
                  <option value="cookie">cookie</option>
                </select>
              </div>
              <div>
                <Label htmlFor="slots">Slots</Label>
                <Input
                  id="slots"
                  type="number"
                  value={upstreamFormData.slots}
                  onChange={(e) =>
                    setUpstreamFormData({
                      ...upstreamFormData,
                      slots: e.target.value ? Number(e.target.value) : 10000,
                    })
                  }
                  placeholder="10000"
                />
              </div>
              <div>
                <Label htmlFor="upstreamTags">Tags (comma separated)</Label>
                <Input
                  id="upstreamTags"
                  value={upstreamFormData.tags || ""}
                  onChange={(e) =>
                    setUpstreamFormData({ ...upstreamFormData, tags: e.target.value })
                  }
                  placeholder="production, api"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setUpstreamDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">{editingUpstream ? "Update" : "Create"}</Button>
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
              placeholder="Search upstreams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {filteredUpstreams.map((upstream) => {
        const upstreamTargets = targets[upstream.id] || [];
        return (
          <Card key={upstream.id}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-foreground" />
                  <div>
                    <h3 className="font-semibold text-foreground">{upstream.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Algorithm: {upstream.algorithm || "round-robin"} • {upstreamTargets.length}{" "}
                      target(s)
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenTargetDialog(upstream.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Target
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenUpstreamDialog(upstream)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUpstream(upstream.id, upstream.name)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Target</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upstreamTargets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No targets configured. Click "Add Target" to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    upstreamTargets.map((target) => (
                      <TableRow key={target.id}>
                        <TableCell className="font-medium">{target.target}</TableCell>
                        <TableCell>{target.weight || 100}</TableCell>
                        <TableCell>
                          {target.tags && target.tags.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {target.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenTargetDialog(upstream.id, target)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDeleteTarget(upstream.id, target.id, target.target)
                              }
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
            </div>
          </Card>
        );
      })}

      {filteredUpstreams.length === 0 && (
        <Card>
          <div className="text-center py-8 text-muted-foreground">
            No upstreams found. Click "Add Upstream" to create one.
          </div>
        </Card>
      )}

      {/* Target Dialog */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTarget?.target ? "Edit" : "Add"} Target</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTargetSubmit} className="space-y-4">
            <div>
              <Label htmlFor="target">Target *</Label>
              <Input
                id="target"
                value={targetFormData.target}
                onChange={(e) => setTargetFormData({ ...targetFormData, target: e.target.value })}
                placeholder="192.168.1.1:8080"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Format: host:port or just host</p>
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                value={targetFormData.weight}
                onChange={(e) =>
                  setTargetFormData({
                    ...targetFormData,
                    weight: e.target.value ? Number(e.target.value) : 100,
                  })
                }
                placeholder="100"
              />
            </div>
            <div>
              <Label htmlFor="targetTags">Tags (comma separated)</Label>
              <Input
                id="targetTags"
                value={targetFormData.tags || ""}
                onChange={(e) => setTargetFormData({ ...targetFormData, tags: e.target.value })}
                placeholder="primary, production"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setTargetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingTarget?.target ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
