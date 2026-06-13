import { getNotePathPresentation, getPortableFileNameError, useVaultStore } from "@cortex/core"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Input,
} from "@cortex/ui"
import { Fragment, useCallback, useEffect, useRef, useState } from "react"

interface Props {
	filePath: string
}

export function NoteHeader({ filePath }: Props) {
	const vault = useVaultStore((state) => state.vault)
	const renameFile = useVaultStore((state) => state.renameFile)
	const notePath = getNotePathPresentation(filePath, vault?.path)
	const noteTitle = notePath.title
	const [title, setTitle] = useState(noteTitle)
	const [error, setError] = useState<string | null>(null)
	const committingRef = useRef(false)

	useEffect(() => {
		setTitle(noteTitle)
		setError(null)
	}, [noteTitle])

	const handleTitleChange = useCallback((value: string) => {
		setTitle(value)
		setError(getPortableFileNameError(`${value.trim()}.md`))
	}, [])

	const handleCommit = useCallback(async () => {
		if (committingRef.current) return
		const nextTitle = title.trim()
		const nextName = `${nextTitle}.md`
		const validationError = getPortableFileNameError(nextName)
		if (validationError) {
			setError(validationError)
			return
		}
		if (nextTitle === noteTitle) {
			setTitle(noteTitle)
			setError(null)
			return
		}

		committingRef.current = true
		try {
			await renameFile(filePath, nextName)
			setError(null)
		} catch (renameError) {
			setError(renameError instanceof Error ? renameError.message : String(renameError))
		} finally {
			committingRef.current = false
		}
	}, [filePath, noteTitle, renameFile, title])

	return (
		<header className="note-header">
			<div className="note-header-title-group">
				<Breadcrumb className="note-header-breadcrumb">
					<BreadcrumbList className="justify-start flex-nowrap overflow-hidden">
						{notePath.segments.map((segment, index) => (
							<Fragment key={segment.id}>
								{index > 0 && <BreadcrumbSeparator />}
								<BreadcrumbItem className="min-w-0">
									<BreadcrumbPage className="truncate text-xs text-text-muted">
										{segment.label}
									</BreadcrumbPage>
								</BreadcrumbItem>
							</Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
				<Input
					value={title}
					aria-label="Note title"
					aria-invalid={Boolean(error)}
					spellCheck={false}
					className="note-header-title"
					onChange={(event) => handleTitleChange(event.target.value)}
					onBlur={() => void handleCommit()}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault()
							event.currentTarget.blur()
						}
						if (event.key === "Escape") {
							event.preventDefault()
							setTitle(noteTitle)
							setError(null)
							event.currentTarget.blur()
						}
					}}
				/>
				<output className="note-header-error">{error}</output>
			</div>
		</header>
	)
}
