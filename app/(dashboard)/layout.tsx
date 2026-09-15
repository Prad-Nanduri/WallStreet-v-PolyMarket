import Sidebar from "@/components/Sidebar";
import DataProvider from "@/components/DataProvider";

export default function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <DataProvider>{children}</DataProvider>
      </div>
    </div>
  );
}
