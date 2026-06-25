# WinForms Theme - CSS Specification

## Tailwind CSS v4 Custom Theme

---

## 1. CSS Variables (winforms.css)

```css
@theme {
  /* WinForms System Colors */
  --color-win-control: #F0F0F0;
  --color-win-control-dark: #E1E1E1;
  --color-win-window: #FFFFFF;
  --color-win-active-title: #0078D4;
  --color-win-inactive-title: #A0A0A0;
  --color-win-menu: #F5F5F5;
  --color-win-menu-hover: #E5F3FF;
  --color-win-menu-active: #CCE8FF;

  /* Grid Colors */
  --color-win-grid-header: #E8E8E8;
  --color-win-grid-border: #D0D0D0;
  --color-win-grid-row-alt: #F9F9F9;
  --color-win-grid-selected: #CCE8FF;
  --color-win-grid-selected-focus: #0078D4;

  /* Button */
  --color-win-button: #E1E1E1;
  --color-win-button-hover: #D4D4D4;
  --color-win-button-active: #C8C8C8;
  --color-win-button-border: #ADADAD;

  /* Text */
  --color-win-text: #1E1E1E;
  --color-win-text-secondary: #6D6D6D;
  --color-win-text-disabled: #A0A0A0;

  /* Status */
  --color-win-statusbar: #007ACC;
  --color-win-error: #E81123;
  --color-win-warning: #FFB900;
  --color-win-success: #107C10;
  --color-win-info: #0078D4;
  --color-win-link: #0066CC;

  /* Input */
  --color-win-input-border: #7A7A7A;
  --color-win-input-focus: #0078D4;
  --color-win-input-bg: #FFFFFF;

  /* Spacing */
  --spacing-win-xs: 2px;
  --spacing-win-sm: 4px;
  --spacing-win-md: 8px;
  --spacing-win-lg: 12px;
  --spacing-win-xl: 16px;

  /* Sizes */
  --size-titlebar: 32px;
  --size-menubar: 28px;
  --size-toolbar: 36px;
  --size-statusbar: 24px;
  --size-sidebar: 220px;
  --size-sidebar-collapsed: 48px;

  /* Font */
  --font-win: 'Segoe UI', 'Inter', -apple-system, sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 13px;
  --font-size-lg: 14px;
}
```

---

## 2. Base Component Styles

### Title Bar
```css
.win-titlebar {
  height: var(--size-titlebar);
  background: var(--color-win-active-title);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: var(--font-size-sm);
  user-select: none;
}
```

### Menu Bar
```css
.win-menubar {
  height: var(--size-menubar);
  background: var(--color-win-menu);
  border-bottom: 1px solid var(--color-win-grid-border);
  display: flex;
  align-items: center;
  padding: 0 4px;
  font-size: var(--font-size-sm);
}

.win-menubar-item {
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 2px;
}

.win-menubar-item:hover {
  background: var(--color-win-menu-hover);
}
```

### Toolbar
```css
.win-toolbar {
  height: var(--size-toolbar);
  background: var(--color-win-menu);
  border-bottom: 1px solid var(--color-win-grid-border);
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 2px;
}

.win-toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.win-toolbar-btn:hover {
  background: var(--color-win-menu-hover);
  border-color: var(--color-win-button-border);
}

.win-toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.win-toolbar-separator {
  width: 1px;
  height: 20px;
  background: var(--color-win-grid-border);
  margin: 0 4px;
}
```

### DataGrid
```css
.win-grid {
  border: 1px solid var(--color-win-grid-border);
  font-size: var(--font-size-xs);
  flex: 1;
  overflow: auto;
}

.win-grid-header {
  background: var(--color-win-grid-header);
  border-bottom: 1px solid var(--color-win-grid-border);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.win-grid-header th {
  padding: 6px 8px;
  text-align: left;
  border-right: 1px solid var(--color-win-grid-border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.win-grid-row {
  border-bottom: 1px solid #EBEBEB;
}

.win-grid-row:nth-child(even) {
  background: var(--color-win-grid-row-alt);
}

.win-grid-row:hover {
  background: var(--color-win-menu-hover);
}

.win-grid-row.selected {
  background: var(--color-win-grid-selected);
}

.win-grid-row td {
  padding: 4px 8px;
  border-right: 1px solid #F0F0F0;
}
```

### GroupBox
```css
.win-groupbox {
  border: 1px solid var(--color-win-grid-border);
  border-radius: 3px;
  padding: 16px 12px 12px;
  margin: 8px 0;
  position: relative;
}

.win-groupbox-title {
  position: absolute;
  top: -9px;
  left: 10px;
  background: var(--color-win-window);
  padding: 0 6px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-win-text);
}
```

### Status Bar
```css
.win-statusbar {
  height: var(--size-statusbar);
  background: var(--color-win-statusbar);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: var(--font-size-xs);
  gap: 0;
}

.win-statusbar-section {
  padding: 0 12px;
  border-right: 1px solid rgba(255,255,255,0.3);
  white-space: nowrap;
}
```

### Button (WinForms Style)
```css
.win-btn {
  padding: 4px 16px;
  border: 1px solid var(--color-win-button-border);
  background: var(--color-win-button);
  border-radius: 3px;
  font-size: var(--font-size-sm);
  cursor: pointer;
  min-width: 75px;
  text-align: center;
}

.win-btn:hover {
  background: var(--color-win-button-hover);
}

.win-btn:active {
  background: var(--color-win-button-active);
}

.win-btn-primary {
  background: var(--color-win-active-title);
  color: white;
  border-color: var(--color-win-active-title);
}
```

### Input
```css
.win-input {
  border: 1px solid var(--color-win-input-border);
  padding: 3px 6px;
  font-size: var(--font-size-sm);
  font-family: var(--font-win);
  border-radius: 1px;
  outline: none;
}

.win-input:focus {
  border-color: var(--color-win-input-focus);
  box-shadow: 0 0 0 1px var(--color-win-input-focus);
}
```

### TreeView (Sidebar)
```css
.win-tree {
  font-size: var(--font-size-sm);
  padding: 4px 0;
}

.win-tree-node {
  padding: 4px 8px 4px calc(var(--depth) * 16px + 8px);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.win-tree-node:hover {
  background: var(--color-win-menu-hover);
}

.win-tree-node.active {
  background: var(--color-win-grid-selected);
  font-weight: 600;
}
```

### Dialog
```css
.win-dialog-overlay {
  background: rgba(0, 0, 0, 0.4);
}

.win-dialog {
  background: var(--color-win-control);
  border: 1px solid var(--color-win-grid-border);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  border-radius: 4px;
}

.win-dialog-header {
  background: var(--color-win-window);
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-win-grid-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: var(--font-size-base);
}

.win-dialog-body {
  padding: 16px;
  background: var(--color-win-control);
}

.win-dialog-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--color-win-grid-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: var(--color-win-control);
}
```

---

## 3. Special States

### Low Stock Warning (Row)
```css
.win-grid-row.low-stock {
  color: var(--color-win-error);
}
.win-grid-row.low-stock td:first-child::before {
  content: '⚠️';
  margin-right: 4px;
}
```

### Status Badges
```css
.win-badge {
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.win-badge-pending { background: #FFF3CD; color: #856404; }
.win-badge-completed { background: #D4EDDA; color: #155724; }
.win-badge-rejected { background: #F8D7DA; color: #721C24; }
.win-badge-cancelled { background: #E2E3E5; color: #383D41; }
```
