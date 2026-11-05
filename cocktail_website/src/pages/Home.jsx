import { Link } from "react-router-dom";
import homeImage from "../assets/images/home_picture_2.png";
import { ROUTES, SECTIONS, toSection } from "../config/navigation";
import Favourites from "./home/Favourites";
import ShopTeaser from "./home/ShopTeaser";
import Signatures from "./home/Signatures";
import Recipes from "./home/Recipes";
import Contact from "./home/Contact";

function Hero() {
  return (
    <section id={SECTIONS.home} className="hero section" aria-labelledby="hero-title">
      <div className="hero__inner container">
        <div className="hero__visual">
          <img src={homeImage} alt="A cocktail being poured at the bar" className="hero__image" width="900" height="900" fetchPriority="high" />
        </div>

        <div className="hero__content page">
          <p className="eyebrow">Bar &amp; bottle shop · est. 2025</p>
          <h1 id="hero-title" className="hero__title">
            Welcome to <em>Cocktail Heaven</em>
          </h1>
          <p className="hero__lead">Mixing flavours, crafting experiences. Discover our finest cocktails &amp; essentials.</p>

          <div className="hero__actions">
            <Link to={toSection(SECTIONS.favourites)} className="btn btn--primary">
              <i className="ri-sparkling-2-line" aria-hidden="true" /> Explore favourites
            </Link>
            <Link to={ROUTES.shop} className="btn btn--ghost">
              <i className="ri-store-2-line" aria-hidden="true" /> Shop now
            </Link>
          </div>

          <p className="hero__body">
            We believe a great cocktail is more than just a drink – it&rsquo;s an experience. From timeless classics to bold new
            creations, we craft with passion.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Favourites />
      <Signatures />
      <ShopTeaser />
      <Recipes />
      <Contact />
    </>
  );
}
