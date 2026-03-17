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
import { consumersApi, credentialsApi, type Consumer, type Credential } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Key, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/consumers/")({
  component: ConsumersList,
});

interface ConsumerFormData {
  username: string;
  customId?: string;
  tags?: string;
}

interface CredentialFormData {
  credentialType: string;
  key?: string;
  secret?: string;
  tags?: string;
}

function ConsumersList() {
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [credentials, setCredentials] = useState<Record<string, Credential[]>>({});
  const [expandedConsumers, setExpandedConsumers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConsumer, setEditingConsumer] = useState<Consumer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ConsumerFormData>({
    username: "",
    customId: "",
    tags: "",
  });

  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(null);
  const [editingCredential, setEditingCredential] = useState<{
    consumerId: string;
    credential: Credential | null;
  } | null>(null);
  const [credentialFormData, setCredentialFormData] = useState<CredentialFormData>({
    credentialType: "key-auth",
    key: "",
    secret: "",
    tags: "",
  });

  useEffect(() => {
    void loadConsumers();
  }, []);

  const loadConsumers = async () => {
    try {
      setLoading(true);
      const response = await consumersApi.list();
      setConsumers(response || []);
      // Load credentials for each consumer
      for (const consumer of response || []) {
        await loadCredentials(consumer.id);
      }
    } catch (error) {
      toast.error("Failed to load consumers", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async (consumerId: string) => {
    try {
      const response = await credentialsApi.list(consumerId);
      setCredentials((prev) => ({ ...prev, [consumerId]: response || [] }));
    } catch {
      // Silently fail for credentials
    }
  };

  const toggleConsumerExpand = (consumerId: string) => {
    const newExpanded = new Set(expandedConsumers);
    if (newExpanded.has(consumerId)) {
      newExpanded.delete(consumerId);
    } else {
      newExpanded.add(consumerId);
    }
    setExpandedConsumers(newExpanded);
  };

  const handleOpenDialog = (consumer?: Consumer) => {
    if (consumer) {
      setEditingConsumer(consumer);
      setFormData({
        username: consumer.username || "",
        customId: consumer.customId || "",
        tags: consumer.tags?.join(", ") || "",
      });
    } else {
      setEditingConsumer(null);
      setFormData({
        username: "",
        customId: "",
        tags: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      username: formData.username,
      customId: formData.customId || undefined,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingConsumer) {
        await consumersApi.update(editingConsumer.id, payload);
        toast.success("Consumer updated successfully");
      } else {
        await consumersApi.create(payload);
        toast.success("Consumer created successfully");
      }
      setDialogOpen(false);
      void loadConsumers();
    } catch (error) {
      toast.error("Failed to save consumer", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete consumer "${username}"?`)) {
      return;
    }

    try {
      await consumersApi.delete(id);
      toast.success("Consumer deleted successfully");
      void loadConsumers();
    } catch (error) {
      toast.error("Failed to delete consumer", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleOpenCredentialDialog = (consumerId: string, credential?: Credential) => {
    setSelectedConsumerId(consumerId);
    if (credential) {
      setEditingCredential({ consumerId, credential });
      setCredentialFormData({
        credentialType: credential.credentialType,
        key: (credential.credential as any)?.key || "",
        secret: (credential.credential as any)?.secret || "",
        tags: credential.tags?.join(", ") || "",
      });
    } else {
      setEditingCredential({ consumerId, credential: null });
      setCredentialFormData({
        credentialType: "key-auth",
        key: "",
        secret: "",
        tags: "",
      });
    }
    setCredentialDialogOpen(true);
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedConsumerId) return;

    const credential = {
      credentialType: credentialFormData.credentialType,
      credential: {
        key: credentialFormData.key,
        secret: credentialFormData.secret,
      },
      tags: credentialFormData.tags
        ? credentialFormData.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
    };

    try {
      if (editingCredential?.credential) {
        await credentialsApi.update(
          selectedConsumerId,
          editingCredential.credential.id,
          credential,
        );
        toast.success("Credential updated successfully");
      } else {
        await credentialsApi.create(selectedConsumerId, credential);
        toast.success("Credential created successfully");
      }
      setCredentialDialogOpen(false);
      await loadCredentials(selectedConsumerId);
    } catch (error) {
      toast.error("Failed to save credential", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleDeleteCredential = async (consumerId: string, id: string, key: string) => {
    if (!confirm(`Are you sure you want to delete credential "${key}"?`)) {
      return;
    }

    try {
      await credentialsApi.delete(consumerId, id);
      toast.success("Credential deleted successfully");
      await loadCredentials(consumerId);
    } catch (error) {
      toast.error("Failed to delete credential", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const filteredConsumers = consumers.filter(
    (consumer) =>
      consumer.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consumer.customId?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consumers</h1>
          <p className="text-sm text-muted-foreground">Manage API consumers and credentials</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Consumer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingConsumer ? "Edit" : "Create"} Consumer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="john-doe"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customId">Custom ID</Label>
                <Input
                  id="customId"
                  value={formData.customId || ""}
                  onChange={(e) => setFormData({ ...formData, customId: e.target.value })}
                  placeholder="external-user-id"
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags || ""}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="production, premium"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingConsumer ? "Update" : "Create"}</Button>
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
              placeholder="Search consumers..."
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
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Custom ID</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredConsumers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No consumers found. Click "Add Consumer" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filteredConsumers.map((consumer) => (
                <>
                  <TableRow key={consumer.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleConsumerExpand(consumer.id)}
                      >
                        {expandedConsumers.has(consumer.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{consumer.username || "-"}</TableCell>
                    <TableCell>{consumer.customId || "-"}</TableCell>
                    <TableCell>
                      {consumer.tags && consumer.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {consumer.tags.map((tag, i) => (
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(consumer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(consumer.id, consumer.username || consumer.id)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedConsumers.has(consumer.id) && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <div className="border-t bg-muted/30 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Credentials</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleOpenCredentialDialog(consumer.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Credential
                            </Button>
                          </div>
                          {credentials[consumer.id] && credentials[consumer.id].length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Credential Type</TableHead>
                                  <TableHead>Key</TableHead>
                                  <TableHead>Secret</TableHead>
                                  <TableHead>Tags</TableHead>
                                  <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {credentials[consumer.id].map((cred) => (
                                  <TableRow key={cred.id}>
                                    <TableCell className="font-medium">
                                      {cred.credentialType}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {(cred.credential as any)?.key || "-"}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {(cred.credential as any)?.secret ? "••••••••" : "-"}
                                    </TableCell>
                                    <TableCell>
                                      {cred.tags && cred.tags.length > 0 ? (
                                        <div className="flex gap-1 flex-wrap">
                                          {cred.tags.map((tag, i) => (
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
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            handleOpenCredentialDialog(consumer.id, cred)
                                          }
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            handleDeleteCredential(
                                              consumer.id,
                                              cred.id,
                                              (cred.credential as any)?.key || cred.id,
                                            )
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground py-4">
                              No credentials for this consumer. Click "Add Credential" to create
                              one.
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Credential Dialog */}
      <Dialog open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCredential?.credential ? "Edit" : "Create"} Credential
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCredentialSubmit} className="space-y-4">
            <div>
              <Label htmlFor="credentialType">Credential Type *</Label>
              <select
                id="credentialType"
                value={credentialFormData.credentialType}
                onChange={(e) =>
                  setCredentialFormData({ ...credentialFormData, credentialType: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="key-auth">Key Auth</option>
                <option value="jwt">JWT</option>
                <option value="basic-auth">Basic Auth</option>
                <option value="hmac-auth">HMAC Auth</option>
              </select>
            </div>
            <div>
              <Label htmlFor="key">Key *</Label>
              <Input
                id="key"
                value={credentialFormData.key || ""}
                onChange={(e) =>
                  setCredentialFormData({ ...credentialFormData, key: e.target.value })
                }
                placeholder="Enter credential key"
                required
              />
            </div>
            <div>
              <Label htmlFor="secret">Secret</Label>
              <Input
                id="secret"
                type="password"
                value={credentialFormData.secret || ""}
                onChange={(e) =>
                  setCredentialFormData({ ...credentialFormData, secret: e.target.value })
                }
                placeholder="Enter secret (leave unchanged to keep current)"
              />
            </div>
            <div>
              <Label htmlFor="credentialTags">Tags (comma separated)</Label>
              <Input
                id="credentialTags"
                value={credentialFormData.tags || ""}
                onChange={(e) =>
                  setCredentialFormData({ ...credentialFormData, tags: e.target.value })
                }
                placeholder="production, premium"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCredentialDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{editingCredential?.credential ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
