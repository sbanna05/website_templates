import React from 'react';

function AddToCartButton({ user, productId, type, onAdd }) {
  const handleAddToCart = () => {
    if (!user) {
      alert('Jelentkezz be a kosárhoz!');
      return;
    }
    
    if (onAdd) {
      onAdd({ id: productId, type });
    }
  };

  return (
    <button className="add_to_cart" onClick={handleAddToCart}>
      Add to Cart +
    </button>
  );
}

export default AddToCartButton;