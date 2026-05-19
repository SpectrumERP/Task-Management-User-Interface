import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useNavigate } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export function MainLayout({ children, activeTab = 'board', onTabChange }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleCreateTask = () => {
    navigate('/task/new');
  };

  return (
    <div className="flex h-screen w-full fixed inset-0 bg-white overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange || (() => { })}
        onCreateTask={handleCreateTask}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-hidden flex flex-col bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
