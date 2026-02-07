# Transaction Tapestry Style Guide

**Version 1.0** | Last Updated: February 2026

This style guide defines the visual language and design system for Transaction Tapestry, inspired by Karmê Chöling's warm, contemplative aesthetic combined with clean, minimalist financial design.

---

## Design Philosophy

**Core Values:**
- Warm and welcoming, not corporate or cold
- Clean and spacious with generous white space
- Contemplative and mindful
- Professional yet approachable
- Elegant without being ostentatious

---

## Color Palette

### Primary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Brand Orange** | `#F16437` | 241, 100, 55 | Primary actions, headings, key accents |
| **Sun Yellow** | `#F9CA01` | 249, 202, 1 | Highlights, hover states, table accents |
| **Success Green** | `#059669` | 5, 150, 105 | Positive values, income indicators |

### Neutral Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Text Black** | `#000000` | 0, 0, 0 | Primary text, card values, important data |
| **Text Gray** | `#333333` | 51, 51, 51 | Body text, descriptions |
| **Label Gray** | `#999999` | 153, 153, 153 | Labels, secondary text |
| **Muted Blue-Gray** | `#7A93A3` | 122, 147, 163 | Tertiary text, subtle elements |
| **Pure White** | `#FFFFFF` | 255, 255, 255 | Card backgrounds, primary surfaces |

### Background Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Warm Cream 1** | `#FFFBF5` | Primary background gradient start |
| **Warm Cream 2** | `#FFF9F0` | Primary background gradient middle |
| **Cool Touch** | `#F8FCFD` | Primary background gradient end |
| **Card Gradient 1** | `#FFFFFF` | Card background gradient start |
| **Card Gradient 2** | `#FFFBF8` | Card background gradient end |

### Border Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Primary Border** | `#F5E8DC` | Card borders, default state |
| **Secondary Border** | `#E8DDD5` | Button borders, subtle dividers |
| **Table Border** | `#FAF5EE` | Table row separators |

---

## Typography

### Font Families

```css
/* Headings */
font-family: 'Crimson Text', Georgia, serif;

/* Body Text */
font-family: 'Libre Baskerville', Georgia, serif;

/* System Fallback */
font-family: Georgia, serif;
```

**Google Fonts Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Crimson+Text:wght@400;600&display=swap" rel="stylesheet">
```

### Typography Scale

| Element | Font Family | Size | Weight | Line Height | Letter Spacing | Color |
|---------|-------------|------|--------|-------------|----------------|-------|
| **H1 (Page Title)** | Crimson Text | 36px | 600 | 1.2 | -0.3px | #F16437 |
| **H2 (Section Title)** | Crimson Text | 28px | 600 | 1.3 | -0.3px | #F16437 or #000000 |
| **H3 (Subsection)** | Crimson Text | 24px | 600 | 1.3 | -0.2px | #000000 |
| **Card Value** | Crimson Text | 40px | 600 | 1.2 | -1px | #000000 |
| **Body Text** | Libre Baskerville | 14px | 400 | 1.7 | 0.3px | #333333 |
| **Button Text** | Libre Baskerville | 13px | 700 | 1.2 | 0.3px | varies |
| **Label (Card)** | Libre Baskerville | 11px | 700 | 1.2 | 1.8px | #999999 |
| **Table Header** | Libre Baskerville | 11px | 700 | 1.2 | 1.8px | #666666 |
| **Subtitle** | Libre Baskerville | 12-13px | 400 | 1.2 | 2.5px | #7A93A3 |

**Typography Guidelines:**
- All labels should be uppercase with increased letter spacing (1.8-2.5px)
- Card values and important numbers use Crimson Text for elegance
- Body text uses Libre Baskerville for readability
- Line height of 1.7 for body text ensures readability

---

## Spacing System

Use a consistent 4px base unit for spacing:

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-xs` | 8px | Tight spacing within components |
| `spacing-sm` | 12px | Small gaps, compact layouts |
| `spacing-md` | 16px | Default spacing within cards |
| `spacing-lg` | 24px | Section spacing, card gaps |
| `spacing-xl` | 28px | Large gaps between card groups |
| `spacing-2xl` | 40px | Major section spacing, card padding |
| `spacing-3xl` | 60px | Page-level spacing, major sections |

**Card Padding:** 40px
**Button Padding:** 14px (vertical) × 32px (horizontal)
**Table Cell Padding:** 22px (vertical) × 32px (horizontal)
**Container Max Width:** 1400px
**Page Padding:** 40px (vertical) × 20px (horizontal)

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 8px | Small elements, badges |
| `radius-md` | 10px | Buttons, inputs |
| `radius-lg` | 12px | Small cards, dropdowns |
| `radius-xl` | 16px | Cards, major containers |

---

## Shadows

### Card Shadows

```css
/* Default Card Shadow */
box-shadow: 0 2px 12px rgba(241, 100, 55, 0.04);

/* Card Hover Shadow */
box-shadow: 0 12px 36px rgba(241, 100, 55, 0.08);
```

