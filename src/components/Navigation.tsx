import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, Heart, Package, LogOut, User, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { toast } from 'sonner';

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
  };

  if (!user) return null;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: PlusCircle, label: 'Create', path: '/create' },
    { icon: Heart, label: 'Interests', path: '/interests' },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Package, label: 'My Items', path: '/my-items' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:top-0 md:bottom-auto">
      <div className="container max-w-screen-lg mx-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-bold text-xl text-primary">SwapIt</Link>
            <div className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Mobile bottom nav */}
      <div className="flex md:hidden items-center justify-around pb-safe">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
              location.pathname === item.path
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 py-2 px-4 text-muted-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
