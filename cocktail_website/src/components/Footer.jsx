import { Link } from "react-router-dom";
import NavLinks from "./NavLinks";
import { SECTIONS, SOCIAL_LINKS, toSection } from "../config/navigation";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div className="site-footer__brand">
          <Link to={toSection(SECTIONS.home)} className="brand">
            <i className="ri-goblet-fill brand__mark" aria-hidden="true" />
            Cocktail<em>Heaven</em>
          </Link>
          <p>Mixing flavours, crafting experiences.</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="site-footer__heading">Explore</h2>
          <NavLinks className="site-footer__links" linkClassName="site-footer__link" />
        </nav>

        <div>
          <h2 className="site-footer__heading">Follow us</h2>
          <ul className="site-footer__social">
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <li key={label}>
                <a href={href} className="icon-btn" target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}>
                  <i className={icon} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer__legal container">
        <p>© {new Date().getFullYear()} Cocktail Heaven. All rights reserved.</p>
        <p>
          Classic recipes &amp; bottle photos via{" "}
          <a href="https://www.thecocktaildb.com" target="_blank" rel="noopener noreferrer">
            TheCocktailDB
          </a>
          . Please drink responsibly.
        </p>
      </div>
    </footer>
  );
}
