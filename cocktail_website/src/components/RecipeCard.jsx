import React from 'react';

function RecipeCard({title, description, ingredients, image}) {
  // Egy kis biztonsági ellenőrzés (ha esetleg valahonnan mégis string jönne, nem omlik össze)
  const ingredientsArray = Array.isArray(ingredients) 
    ? ingredients 
    : ingredients.split(";");

  return (
    <div className="recipe_card">
      <h3 className="repice_title">{title}</h3>
      <img src={image} alt={title} className="recipe_image" width={150} height={150} />
      <p className="recipe_description">{description}</p>
      
      <ul className="recipe_ingredients_list">
        {ingredientsArray.map((ingredient, idx) => (
          <li key={idx}>
            {typeof ingredient === 'string' ? ingredient.trim() : ingredient}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecipeCard;