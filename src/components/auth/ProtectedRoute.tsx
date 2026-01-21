import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSystemAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireSystemAdmin = false }: ProtectedRouteProps) => {
  const { user, isLoading, mustChangePassword, isSystemAdmin, roles } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has any role
  if (roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            Your account does not have any assigned roles. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (requireSystemAdmin && !isSystemAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access this page. Only system administrators can view this content.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
