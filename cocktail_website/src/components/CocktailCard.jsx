function CocktailCard({ id, title, ingredients, image, alt, width = 250, height = 250 }) {
  return (
    <div className="cocktail_card" id={id}>
      <div className="card_bg">
        <span className="card_title">{title}</span>
      </div>
      
      <img
        className="card_image"
        src={image}
        alt={alt}
        width={width}
        height={height}
      />

      <div className="card_ingredients">
        <ul className="card_ingredients_list">
          {ingredients.map((item, index) => (
            <li key={index} className="card_ingredient_list_item">
              {item}
            </li>
          ))}
        </ul>
      </div>

      
    </div>
  );
}

export default CocktailCard;
