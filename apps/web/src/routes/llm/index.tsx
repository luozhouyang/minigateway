import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LLM_CLIENT_PROFILES,
  LLM_PROVIDER_PROTOCOLS,
  LLM_PROVIDER_VENDORS,
  llmModelsApi,
  llmProvidersApi,
  type LlmClientProfile,
  type LlmModel,
  type LlmProvider,
  type LlmProviderAuthConfig,
  type LlmProviderProtocol,
  type LlmProviderVendor,
} from "@/lib/api/client";
import { useDashboardSettings } from "@/lib/dashboard-settings";
import {
  confirmAction,
  formatTimestamp,
  getErrorMessage,
  joinCommaSeparated,
  parseCommaSeparatedInput,
  parseJsonInput,
  previewJson,
  stringifyJson,
} from "@/lib/dashboard-utils";
import { toast } from "sonner";
import { Bot, Database, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/llm/")({
  component: LlmResourcesPage,
});

interface ProviderFormState {
  name: string;
  displayName: string;
  vendor: LlmProviderVendor;
  protocol: LlmProviderProtocol;
  baseUrl: string;
  clients: string;
  headers: string;
  auth: string;
  adapterConfig: string;
  enabled: boolean;
  tags: string;
}

interface ModelFormState {
  providerId: string;
  name: string;
  upstreamModel: string;
  metadata: string;
  enabled: boolean;
  tags: string;
}

const EMPTY_PROVIDER_FORM: ProviderFormState = {
  name: "",
  displayName: "",
  vendor: "openai",
  protocol: "openai-compatible",
  baseUrl: "",
  clients: "",
  headers: "{}",
  auth: stringifyJson({ type: "none" }),
  adapterConfig: "{}",
  enabled: true,
  tags: "",
};

const EMPTY_MODEL_FORM: ModelFormState = {
  providerId: "",
  name: "",
  upstreamModel: "",
  metadata: "{}",
  enabled: true,
  tags: "",
};

