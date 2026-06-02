/** Full-viewport admin login — avoids body flex shrinking the page. */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-login-shell">{children}</div>;
}
