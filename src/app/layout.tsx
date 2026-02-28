import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { WalletProvider } from "~/context/WalletContext";

export const metadata: Metadata = {
  title: "Smart Bond Return",
  description: "Decentralised rental deposit protocol on the XRP Ledger",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="min-h-screen bg-neutral-950 font-sans text-neutral-100 antialiased">
        <TRPCReactProvider>
          <WalletProvider>{children}</WalletProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
