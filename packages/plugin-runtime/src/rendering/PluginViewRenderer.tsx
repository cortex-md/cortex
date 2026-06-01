import type {
	ViewDescriptor,
	ViewDispatch,
	ViewNode,
	ViewRegistration,
	ViewState,
} from "cortex-plugin-api"
import { useCallback, useReducer } from "react"

interface Props {
	registration: ViewRegistration
}

export function PluginViewRenderer({ registration }: Props) {
	const [state, dispatch] = useReducer(
		(current: Record<string, unknown>, action: { type: string; payload?: unknown }) => {
			if (registration.reduce) {
				return registration.reduce(current, action.type, action.payload)
			}
			return current
		},
		registration.initialState ?? {},
	)

	const viewDispatch: ViewDispatch = useCallback((action: string, payload?: unknown) => {
		dispatch({ type: action, payload })
	}, [])

	const viewState: ViewState = { state }
	const descriptor = registration.render(viewState, viewDispatch)

	return <>{renderDescriptor(descriptor, viewDispatch)}</>
}

function renderDescriptor(descriptor: ViewDescriptor, dispatch: ViewDispatch): React.ReactNode {
	if (Array.isArray(descriptor)) {
		return descriptor.map((node, index) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: ViewDescriptor nodes have no inherent IDs
			<ViewNodeRenderer key={index} node={node} dispatch={dispatch} />
		))
	}
	return <ViewNodeRenderer node={descriptor} dispatch={dispatch} />
}

function ViewNodeRenderer({ node, dispatch }: { node: ViewNode; dispatch: ViewDispatch }) {
	const { type, props = {}, children } = node
	const childContent = children ? renderDescriptor(children, dispatch) : null

	switch (type) {
		case "stack":
			return <div className={`flex flex-col gap-2 ${props.className ?? ""}`}>{childContent}</div>
		case "row":
			return (
				<div className={`flex flex-row items-center gap-2 ${props.className ?? ""}`}>
					{childContent}
				</div>
			)
		case "text":
			return (
				<span className={`text-sm ${props.className ?? ""}`}>
					{(props.value as string) ?? childContent}
				</span>
			)
		case "heading":
			return (
				<h3 className={`text-lg font-semibold ${props.className ?? ""}`}>
					{(props.value as string) ?? childContent}
				</h3>
			)
		case "button":
			return (
				<button
					type="button"
					className={`inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent ${props.className ?? ""}`}
					onClick={() => {
						if (props.action) dispatch(props.action as string, props.payload)
					}}
				>
					{(props.label as string) ?? childContent}
				</button>
			)
		case "input":
			return (
				<input
					type="text"
					className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm ${props.className ?? ""}`}
					placeholder={props.placeholder as string}
					value={props.value as string}
					onChange={(e) => {
						if (props.onChangeAction) dispatch(props.onChangeAction as string, e.target.value)
					}}
				/>
			)
		case "toggle":
			return (
				<button
					type="button"
					role="switch"
					aria-checked={props.checked as boolean}
					className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${(props.checked as boolean) ? "bg-brand" : "bg-muted"}`}
					onClick={() => {
						if (props.action) dispatch(props.action as string, !(props.checked as boolean))
					}}
				>
					<span
						className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg transition-transform ${(props.checked as boolean) ? "translate-x-4" : "translate-x-0"}`}
					/>
				</button>
			)
		case "separator":
			return <hr className="border-border" />
		case "list":
			return <ul className={`flex flex-col ${props.className ?? ""}`}>{childContent}</ul>
		case "list-item":
			return <li className={`py-1 px-2 text-sm ${props.className ?? ""}`}>{childContent}</li>
		case "scroll-area":
			return <div className={`overflow-y-auto ${props.className ?? ""}`}>{childContent}</div>
		case "badge":
			return (
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground ${props.className ?? ""}`}
				>
					{(props.value as string) ?? childContent}
				</span>
			)
		case "progress":
			return (
				<div className="w-full bg-muted rounded-full h-2">
					<div
						className="bg-brand h-2 rounded-full transition-all"
						style={{ width: `${props.value as number}%` }}
					/>
				</div>
			)
		case "empty":
			return (
				<div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
					{(props.message as string) ?? "No items"}
				</div>
			)
		case "icon":
		case "select":
		case "markdown":
			return null
		default:
			return null
	}
}
