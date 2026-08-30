# Responsive cocktail website with ligth-, dark- and accessible-theme

This project showcases a modern cocktail website that is fully responsive and supports three themes: Light, Dark, and Accessible (for visually impaired users). The design emphasizes readability, usability, and smooth UI transitions.

---

## Desktop First Layout

The website is built desktop-first, meaning the design and layout are optimized for larger screens first and then adapted to tablets and mobile devices.

## Header & Navigation

A fixed header with a logo and navigation links (Home, Favorites, Signature Drinks, Shop, Recipes, Contact Us).

Includes a theme toggle button to switch between **light**, **dark**, and **accessible** themes.

Sign-in / Sign-up buttons dynamically adjust depending on the user authentication state.

---

## Themes

The website supports three themes using CSS custom properties (--variable-name) and dynamic class toggling on the body element:

### Light Theme

<img width="1919" height="847" alt="website_light" src="https://github.com/user-attachments/assets/4dd1d2fd-7d58-4c42-8239-4f4d4d781c76" />

- Default theme with soft ruby colors and a modern pastel palette.

- Optimized for normal readability and aesthetic visuals.

- Example colors:

```css
 --body-color: hsl(10, 30%, 85%), --card-bg: hsl(350, 75%, 30%)
 ```

### Dark Theme

<img width="1919" height="849" alt="website_dark" src="https://github.com/user-attachments/assets/92173148-7f8a-41cc-bfed-15906228e4af" />

- Designed for low-light conditions to reduce eye strain.

- Dark ruby backgrounds with brighter text for better contrast.

- Adjusted box shadows and text colors for visibility.

- Example colors:

```css
  --body-color: #342121, --card-bg: hsl(350, 80%, 20%)
  ```

### Accessible Theme

<img width="1917" height="832" alt="website_acc" src="https://github.com/user-attachments/assets/e4ca7bf0-3e8e-4449-bfd3-1c6cc8018a10" />

- For visually impaired users, larger font sizes and high contrast.

- Uses bright accents and clearly readable typography.

- Adjusted inputs, buttons, and modal containers to match accessible color standards.

- Example colors:

```css
--body-color: #2e2525, --card-bg: #371d1d, --accent-color: #00ffff
```

- Font sizes are scaled up:

```css
--biggest-font-size: 3.5rem, --h1-font-size: 1.75rem
```

## For tablet and mobile users (< 756px)

- Navigation transforms into a slide-out menu.

- Hamburger toggle button appears for opening/closing the menu.

- Theme toggle and sign-in/sign-up icons repositioned for usability.

- Example screenshot:

<img width="541" height="725" alt="mobile" src="https://github.com/user-attachments/assets/6d731e27-08c9-4941-ade6-86d7b0d7d135" />

## UI Components

### Header & Navigation

- Logo links to homepage.
- Menu items highlight on hover.
- Dynamic theme switcher with icons (`moon`, `sun`, `eye`).

### Sign-in / Sign-up Modals

- Centered overlays with scaling animation.
- Inputs use accessible variables for font size and contrast.
- Buttons highlight on hover with subtle animations.

<img width="1518" height="812" alt="signup" src="https://github.com/user-attachments/assets/ad1683e6-d20d-45c7-9dd4-25a2b160db21" />
  
### Shop / Cart

- Shopping cart icon with counter.
- Responsive layout ensures accessibility on mobile.
  
<img width="914" height="688" alt="viewcart" src="https://github.com/user-attachments/assets/2b8459ed-7135-4a57-9038-6ca75a2ff996" />

### Cocktail Cards

- Color-coded cards depending on theme.
- Shadows, border-radius, and accent borders enhance visual hierarchy.
- High-contrast colors in accessible mode for readability.
  
<img width="1919" height="848" alt="cocktails" src="https://github.com/user-attachments/assets/8db07251-0432-48bd-976e-e1a1269e785b" />

### Favourites & Signature Cocktails

- loop effect with different cocktail cards
- On hover effect for modern design

> **Note that the signature cocktail recipes are indeed my own creations, although not IBA-approved**

<img width="1919" height="842" alt="scroll" src="https://github.com/user-attachments/assets/1f9dc3bd-c67b-4202-922d-50126069c205" />

<img width="767" height="509" alt="onhover" src="https://github.com/user-attachments/assets/fbf42c9c-f67b-41b7-b2dc-bcd536742071" />

---

## CSS Structure

- Root variables (`:root`) define fonts, colors, shadows, border-radius, and spacing.
- Theme classes (`.dark-theme`, `.accessible-theme`) override root variables dynamically.
- Media queries handle responsive font sizes and layout adjustments.
- `transition` and `transform` properties ensure smooth animations when opening menus or switching themes.

---

## Accessibility Features

- High-contrast color scheme in accessible mode.
- Large, scalable fonts for headings, links, and inputs.
- Keyboard-friendly navigation (tab-focus visible).
- Hover & focus effects retained for visual cues.
- ARIA attributes can be added to enhance screen reader support.

---

## BACKEND: Express and Node.js

### CRUD

