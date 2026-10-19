import type { Metadata } from "next";

import { CopilotKit } from "@copilotkit/react-core";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";

export const metadata: Metadata = {
  title: "Meridian | Investment Diligence",
  description:
    "An evidence-backed local workspace for public-company financial diligence and Investment Committee draft reports.",
  openGraph: {
    title: "Meridian Investment Diligence",
    description: "Public-company diligence drafts with SEC-linked financial evidence.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian | Investment Diligence",
    description: "Public-company diligence drafts with SEC-linked financial evidence.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <CopilotKit runtimeUrl="/api/copilotkit" agent="research_assistant">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
