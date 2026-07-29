# Design Tokens and Styling Basics

## Why CSS variables for color/spacing/typography

```css
:root {
  --color-primary: #2b6cb0;
  --space-md: 16px;
  --font-body: "Inter", sans-serif;
}

.button {
  background: var(--color-primary);
  padding: var(--space-md);
  font-family: var(--font-body);
}
```

Naming a value once (a "token") instead of repeating a raw hex code or
pixel value everywhere means: one change updates every usage, values stay
consistent across components, and a future theme/dark-mode swap only needs
to redefine the tokens, not hunt through every file.

## A few common mistakes to avoid

| Mistake | Why it hurts |
|---|---|
| Gradient text used just to "look fancy" | Often hurts legibility and looks dated rather than premium |
| Low-contrast text (light gray on white) | Fails accessibility and is genuinely hard to read |
| Hardcoding colors/spacing inline everywhere | Impossible to keep consistent or re-theme later |
| Copying a trendy font without checking it renders your content well | A display font that's unreadable at body-text size |

## Make it yours

Pick your own token names/values and the styling approach that fits your
stack (plain CSS variables, a CSS-in-JS library, a utility framework) -
the point is having named, reusable values, not a specific tool.