- **CREATE**
  - User login
  - Cart creation
  - Adding cart items
  - Placing order
  - Sending message

- **READ**
  - Fetch user info
  - Cart items
  - Cocktail and signatures list
  - Cart items count

- **UPDATE**
  - Cart items count is refreshed after adding/deleting items
  - Cart list is updated
  - After placing order, update stock in beverages/essentials tables:
    - `stock = stock - itemQuantity`

- **DELETE**
  - Delete cart items

<img width="1207" height="646" alt="database" src="https://github.com/user-attachments/assets/7269aedb-d744-416f-bd33-01d513fd41fc" />

---

#### Database configuration

Create a `.env` file in the `backend` folder where you add your basic database information

```js
DB_HOST=localhost
DB_USER=YOUR_USERNAME
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=YOUR_DB_NAME
```

than in the server.js file:

```js
const db = await mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});
```

#### Example code for api calls from `server.js`

```javascript
app.post('/api/cart', async (req, res) => {
    const { userId, quantity, beverageId, essentialId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Hiányzó adatok' });
    }
    try {
        let carts = await db.query("Select * from carts where user_id = ?", [userId]);
        let cartId;

        if (carts.length === 0) {
            let result = await db.query("insert into carts (user_id) values (?)", [userId]);
            cartId = result.insertId;
        } else cartId = carts[0].id

        let sql = `select * from cart_items
                where cart_id = ?`;
        let params;
        if (beverageId) {
            sql += " and beverage_id = ?;";
            params = [cartId, beverageId];
        } else if (essentialId) {
            sql += " and essential_id = ?;";
            params = [cartId, essentialId];
        } else {
            return res.status(400).json({ error: "Hiányzó termék ID" });
        }
        console.log(sql)

        let items = await db.query(sql, params)
        console.log("cartitems:", items)

        if (items.length > 0) {
            await db.query(`update cart_items Set quantity = quantity + ?
                    Where id = ?`,
                [quantity || 1, items[0].id])
        } else {
            await db.query(`INSERT INTO cart_items
                 (cart_id, beverage_id, essential_id, quantity) VALUES (?, ?, ?, ?)`,
                [cartId, beverageId || null, essentialId || null, quantity || 1]
            );
        }

        res.json({ message: "Hozzáadva a kosárhoz!", cartId });
    } catch (err) {
        res.status(500).json({ error: 'Adatbázis hiba' });
    }
});

app.get('/api/cart/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const carts = await db.query("Select * from carts where user_id = ?", [userId])
        if (!carts.length) return res.json({ items: [] });

        const cartId = carts[0].id;

        const orderItems = await db.query(`
            SELECT ci.id, ci.quantity, 
                    ci.beverage_id, 
                    ci.essential_id,
                    COALESCE(b.name, e.name) AS name,
                    COALESCE(b.price, e.price) AS price
            FROM cart_items ci
            LEFT JOIN beverages b ON ci.beverage_id = b.id
            LEFT JOIN essentials e ON ci.essential_id = e.id
            WHERE ci.cart_id = ?
         `, [cartId]);

        res.json({ orderItems })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: 'Hiba a kosár lekéréséhez.' })
    }
})

app.delete('/api/cart/:userId/item/:itemId', async (req, res) => {
    const { userId, itemId } = req.params;
    try {
        const carts = await db.query("Select * from carts where user_id = ?", [userId]);
        if (!carts.length) return res.status(404).json({ error: "Nincs kosár ehhez a felhasználóhoz" });
        const cartId = carts[0].id;

        const result = await db.query("DELETE FROM cart_items WHERE id = ? AND cart_id = ?", [itemId, cartId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Nincs ilyen tétel a kosárban" });
        }
        res.json({ message: "Tétel törölve a kosárból" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Hiba a tétel törlésekor" });
    }
});

app.post('/api/orders', async (req, res) => {
    const { userId, orderItems, total } = req.body;
    if (!userId || !orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json({ error: "Hiányzó adatok a rendeléshez" });
  }
  console.log("orderItems:", orderItems)

    try {
        const orderItemsJSON = JSON.stringify(orderItems || req.body.orderItems);
        const result = await db.query("insert into orders (user_id, total, order_items) values (?,?,?)",
            [userId, total, orderItemsJSON]
        )
        const orderId = result.insertId

        //stock frissítés
        for(let item of orderItems){
            if(item.beverageId){
                await db.query("update beverages set stock = stock - ? where name = ? and stock >= ?"
                    ,[item.quantity, item.name, item.quantity]
                )
            }
            if(item.essentialId){
                await db.query("update essentials set stock = stock - ? where name = ? and stock >= ?"
                    ,[item.quantity, item.name, item.quantity]
                )
            }
        }empty cart
        await db.query("DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = ?)", [userId]);

        res.json({ message: 'Rendelés létrehozva', orderId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Hiba a rendelés mentésekor' });
    }
});
```

---

### How to run the application

clone the project

```bash
clone <repository_name>
cd <working_directory>
cd ./with_react
```

#### Frontend

```bash
cd cocktail_website
npm run dev
```

### Backend

```bash
cd backend
node server.js
```
