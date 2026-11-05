/**
 * Single source of truth for routes, section anchors and navigation links.
 * Header, footer, hero buttons and the scroll-spy all read from here,
 * so a renamed section can never silently break a link again.
 */
export const ROUTES = {
  home: "/",
  shop: "/shop",
};

export const SECTIONS = {
  home: "home",
  favourites: "favourites",
  shop: "shop-teaser",
  signatures: "signatures",
  recipes: "recipes",
  contact: "contact",
  beverages: "beverages",
  essentials: "essentials",
};

/** Build a router `to` object that targets an anchor on a given page. */
export const toSection = (id, pathname = ROUTES.home) => ({ pathname, hash: `#${id}` });

export const NAV_LINKS = [
  { label: "Home", to: toSection(SECTIONS.home), section: SECTIONS.home },
  { label: "Favourites", to: toSection(SECTIONS.favourites), section: SECTIONS.favourites },
  { label: "Signatures", to: toSection(SECTIONS.signatures), section: SECTIONS.signatures },
  { label: "Recipes", to: toSection(SECTIONS.recipes), section: SECTIONS.recipes },
  { label: "Shop", to: { pathname: ROUTES.shop } },
  { label: "Contact", to: toSection(SECTIONS.contact), section: SECTIONS.contact },
];

export const SOCIAL_LINKS = [
  { label: "Facebook", href: "https://www.facebook.com", icon: "ri-facebook-fill" },
  { label: "Instagram", href: "https://www.instagram.com", icon: "ri-instagram-fill" },
  { label: "X (Twitter)", href: "https://x.com", icon: "ri-twitter-x-fill" },
];
