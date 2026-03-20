import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "./providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
    title: "WHI Ground Control",
    description: "Walking Holiday Ireland Operations Hub",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="font-sans">
                <Providers>
                    <div className="flex min-h-screen bg-slate-50">
                        <Sidebar />
                        <main className="flex-1 lg:pl-0">
                            <div className="p-4 md:p-8">
                                {children}
                            </div>
                        </main>
                    </div>
                    <Toaster position="top-right" richColors />
                </Providers>
            </body>
        </html>
    );
}
