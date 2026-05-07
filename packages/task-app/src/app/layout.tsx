import type { Metadata } from "next";
import "./globals.css";
import { AmplifyProvider } from "../components/providers/AmplifyProvider";
import { UserProvider } from "../components/providers/UserProvider";

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
        <AmplifyProvider>
          <UserProvider>{children}</UserProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}
