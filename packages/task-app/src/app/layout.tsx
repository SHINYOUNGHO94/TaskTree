import type { Metadata } from "next";
import "./globals.css";
import { AmplifyProvider } from "../components/providers/AmplifyProvider";

export const metadata: Metadata = {
  title: "TaskTree",
  description: "Simple & Sophisticated Task Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AmplifyProvider>{children}</AmplifyProvider>
      </body>
    </html>
  );
}
