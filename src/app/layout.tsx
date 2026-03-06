import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

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
            <body className={inter.className}>
                <Providers>
                    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
                        <Sidebar />
                        <main className="flex-1 lg:pl-0">
                            <div className="p-4 md:p-8">
                                {children}
                            </div>
                        </main>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
