import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";
import { NAV_LINKS, ROUTES, SECTIONS, toSection } from "../config/navigation";
import { DIALOGS, useAuth, useCart, useDialog } from "../context/contexts";
import { useActiveSection } from "../hooks/useActiveSection";

const SPY_IDS = NAV_LINKS.filter((link) => link.section).map((link) => link.section);

function AccountActions() {
  const { user, signOut } = useAuth();
  const { count } = useCart();
  const { open } = useDialog();

  if (!user) {
    return (
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => open(DIALOGS.signIn)}>
        <i className="ri-login-circle-line" aria-hidden="true" />
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn cart-btn"
        onClick={() => open(DIALOGS.cart)}
        aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      >
        <i className="ri-shopping-bag-3-line" aria-hidden="true" />
        {count > 0 && (
          <span className="badge" aria-hidden="true">
            {count}
          </span>
        )}
      </button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={signOut} title="Sign out">
        <i className="ri-user-3-line" aria-hidden="true" />
        <span className="account__name">{user.username}</span>
        <i className="ri-logout-box-r-line" aria-hidden="true" />
        <span className="visually-hidden">(sign out)</span>
      </button>
    </>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const activeSection = useActiveSection(SPY_IDS, pathname === ROUTES.home);
  const closeMenu = () => setMenuOpen(false);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const skipToContent = () => {
    const main = document.getElementById("main");
    main?.focus();
    main?.scrollIntoView();
  };

  return (
    <header className="site-header">
      <button type="button" className="skip-link" onClick={skipToContent}>
        Skip to content
      </button>

      <div className="site-header__inner container">
        <Link to={toSection(SECTIONS.home)} className="brand" onClick={closeMenu}>
          <i className="ri-goblet-fill brand__mark" aria-hidden="true" />
          Cocktail<em>Heaven</em>
        </Link>

        <nav id="primary-nav" className={`nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary">
          <p className="nav__drawer-title" aria-hidden="true">
            Menu
          </p>
          <NavLinks
            className="nav__list"
            linkClassName="nav__link"
            activeSection={activeSection}
            onNavigate={closeMenu}
          />
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <AccountActions />
          <button
            type="button"
            className="icon-btn nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <i className={menuOpen ? "ri-close-line" : "ri-menu-4-line"} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`nav-scrim ${menuOpen ? "is-visible" : ""}`} onClick={closeMenu} aria-hidden="true" />
    </header>
  );
}
