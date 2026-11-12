# Website templates

Each folder is a separate, self-contained site. Work only inside the folder the task names.

## Design rules

Apply these to every interface designed or built in this repository.

### Structure and hierarchy

- Use a design system. Define colour, type, spacing, radius, shadow and motion as tokens first, then build components from the tokens. No one-off values.
- Show the actual product. Use real renders, screenshots or live components, not abstract illustrations or placeholder icons.
- Enlarge the main feature. The thing the page exists for gets the most space and visual weight.
- Group with spacing. Separate sections with whitespace before reaching for borders, boxes or divider lines.
- Emphasise the call to action. One primary action per view, and it is the most prominent control on screen.
- Remove embellishments. Every element must earn its place; delete decoration that carries no information.

### Typography and copy

- Make headlines specific. Say what the thing is or does ("Pick a block to shape it"), never a generic label ("Inspector", "Welcome").
- Wrap headlines properly. Use `text-wrap: balance` on headlines and `text-wrap: pretty` on body copy; no orphaned single words.
- Do not italicise random words. Italic is for genuine emphasis or titles only.
- Use monospace only when needed: code, key caps and data that must align by character. Never as a style choice.
- Use tabular numbers (`font-variant-numeric: tabular-nums`) for any number that changes or lines up in a column.
- Drop redundant labels. If the content or context already says it, do not label it again.
- Improve text contrast. Body text meets WCAG AA at minimum (4.5:1); check secondary and muted text too.

### Components

- Delete filter badges and status chips ("new", "soon", "beta") unless they change what the user can do.
- Add one accent colour and use it consistently for selection, focus and the primary action.
- Keep icons consistent: one family, one stroke width, one grid size, one corner style.
- Inner radius = outer radius − padding. A card inside a 20 px panel with 12 px padding gets an 8 px radius.
- Align by eye, not by pixels. Correct optically for icon shapes, glyph side-bearings and visual weight.

### States and feedback

- Add loading states. Anything that takes longer than about 100 ms shows a skeleton, spinner or progress.
- Animate useful feedback. Motion confirms an action or shows where something went. No decorative animation, and always respect `prefers-reduced-motion`.

## Code

- Follow best practice for the stack in use and keep code clean: small focused modules, descriptive names, no dead code, no commented-out blocks.
- Comments explain why, not what.
- Accessibility is part of done: alt text on images, full keyboard operation, visible focus, labelled controls.
