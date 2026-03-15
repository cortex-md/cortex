import type { RendererPlugin } from "@cortex/renderer"
import { createRenderer } from "@cortex/renderer"
import { useEffect, useMemo, useRef, useState } from "react"

interface Props {
	content: string
	plugins?: RendererPlugin[]
	onWikiLinkClick?: (target: string) => void
	onTaskCheckboxToggle?: (offset: number, checked: boolean) => void
}

export function ReadingView({
	content,
	plugins = [],
	onWikiLinkClick,
	onTaskCheckboxToggle,
}: Props) {
	const [html, setHtml] = useState("")
	const containerRef = useRef<HTMLDivElement>(null)

	const renderer = useMemo(() => createRenderer({ plugins }), [plugins])

	useEffect(() => {
		renderer.render(content).then(setHtml)
	}, [content, renderer])

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

		container.addEventListener("click", handleClick)
		return () => container.removeEventListener("click", handleClick)
	}, [onWikiLinkClick, onTaskCheckboxToggle])

	return (
		<div
			ref={containerRef}
			className="reading-view"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: renderer produces sanitized HTML via unified/rehype pipeline
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
