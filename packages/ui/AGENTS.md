# @cortex/ui

## Color Contract

- Use `background`, `foreground`, `muted`, and `border` for neutral UI.
- Use `brand` only for accent actions, selection, and focus.
- Use `status-error-*`, `status-success-*`, and `status-warning-*` for feedback.
- Use `settings-group-*` only for Settings composition surfaces.
- Never hardcode white or Tailwind red, green, or yellow for semantic text and controls. Solid
  feedback fills use their matching `on-solid` token.

## Components

- Components remain pure primitives with class names and forwarded native props.
- Buttons use the accent with `primary-foreground`; custom accents update that foreground at
  runtime.
- `FolderPicker` uses `reserveDropdownSpace` when it is rendered inside an overflow-clipped
  Settings group so its inline option list remains visible.
- Settings composition remains desktop-owned. `@cortex/ui` provides `Field`, `Item`, `Separator`,
  and `NativeSelect` rather than a Settings-specific primitive.
