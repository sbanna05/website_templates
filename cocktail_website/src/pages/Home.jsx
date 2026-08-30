import React, { useState } from "react";
import homeImage from "../assets/images/home_picture_2.png"; 

import Favourites from "./Favourites";
import Shop from "./Shop";
import Contact from "./Contact";
import Recipes from "./Recipes";

const MOCK_COCKTAILS = [
  { id: 1, name: "Margarita", description: "Classic tequila cocktail.", image: "margarita", ingredients: ["Tequila", "Lime juice", "Triple sec"] },
  { id: 2, name: "Mojito", description: "Minty fresh rum drink.", image: "mojito", ingredients: ["White rum", "Mint", "Lime juice", "Soda water"] },
  { id: 3, name: "Old Fashioned", description: "A whiskey lover's dream.", image: "oldfashioned", ingredients: ["Bourbon", "Angostura bitters", "Sugar cube"] }
];

const MOCK_SIGNATURES = [
  { id: 101, name: "Heavenly Glow", description: "Our special glowing cocktail.", image: "heavenly_glow.jpg", ingredients: ["Gin", "Blue Curacao", "Tonic"] },
  { id: 102, name: "Dark Abyss", description: "Deep flavors for the brave.", image: "dark_abyss.jpg", ingredients: ["Dark rum", "Blackberry syrup", "Lime"] }
];

function Home({ user }) {
  const [cocktails] = useState(MOCK_COCKTAILS);
  const [signatures] = useState(MOCK_SIGNATURES);

  const handleSubmit = (messageData) => {
    console.log("Kapott üzenet:", messageData);
    alert('Üzenet sikeresen elküldve! (Portfólió demó funkció)');
  };

  return (
    <>
      <section id="home">
        <div className="home_container container grid">
          <h1 className="home_title section_title">
            Welcome to Cocktail Heaven
          </h1>

          <div className="home_row">
            <div className="home_picture">
              <img src={homeImage} alt="home_picture" className="home_image" />
            </div>

            <div className="home_content">
              <p className="home_info">
                Mixing flavours, crafting experiences. Discover our finest
                cocktails & essentials.
              </p>

              <div className="home_links">
                <a href="#favourites" className="home_link">
                  Explore Favourites
                </a>
                <a href="#shop" className="home_link">
                  Shop Now
                </a>
              </div>

              <p className="home_info">
                We believe a great cocktail is more than just a drink – it's an
                experience. From timeless classics to bold new creations, we
                craft with passion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Favourites />
      <Shop />
      <Recipes cocktails={cocktails} signatures={signatures} />
      <Contact onSubmit={handleSubmit} user={user} />
    </>
  );
}

export default Home;