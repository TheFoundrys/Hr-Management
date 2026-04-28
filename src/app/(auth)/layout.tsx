import { ThemeToggle } from '@/components/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-400">
      <div className="fixed top-8 right-8 z-50 w-36">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
