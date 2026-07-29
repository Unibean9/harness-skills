# Responsive & Accessibility Basics

## Why this matters

Users hit your UI on wildly different screen sizes and with different
abilities - a layout that only works at one viewport width, or text only
readable by someone with perfect eyesight and full mouse control, excludes
real users, not an edge case.

## One minimal responsive CSS example

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
```

`auto-fit` + `minmax()` lets the grid figure out how many columns fit at
the current width on its own - no media query breakpoints needed for the
common "cards that reflow" case.

## Self-review checklist before calling a UI done

- Does every interactive element have a visible focus state (not just `:hover`)?
- Is text contrast readable (dark text on light background, or checked against a contrast guideline)?
- Does the layout still work at a narrow (mobile) width without horizontal scrolling?
- Do images have meaningful `alt` text (or an empty `alt=""` if purely decorative)?
- Can every action be reached and triggered using only the keyboard?
- Do form inputs have an associated, visible label (not just a placeholder)?
