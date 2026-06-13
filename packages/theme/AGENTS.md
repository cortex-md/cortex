# @cortex/theme

## Responsibilities

- Own built-in theme tokens, CSS variable generation, theme families, contrast utilities, and the
  public community theme contract.
- Keep theme decisions independent from React and desktop feature state.
- Export lightweight JSON validation through `parseCommunityThemeManifest`.
- Keep community stylesheet contents opaque. This package must not depend on CSS AST parsers or
  `@cortex/theme-mobile`.

## Community Themes

- Community manifests contain identity, metadata, and safe relative paths for light and dark CSS.
- There is no API version before release. The current manifest shape is the only supported shape.
- Desktop injects community CSS directly and lets the browser own parsing, cascade, selectors, and
  `var()` resolution.
- Portable token extraction belongs exclusively to `@cortex/theme-mobile`.
- Built-in and custom accents must provide at least 4.5:1 contrast for text and 3:1 for focus
  indicators. Use the exported contrast resolvers instead of fixed light foregrounds.

## Token Rules

- Feedback states require solid, background, foreground, border, and on-solid values.
- Settings groups use `settingsGroupBg`, `settingsGroupBorder`, and `settingsGroupDivider`.
- Sidebar hierarchy guides use `sidebarGuide`, exposed as `--sidebar-tree-guide`.
- `ThemeAdapter.applyTheme` receives the effective light or dark scheme and adapters expose it as
  `data-theme-scheme`.
- App-level aliases derive from base variables. Community themes should not duplicate private
  shadcn aliases.
