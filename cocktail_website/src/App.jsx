// HashRouter keeps deep links working on GitHub Pages (no server-side rewrites).
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import AppProviders from "./context/AppProviders";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollUp from "./components/ScrollUp";
import ScrollManager from "./components/ScrollManager";
import Dialogs from "./components/dialogs/Dialogs";
import Home from "./pages/Home";
import Webshop from "./pages/Webshop";
import { ROUTES } from "./config/navigation";

export default function App() {
  return (
    <AppProviders>
      <HashRouter>
        <ScrollManager />
        <Header />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path={ROUTES.home} element={<Home />} />
            <Route path={ROUTES.shop} element={<Webshop />} />
            {/* Legacy URLs */}
            <Route path="/home" element={<Navigate to={ROUTES.home} replace />} />
            <Route path="/webshop" element={<Navigate to={ROUTES.shop} replace />} />
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Routes>
        </main>
        <Footer />
        <ScrollUp />
        <Dialogs />
      </HashRouter>
    </AppProviders>
  );
}
