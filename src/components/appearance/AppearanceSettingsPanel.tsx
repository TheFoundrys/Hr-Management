'use client';

import { Check } from 'lucide-react';
import { COLOR_PRESETS, type ColorPresetId } from '@/lib/theme/color-presets';
import { useAppearanceStore } from '@/lib/stores/appearanceStore';
import { ThemeModeControl } from './ThemeModeControl';

const preview: Record<ColorPresetId, string> = {
  navy: 'bg-[#1a2b6d]',
  ocean: 'bg-[#0e7490]',
  emerald: 'bg-[#047857]',
  violet: 'bg-[#5b21b6]',
  amber: 'bg-[#b45309]',
};

export function AppearanceSettingsPanel({ showIntro = true }: { showIntro?: boolean }) {
  const colorPreset = useAppearanceStore((s) => s.colorPreset);
  const setColorPreset = useAppearanceStore((s) => s.setColorPreset);

  return (
    <div className="space-y-8 max-w-2xl">
      {showIntro ? (
        <div className="border-b border-border pb-4">
          <h2 className="text-lg font-bold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These choices apply on this device across the tenant workspace and super-admin tools. Color presets update
            buttons, links, and highlights; neutrals stay consistent for readability.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Color accent</h3>
        <p className="text-xs text-muted-foreground">Pick one of five curated palettes. Light and dark modes each have tuned contrast.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_PRESETS.map((p) => {
            const selected = colorPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setColorPreset(p.id)}
                className={`text-left rounded-xl border p-4 transition-all hover:border-primary/50
                  ${selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`h-10 w-10 rounded-xl shrink-0 ${preview[p.id]}`} aria-hidden />
                  {selected ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="w-4 h-4" aria-hidden />
                    </span>
                  ) : (
                    <span className="h-8 w-8 rounded-full border border-border bg-muted/40" aria-hidden />
                  )}
                </div>
                <p className="text-sm font-bold text-foreground">{p.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{p.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Interface theme</h3>
        <p className="text-xs text-muted-foreground">Light, dark, or match your operating system.</p>
        <ThemeModeControl />
      </section>
    </div>
  );
}
