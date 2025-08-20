import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../context/ThemeContext'; // Corrected path based on your structure
import ThemeToggle from '../components/ThemeToggle';   // Corrected path based on your structure

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'DataPhi AI Chatbot',
  description: 'A Next.js chat application inspired by the Vercel AI Chatbot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          {/* This ThemeToggle component will now appear on every page */}
          <ThemeToggle />
          
          {/* Your page content (login, register, chat, etc.) will be rendered here */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
