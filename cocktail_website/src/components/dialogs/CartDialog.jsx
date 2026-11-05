import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../Modal";
import SmartImage from "../SmartImage";
import { ROUTES } from "../../config/navigation";
import { useCart, useDialog } from "../../context/contexts";
import { formatPrice } from "../../lib/format";

function CartLine({ item }) {
  const { setQuantity, remove } = useCart();

  return (
    <li className="cart-line">
      <SmartImage src={item.image} alt="" className="cart-line__image" width="56" height="56" />
      <div className="cart-line__info">
        <p className="cart-line__name">{item.name}</p>
        <p className="cart-line__price">{formatPrice(item.price)} each</p>
      </div>
      <div className="stepper" role="group" aria-label={`Quantity of ${item.name}`}>
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => setQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
          <i className="ri-subtract-line" aria-hidden="true" />
        </button>
        <output className="stepper__value" aria-live="polite">
          {item.quantity}
        </output>
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => setQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
          <i className="ri-add-line" aria-hidden="true" />
        </button>
      </div>
      <p className="cart-line__total">{formatPrice(item.price * item.quantity)}</p>
      <button type="button" className="icon-btn icon-btn--sm" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>
        <i className="ri-delete-bin-6-line" aria-hidden="true" />
      </button>
    </li>
  );
}

export default function CartDialog() {
  const { items, total, clear } = useCart();
  const { close } = useDialog();
  const [ordered, setOrdered] = useState(false);

  const placeOrder = () => {
    clear();
    setOrdered(true);
  };

  if (ordered) {
    return (
      <Modal title="Order placed" onClose={close} size="sm">
        <p className="empty-state" role="status">
          <i className="ri-checkbox-circle-line" aria-hidden="true" />
          Thank you! Your order is on its way. <span className="hint">(Demo – nothing was charged.)</span>
        </p>
        <button type="button" className="btn btn--primary btn--block" onClick={close}>
          Continue
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Your cart" onClose={close}>
      {items.length === 0 ? (
        <div className="empty-state">
          <i className="ri-shopping-bag-3-line" aria-hidden="true" />
          <p>Your cart is empty.</p>
          <Link to={ROUTES.shop} className="btn btn--primary" onClick={close}>
            Browse the shop
          </Link>
        </div>
      ) : (
        <>
          <ul className="cart-lines">
            {items.map((item) => (
              <CartLine key={item.id} item={item} />
            ))}
          </ul>
          <div className="cart-summary">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={close}>
              Keep shopping
            </button>
            <button type="button" className="btn btn--primary" onClick={placeOrder}>
              <i className="ri-secure-payment-line" aria-hidden="true" /> Place order
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
