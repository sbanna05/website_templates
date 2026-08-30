import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // IMPORTÁLVA
import SignInContainer from './SignInContainer.jsx';
import SignUpContainer from './SignUpContainer.jsx';

function Header({ user, onLogin, onLogout, cartCount, setShowCart }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const navigate = useNavigate(); // ÚJ
  const location = useLocation(); // ÚJ

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'accessible'];
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    document.body.classList.remove('light-theme', 'dark-theme', 'accessible-theme');
    document.body.classList.add(`${nextTheme}-theme`);
  };

  // ÚJ FÜGGVÉNY: Görgetés kezelése HashRouter mellett
  const handleScroll = (e, id) => {
    e.preventDefault(); // Megakadályozza, hogy az URL-be beírja a #id-t
    setMenuOpen(false); // Bezárja a mobilos menüt

    // Ha nem a főoldalon vagyunk (pl. a webshopban), visszanavigálunk, majd görgetünk
    if (location.pathname !== '/' && location.pathname !== '/home') {
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          // Kisebb eltolás, ha a header fix (sticky)
          const y = element.getBoundingClientRect().top + window.scrollY - 80; 
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150); // Várunk picit, amíg betölt a főoldal
    } else {
      // Ha már a főoldalon vagyunk, csak görgetünk
      const element = document.getElementById(id);
      if (element) {
        const y = element.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="header">
      <nav className="nav">
        {/* A logó is használja a görgetést */}
        <a href="#home" className="nav_logo" onClick={(e) => handleScroll(e, 'home')}>
          CocktailHeaven
        </a>

        <div className={`nav_menu ${menuOpen ? 'show-menu' : ''}`}>
          <ul className="nav_list">
            {/* FIGYELD AZ onClick-eket! */}
            <li className="nav_item">
              <a href="#home" className="nav_link" onClick={(e) => handleScroll(e, 'home')}>Home</a>
            </li>
            <li className="nav_item">
              {/* Ellenőrizd, hogy a Favourites komponensedben id="favorites" vagy id="favourites" van-e! */}
              <a href="#favorites" className="nav_link" onClick={(e) => handleScroll(e, 'favorites')}>Favorites</a>
            </li>
            <li className="nav_item">
              <a href="#shop" className="nav_link" onClick={(e) => handleScroll(e, 'shop')}>Shop</a>
            </li>
            <li className="nav_item">
              <a href="#recipes" className="nav_link" onClick={(e) => handleScroll(e, 'recipes')}>Recipes</a>
            </li>
            <li className="nav_item">
              {/* Lehet, hogy nálad id="contact" vagy id="contact-us", írd át ha kell */}
              <a href="#contact" className="nav_link" onClick={(e) => handleScroll(e, 'contact')}>Contact Us</a>
            </li>
          </ul>

          <div className="nav_close" onClick={toggleMenu}>
            <i className="ri-close-line"></i>
          </div>

          <div className="nav_dark" onClick={toggleTheme}>
            <span className="change_theme_name">
              {theme === 'light' ? 'Dark Mode' : theme === 'dark' ? 'Accessible Mode' : 'Light Mode'}
            </span>
            <i className={`ri-${theme === 'light' ? 'moon' : theme === 'dark' ? 'eye' : 'sun'}-line change_theme`}></i>
          </div>

          {!user ? (
            <div className="sign_in_icon" onClick={() => setShowSignIn(true)}>
              <span className="sign_in_name">Sign In</span>
              <i className="ri-login-box-line"></i>
            </div>
          ) : (
            <div className="shop_actions">
              <div className="nav_cart" onClick={() => setShowCart(true)}>
                <i className="ri-shopping-cart-line"></i>
                <span className="cart_count">{cartCount}</span>
              </div>
              <a href="#profile" className="nav_profile" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                <i className="ri-user-line"></i>
                <span className="profile_name">{user.username}</span>
              </a>
            </div>
          )}
        </div>

        {menuOpen && (
          <div className="nav_overlay show-overlay" onClick={toggleMenu}></div>
        )}

        <div className="nav_toggle" onClick={toggleMenu}>
          <i className="ri-menu-fill"></i>
        </div>
      </nav>

      {showSignIn && (
        <SignInContainer 
          active={showSignIn} 
          close={() => setShowSignIn(false)} 
          switchToSignUp={() => { setShowSignIn(false); setShowSignUp(true); }} 
          onLogin={(userData) => {
            onLogin(userData);
            setShowSignIn(false);
          }} 
        />
      )}
      
      {showSignUp && (
        <SignUpContainer 
          active={showSignUp} 
          close={() => setShowSignUp(false)} 
          switchToSignIn={() => { setShowSignUp(false); setShowSignIn(true); }} 
        />
      )}
    </section>
  );
}

export default Header;