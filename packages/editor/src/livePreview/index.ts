import type { Extension } from "@codemirror/state"
import "./styles.css"
import { blockquotePlugin } from "./blockquote"
import { checkboxesPlugin } from "./checkboxes"
import { codeBlockPlugin } from "./codeBlock"
import { formattingPlugin } from "./formatting"
import { frontmatterPlugin } from "./frontmatter"
import { headingsPlugin } from "./headings"
import { horizontalRulePlugin } from "./horizontalRule"
import { inlineCodePlugin } from "./inlineCode"
import { linksPlugin } from "./links"

export function livePreviewExtension(): Extension {
	return [
		frontmatterPlugin,
		headingsPlugin,
		formattingPlugin,
		inlineCodePlugin,
		linksPlugin,
		checkboxesPlugin,
		horizontalRulePlugin,
		blockquotePlugin,
		codeBlockPlugin,
	]
}

export { blockquotePlugin } from "./blockquote"
export { checkboxesPlugin } from "./checkboxes"
export { codeBlockPlugin } from "./codeBlock"
export { formattingPlugin } from "./formatting"
export { frontmatterPlugin } from "./frontmatter"
export { headingsPlugin } from "./headings"
export { horizontalRulePlugin } from "./horizontalRule"
export { inlineCodePlugin } from "./inlineCode"
export { linksPlugin } from "./links"
