# @cortex/properties

- Own property definitions, validation, YAML frontmatter mutations, vault schema persistence,
  suggestions, author resolution, system metadata, and per-note property UI state.
- Keep the root package framework-free and platform-agnostic. Platform access is injected through
  `initializeProperties`.
- Runtime services are separated into `files`, `notes`, `identity`, and `metadata`. Keep service
  methods narrow and batch note presentation through `loadNotePropertiesSnapshot`.
- Keep pure definition factories and transformations in `definitions.ts`, value parsing and
  coercion in `values.ts`, actor resolution in `actors.ts`, persistence in `schemaStore.ts` and
  `noteStore.ts`, and vault discovery under `discovery/`.
- Test-only runtimes and definitions live under `src/__tests__/fixtures`; never expose them from the
  production package.
- Keep CodeMirror imports isolated to the `@cortex/properties/codemirror` subpath.
- Note CodeMirror documents contain only Markdown bodies. The CodeMirror subpath stores structured
  frontmatter metadata through state effects and must not hide, replace, or protect raw YAML ranges.
- Preserve unknown YAML keys, comments, ordering, scalar types, and line endings during targeted
  property mutations.
- `extractFrontmatterBody` and `replaceFrontmatterBody` preserve the complete frontmatter prefix
  byte-for-byte, including malformed YAML, while body editing remains available.
- Property keys are immutable after creation. Property names are editable display labels.
- `select` owns stable UUID options, token color keys, optional defaults, and persisted manual or
  alphabetical ordering. Legacy unavailable types remain readable and preserved.
- `person` stores one remote user ID and resolves to free text for local vaults. System actors use
  the same member and device identity resolution without persisting display labels.
- Schema and UI-state writes must use the injected atomic writer.
- Unavailable custom property types remain readable and preserved, but cannot be edited.
- Note rendering and panel refreshes must never build the vault-wide suggestion index. Derive
  unknown scalar keys from the current `PropertyMap`; build global suggestions only while Add
  Property is open.
- Suggestion indexing is single-flight per vault. Query changes share the active build, invalidation
  only increments its generation, and an invalidation during a build permits one serialized rebuild.
- `listMarkdownFiles` consumes the file list already loaded by the host vault store. It must not
  trigger another vault scan.
- Schema writes and synced schema replacements notify `onVaultSchemaChange` subscribers without a
  React dependency.
