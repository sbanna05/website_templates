import SmartImage from "./SmartImage";
import AddToCartButton from "./AddToCartButton";
import { formatPrice } from "../lib/format";

export default function ProductCard({ product }) {
  return (
    <article className="product-card page">
      <div className="product-card__media">
        <SmartImage src={product.image} alt={product.name} width="220" height="220" fallbackIcon="ri-store-2-line" />
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__detail">{product.detail}</p>
        <p className="product-card__price">{formatPrice(product.price)}</p>
      </div>
      <AddToCartButton product={product} />
    </article>
  );
}
