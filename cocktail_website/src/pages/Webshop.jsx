import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import SectionHeading from "../components/SectionHeading";
import { ROUTES, SECTIONS, toSection } from "../config/navigation";
import { CATEGORIES, PRODUCTS } from "../data/catalog";

const ALL = "all";

export default function Webshop() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const deferredQuery = useDeferredValue(query);

  const groups = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return CATEGORIES.filter((c) => category === ALL || c.id === category).map((c) => ({
      ...c,
      products: PRODUCTS.filter(
        (p) => p.category === c.id && (!needle || `${p.name} ${p.detail}`.toLowerCase().includes(needle)),
      ),
    }));
  }, [deferredQuery, category]);

  const resultCount = groups.reduce((sum, g) => sum + g.products.length, 0);
  const filters = [{ id: ALL, label: "All", icon: "ri-apps-2-line" }, ...CATEGORIES];

  return (
    <div className="webshop section">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to={toSection(SECTIONS.home)}>Home</Link>
            </li>
            <li aria-current="page">Shop</li>
          </ol>
        </nav>

        <SectionHeading as="h1" eyebrow="The bottle shop" title="Cocktail Heaven shop" lead="Everything you need to recreate our bar at home." />

        <div className="shop-toolbar page" role="search">
          <label className="search">
            <span className="visually-hidden">Search products</span>
            <i className="ri-search-line" aria-hidden="true" />
            <input type="search" placeholder="Search bottles & tools…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>

          <div className="chips" role="group" aria-label="Filter by category">
            {filters.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={category === f.id} onClick={() => setCategory(f.id)}>
                <i className={category === f.id ? "ri-check-line" : f.icon} aria-hidden="true" />
                {f.label}
              </button>
            ))}
          </div>

          <p className="shop-toolbar__count" role="status">
            {resultCount} {resultCount === 1 ? "product" : "products"}
          </p>
        </div>

        {groups.map((group) => (
          <section key={group.id} id={group.id} className="shop-group" aria-labelledby={`${group.id}-title`}>
            <h2 id={`${group.id}-title`} className="shop-group__title">
              <i className={group.icon} aria-hidden="true" /> {group.label}
            </h2>
            {group.products.length ? (
              <ul className="product-grid">
                {group.products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state empty-state--inline">No {group.label.toLowerCase()} match “{deferredQuery}”.</p>
            )}
          </section>
        ))}

        <p className="credit">
          <Link to={ROUTES.home}>← Back to the bar</Link>
        </p>
      </div>
    </div>
  );
}
