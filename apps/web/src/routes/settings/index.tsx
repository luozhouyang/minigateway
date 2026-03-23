import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Persist local dashboard behavior and validate the current admin API connection.
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Connection</CardTitle>
              <CardDescription>Current admin API target</CardDescription>
            </div>
            <Settings2 className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Base URL: <span className="font-medium text-foreground">{settings.apiBaseUrl}</span>
            </p>
            <p>
              Status:{" "}
              <span className={diagnostics.connected ? "text-emerald-600" : "text-destructive"}>
                {diagnostics.connected ? "Connected" : "Unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Destructive actions</CardTitle>
              <CardDescription>Deletion and risky change prompts</CardDescription>
            </div>
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Confirm deletes:{" "}
              <span className="font-medium text-foreground">
                {settings.confirmBeforeDelete ? "Enabled" : "Disabled"}
              </span>
            </p>
            <p>
              Timestamp display:{" "}
              <span className="font-medium text-foreground">
                {settings.showRelativeTimes ? "Relative" : "Locale"}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Auto refresh</CardTitle>
              <CardDescription>Dashboard landing page sync frequency</CardDescription>
            </div>
            <Timer className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Interval:{" "}
              <span className="font-medium text-foreground">
                {settings.dashboardAutoRefreshSeconds > 0
                  ? `${settings.dashboardAutoRefreshSeconds}s`
                  : "Manual refresh only"}
              </span>
            </p>
            <p>Changes are stored locally in your browser.</p>
          </CardContent>
        </Card>
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
              <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={formState.confirmBeforeDelete}
                  onChange={(event) => handleChange("confirmBeforeDelete", event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Confirm before delete</p>
                  <p className="text-xs text-muted-foreground">
                    Keep browser confirmation prompts before removing resources.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={formState.showRelativeTimes}
                  onChange={(event) => handleChange("showRelativeTimes", event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Use relative timestamps</p>
                  <p className="text-xs text-muted-foreground">
                    Show times as "5m ago" instead of locale date strings.
                  </p>
                </div>
              </label>

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
