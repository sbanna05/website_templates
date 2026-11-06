import { useState } from "react";
import SmartImage from "./SmartImage";

const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

/**
 * Flipbook-style recipe card: photo on the front, method on the back.
 *  - mouse:    the page turns on hover
 *  - keyboard: Tab lands on the recipe side, which turns the page; arrow keys scroll it if it is long
 *  - touch:    tap to turn, tap again to turn back
 *  - screen readers get both sides in reading order (nothing is aria-hidden)
 *  - accessible theme: no flip, photo and recipe are stacked (accessible.css)
 */
export default function RecipeCard({ name, image, imageLarge, glass, category, ingredients, instructions }) {
  const [flipped, setFlipped] = useState(false);

  const handleClick = () => {
    if (!canHover()) setFlipped((value) => !value);
  };

  return (
    <article className={`recipe-card ${flipped ? "is-flipped" : ""}`} onClick={handleClick}>
      <div className="recipe-card__inner">
        <div className="recipe-card__face recipe-card__front page">
          <div className="graded recipe-card__media">
            <SmartImage
              src={image}
              srcSet={imageLarge ? `${image} 350w, ${imageLarge} 700w` : undefined}
              sizes="(min-width: 40em) 320px, 90vw"
              alt={`${name} in a ${glass?.toLowerCase() ?? "glass"}`}
              width="350"
              height="350"
            />
            <span className="recipe-card__hint" aria-hidden="true">
              <i className="ri-book-open-line" /> Recipe
            </span>
          </div>
          <div className="recipe-card__body">
            <p className="eyebrow">{category}</p>
            <h3 className="recipe-card__title">{name}</h3>
            <p className="recipe-card__meta">
              <i className="ri-goblet-line" aria-hidden="true" /> {glass}
            </p>
          </div>
        </div>

        <div className="recipe-card__face recipe-card__back page scroll-area" tabIndex={0} role="group" aria-label={`${name} recipe`}>
          <p className="recipe-card__title" aria-hidden="true">
            {name}
          </p>
          <h4 className="recipe-card__label">Ingredients</h4>
          <ul className="recipe-card__ingredients">
            {ingredients.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h4 className="recipe-card__label">Method</h4>
          <p className="recipe-card__method">{instructions}</p>
        </div>
      </div>
    </article>
  );
}
