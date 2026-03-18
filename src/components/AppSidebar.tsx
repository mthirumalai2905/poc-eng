import { MessageSquare, Blocks, Settings, Plus, Activity, GitBranch } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
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
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Chat", url: "/", icon: MessageSquare },
  { title: "Skills", url: "/skills", icon: Blocks },
  { title: "Monitoring", url: "/monitoring", icon: Activity },
  { title: "Lifecycle", url: "/lifecycle", icon: GitBranch },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
            <span className="text-background font-mono font-bold text-xs">A</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xs font-semibold text-foreground tracking-tight">Architect</h1>
              <p className="text-[10px] text-muted-foreground">AI Lab</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <div className="px-3 mb-2">
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </button>
            </div>
          )}
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-foreground"
                    >
                      <item.icon className="mr-2 h-3.5 w-3.5" />
                      {!collapsed && <span className="text-xs">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="text-[10px] text-muted-foreground font-mono">
            v0.2.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