### Button Shadows

```css
/* Primary Button Shadow */
box-shadow: 0 4px 16px rgba(241, 100, 55, 0.25);

/* Primary Button Hover Shadow */
box-shadow: 0 6px 24px rgba(241, 100, 55, 0.35);

/* Secondary Button Shadow */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);

/* Secondary Button Hover Shadow */
box-shadow: 0 4px 16px rgba(249, 202, 1, 0.15);
```

---

## Components

### Buttons

#### Primary Button (Solid Orange)

```css
.btn-primary {
  padding: 14px 32px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Libre Baskerville', Georgia, serif;
  letter-spacing: 0.3px;
  background: #F16437;
  color: #FFFFFF;
  box-shadow: 0 4px 16px rgba(241, 100, 55, 0.25);
}

.btn-primary:hover {
  background: #D94F2A;
  box-shadow: 0 6px 24px rgba(241, 100, 55, 0.35);
  transform: translateY(-2px);
}
```

#### Secondary Button

```css
.btn-secondary {
  padding: 14px 32px;
  font-size: 13px;
  font-weight: 700;
  border: 1.5px solid #E8DDD5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Libre Baskerville', Georgia, serif;
  letter-spacing: 0.3px;
  background: #FFFFFF;
  color: #333333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.btn-secondary:hover {
  border-color: #F9CA01;
  box-shadow: 0 4px 16px rgba(249, 202, 1, 0.15);
}
```

**Button Sizes:**
- **Default:** 14px padding vertical, 32px horizontal
- **Small:** 12px padding vertical, 24px horizontal
- **Large:** 16px padding vertical, 40px horizontal

---

### Cards

```css
.card {
  background: linear-gradient(135deg, #FFFFFF 0%, #FFFBF8 100%);
  border: 1px solid #F5E8DC;
  border-radius: 16px;
  padding: 40px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(241, 100, 55, 0.04);
}

.card:hover {
  border-color: #F9CA01;
  box-shadow: 0 12px 36px rgba(241, 100, 55, 0.08);
  transform: translateY(-6px);
}
```

**Card Structure:**
```html
<div class="card">
  <div class="card-label">LABEL TEXT</div>
  <div class="card-value">$124,250</div>
  <div class="card-subtitle">Subtitle text</div>
</div>
```

**Card Label:**
```css
.card-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.8px;
  color: #999999;
  margin-bottom: 16px;
}
```

**Card Value:**
```css
.card-value {
  font-family: 'Crimson Text', Georgia, serif;
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -1px;
  color: #000000;
  margin-bottom: 12px;
}
```

**Card Subtitle:**
```css
.card-subtitle {
  font-size: 13px;
  color: #7A93A3;
}
```

---

### Tables

```css
table {
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #F5E8DC;
  border-collapse: collapse;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(241, 100, 55, 0.04);
}

thead {
  background: linear-gradient(135deg, #FFFBF5 0%, #FFF9F0 100%);
  border-bottom: 2px solid #F9CA01;
}

th {
  padding: 20px 32px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.8px;
  color: #666666;
}

td {
  padding: 22px 32px;
  font-size: 14px;
  color: #333333;
  border-top: 1px solid #FAF5EE;
}

tr:hover {
  background: linear-gradient(90deg, rgba(249, 202, 1, 0.03) 0%, transparent 100%);
}
```

