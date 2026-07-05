import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="menace-shell flex min-h-screen text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <TopBar />
          {children}
        </div>
      </main>
    </div>
  );
}
