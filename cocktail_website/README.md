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
