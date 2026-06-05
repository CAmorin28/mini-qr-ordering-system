/** Admin routes use full viewport width (body is a flex column). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
