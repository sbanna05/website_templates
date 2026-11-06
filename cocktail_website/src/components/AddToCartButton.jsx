import { useEffect, useState } from "react";
import { DIALOGS, useAuth, useCart, useDialog, useToast } from "../context/contexts";
import { formatPrice } from "../lib/format";

const CONFIRM_MS = 1600;

export default function AddToCartButton({ product }) {
  const { user } = useAuth();
  const { add, items } = useCart();
  const { open } = useDialog();
  const { notify } = useToast();
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

    const quantity = (items.find((item) => item.id === product.id)?.quantity ?? 0) + 1;
    notify({
      key: product.id,
      title: product.name,
      message: "added to cart",
      meta: `${quantity} in your cart · ${formatPrice(product.price * quantity)}`,
      image: product.image,
      action: { label: "View cart", onClick: () => open(DIALOGS.cart) },
    });
  };

  return (
    <button type="button" className={`btn btn--primary btn--block ${added ? "is-done" : ""}`} onClick={handleClick}>
      <i className={added ? "ri-check-line" : "ri-shopping-bag-3-line"} aria-hidden="true" />
      {/* the toast announces the result, so this label stays quiet */}
      <span className="btn__label">{added ? "Added" : "Add to cart"}</span>
      <span className="visually-hidden">: {product.name}</span>
    </button>
  );
}
