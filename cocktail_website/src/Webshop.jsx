import React, { useState } from 'react';
// Mivel a Webshop.jsx a src/ mappában van, a components mappa mellette van:
import AddToCartButton from './components/AddToCartButton.jsx';
import './assets/css/shop.css';

// Tesztadatok backend helyett a portfólióhoz
const MOCK_BEVERAGES = [
  { id: 1, name: "Absolut", price: 8, image: "absolut.jpg" },
  { id: 2, name: "Campari", price: 10, image: "campari.jpg" },
  { id: 3, name: "Grey Goose", price: 9, image: "grey_goose.jpg" }
];

const MOCK_ESSENTIALS = [
  { id: 101, name: "Old Fashioned Glass", price: 25, image: "old_fashioned_glass.jpg" },
  { id: 102, name: "Muddler", price: 12, image: "muddler.jpg" },
  { id: 103, name: "Jigger", price: 8, image: "jigger.png" }
];

function Webshop({ user, onAdd }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [beverages] = useState(MOCK_BEVERAGES);
  const [essentials] = useState(MOCK_ESSENTIALS);

  const filteredDrinks = beverages.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEssentials = essentials.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="shop">
      <div className="shop_header">
        <h1 className="shop_title section_title">CocktailHeaven Shop</h1>
        <div className="search_bar">
          <input
            type="text"
            className="search_input" 
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="beverages" id="beverages">
        <h2 className="section_subtitle">Beverages</h2>
        <div className="drink_cards_container">
          {filteredDrinks.map((drink) => (
            <div className="drink_card" key={drink.id}>
               <img 
                src={`/images/tools/${drink.image}`} 
                alt={drink.name} 
                className="drink_img"
              />
              <div className="drink_info">
                <h3 className="drink_name">{drink.name}</h3>
                <p className="drink_price">{drink.price}$</p>
              </div>
              
              <AddToCartButton 
                user={user} 
                productId={drink.id} 
                type="beverage"
                onAdd={onAdd}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="essentials" id="essentials">
        <h2 className="section_subtitle">Bar Essentials</h2>
        <div className="bar_tools_container">
          {filteredEssentials.map((tool) => (
            <div className="tool_card" key={tool.id}>
              {/* JAVÍTVA: Az eszközök (tools) maradnak a tools mappában */}
              <img 
                src={`/images/tools/${tool.image}`} 
                alt={tool.name} 
                className="tool_img"
              />
              <div className="tool_info">
                <h3 className="tool_name">{tool.name}</h3>
                <p className="tool_price">{tool.price}$</p>
              </div>
              
              <AddToCartButton 
                user={user} 
                productId={tool.id} 
                type="essential"
                onAdd={onAdd}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Webshop;