import {
	getCalloutRegistryVersion,
	getMarkdownRegistryVersion,
	getSharedRenderer,
	subscribeCalloutTypes,
	subscribeMarkdownRegistry,
} from "@cortex/renderer"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

interface Props {
	content: string
	renderDelay?: number
	onWikiLinkClick?: (target: string) => void
	onExternalLinkClick?: (url: string) => void
	onTaskCheckboxToggle?: (offset: number, checked: boolean) => void
}

function subscribeRendererRegistry(listener: () => void): () => void {
	const unsubscribeMarkdown = subscribeMarkdownRegistry(listener)
	const unsubscribeCallouts = subscribeCalloutTypes(listener)
	return () => {
		unsubscribeMarkdown()
		unsubscribeCallouts()
	}
}

function getRendererRegistryVersion(): string {
	return `${getMarkdownRegistryVersion()}:${getCalloutRegistryVersion()}`
}

export function ReadingView({
	content,
	renderDelay = 0,
	onWikiLinkClick,
	onExternalLinkClick,
	onTaskCheckboxToggle,
}: Props) {
	const [html, setHtml] = useState("")
	const containerRef = useRef<HTMLDivElement>(null)
	const renderRequestRef = useRef(0)
	const rendererRegistryVersion = useSyncExternalStore(
		subscribeRendererRegistry,
		getRendererRegistryVersion,
		getRendererRegistryVersion,
	)

	useEffect(() => {
		const request = ++renderRequestRef.current
		const registryVersion = rendererRegistryVersion
		const render = () => {
			void getSharedRenderer()
				.render(content)
				.then((renderedHtml) => {
					if (
						request === renderRequestRef.current &&
						registryVersion === getRendererRegistryVersion()
					) {
						setHtml(renderedHtml)
					}
				})
		}
		const timeout = renderDelay === 0 ? undefined : setTimeout(render, renderDelay)
		if (renderDelay === 0) render()
		return () => {
			if (timeout) clearTimeout(timeout)
			if (renderRequestRef.current === request) renderRequestRef.current++
		}
	}, [content, renderDelay, rendererRegistryVersion])

	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		const handleClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement

			const wikiLink = target.closest("[data-wiki-link]") as HTMLElement | null
			if (wikiLink) {
				event.preventDefault()
				const linkTarget = wikiLink.getAttribute("data-wiki-link")
				if (linkTarget) onWikiLinkClick?.(linkTarget)
				return
			}

			const externalLink = target.closest<HTMLAnchorElement>("a[href]")
			const externalUrl = externalLink?.getAttribute("href")
			if (externalUrl && /^(https?:|mailto:)/i.test(externalUrl)) {
				event.preventDefault()
				onExternalLinkClick?.(externalUrl)
				return
			}

			const checkbox = target.closest("[data-task-checkbox]") as HTMLInputElement | null
			if (checkbox) {
				event.preventDefault()
				const listItem = checkbox.closest("[data-task-item]") as HTMLElement | null
				if (listItem && onTaskCheckboxToggle) {
					const isChecked = listItem.getAttribute("data-task-item") === "checked"
					const offset = Number(listItem.getAttribute("data-offset") ?? -1)
					onTaskCheckboxToggle(offset, !isChecked)
				}
			}
		}

		const handleToggle = (event: Event) => {
			const callout = event.target
			if (!(callout instanceof HTMLDetailsElement)) return
			if (!callout.classList.contains("markdown-callout")) return
			callout.classList.toggle("is-collapsed", !callout.open)
		}

		container.addEventListener("click", handleClick)
		container.addEventListener("toggle", handleToggle, true)
		return () => {
			container.removeEventListener("click", handleClick)
			container.removeEventListener("toggle", handleToggle, true)
		}
	}, [onExternalLinkClick, onWikiLinkClick, onTaskCheckboxToggle])

	return (
		<div
			ref={containerRef}
			className="reading-view markdown-surface"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: content passes through the renderer sanitizer
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
