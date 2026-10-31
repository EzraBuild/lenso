import type { Metadata } from "next";
import { EB_Garamond, Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], weight: ["400"] });
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Lenso — your iPhone is your webcam",
  description:
    "Use an iPhone as a Windows webcam over Wi-Fi. Hardware H.264, no OBS, no watermark, no subscription, no Mac. Open source.",
  metadataBase: new URL("https://lenso.dev"),
  openGraph: {
    title: "Lenso — your iPhone is your webcam",
    description: "Use an iPhone as a Windows webcam over Wi-Fi. No OBS, no watermark, no subscription.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} ${garamond.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
