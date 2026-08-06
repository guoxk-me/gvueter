# Admin page design contract

This contract keeps route pages visually consistent without making route components depend on Shell internals. Shared components own behavior; pages only compose the regions that apply to their workflow.

<!-- AI modified: document the page and responsive rules enforced by shared components and tests. -->

## Standard page anatomy

1. `PageHeader` owns the page title, optional eyebrow/description, and page-level actions. Breadcrumb and tabs never move into `PageHeader`; they belong to the Shell context bar.
2. `SearchForm` or a feature filter bar owns submitted query state. Fields render in one column by default, two from `sm`, and four only when the container has enough width.
3. Cards, state boundaries, charts, trees, and tables form the content region. Sibling regions use a `1.5rem` vertical gap (`space-y-6`); an internal card generally uses `1rem` padding/gaps.
4. Table pagination belongs to the same bordered table surface and is separated by that surface's single top border. The table container, not the document, owns horizontal overflow.

`PageHeader` copy shrinks before actions. Actions wrap on narrow screens; a route with more than two peer actions keeps the primary action visible and places lower-priority actions in a `DropdownMenu`. Row actions always use their existing `More` menu. Destructive actions follow secondary actions and are the final/rightmost action; confirmation remains mandatory.

## Shell geometry and boundary ownership

The values below are CSS variables in `main.css` and their TypeScript counterparts live in `ADMIN_SHELL_METRICS`:

| Region                       | Token                                                | Baseline          |
| ---------------------------- | ---------------------------------------------------- | ----------------- |
| Header and sidebar brand row | `--admin-shell-header-height`                        | `3.5rem`          |
| Breadcrumb context row       | `--admin-context-breadcrumb-height`                  | `2rem`            |
| Tabs context row             | `--admin-context-tabs-height`                        | `2.5rem`          |
| Route padding                | `--admin-page-padding` / `--admin-page-padding-wide` | `1rem` / `1.5rem` |
| Coarse-pointer target        | `--admin-touch-target`                               | `2.75rem`         |

Breadcrumb and Tabs are optional rows in one context bar. Hiding either row never changes the other row's height. The context bar draws its bottom border; its children draw none. A visible sidebar closest to content owns the vertical separator, so adjacent rails never draw a double line. Cards own their full border, while the surrounding page stays borderless.

Background, foreground, muted, card, border, ring, semantic colors, chart colors, radius, density, and control sizing come from `src/assets/css/main.css`. Feature code must consume those semantic tokens instead of adding page-specific color or shadow scales.

## Overlay choice

| Surface  | Use                                                                             | Do not use                                        |
| -------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `Dialog` | short decisions, confirmation, compact atomic input                             | shareable detail, navigation, long mobile editing |
| `Drawer` | contextual or shareable record detail, side-by-side inspection                  | destructive confirmation                          |
| `Sheet`  | mobile navigation, appearance/settings, and long edge-attached mobile workflows | a short decision that needs immediate focus       |
| `Card`   | persistent in-page grouping and summaries                                       | transient modal work                              |

The existing mobile navigation and Appearance panel use `Sheet`; detail flows use `Drawer`, which is implemented with Sheet semantics. Short confirmation dialogs intentionally remain centered on mobile. A new long form that cannot fit the compact `FormDialog` contract must choose Drawer/Sheet at the feature composition layer instead of making every Dialog change presentation.

## Appearance setting applicability

Every visible setting has an observable target:

- theme mode, theme and semantic colors update root classes and CSS tokens;
- locale updates visible copy and locale-aware display helpers;
- component size updates form, button, and table density tokens;
- layout uses the same `AdminLayoutDefinition` for the preview and live Shell;
- content width changes the route content maximum width;
- sidebar default appears only when the active layout exposes a collapse target;
- watermark, Breadcrumb, Breadcrumb icon, Tabs, tab style, Footer, and page transition alter their named surface;
- dependent Breadcrumb icon and tab-style controls appear only while their parent surface is enabled;
- sticky Header stays hidden because the current internal-scroll Shell makes it inapplicable.

Presets are acceptance shortcuts for multiple observable settings, not separate hidden state.

## Responsive contract

- `1024px` is the only Shell navigation breakpoint. At narrower widths, desktop rails/top navigation disappear and the mobile Sheet trigger appears.
- Query fields collapse to one column, dual-column forms collapse to one, and action groups wrap without widening the page.
- Tables and permission matrices own horizontal scrolling; a feature may additionally hide secondary columns or render a card view when reading the row would otherwise require excessive scrolling.
- Long headings use balanced wrapping. Breadcrumbs keep one stable row, truncate the current crumb, expose full labels by title, and remain horizontally scrollable.
- Charts and grid children use `min-width: 0`; chart containers own clipping and resize observation. Trees truncate node labels while retaining full keyboard traversal.
- Coarse-pointer buttons, inputs, selects, and navigation targets have a `44px` minimum target. Dense checkbox and switch visuals may remain smaller only when their labeled row/cell provides equivalent spacing and an unambiguous target.
- Dialog remains appropriate for short decisions. Navigation, settings, details, and long mobile edge workflows use Sheet/Drawer as described above.

The responsive acceptance matrix is `390 / 768 / 1024 / 1280 / 1440`, Chinese and English, light and dark, standard and compact density, with normal and reduced motion where animation applies.
