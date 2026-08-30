import { Link } from 'react-router-dom';
import beveragesImg from '../assets/images/beverages.jpg';
import essentialsImg from '../assets/images/essentials.jpg';

function Shop() {
  return (
    <section id="shop" className="shop_container grid">
      <div className="shop_title section_title">Discover Our Latest Items</div>

      <div className="shop_items">
        <Link to="/webshop" className="shop_item">
          <img src={beveragesImg} alt="Beverages" width={300} />
          <span className="shop_label">Beverages</span>
        </Link>

        <Link to="/webshop" className="shop_item">
          <img src={essentialsImg} alt="Essentials" width={300} height={250} />
          <span className="shop_label">Essentials</span>
        </Link>
      </div>
    </section>
  );
}

export default Shop;