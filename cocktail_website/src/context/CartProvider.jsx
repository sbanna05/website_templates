import { useEffect, useMemo, useReducer } from "react";
import { CartContext, useAuth } from "./contexts";

function cartReducer(items, action) {
  switch (action.type) {
    case "add": {
      const existing = items.find((item) => item.id === action.product.id);
      if (existing) {
        return items.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      const { id, name, price, image } = action.product;
      return [...items, { id, name, price, image, quantity: 1 }];
    }
    case "setQuantity":
      return action.quantity <= 0
        ? items.filter((item) => item.id !== action.id)
        : items.map((item) => (item.id === action.id ? { ...item, quantity: action.quantity } : item));
    case "remove":
      return items.filter((item) => item.id !== action.id);
    case "clear":
      return [];
    default:
      throw new Error(`Unknown cart action: ${action.type}`);
  }
}

export default function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, dispatch] = useReducer(cartReducer, []);

  // The cart belongs to a signed-in user: signing out empties it.
  useEffect(() => {
    if (!user) dispatch({ type: "clear" });
  }, [user]);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return {
      items,
      count,
      total,
      add: (product) => dispatch({ type: "add", product }),
      setQuantity: (id, quantity) => dispatch({ type: "setQuantity", id, quantity }),
      remove: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [items]);

  return <CartContext value={value}>{children}</CartContext>;
}
