'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent 
        ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-4 h-4 bg-muted animate-pulse rounded-xl" />
        {!collapsed && <div className="h-4 w-20 bg-muted animate-pulse rounded-xl" />}
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const modeLabel =
    theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light';

  return (
    <button
      onClick={cycleTheme}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-300 group
        ${isDark 
          ? 'text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10 border border-yellow-400/20' 
          : 'text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20'}
        ${collapsed ? 'justify-center' : ''}
      `}
      title="Cycle: light → dark → system"
    >
      <div className="relative w-4 h-4 shrink-0 overflow-hidden">
         <Sun className={`w-4 h-4 absolute transition-all duration-500 transform 
           ${isDark ? 'translate-y-6 opacity-0 rotate-90' : 'translate-y-0 opacity-100 rotate-0'}`} />
         <Moon className={`w-4 h-4 absolute transition-all duration-500 transform 
           ${isDark ? 'translate-y-0 opacity-100 rotate-0' : '-translate-y-6 opacity-0 -rotate-90'}`} />
      </div>
      
      {!collapsed && (
        <div className="flex flex-col items-start leading-none gap-0.5">
          <span className="text-xs font-black uppercase tracking-widest transition-colors">
            {modeLabel}
          </span>
          <span className="text-[9px] font-bold text-muted-foreground opacity-70">
            Next: {theme === 'light' ? 'Dark' : theme === 'dark' ? 'System' : 'Light'}
          </span>
        </div>
      )}
    </button>
  );
}
