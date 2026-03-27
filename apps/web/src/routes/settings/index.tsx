import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/resources/MetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type DashboardSettings, useDashboardSettings } from "@/lib/dashboard-settings";
import { getErrorMessage, parseOptionalNumber } from "@/lib/dashboard-utils";
import { consumersApi, pluginsApi, routesApi, servicesApi, upstreamsApi } from "@/lib/api/client";
import { toast } from "sonner";
import { RefreshCw, RotateCcw, Save, Settings2, ShieldAlert, Timer } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: Settings,
});

interface SettingsFormState {
  apiBaseUrl: string;
  confirmBeforeDelete: boolean;
  showRelativeTimes: boolean;
  dashboardAutoRefreshSeconds: string;
}

interface DiagnosticsState {
  connected: boolean;
  error: string | null;
  services: number;
  routes: number;
  upstreams: number;
  consumers: number;
  plugins: number;
  checkedAt: string | null;
}

const EMPTY_DIAGNOSTICS: DiagnosticsState = {
  connected: false,
  error: null,
  services: 0,
  routes: 0,
  upstreams: 0,
  consumers: 0,
  plugins: 0,
  checkedAt: null,
};

function Settings() {
  const { defaults, patchSettings, resetSettings, settings } = useDashboardSettings();
  const [formState, setFormState] = useState<SettingsFormState>(() => toFormState(settings));
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>(EMPTY_DIAGNOSTICS);

  useEffect(() => {
    setFormState(toFormState(settings));
  }, [settings]);

  useEffect(() => {
    void runDiagnostics();
  }, []);

  async function runDiagnostics() {
    try {
      setChecking(true);

      const [services, routes, upstreams, consumers, plugins] = await Promise.all([
        servicesApi.list(),
        routesApi.list(),
        upstreamsApi.list(),
        consumersApi.list(),
        pluginsApi.list(),
      ]);

      setDiagnostics({
        connected: true,
        error: null,
        services: services.length,
        routes: routes.length,
        upstreams: upstreams.length,
        consumers: consumers.length,
        plugins: plugins.length,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      setDiagnostics({
        ...EMPTY_DIAGNOSTICS,
        connected: false,
        error: getErrorMessage(error, "Unable to reach the admin API."),
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
    }
  }

  function handleChange<K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);

      patchSettings({
        apiBaseUrl: formState.apiBaseUrl.trim(),
        confirmBeforeDelete: formState.confirmBeforeDelete,
        showRelativeTimes: formState.showRelativeTimes,
        dashboardAutoRefreshSeconds:
          parseOptionalNumber(formState.dashboardAutoRefreshSeconds) ?? 0,
      });

      toast.success("Settings saved");
      await runDiagnostics();
    } catch (error) {
      toast.error("Failed to save settings", {
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const resetValue = resetSettings();
    setFormState(toFormState(resetValue));
    toast.success("Settings reset");
    void runDiagnostics();
  }

  const hasChanges =
    formState.apiBaseUrl.trim() !== settings.apiBaseUrl ||
    formState.confirmBeforeDelete !== settings.confirmBeforeDelete ||
    formState.showRelativeTimes !== settings.showRelativeTimes ||
    (parseOptionalNumber(formState.dashboardAutoRefreshSeconds) ?? 0) !==
      settings.dashboardAutoRefreshSeconds;

  return (
    <div className="page-enter page-stack">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Persist dashboard behavior locally, tune destructive-action prompts, and validate admin API connectivity."
        icon={Settings2}
        meta={
          <>
            <span>{diagnostics.connected ? "Admin API connected" : "Admin API unavailable"}</span>
            {diagnostics.checkedAt ? <span>Checked {diagnostics.checkedAt}</span> : null}
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => void runDiagnostics()}
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              Test Connection
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Connection"
          value={diagnostics.connected ? "Live" : "Offline"}
          description={settings.apiBaseUrl}
          icon={Settings2}
          tone="sky"
        />
        <MetricCard
          label="Destructive actions"
          value={settings.confirmBeforeDelete ? "Guarded" : "Open"}
          description={settings.showRelativeTimes ? "Relative timestamps" : "Locale timestamps"}
          icon={ShieldAlert}
          tone="amber"
        />
        <MetricCard
          label="Auto refresh"
          value={
            settings.dashboardAutoRefreshSeconds > 0
              ? `${settings.dashboardAutoRefreshSeconds}s`
              : "Manual"
          }
          description="Dashboard landing page sync interval"
          icon={Timer}
          tone="lime"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin API</CardTitle>
              <CardDescription>
                Override the admin endpoint used by every dashboard page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API base URL</Label>
                <Input
                  id="apiBaseUrl"
                  value={formState.apiBaseUrl}
                  onChange={(event) => handleChange("apiBaseUrl", event.target.value)}
                  placeholder={defaults.apiBaseUrl}
                />
                <p className="text-xs text-muted-foreground">
                  Example: `/admin` or `http://localhost:3000/admin`
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard behavior</CardTitle>
              <CardDescription>
                Preferences that affect list pages and the overview screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Confirm before delete</p>
                  <p className="text-xs text-muted-foreground">
                    Keep browser confirmation prompts before removing resources.
                  </p>
                </div>
                <Switch
                  checked={formState.confirmBeforeDelete}
                  onCheckedChange={(checked) => handleChange("confirmBeforeDelete", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Use relative timestamps</p>
                  <p className="text-xs text-muted-foreground">
                    Show times as "5m ago" instead of locale date strings.
                  </p>
                </div>
                <Switch
                  checked={formState.showRelativeTimes}
                  onCheckedChange={(checked) => handleChange("showRelativeTimes", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboardAutoRefreshSeconds">Dashboard auto refresh seconds</Label>
                <Input
                  id="dashboardAutoRefreshSeconds"
                  type="number"
                  min="0"
                  max="3600"
                  value={formState.dashboardAutoRefreshSeconds}
                  onChange={(event) =>
                    handleChange("dashboardAutoRefreshSeconds", event.target.value)
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Set `0` to disable automatic refreshes on the dashboard overview page.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !hasChanges}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormState(toFormState(settings))}
            >
              Revert Form
            </Button>
          </div>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Connection diagnostics</CardTitle>
            <CardDescription>
              Verifies that the configured API base can list every resource collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">
                {diagnostics.connected ? "Admin API reachable" : "Admin API check failed"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {diagnostics.error || "The dashboard successfully queried all resource endpoints."}
              </p>
              {diagnostics.checkedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last checked at {new Date(diagnostics.checkedAt).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricItem label="Services" value={diagnostics.services} />
              <MetricItem label="Routes" value={diagnostics.routes} />
              <MetricItem label="Upstreams" value={diagnostics.upstreams} />
              <MetricItem label="Consumers" value={diagnostics.consumers} />
              <MetricItem label="Plugins" value={diagnostics.plugins} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricItem(props: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{props.label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{props.value}</p>
    </div>
  );
}

function toFormState(settings: DashboardSettings): SettingsFormState {
  return {
    apiBaseUrl: settings.apiBaseUrl,
    confirmBeforeDelete: settings.confirmBeforeDelete,
    showRelativeTimes: settings.showRelativeTimes,
    dashboardAutoRefreshSeconds: String(settings.dashboardAutoRefreshSeconds),
  };
}
