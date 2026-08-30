// Cserélve HashRouter-re a GitHub Pages kompatibilitás miatt
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollUp from "./components/ScrollUp";
import ViewCart from "./components/ViewCart.jsx";
import Webshop from "./Webshop";
import "remixicon/fonts/remixicon.css";
import ScrollHandler from "./components/ScrollHandler.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [showCart, setShowCart] = useState(false);

  // Szimulált bejelentkezés (Portfólióhoz)
  const handleLogin = () => {
    setUser({ name: "Demo Felhasználó" });
  };

  const handleLogout = () => {
    setUser(null);
    setCartCount(0);
  };

  const handleOrder = () => {
    setCartCount(0);
    setShowCart(false);
    alert("Rendelés sikeresen leadva! (Ez csak egy demó funkció)");
  };

  const handleAddToCart = () => {
    setCartCount((prevCount) => prevCount + 1);
  };

  return (
    <Router>
      <Header
        user={user}
        onLogin={handleLogin}
        cartCount={cartCount}
        onLogout={handleLogout}
        setShowCart={setShowCart}
      />
      
      <ScrollHandler />

      {showCart && (
        <ViewCart
          user={user}
          onOrder={handleOrder}
          onClose={() => setShowCart(false)}
          onUpdateCart={() => setCartCount(0)} 
        />
      )}

      <main>
        <Routes>
          {/* Főoldal */}
          <Route path="/" element={<Home user={user} />} />
          
          {/* Ha a gomb /home-ra visz, ez lekezeli és a Home-ot tölti be */}
          <Route path="/home" element={<Home user={user} />} />
          
          {/* Webshop */}
          <Route
            path="/webshop"
            element={<Webshop user={user} onAdd={handleAddToCart} />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        <ScrollUp />
      </main>
      <Footer />
    </Router>
  );
}

export default App;