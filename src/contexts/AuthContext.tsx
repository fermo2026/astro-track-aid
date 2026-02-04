import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  must_change_password: boolean;
  department_id: string | null;
  avatar_url: string | null;
}

interface UserRole {
  role: string;
  department_id: string | null;
  college_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRole[];
  isLoading: boolean;
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const initializationComplete = useRef(false);

  const fetchUserData = async (userId: string): Promise<{ profile: UserProfile | null; roles: UserRole[] }> => {
    try {
      // Fetch profile and roles in parallel
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, must_change_password, department_id, avatar_url')
          .eq('id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('role, department_id, college_id')
          .eq('user_id', userId)
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
      }

      if (rolesResult.error) {
        console.error('Error fetching roles:', rolesResult.error);
      }

      return {
        profile: profileResult.data || null,
        roles: rolesResult.data || []
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { profile: null, roles: [] };
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch user data and wait for it to complete
          const userData = await fetchUserData(initialSession.user.id);
          
          if (!isMounted) return;
          
          setProfile(userData.profile);
          setRoles(userData.roles);
        }
        
        initializationComplete.current = true;
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          initializationComplete.current = true;
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        // Only process after initial load is complete to avoid race conditions
        if (!initializationComplete.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const userData = await fetchUserData(newSession.user.id);
          if (isMounted) {
            setProfile(userData.profile);
            setRoles(userData.roles);
          }
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.session?.user) {
      // Use the session returned directly from signIn - no need to call getSession again
      setSession(data.session);
      setUser(data.session.user);
      // Fetch user data in parallel with state updates
      const userData = await fetchUserData(data.session.user.id);
      setProfile(userData.profile);
      setRoles(userData.roles);
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const refreshProfile = async () => {
    if (user) {
      const userData = await fetchUserData(user.id);
      setProfile(userData.profile);
      setRoles(userData.roles);
    }
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!error && user) {
      // Update profile to mark password as changed
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id);

      // Refresh profile data
      const userData = await fetchUserData(user.id);
      setProfile(userData.profile);
      setRoles(userData.roles);
    }

    return { error };
  };

  const isSystemAdmin = roles.some(r => r.role === 'system_admin');
  const mustChangePassword = profile?.must_change_password ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isSystemAdmin,
        mustChangePassword,
        signIn,
        signOut,
        refreshProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
