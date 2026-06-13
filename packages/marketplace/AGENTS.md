# @cortex/marketplace

## Theme Installation

- Theme installation always uses staging inside the vault themes directory.
- Parse the manifest, validate safe stylesheet paths, and verify both referenced assets exist before
  replacing an installed theme.
- Treat stylesheet contents as opaque browser CSS. Marketplace must not import
  `@cortex/theme-mobile` or a theme CSS parser.
- Preserve the previous installation until the staged theme has been promoted and runtime reload
  succeeds.
- On any failure, remove staging and restore the previous theme without masking the original error.
- Theme uninstall resolves the family name from the manifest before removing runtime registrations.
