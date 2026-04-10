export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary-100/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-100/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>

  );
}
