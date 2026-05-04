import { Palette } from 'lucide-react';
import { AppearanceSettingsPanel } from '@/components/appearance/AppearanceSettingsPanel';

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-3 border-b border-border pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Palette className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Appearance &amp; theme</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Available from every dashboard via the sidebar.</p>
        </div>
      </header>
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
        <AppearanceSettingsPanel />
      </div>
    </div>
  );
}
