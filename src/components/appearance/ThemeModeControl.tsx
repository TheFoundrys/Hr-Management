'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const modes = [
  { id: 'light' as const, label: 'Light', icon: Sun },
  { id: 'dark' as const, label: 'Dark', icon: Moon },
  { id: 'system' as const, label: 'System', icon: Monitor },
];

export function ThemeModeControl() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <div className="flex rounded-xl border border-border p-1 bg-muted/30 gap-1">
        {modes.map((m) => (
          <div key={m.id} className="flex-1 h-10 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const active = !theme || theme === 'system' ? 'system' : theme === 'dark' ? 'dark' : 'light';

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Resolved: <span className="font-semibold text-foreground capitalize">{resolvedTheme}</span>
        {theme === 'system' ? ' (follows device)' : ''}
      </p>
      <div className="flex rounded-xl border border-border p-1 bg-muted/20 gap-1">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-transparent
              ${
                active === id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
