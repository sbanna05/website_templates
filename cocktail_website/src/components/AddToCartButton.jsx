import { useEffect, useState } from "react";
import { DIALOGS, useAuth, useCart, useDialog } from "../context/contexts";

const CONFIRM_MS = 1600;

export default function AddToCartButton({ product }) {
  const { user } = useAuth();
  const { add } = useCart();
  const { open } = useDialog();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [added]);

  const handleClick = () => {
    if (!user) {
      open(DIALOGS.signIn, { message: "Sign in to start filling your cart." });
      return;
    }
    add(product);
    setAdded(true);
  };

  return (
    <button type="button" className={`btn btn--primary btn--block ${added ? "is-done" : ""}`} onClick={handleClick}>
      <i className={added ? "ri-check-line" : "ri-shopping-bag-3-line"} aria-hidden="true" />
      <span aria-live="polite">{added ? "Added" : "Add to cart"}</span>
      <span className="visually-hidden">: {product.name}</span>
    </button>
  );
}
