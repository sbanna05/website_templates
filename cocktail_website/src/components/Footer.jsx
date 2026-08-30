import React from "react";

export default function Footer() {
  return (
    <footer id="footer" className="footer_container grid">
      <div className="footer_logo">
        <a href="#" className="footer_logo">CocktailHeaven</a>
      </div>

      <div className="footer_links">
        <ul className="footer_links_list">
          <li className="footer_links_item">
            <a href="#home" className="footer_links_link">Home</a>
          </li>
          <li className="footer_links_item">
            <a href="#favorites" className="footer_links_link">Favorites</a>
          </li>
          <li className="footer_links_item">
            <a href="#signatures" className="footer_links_link">Signature Drinks</a>
          </li>
          <li className="footer_links_item">
            <a href="#shop" className="footer_links_link">Shop</a>
          </li>
          <li className="footer_links_item">
            <a href="#contact-us" className="footer_links_link">Contact Us</a>
          </li>
        </ul>
      </div>

      <div className="footer_social">
        <a href="https://www.facebook.com" className="footer_social_link">
          <i className="ri-facebook-fill"></i>
        </a>
        <a href="https://www.instagram.com" className="footer_social_link">
          <i className="ri-instagram-fill"></i>
        </a>
        <a href="https://www.twitter.com" className="footer_social_link">
          <i className="ri-twitter-x-fill"></i>
        </a>
      </div>

      <div className="footer_copy">
        <p>&copy; 2025 Cocktail Website. All rights reserved.</p>
      </div>
    </footer>
  );
}

