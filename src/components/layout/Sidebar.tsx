import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Violations', path: '/violations' },
  { icon: Users, label: 'Students', path: '/students' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Building2, label: 'Organization', path: '/departments' },
  { icon: Shield, label: 'User Management', path: '/users' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground flex flex-col h-[calc(100vh-4rem)] transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 h-6 w-6 rounded-full bg-card border border-border shadow-md hover:bg-muted z-10"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-foreground" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-foreground" />
        )}
      </Button>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-sidebar-accent',
                isActive && 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-sidebar-primary-foreground')} />
              {!collapsed && (
                <span className="truncate animate-fade-in">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={cn('p-4 border-t border-sidebar-border', collapsed && 'px-2')}>
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/60">
            <p>© 2024 ASTU</p>
            <p>Violation Management System</p>
          </div>
        )}
      </div>
    </aside>
  );
};
