import ThemeProvider from "./ThemeProvider";
import AuthProvider from "./AuthProvider";
import CartProvider from "./CartProvider";
import DialogProvider from "./DialogProvider";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <DialogProvider>{children}</DialogProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
