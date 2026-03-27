import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Route, Server, Settings, Users, Plug, Database, TrendingUp, Bot } from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: TrendingUp,
  },
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
  {
    title: "Settings",
    url: "/settings",
    icon: Database,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b flex items-center justify-center h-14">
        <span className="text-sm font-semibold">MiniGateway</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
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
    </Sidebar>
  );
}
