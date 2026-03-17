import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, Save, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: Settings,
});

interface SettingsData {
  databasePath: string;
  adminApiEnabled: boolean;
  adminApiKey?: string;
  corsEnabled: boolean;
  corsOrigins: string;
  rateLimitEnabled: boolean;
  rateLimitMax: number;
  rateLimitWindow: number;
}

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    databasePath: "",
    adminApiEnabled: true,
    adminApiKey: "",
    corsEnabled: false,
    corsOrigins: "*",
    rateLimitEnabled: false,
    rateLimitMax: 100,
    rateLimitWindow: 60,
  });

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: Implement settings API endpoint
      // For now, use default values
      setSettings({
        databasePath: "./data/token-gateway.db",
        adminApiEnabled: true,
        adminApiKey: "",
        corsEnabled: false,
        corsOrigins: "*",
        rateLimitEnabled: false,
        rateLimitMax: 100,
        rateLimitWindow: 60,
      });
    } catch (error) {
      toast.error("Failed to load settings", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // TODO: Implement settings API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm("Are you sure you want to reset the database? This action cannot be undone.")) {
      return;
    }

    try {
      // TODO: Implement database reset API endpoint
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

      toast.success("Database reset successfully");
    } catch (error) {
      toast.error("Failed to reset database", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure Token Gateway settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Database Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database
              </CardTitle>
              <CardDescription>Configure database settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="databasePath">Database Path</Label>
                <Input
                  id="databasePath"
                  value={settings.databasePath}
                  onChange={(e) => setSettings({ ...settings, databasePath: e.target.value })}
                  placeholder="./data/token-gateway.db"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Path to the SQLite database file
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleResetDatabase}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Database
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin API Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Admin API</CardTitle>
              <CardDescription>Configure Admin API settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adminApiEnabled"
                  checked={settings.adminApiEnabled}
                  onChange={(e) => setSettings({ ...settings, adminApiEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="adminApiEnabled">Enable Admin API</Label>
              </div>
              <div>
                <Label htmlFor="adminApiKey">Admin API Key</Label>
                <Input
                  id="adminApiKey"
                  type="password"
                  value={settings.adminApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, adminApiKey: e.target.value })}
                  placeholder="Enter API key"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to disable authentication
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CORS Settings */}
          <Card>
            <CardHeader>
              <CardTitle>CORS</CardTitle>
              <CardDescription>Configure Cross-Origin Resource Sharing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="corsEnabled"
                  checked={settings.corsEnabled}
                  onChange={(e) => setSettings({ ...settings, corsEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="corsEnabled">Enable CORS</Label>
              </div>
              <div>
                <Label htmlFor="corsOrigins">Allowed Origins</Label>
                <Input
                  id="corsOrigins"
                  value={settings.corsOrigins}
                  onChange={(e) => setSettings({ ...settings, corsOrigins: e.target.value })}
                  placeholder="*"
                  disabled={!settings.corsEnabled}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list of allowed origins. Use * for all origins.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limiting Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>Configure rate limiting for API requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rateLimitEnabled"
                  checked={settings.rateLimitEnabled}
                  onChange={(e) => setSettings({ ...settings, rateLimitEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="rateLimitEnabled">Enable Rate Limiting</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rateLimitMax">Max Requests</Label>
                  <Input
                    id="rateLimitMax"
                    type="number"
                    value={settings.rateLimitMax}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rateLimitMax: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!settings.rateLimitEnabled}
                  />
                </div>
                <div>
                  <Label htmlFor="rateLimitWindow">Window (seconds)</Label>
                  <Input
                    id="rateLimitWindow"
                    type="number"
                    value={settings.rateLimitWindow}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rateLimitWindow: parseInt(e.target.value) || 0,
                      })
                    }
                    disabled={!settings.rateLimitEnabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
