import { useRef } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "../../components/SectionHeading";
import SmartImage from "../../components/SmartImage";
import { ROUTES, SECTIONS } from "../../config/navigation";
import { SIGNATURES } from "../../data/catalog";
import { prefersReducedMotion } from "../../lib/format";

export default function Signatures() {
  const railRef = useRef(null);

  const turnPage = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const page = rail.querySelector(".signature-card");
    const step = page ? page.getBoundingClientRect().width + 24 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * step, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  };

  return (
    <section id={SECTIONS.signatures} className="section signatures" aria-labelledby="signatures-title">
      <div className="container signatures__head">
        <SectionHeading
          id="signatures-title"
          align="start"
          eyebrow="Only at Cocktail Heaven"
          title="Signature drinks"
          lead="Our own creations – the recipes stay behind the bar. Order them in person or pick up the bottles to experiment at home."
        />
        <div className="signatures__nav" data-reveal="fade">
          <button type="button" className="icon-btn icon-btn--outline" onClick={() => turnPage(-1)} aria-label="Previous page" aria-controls="signature-rail">
            <i className="ri-arrow-left-line" aria-hidden="true" />
          </button>
          <button type="button" className="icon-btn icon-btn--outline" onClick={() => turnPage(1)} aria-label="Next page" aria-controls="signature-rail">
            <i className="ri-arrow-right-line" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul id="signature-rail" ref={railRef} className="signatures__rail" tabIndex={0} aria-label="Signature drinks, scroll horizontally">
        {SIGNATURES.map((drink, index) => (
          <li key={drink.id} className="signature-card" data-reveal="right" style={{ "--i": index }}>
            <figure className="signature-card__page">
              <div className="graded signature-card__media">
                <SmartImage src={drink.image} alt={`${drink.name}: ${drink.look}`} width="600" height="900" />
              </div>
              <figcaption className="signature-card__caption">
                <span className="signature-card__folio" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="signature-card__name">{drink.name}</h3>
                <p className="signature-card__glass">
                  <i className="ri-goblet-line" aria-hidden="true" /> {drink.glass}
                </p>
                <p className="signature-card__look">{drink.look}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="container signatures__cta" data-reveal>
        <Link to={ROUTES.shop} className="btn btn--primary">
          <i className="ri-store-2-line" aria-hidden="true" /> Stock your home bar
        </Link>
      </div>
    </section>
  );
}
