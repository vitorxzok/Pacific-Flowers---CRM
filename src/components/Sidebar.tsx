'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Settings, Users, BarChart3, Bell, LogOut, Smartphone, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState<string>('Carregando...');
  const [userRole, setUserRole] = useState<string>('Atendente');

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (pathname !== '/login') router.push('/login');
        return;
      }
      
      const userId = session.user.id;
      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', userId)
        .single();
        
      if (profile) {
        setUserName(profile.name);
        setUserRole(profile.role);
      } else {
        // Fallback if profile trigger failed or is delayed
        setUserName(session.user.user_metadata?.name || 'Atendente');
      }
    }
    loadUser();
  }, [pathname, router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Painel', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'WhatsApp', href: '/whatsapp', icon: Smartphone },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
    { name: 'Notificações', href: '/notificacoes', icon: Bell },
    { name: 'Administrador', href: '/admin', icon: Shield },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ];

  if (pathname === '/login') return null;

  return (
    <aside className="w-64 bg-surface/80 backdrop-blur-md border-r border-surface-border h-full flex flex-col">
      <div className="p-6 flex items-center space-x-3">
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Pacific Flowers
        </span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={twMerge(
                clsx(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-surface-hover'
                )
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-surface-border">
        <div className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-white truncate" title={userName}>{userName}</span>
              <span className="text-xs text-gray-400 truncate">{userRole}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