function LlmResourcesPage() {
  const { settings } = useDashboardSettings();
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerSearchQuery, setProviderSearchQuery] = useState("");
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LlmProvider | null>(null);
  const [editingModel, setEditingModel] = useState<LlmModel | null>(null);
  const [providerFormState, setProviderFormState] =
    useState<ProviderFormState>(EMPTY_PROVIDER_FORM);
  const [modelFormState, setModelFormState] = useState<ModelFormState>(EMPTY_MODEL_FORM);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData(isRefresh = false) {
    try {
      setError(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [providerList, modelList] = await Promise.all([
        llmProvidersApi.list(),
        llmModelsApi.list(),
      ]);

      setProviders(providerList);
      setModels(modelList);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load LLM resources"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openCreateProviderDialog() {
    setEditingProvider(null);
    setProviderFormState(EMPTY_PROVIDER_FORM);
    setProviderDialogOpen(true);
  }

  function openEditProviderDialog(provider: LlmProvider) {
    setEditingProvider(provider);
    setProviderFormState({
      name: provider.name,
      displayName: provider.displayName || "",
      vendor: provider.vendor,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      clients: joinCommaSeparated(provider.clients),
      headers: stringifyJson(provider.headers),
      auth: stringifyJson(provider.auth),
      adapterConfig: stringifyJson(provider.adapterConfig),
      enabled: provider.enabled,
      tags: joinCommaSeparated(provider.tags),
    });
    setProviderDialogOpen(true);
  }

  function openCreateModelDialog(providerId = "") {
    setEditingModel(null);
    setModelFormState({
      ...EMPTY_MODEL_FORM,
      providerId,
    });
    setModelDialogOpen(true);
  }

  function openEditModelDialog(model: LlmModel) {
    setEditingModel(model);
    setModelFormState({
      providerId: model.providerId,
      name: model.name,
      upstreamModel: model.upstreamModel,
      metadata: stringifyJson(model.metadata),
      enabled: model.enabled,
      tags: joinCommaSeparated(model.tags),
    });
    setModelDialogOpen(true);
  }

  async function handleProviderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingProvider(true);

      const payload: Partial<LlmProvider> = {
        name: providerFormState.name.trim(),
        displayName: providerFormState.displayName.trim() || undefined,
        vendor: providerFormState.vendor,
        protocol: providerFormState.protocol,
        baseUrl: providerFormState.baseUrl.trim(),
        clients: parseClientProfiles(providerFormState.clients),
        headers:
          parseJsonInput<Record<string, string>>(providerFormState.headers, "Provider headers") ||
          {},
        auth: parseJsonInput<LlmProviderAuthConfig>(
          providerFormState.auth,
          "Provider auth config",
        ) || {
          type: "none",
        },
        adapterConfig:
          parseJsonInput<Record<string, unknown>>(
            providerFormState.adapterConfig,
            "Adapter config",
          ) || {},
        enabled: providerFormState.enabled,
        tags: parseCommaSeparatedInput(providerFormState.tags),
      };

      if (editingProvider) {
        await llmProvidersApi.update(editingProvider.id, payload);
        toast.success("LLM provider updated");
      } else {
        await llmProvidersApi.create(payload);
        toast.success("LLM provider created");
      }

      setProviderDialogOpen(false);
      await loadData(true);
    } catch (saveError) {
      toast.error("Failed to save LLM provider", {
        description: getErrorMessage(saveError),
      });
    } finally {
      setSavingProvider(false);
    }
  }

  async function handleModelSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingModel(true);

      const payload: Partial<LlmModel> = {
        providerId: modelFormState.providerId,
        name: modelFormState.name.trim(),
        upstreamModel: modelFormState.upstreamModel.trim(),
        metadata: parseJsonInput<Record<string, unknown>>(
          modelFormState.metadata,
          "Model metadata",
        ),
        enabled: modelFormState.enabled,
        tags: parseCommaSeparatedInput(modelFormState.tags),
      };

      if (editingModel) {
        await llmModelsApi.update(editingModel.id, payload);
        toast.success("LLM model updated");
      } else {
        await llmModelsApi.create(payload);
        toast.success("LLM model created");
      }

      setModelDialogOpen(false);
      await loadData(true);
    } catch (saveError) {
      toast.error("Failed to save LLM model", {
        description: getErrorMessage(saveError),
      });
    } finally {
      setSavingModel(false);
    }
  }

  async function handleDeleteProvider(provider: LlmProvider) {
    const shouldDelete = await confirmAction(
      `Delete LLM provider "${provider.name}"? Related models will also be removed.`,
    );
    if (!shouldDelete) {
      return;
    }

    try {
      await llmProvidersApi.delete(provider.id);
      toast.success("LLM provider deleted");
      await loadData(true);
    } catch (deleteError) {
      toast.error("Failed to delete LLM provider", {
        description: getErrorMessage(deleteError),
      });
    }
  }

  async function handleDeleteModel(model: LlmModel) {
    const shouldDelete = await confirmAction(`Delete LLM model "${model.name}"?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await llmModelsApi.delete(model.id);
      toast.success("LLM model deleted");
      await loadData(true);
    } catch (deleteError) {
      toast.error("Failed to delete LLM model", {
        description: getErrorMessage(deleteError),
      });
    }
  }

  const providerNameById = useMemo(
    () => new Map(providers.map((provider) => [provider.id, provider.name])),
    [providers],
  );

  const modelCountByProviderId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const model of models) {
      counts.set(model.providerId, (counts.get(model.providerId) || 0) + 1);
    }

    return counts;
  }, [models]);

  const filteredProviders = useMemo(() => {
    const query = providerSearchQuery.trim().toLowerCase();
    if (!query) {
      return providers;
    }

    return providers.filter((provider) => {
      const haystack = [
        provider.name,
        provider.displayName,
        provider.vendor,
        provider.protocol,
        provider.baseUrl,
        joinCommaSeparated(provider.clients),
        joinCommaSeparated(provider.tags),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [providerSearchQuery, providers]);

  const filteredModels = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase();
    if (!query) {
      return models;
    }

    return models.filter((model) => {
      const haystack = [
        model.name,
        model.upstreamModel,
        providerNameById.get(model.providerId),
        joinCommaSeparated(model.tags),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [modelSearchQuery, models, providerNameById]);

  const enabledProviders = providers.filter((provider) => provider.enabled).length;
  const enabledModels = models.filter((model) => model.enabled).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading LLM resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">LLM Providers and Models</h1>
          <p className="text-sm text-muted-foreground">
            Configure upstream LLM vendors, auth, and model catalogs for router plugins.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={() => openCreateModelDialog()}>
            <Plus className="h-4 w-4" />
            Add Model
          </Button>
          <Button type="button" onClick={openCreateProviderDialog}>
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load LLM resources</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Bot}
          label="Providers"
          value={providers.length}
          description="Registered upstream vendors"
        />
        <MetricCard
          icon={Bot}
          label="Enabled providers"
          value={enabledProviders}
          description="Ready for traffic"
        />
        <MetricCard
          icon={Database}
          label="Models"
          value={models.length}
          description="Available routing targets"
        />
        <MetricCard
          icon={Database}
          label="Enabled models"
          value={enabledModels}
          description="Selectable in router plugins"
        />
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Providers</CardTitle>
            <CardDescription>
              {filteredProviders.length} of {providers.length} providers shown
            </CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={providerSearchQuery}
              onChange={(event) => setProviderSearchQuery(event.target.value)}
              placeholder="Search by name, vendor, protocol, client, or tag"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No providers matched</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the search query or create a new provider.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Connectivity</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div className="font-medium">{provider.displayName || provider.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {provider.name} · {provider.vendor}
                      </div>
                      {provider.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {provider.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>Protocol: {provider.protocol}</div>
                      <div className="truncate">{provider.baseUrl}</div>
                      <div>Auth: {provider.auth.type}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {provider.clients?.length ? joinCommaSeparated(provider.clients) : "Any"}
                    </TableCell>
                    <TableCell>{modelCountByProviderId.get(provider.id) || 0}</TableCell>
                    <TableCell>{provider.enabled ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>
                      {formatTimestamp(provider.updatedAt, settings.showRelativeTimes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openCreateModelDialog(provider.id)}
                        >
                          <Plus className="h-4 w-4" />
                          Add Model
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditProviderDialog(provider)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDeleteProvider(provider)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Models</CardTitle>
            <CardDescription>
              {filteredModels.length} of {models.length} models shown
            </CardDescription>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={modelSearchQuery}
              onChange={(event) => setModelSearchQuery(event.target.value)}
              placeholder="Search by model, upstream model, provider, or tag"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredModels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No models matched</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the search query or create a new model.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div className="font-medium">{model.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Upstream: {model.upstreamModel}
                      </div>
                      {model.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {model.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {providerNameById.get(model.providerId) || model.providerId}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {previewJson(model.metadata, 120)}
                    </TableCell>
                    <TableCell>{model.enabled ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>
                      {formatTimestamp(model.updatedAt, settings.showRelativeTimes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModelDialog(model)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDeleteModel(model)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Edit provider" : "Create provider"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleProviderSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider-name">Name</Label>
                <Input
                  id="provider-name"
                  value={providerFormState.name}
                  onChange={(event) =>
                    setProviderFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="openai"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-display-name">Display name</Label>
                <Input
                  id="provider-display-name"
                  value={providerFormState.displayName}
                  onChange={(event) =>
                    setProviderFormState((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="OpenAI Production"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="provider-vendor">Vendor</Label>
                <Select
                  id="provider-vendor"
                  value={providerFormState.vendor}
                  onChange={(event) =>
                    setProviderFormState((current) => ({
                      ...current,
                      vendor: event.target.value as LlmProviderVendor,
                    }))
                  }
                >
                  {LLM_PROVIDER_VENDORS.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-protocol">Protocol</Label>
                <Select
                  id="provider-protocol"
                  value={providerFormState.protocol}
                  onChange={(event) =>
                    setProviderFormState((current) => ({
                      ...current,
                      protocol: event.target.value as LlmProviderProtocol,
                    }))
                  }
                >
                  {LLM_PROVIDER_PROTOCOLS.map((protocol) => (
                    <option key={protocol} value={protocol}>
                      {protocol}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-clients">Client profiles</Label>
                <Input
                  id="provider-clients"
                  value={providerFormState.clients}
                  onChange={(event) =>
                    setProviderFormState((current) => ({
                      ...current,
                      clients: event.target.value,
                    }))
                  }
                  placeholder={LLM_CLIENT_PROFILES.join(", ")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider-base-url">Base URL</Label>
              <Input
                id="provider-base-url"
                type="url"
                value={providerFormState.baseUrl}
                onChange={(event) =>
                  setProviderFormState((current) => ({ ...current, baseUrl: event.target.value }))
                }
                placeholder="https://api.openai.com/v1"
                required
              />
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <input
                type="checkbox"
                checked={providerFormState.enabled}
                onChange={(event) =>
                  setProviderFormState((current) => ({ ...current, enabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Provider enabled</p>
                <p className="text-xs text-muted-foreground">
                  Disabled providers remain stored but cannot be selected for routing.
                </p>
              </div>
            </label>

            <JsonField
              id="provider-headers"
              label="Headers JSON"
              value={providerFormState.headers}
              onChange={(value) =>
                setProviderFormState((current) => ({ ...current, headers: value }))
              }
              placeholder='{"x-tenant": "gateway"}'
            />

            <JsonField
              id="provider-auth"
              label="Auth JSON"
              value={providerFormState.auth}
              onChange={(value) => setProviderFormState((current) => ({ ...current, auth: value }))}
              placeholder='{"type": "bearer", "tokenEnv": "OPENAI_API_KEY"}'
            />

            <JsonField
              id="provider-adapter-config"
              label="Adapter config JSON"
              value={providerFormState.adapterConfig}
              onChange={(value) =>
                setProviderFormState((current) => ({ ...current, adapterConfig: value }))
              }
              placeholder="{}"
            />

            <div className="space-y-2">
              <Label htmlFor="provider-tags">Tags</Label>
              <Input
                id="provider-tags"
                value={providerFormState.tags}
                onChange={(event) =>
                  setProviderFormState((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="production, shared"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProviderDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingProvider}>
                {editingProvider ? "Save Changes" : "Create Provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Edit model" : "Create model"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleModelSubmit}>
            <div className="space-y-2">
              <Label htmlFor="model-provider">Provider</Label>
              <Select
                id="model-provider"
                value={modelFormState.providerId}
                onChange={(event) =>
                  setModelFormState((current) => ({ ...current, providerId: event.target.value }))
                }
              >
                <option value="" disabled>
                  Select provider
                </option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.displayName || provider.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model-name">Model name</Label>
                <Input
                  id="model-name"
                  value={modelFormState.name}
                  onChange={(event) =>
                    setModelFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="gpt-4.1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model-upstream">Upstream model</Label>
                <Input
                  id="model-upstream"
                  value={modelFormState.upstreamModel}
                  onChange={(event) =>
                    setModelFormState((current) => ({
                      ...current,
                      upstreamModel: event.target.value,
                    }))
                  }
                  placeholder="gpt-4.1"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <input
                type="checkbox"
                checked={modelFormState.enabled}
                onChange={(event) =>
                  setModelFormState((current) => ({ ...current, enabled: event.target.checked }))
                }
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Model enabled</p>
                <p className="text-xs text-muted-foreground">
                  Disabled models remain stored but are hidden from routing selection.
                </p>
              </div>
            </label>

            <JsonField
              id="model-metadata"
              label="Metadata JSON"
              value={modelFormState.metadata}
              onChange={(value) =>
                setModelFormState((current) => ({ ...current, metadata: value }))
              }
              placeholder='{"contextWindow": 128000}'
            />

            <div className="space-y-2">
              <Label htmlFor="model-tags">Tags</Label>
              <Input
                id="model-tags"
                value={modelFormState.tags}
                onChange={(event) =>
                  setModelFormState((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="chat, primary"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModelDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingModel || !modelFormState.providerId}>
                {editingModel ? "Save Changes" : "Create Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard(props: {
  icon: typeof Bot;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm">{props.label}</CardTitle>
          <CardDescription>{props.description}</CardDescription>
        </div>
        <props.icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{props.value}</div>
      </CardContent>
    </Card>
  );
}

function JsonField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <textarea
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-32 w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder={props.placeholder}
      />
    </div>
  );
}

function parseClientProfiles(value: string): LlmClientProfile[] | undefined {
  const parsed = parseCommaSeparatedInput(value) as LlmClientProfile[] | undefined;
  if (!parsed) {
    return undefined;
  }

  const invalidProfile = parsed.find((profile) => !LLM_CLIENT_PROFILES.includes(profile));
  if (invalidProfile) {
    throw new Error(`Unknown client profile: ${invalidProfile}`);
  }

  return parsed;
}
