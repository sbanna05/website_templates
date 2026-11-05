import RecipeCard from "../../components/RecipeCard";
import SectionHeading from "../../components/SectionHeading";
import { SECTIONS } from "../../config/navigation";
import { CLASSIC_IDS, FALLBACK_CLASSICS } from "../../data/catalog";
import { useCocktails } from "../../hooks/useCocktails";

function RecipeSkeleton() {
  return (
    <li className="recipe-card recipe-card--skeleton" aria-hidden="true">
      <div className="skeleton skeleton--media" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--short" />
    </li>
  );
}

export default function Recipes() {
  const { status, data } = useCocktails(CLASSIC_IDS, FALLBACK_CLASSICS);

  return (
    <section id={SECTIONS.recipes} className="section section--sunken" aria-labelledby="recipes-title" aria-busy={status === "loading"}>
      <div className="container">
        <SectionHeading
          id="recipes-title"
          eyebrow="Learn the classics"
          title="Look up our cocktail recipes"
          lead="Turn the page on any card for the ingredients and method."
        />

        {status === "error" && (
          <p className="notice" role="status">
            <i className="ri-wifi-off-line" aria-hidden="true" /> We couldn&rsquo;t reach the recipe library, so here are a few offline favourites.
          </p>
        )}

        <ul className="recipe-grid">
          {status === "loading"
            ? CLASSIC_IDS.map((id) => <RecipeSkeleton key={id} />)
            : data.map((cocktail) => (
                <li key={cocktail.id}>
                  <RecipeCard {...cocktail} />
                </li>
              ))}
        </ul>

        <p className="credit">
          Recipes &amp; photos:{" "}
          <a href="https://www.thecocktaildb.com" target="_blank" rel="noopener noreferrer">
            TheCocktailDB
          </a>
        </p>
      </div>
    </section>
  );
}
