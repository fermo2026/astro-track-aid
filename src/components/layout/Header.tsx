import { useState } from 'react';
import { User, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileEditDialog } from '@/components/profile/ProfileEditDialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import astuLogo from '@/assets/astu-logo.jpg';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      system_admin: 'System Admin',
      vpaa: 'VPAA',
      main_registrar: 'Main Registrar',
      college_registrar: 'College Registrar',
      college_dean: 'College Dean',
      academic_vice_dean: 'Academic Vice Dean',
      department_head: 'Department Head',
      deputy_department_head: 'Deputy Dept. Head',
    };
    return roleMap[role] || role;
  };

  const primaryRole = roles[0]?.role;

  return (
    <header className="astu-header sticky top-0 z-50 h-16 flex items-center justify-between px-6 shadow-lg">
      <div className="flex items-center gap-4">
        <img 
          src={astuLogo} 
          alt="ASTU Logo" 
          className="h-10 w-10 object-contain rounded-full bg-white p-0.5"
        />
        <div className="hidden md:block">
          <h1 className="text-lg font-bold text-primary-foreground">ASTU</h1>
          <p className="text-xs text-primary-foreground/80">Student Violation Management</p>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-8 hidden lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or ID..."
            className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:bg-primary-foreground/20"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-primary-foreground hover:bg-primary-foreground/10">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-primary-foreground/70">
                  {primaryRole ? getRoleLabel(primaryRole) : 'No Role'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileEditDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
    </header>
  );
};
