# Theme System Documentation

## Overview

The GritScore application now includes a comprehensive theme system that allows users to customize the appearance of the entire application. The theme system is built using React Context and CSS Custom Properties for real-time theme switching.

## Features

- **9 Pre-built Themes**: White, Dark, Gray, Blue, Red, Pink, Green, Purple, Orange
- **Real-time Switching**: Instant theme changes without page refresh
- **Persistent Storage**: Theme preferences saved to localStorage
- **Comprehensive Coverage**: Themes affect all UI components including:
  - Navigation bar and sidebar
  - Buttons and form inputs
  - Cards and containers
  - Text colors and backgrounds
  - Borders and shadows

## Theme Structure

Each theme includes:
- **Primary Colors**: 10 shades (50-900) for consistent color palette
- **Accent Color**: Primary brand color for buttons and highlights
- **Background**: Main page background color
- **Surface**: Card and container background color
- **Text**: Primary text color
- **Border**: Border color for containers and dividers

## Usage

### Theme Switcher
- Click the color wheel icon (🎨) in the top navigation bar
- Select from the dropdown menu of available themes
- Theme changes are applied immediately and saved automatically

### Theme Preview
- Visit the Profile page to see a visual preview of all available themes
- Click on any theme card to switch to that theme
- Current theme is highlighted with a colored indicator

## Implementation Details

### ThemeContext
Located in `src/contexts/ThemeContext.jsx`:
- Manages theme state and switching logic
- Handles localStorage persistence
- Applies CSS custom properties to document root

### CSS Custom Properties
The theme system uses CSS custom properties for dynamic theming:
```css
:root {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  /* ... more shades ... */
  --color-accent: #3b82f6;
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #1e293b;
  --color-border: #bfdbfe;
}
```

### Theme-Aware Classes
Custom CSS classes that use theme variables:
- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.card` - Card container styling
- `.input-field` - Form input styling
- `.nav-item` - Navigation item styling
- `.sidebar` - Sidebar styling
- `.top-bar` - Top navigation bar styling

## Adding New Themes

To add a new theme:

1. Add theme definition to `themes` object in `ThemeContext.jsx`:
```javascript
newTheme: {
  name: 'New Theme',
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    // ... all 10 shades
  },
  accent: '#3b82f6',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#1e293b',
  border: '#bfdbfe'
}
```

2. The theme will automatically appear in the theme switcher and preview

## Browser Compatibility

The theme system uses modern CSS features:
- CSS Custom Properties (CSS Variables)
- CSS Grid and Flexbox
- Modern CSS transitions

Supported in all modern browsers (Chrome 49+, Firefox 31+, Safari 9.1+, Edge 16+)

## Performance

- Theme switching is instant with CSS custom properties
- No JavaScript re-rendering required for color changes
- Minimal bundle size impact
- Efficient localStorage usage

## Accessibility

- High contrast themes available (Dark theme)
- Color combinations meet WCAG AA standards
- Theme changes don't affect functionality
- Keyboard navigation support maintained 