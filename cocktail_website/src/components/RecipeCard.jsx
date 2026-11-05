import { useId, useState } from "react";
import SmartImage from "./SmartImage";

/** Flipbook-style recipe card: photo on the front, method on the back. */
export default function RecipeCard({ name, image, imageLarge, glass, category, ingredients, instructions }) {
  const [flipped, setFlipped] = useState(false);
  const backId = useId();

  return (
    <article className={`recipe-card ${flipped ? "is-flipped" : ""}`}>
      <div className="recipe-card__inner">
        <div className="recipe-card__face recipe-card__front page" aria-hidden={flipped}>
          <div className="graded recipe-card__media">
            <SmartImage
              src={image}
              srcSet={imageLarge ? `${image} 350w, ${imageLarge} 700w` : undefined}
              sizes="(min-width: 40em) 320px, 90vw"
              alt={`${name} in a ${glass?.toLowerCase() ?? "glass"}`}
              width="350"
              height="350"
            />
          </div>
          <div className="recipe-card__body">
            <p className="eyebrow">{category}</p>
            <h3 className="recipe-card__title">{name}</h3>
            <p className="recipe-card__meta">
              <i className="ri-goblet-line" aria-hidden="true" /> {glass}
            </p>
          </div>
        </div>

        <div id={backId} className="recipe-card__face recipe-card__back page" aria-hidden={!flipped}>
          <h3 className="recipe-card__title">{name}</h3>
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

      <button
        type="button"
        className="btn btn--sm recipe-card__toggle"
        aria-expanded={flipped}
        aria-controls={backId}
        onClick={() => setFlipped((value) => !value)}
      >
        <i className={flipped ? "ri-arrow-go-back-line" : "ri-book-open-line"} aria-hidden="true" />
        {flipped ? "Back to photo" : "Show recipe"}
        <span className="visually-hidden"> for {name}</span>
      </button>
    </article>
  );
}
