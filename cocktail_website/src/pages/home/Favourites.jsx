import { useState } from "react";
import CocktailCard from "../../components/CocktailCard";
import SectionHeading from "../../components/SectionHeading";
import { SECTIONS } from "../../config/navigation";
import { FAVOURITES } from "../../data/catalog";


export default function Favourites() {
  const [paused, setPaused] = useState(false);

  return (
    <section id={SECTIONS.favourites} className="section section--band" aria-labelledby="favourites-title">
      <div className="container">
        <SectionHeading id="favourites-title" eyebrow="On the menu" title="This week's favourites" lead="Hover or focus a card to see what goes in the glass." />
      </div>

      <div className={`marquee ${paused ? "is-paused" : ""}`}>
        <ul className="marquee__track">
          {FAVOURITES.map((cocktail) => (
            <li key={cocktail.id} className="marquee__item">
              <CocktailCard {...cocktail} />
            </li>
          ))}
          {FAVOURITES.map((cocktail) => (
            <li key={`loop-${cocktail.id}`} className="marquee__item marquee__item--clone" aria-hidden="true" inert>
              <CocktailCard {...cocktail} focusable={false} />
            </li>
          ))}
        </ul>
      </div>

      <div className="container marquee__controls">
        <button type="button" className="btn btn--ghost btn--sm" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          <i className={paused ? "ri-play-line" : "ri-pause-line"} aria-hidden="true" />
          {paused ? "Play carousel" : "Pause carousel"}
        </button>
      </div>
    </section>
  );
}