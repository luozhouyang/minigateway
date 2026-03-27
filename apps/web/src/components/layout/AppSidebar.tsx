import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Bot,
  Database,
  Plug,
  Route,
  Server,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

const dashboardItem = {
  title: "Dashboard",
  url: "/dashboard",
  icon: TrendingUp,
};

const resourceItems = [
  {
    title: "Routes",
    url: "/routes",
    icon: Route,
  },
  {
    title: "Services",
    url: "/services",
    icon: Server,
  },
  {
    title: "Upstreams",
    url: "/upstreams",
    icon: Settings,
  },
  {
    title: "Consumers",
    url: "/consumers",
    icon: Users,
  },
  {
    title: "Plugins",
    url: "/plugins",
    icon: Plug,
  },
  {
    title: "LLM",
    url: "/llm",
    icon: Bot,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-sidebar-border/70">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 px-3 py-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-sidebar-accent/70"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary/14 text-sidebar-primary shadow-sm ring-1 ring-sidebar-primary/18">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">
              MiniGateway
            </div>
            <div className="truncate text-xs text-sidebar-foreground/65">
              API Gateway Control Plane
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarMenu className="gap-1 px-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === dashboardItem.url}
              tooltip={dashboardItem.title}
              size="lg"
              className="rounded-2xl px-3 shadow-none data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-primary"
            >
              <Link to={dashboardItem.url}>
                <dashboardItem.icon className="h-4 w-4" />
                <span>{dashboardItem.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup className="px-0 py-0">
          <SidebarGroupLabel className="px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/50">
            Resources
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {resourceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    size="lg"
                    className="rounded-2xl px-3 shadow-none data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-primary"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border/70 px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              size="lg"
              className="rounded-2xl px-3"
              isActive={location.pathname.startsWith("/settings")}
            >
              <Link to="/settings">
                <Database className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
