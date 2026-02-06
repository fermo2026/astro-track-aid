import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <footer className="border-t border-border bg-muted/30 py-3 px-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Adama Science and Technology University. All rights reserved.
      </footer>
    </div>
  );
};
