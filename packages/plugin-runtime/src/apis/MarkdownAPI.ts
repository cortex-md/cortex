import {
	registerCalloutType,
	registerMarkdownInline,
	registerMarkdownProcessor,
	registerMarkdownSemantic,
} from "@cortex/renderer"
import type { Disposable, PluginAPI } from "cortex-plugin-api"
import { pluginHasCapability } from "../manifestCapabilities"

function requireMarkdownCapability(pluginId: string): void {
	if (!pluginHasCapability(pluginId, "markdown:extensions")) {
		throw new Error(`Plugin "${pluginId}" requires the markdown:extensions capability`)
	}
}

export function createMarkdownAPI(pluginId: string): PluginAPI["markdown"] {
	return {
		registerInline(registration): Disposable {
			requireMarkdownCapability(pluginId)
			const dispose = registerMarkdownInline(registration, pluginId)
			return { dispose }
		},
		registerSemantic(registration): Disposable {
			requireMarkdownCapability(pluginId)
			const dispose = registerMarkdownSemantic(registration, pluginId)
			return { dispose }
		},
		registerProcessor(processor): Disposable {
			requireMarkdownCapability(pluginId)
			const dispose = registerMarkdownProcessor(processor, pluginId)
			return { dispose }
		},
		registerCalloutType(registration): Disposable {
			requireMarkdownCapability(pluginId)
			const dispose = registerCalloutType(registration, pluginId)
			return { dispose }
		},
	}
}
