import ThemeProvider from "./ThemeProvider";
import AuthProvider from "./AuthProvider";
import CartProvider from "./CartProvider";
import DialogProvider from "./DialogProvider";
import ToastProvider from "./ToastProvider";

export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <DialogProvider>
            <ToastProvider>{children}</ToastProvider>
          </DialogProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
