import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata = {
  title: "Calendar Note",
  description: "เว็บบันทึกนัดหมายลง Google Calendar แบบหน้าเดียว",
  icons: {
    icon: "/calendar-note.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${kanit.variable} antialiased`}>{children}</body>
    </html>
  );
}