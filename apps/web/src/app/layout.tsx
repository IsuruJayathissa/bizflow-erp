import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'BizFlow ERP - Small Business Management Platform',
  description: 'Enterprise Resource Planning system for small and medium businesses. Manage sales, inventory, customers, and finances seamlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
