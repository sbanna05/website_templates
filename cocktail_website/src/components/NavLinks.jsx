import { Link, useLocation } from "react-router-dom";
import { NAV_LINKS } from "../config/navigation";

/** Shared by header and footer so both always point at the same places. */
export default function NavLinks({ className, linkClassName, activeSection, onNavigate }) {
  const { pathname } = useLocation();

  const isActive = (link) => {
    if (link.to.pathname !== pathname) return false;
    if (!link.section) return true; // page link (e.g. Shop)
    return activeSection === link.section;
  };

  return (
    <ul className={className}>
      {NAV_LINKS.map((link) => (
        <li key={link.label}>
          <Link
            to={link.to}
            className={linkClassName}
            aria-current={isActive(link) ? (link.section ? "location" : "page") : undefined}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