**Table Guidelines:**
- Table header has 2px yellow border bottom (#F9CA01)
- Hover effect uses subtle yellow gradient
- Maintain generous padding (20-32px)
- Use uppercase headers with wide letter spacing

---

### Forms & Inputs

```css
.input {
  padding: 12px 20px;
  font-size: 14px;
  font-family: 'Libre Baskerville', Georgia, serif;
  border: 1.5px solid #E8DDD5;
  border-radius: 10px;
  background: #FFFFFF;
  color: #333333;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.input:focus {
  outline: none;
  border-color: #F9CA01;
  box-shadow: 0 4px 16px rgba(249, 202, 1, 0.15);
}
```

---

### Navigation

```css
.navbar {
  height: 80px;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #F5E8DC;
  backdrop-filter: blur(10px);
}

.nav-link {
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #F16437;
  background: rgba(241, 100, 55, 0.05);
}
```

---

## Layout Grid

### Card Grid
```css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 28px;
}
```

### Content Container
```css
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
}
```

---

## Animations & Transitions

### Standard Transition
```css
transition: all 0.3s ease;
```

### Smooth Easing
```css
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover Transform
```css
transform: translateY(-2px);  /* Buttons */
transform: translateY(-6px);  /* Cards */
```

**Animation Guidelines:**
- Use 0.3s for quick interactions (buttons, links)
- Use 0.4s for larger elements (cards, modals)
- Use cubic-bezier(0.4, 0, 0.2, 1) for smooth, elegant motion
- Hover transforms should be subtle (-2px to -6px)

---

## Backgrounds

### Page Background
```css
background: linear-gradient(135deg, #FFFBF5 0%, #FFF9F0 50%, #F8FCFD 100%);
```

### Card Background
```css
background: linear-gradient(135deg, #FFFFFF 0%, #FFFBF8 100%);
```

### Table Header Background
```css
background: linear-gradient(135deg, #FFFBF5 0%, #FFF9F0 100%);
```

---

## Special Elements

### Positive Values (Income)
```css
color: #059669;
font-weight: 700;
```

### Negative Values (Expenses)
```css
color: #DC2626;
font-weight: 700;
```

### Loading States
```css
.skeleton {
  background: linear-gradient(90deg, #F5E8DC 25%, #FFFBF8 50%, #F5E8DC 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## Accessibility

### Contrast Requirements
- All text must meet WCAG AA standards (4.5:1 for normal text)
- Interactive elements must have clear focus states
- Maintain sufficient color contrast for all text

### Focus States
```css
*:focus-visible {
  outline: 2px solid #F9CA01;
  outline-offset: 2px;
}
```

### Screen Reader Text
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 640px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop */
@media (max-width: 1024px) { }

/* Large Desktop */
@media (max-width: 1280px) { }
```

### Mobile Adjustments
- Reduce card padding from 40px to 24px
- Reduce heading sizes by 20-30%
- Stack card grids to single column
- Reduce page padding to 20px

---

## Usage Examples

### Page Header
```html
<div class="header">
  <h1>Dashboard</h1>
  <p class="subtitle">Financial Overview</p>
</div>
```

### Summary Cards
```html
<div class="cards-grid">
  <div class="card">
    <div class="card-label">Total Income</div>
    <div class="card-value">$124,250</div>
    <div class="card-subtitle">486 transactions</div>
  </div>
</div>
```

### Action Buttons
```html
<div class="buttons">
  <button class="btn btn-primary">Create Report</button>
  <button class="btn btn-secondary">Export Data</button>
</div>
```

---

## Don'ts

❌ **Never use:**
- Harsh black borders (use soft warm borders instead)
- Pure blue colors (use warm blue-grays like #7A93A3)
- Sans-serif fonts for body text
- Bright, saturated colors
- Sharp corners on major elements
- Tight spacing or cramped layouts
- Multiple gradients on one element
- Emoji or decorative icons

❌ **Avoid:**
- Centered text in tables
- All caps for long text
- Multiple font families
- Bright white (#FFFFFF) for backgrounds (use warm creams)

---

## Implementation Checklist

When implementing this design system:

- [ ] Install Google Fonts (Crimson Text, Libre Baskerville)
- [ ] Set up CSS custom properties for colors
- [ ] Create base typography styles
- [ ] Implement spacing system
- [ ] Build button components
- [ ] Build card components
- [ ] Style tables
- [ ] Add transitions and animations
- [ ] Test on multiple screen sizes
- [ ] Verify accessibility (contrast, focus states)
- [ ] Test with real data

---

## CSS Custom Properties

```css
:root {
  /* Colors */
  --color-brand-orange: #F16437;
  --color-sun-yellow: #F9CA01;
  --color-success: #059669;
  --color-error: #DC2626;

  --color-text-primary: #000000;
  --color-text-secondary: #333333;
  --color-text-label: #999999;
  --color-text-muted: #7A93A3;

  --color-white: #FFFFFF;
  --color-cream-1: #FFFBF5;
  --color-cream-2: #FFF9F0;
  --color-cool-touch: #F8FCFD;

  --color-border-primary: #F5E8DC;
  --color-border-secondary: #E8DDD5;
  --color-border-table: #FAF5EE;

  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 28px;
  --spacing-2xl: 40px;
  --spacing-3xl: 60px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Typography */
  --font-heading: 'Crimson Text', Georgia, serif;
  --font-body: 'Libre Baskerville', Georgia, serif;

  /* Shadows */
  --shadow-card: 0 2px 12px rgba(241, 100, 55, 0.04);
  --shadow-card-hover: 0 12px 36px rgba(241, 100, 55, 0.08);
  --shadow-button: 0 4px 16px rgba(241, 100, 55, 0.25);
  --shadow-button-hover: 0 6px 24px rgba(241, 100, 55, 0.35);
}
```

---

## Version History

**v1.0 (February 2026)**
- Initial style guide based on karme-1-sunrise design
- Established warm, contemplative aesthetic
- Defined complete component library
- Created implementation guidelines

---

## Support & Questions

For questions or clarifications about this style guide:
- Review the sample implementation: `final-1-solid-orange.html`
- Reference Karmê Chöling Brand Guide for brand alignment
- Maintain warm, welcoming aesthetic in all implementations

---

*This style guide ensures consistency across all Transaction Tapestry interfaces while honoring the contemplative, welcoming spirit of the Karmê Chöling brand.*
