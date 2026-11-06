import { Link } from "react-router-dom";
import SectionHeading from "../../components/SectionHeading";
import { ROUTES, SECTIONS, toSection } from "../../config/navigation";
import beveragesImg from "../../assets/images/beverages.jpg";
import essentialsImg from "../../assets/images/essentials_web.jpg";

const TILES = [
  { id: SECTIONS.beverages, label: "Beverages", blurb: "Spirits, liqueurs & bitters", image: beveragesImg },
  { id: SECTIONS.essentials, label: "Essentials", blurb: "Glassware & bar tools", image: essentialsImg },
];

export default function ShopTeaser() {
  return (
    <section id={SECTIONS.shop} className="section" aria-labelledby="shop-teaser-title">
      <div className="container">
        <SectionHeading id="shop-teaser-title" eyebrow="The bottle shop" title="Discover our latest items" />

        <ul className="shop-tiles">
          {TILES.map((tile, index) => (
            <li key={tile.id} data-reveal="zoom" style={{ "--i": index }}>
              <Link to={toSection(tile.id, ROUTES.shop)} className="shop-tile graded">
                <img src={tile.image} alt="" width="600" height="450" loading="lazy" decoding="async" />
                <span className="shop-tile__label">
                  <span className="shop-tile__title">{tile.label}</span>
                  <span className="shop-tile__blurb">{tile.blurb}</span>
                  <span className="shop-tile__cta">
                    Shop {tile.label.toLowerCase()} <i className="ri-arrow-right-line" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
