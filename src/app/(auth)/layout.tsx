export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#f8f9fa] px-4 py-12">
      <div className="w-full max-w-md rounded-[20px] border border-[#f9fafb] bg-white p-8 shadow-[var(--shadow-card)]">
        {children}
      </div>
    </div>
  );
}
