
import "../app/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const path = router.pathname;

  const isAdminRoute = path.startsWith("/admin");

  return (
    <ThemeProvider>
      {isAdminRoute ? (
        <AuthProvider>
          <ThemeToggle />
          <Component {...pageProps} />
        </AuthProvider>
      ) : (
        <AuthProvider>
          <ThemeToggle />
          <Component {...pageProps} />
        </AuthProvider>
      )}
    </ThemeProvider>
  );
}
