import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  modoDemo?: boolean;
}

export function MainLayout({ children, modoDemo = true }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header modoDemo={modoDemo} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
