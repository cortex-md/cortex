export {
	resolveAuthorProperty,
	resolvePropertyActor,
	resolvePropertyActorValue,
} from "./author"
export {
	extractFrontmatterBody,
	FrontmatterParseError,
	locateFrontmatter,
	parseFrontmatter,
	parseYamlMapping,
	removeFrontmatterValue,
	replaceFrontmatterBody,
	serializeFrontmatter,
	setFrontmatterValue,
} from "./frontmatter"
export {
	getPropertyMap,
	getResolvedPropertyMap,
	removeProperty,
	setProperty,
} from "./operations"
export {
	getPropertyType,
	getPropertyTypes,
	registerPropertyType,
	resetCustomPropertyTypes,
} from "./registry"
export {
	getOptionalPropertiesRuntime,
	getPropertiesRuntime,
	initializeProperties,
	resetPropertiesRuntime,
} from "./runtime"
export {
	changePropertyType,
	createPropertyKey,
	defineProperty,
	duplicatePropertyDefinition,
	getSortedPropertyOptions,
	getVaultSchema,
	isPropertyDefinitionEditable,
	notifyVaultSchemaChanged,
	onVaultSchemaChange,
	updateVaultSchema,
	validateVaultSchema,
} from "./schema"
export {
	getObservedPropertyDefinitions,
	invalidatePropertySuggestions,
	suggestProperties,
} from "./suggestions"
export {
	createNoteWithPropertyDefaults,
	prepareDuplicatedNote,
	prepareNoteForSave,
} from "./system"
export type {
	BuiltInPropertyType,
	CustomPropertyType,
	FrontmatterEditorState,
	FrontmatterExtensionOptions,
	FrontmatterLocation,
	FrontmatterResult,
	NotePropertiesUiState,
	NoteSourceMetadata,
	PrimitivePropertyType,
	PropertiesRuntime,
	PropertyAuthorContext,
	PropertyColor,
	PropertyDefinition,
	PropertyDevice,
	PropertyMap,
	PropertyOption,
	PropertyPerson,
	PropertyTypeDefinition,
	PropertyValidationResult,
	ResolvedAuthorConfig,
	ResolvedPropertyActor,
	VaultSchema,
} from "./types"
export {
	BUILT_IN_PROPERTY_TYPES,
	PROPERTY_COLORS,
} from "./types"
export {
	getNotePropertiesExpanded,
	removeNotePropertiesUiState,
	renameNotePropertiesUiState,
	setNotePropertiesExpanded,
} from "./uiState"
