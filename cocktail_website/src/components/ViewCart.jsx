import React, { useState } from "react";

// Ha az App.jsx-ből kapja a termékeket, akkor a cartItems prop-ot használja,
// egyébként mutat egy mock kosarat a portfólió vizualizáció miatt.
function ViewCart({ user, onClose, onOrder, onUpdateCart }) {
  const [cartItems, setCartItems] = useState([
    { id: 1, name: "Mojito", price: 8, quantity: 2 },
    { id: 101, name: "Boston Shaker", price: 25, quantity: 1 }
  ]);

  if (!user) {
    return (
      <div className="cart_overlay" onClick={onClose}>
        <div className="view_cart_container" onClick={(e) => e.stopPropagation()}>
          <h2>Jelentkezz be a kosár megtekintéséhez!</h2>
          <button className="cancel_btn" onClick={onClose}>Bezárás</button>
        </div>
      </div>
    );
  }

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleOrder = () => {
    if (!cartItems.length) {
      alert("A kosár üres!");
      return;
    }
    alert("Rendelés sikeresen elküldve! (Demo mód)");
    setCartItems([]);
    if (onOrder) onOrder();
  };

  const handleDeleteItem = (item) => {
    if (!window.confirm(`Biztosan törlöd a következő tételt a kosárból? \n${item.name}`)) return;
    
    // Szűrés ID alapján
    const updatedCart = cartItems.filter((ci) => ci.id !== item.id);
    setCartItems(updatedCart);
    
    if (onUpdateCart) onUpdateCart(updatedCart);
  };

  return (
    <div className="cart_overlay" onClick={onClose}>
      <div className="view_cart_container" onClick={(e) => e.stopPropagation()}>
        <h2 className="view_cart_title">My Cart</h2>
        
        {cartItems.length === 0 ? (
          <p style={{ textAlign: 'center', margin: '2rem 0' }}>Your cart is empty.</p>
        ) : (
          <table className="cart_table table table-bordered table-striped">
            <thead className="text-black justify-content-center">
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Total</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="delete_btn"
                      title="Tétel törlése"
                      style={{
                        background: "none",
                        border: "none",
                        color: "crimson",
                        cursor: "pointer",
                        fontSize: "1.2rem"
                      }}
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3">
                  <strong>Total price:</strong>
                </td>
                <td colSpan={2}>
                  <strong>${totalPrice.toFixed(2)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        )}

        <div className="cart_buttons">
          {cartItems.length > 0 && (
            <button className="order_btn" onClick={handleOrder}>
              Order
            </button>
          )}
          <button className="cancel_btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewCart;