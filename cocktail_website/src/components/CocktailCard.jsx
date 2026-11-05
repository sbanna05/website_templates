/**
 * Favourites card – keeps the original 3D hover: the stage tips back,
 * the glass lifts out and the ingredient slip slides in.
 * Also triggers on keyboard focus; the accessible theme shows ingredients statically.
 */
export default function CocktailCard({ title, image, ingredients, focusable = true }) {
  return (
    <article className="cocktail-card" tabIndex={focusable ? 0 : -1} aria-label={title}>
      <div className="cocktail-card__stage">
        <h3 className="cocktail-card__title">{title}</h3>
      </div>

      <img className="cocktail-card__image" src={image} alt="" width="160" height="160" loading="lazy" decoding="async" />

      <ul className="cocktail-card__ingredients" aria-label={`${title} ingredients`}>
        {ingredients.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
