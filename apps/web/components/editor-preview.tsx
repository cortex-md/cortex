"use client"

import { useState } from "react"

interface VaultFile {
	name: string
	path: string
	content: EditorContent
}

interface EditorContent {
	title: string
	body: ContentBlock[]
}

type ContentBlock =
	| { type: "h1"; text: string }
	| { type: "h2"; text: string }
	| { type: "paragraph"; parts: InlinePart[] }
	| { type: "blockquote"; text: string }
	| { type: "checklist"; items: { done: boolean; text: string }[] }
	| { type: "codeblock"; lang: string; code: string }
	| { type: "tags"; tags: string[] }

type InlinePart =
	| { kind: "text"; value: string }
	| { kind: "wikilink"; value: string }
	| { kind: "bold"; value: string }
	| { kind: "code"; value: string }

const vaultFiles: VaultFile[] = [
	{
		name: "home.md",
		path: "home.md",
		content: {
			title: "home",
			body: [
				{ type: "h1", text: "Bem-vindo ao Cortex" },
				{
					type: "paragraph",
					parts: [
						{ kind: "text", value: "Este é o seu vault. Comece por " },
						{ kind: "wikilink", value: "graph-theory" },
						{ kind: "text", value: " ou veja as " },
						{ kind: "wikilink", value: "rust-notes" },
						{ kind: "text", value: "." },
					],
				},
				{
					type: "checklist",
					items: [
						{ done: true, text: "Criar primeiro vault" },
						{ done: true, text: "Escrever nota de boas-vindas" },
						{ done: false, text: "Conectar notas com [[wikilinks]]" },
						{ done: false, text: "Explorar o Graph View" },
					],
				},
				{ type: "tags", tags: ["#início", "#meta"] },
			],
		},
	},
	{
		name: "graph-theory.md",
		path: "notes/graph-theory.md",
		content: {
			title: "graph-theory",
			body: [
				{ type: "h1", text: "Teoria dos Grafos" },
				{
					type: "paragraph",
					parts: [
						{ kind: "text", value: "Um grafo " },
						{ kind: "bold", value: "G = (V, E)" },
						{
							kind: "text",
							value: " consiste em um conjunto de vértices V e um conjunto de arestas E.",
						},
					],
				},
				{ type: "h2", text: "Propriedades" },
				{
					type: "paragraph",
					parts: [
						{ kind: "text", value: "Ver também: " },
						{ kind: "wikilink", value: "rust-notes" },
						{ kind: "text", value: " para implementações em Rust." },
					],
				},
				{
					type: "blockquote",
					text: "Todo vault do Cortex é um grafo. Notas são vértices, wikilinks são arestas.",
				},
				{
					type: "codeblock",
					lang: "rust",
					code: `struct Graph {\n    nodes: Vec<Node>,\n    edges: Vec<Edge>,\n}`,
				},
				{ type: "tags", tags: ["#matemática", "#grafos", "#cs"] },
			],
		},
	},
	{
		name: "rust-notes.md",
		path: "notes/rust-notes.md",
		content: {
			title: "rust-notes",
			body: [
				{ type: "h1", text: "Notas sobre Rust" },
				{
					type: "paragraph",
					parts: [
						{ kind: "text", value: "Rust combina " },
						{ kind: "bold", value: "segurança de memória" },
						{ kind: "text", value: " com performance de C/C++. O sistema de " },
						{ kind: "code", value: "ownership" },
						{ kind: "text", value: " elimina data races em tempo de compilação." },
					],
				},
				{ type: "h2", text: "Ownership rules" },
				{
					type: "checklist",
					items: [
						{ done: true, text: "Cada valor tem exatamente um owner" },
						{ done: true, text: "Quando owner sai do escopo, valor é dropado" },
						{ done: false, text: "Implementar arena allocator" },
					],
				},
				{
					type: "paragraph",
					parts: [
						{ kind: "text", value: "Usado no Cortex para o engine de sync. Ver " },
						{ kind: "wikilink", value: "graph-theory" },
						{ kind: "text", value: " para contexto." },
					],
				},
				{ type: "tags", tags: ["#rust", "#sistemas", "#memoria"] },
			],
		},
	},
]

const sidebarFolders = [
	{
		name: "notes",
		files: ["graph-theory.md", "rust-notes.md"],
	},
]

function TrafficLights() {
	return (
		<div className="flex items-center gap-[6px]">
			<div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
			<div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
			<div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
		</div>
	)
}

function SidebarFileIcon() {
	return (
		<svg
			width="13"
			height="13"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
			className="flex-shrink-0"
		>
			<path
				d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
		</svg>
	)
}

function FolderIcon({ open }: { open?: boolean }) {
	return (
		<svg
			width="13"
			height="13"
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
			className="flex-shrink-0"
		>
			{open ? (
				<path
					d="M2 5h5l1.5-2H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V6a1 1 0 011-1z"
					stroke="currentColor"
					strokeWidth="1.3"
					strokeLinejoin="round"
				/>
			) : (
				<path
					d="M1 4h6l1.5-2H14a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1z"
					stroke="currentColor"
					strokeWidth="1.3"
					strokeLinejoin="round"
				/>
			)}
		</svg>
	)
}

function SyncDot({ synced }: { synced: boolean }) {
	return (
		<span
			className="inline-flex items-center gap-1 text-[10px]"
			style={{ color: synced ? "var(--status-success)" : "var(--status-warning)" }}
		>
			<span
				className="inline-block h-[6px] w-[6px] rounded-full"
				style={{ background: synced ? "var(--status-success)" : "var(--status-warning)" }}
			/>
			{synced ? "Synced" : "Syncing…"}
		</span>
	)
}

function InlineContent({ parts }: { parts: InlinePart[] }) {
	return (
		<>
			{parts.map((part, i) => {
				if (part.kind === "text") {
					return <span key={i}>{part.value}</span>
				}
				if (part.kind === "wikilink") {
					return (
						<span key={i} className="cursor-pointer font-medium" style={{ color: "var(--link)" }}>
							{part.value}
						</span>
					)
				}
				if (part.kind === "bold") {
					return (
						<strong key={i} className="font-semibold text-primary">
							{part.value}
						</strong>
					)
				}
				if (part.kind === "code") {
					return (
						<code
							key={i}
							className="rounded px-1 font-mono text-[11px]"
							style={{
								background: "var(--bg-code)",
								color: "var(--syntax-keyword)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							{part.value}
						</code>
					)
				}
				return null
			})}
		</>
	)
}

function EditorBody({ blocks }: { blocks: ContentBlock[] }) {
	return (
		<div className="flex flex-col gap-3">
			{blocks.map((block, i) => {
				if (block.type === "h1") {
					return (
						<h1
							key={i}
							className="font-editor font-bold text-primary"
							style={{ fontSize: "20px", lineHeight: 1.2, letterSpacing: "-0.02em" }}
						>
							{block.text}
						</h1>
					)
				}
				if (block.type === "h2") {
					return (
						<h2
							key={i}
							className="font-editor font-semibold text-primary"
							style={{ fontSize: "15px", lineHeight: 1.3, letterSpacing: "-0.01em" }}
						>
							{block.text}
						</h2>
					)
				}
				if (block.type === "paragraph") {
					return (
						<p key={i} className="text-primary" style={{ fontSize: "13px", lineHeight: 1.7 }}>
							<InlineContent parts={block.parts} />
						</p>
					)
				}
				if (block.type === "blockquote") {
					return (
						<blockquote
							key={i}
							className="text-muted-foreground italic"
							style={{
								fontSize: "13px",
								lineHeight: 1.65,
								borderLeft: "2px solid var(--accent)",
								paddingLeft: "12px",
							}}
						>
							{block.text}
						</blockquote>
					)
				}
				if (block.type === "checklist") {
					return (
						<ul key={i} className="flex flex-col gap-1.5 list-none">
							{block.items.map((item, j) => (
								<li key={j} className="flex items-center gap-2" style={{ fontSize: "12.5px" }}>
									<span
										className="flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center rounded-sm border"
										style={{
											borderColor: item.done ? "var(--accent)" : "var(--border)",
											background: item.done ? "var(--accent)" : "transparent",
										}}
									>
										{item.done && (
											<svg width="8" height="8" viewBox="0 0 10 10" fill="none">
												<path
													d="M2 5l2.5 2.5L8 3"
													stroke="var(--text-on-accent)"
													strokeWidth="1.5"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										)}
									</span>
									<span
										className={item.done ? "text-muted-foreground line-through" : "text-primary"}
									>
										{item.text}
									</span>
								</li>
							))}
						</ul>
					)
				}
				if (block.type === "codeblock") {
					return (
						<div
							key={i}
							className="overflow-hidden rounded-md"
							style={{
								background: "var(--bg-code)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							<div
								className="flex items-center justify-between px-3 py-1.5"
								style={{
									borderBottom: "1px solid var(--border-subtle)",
									background: "var(--bg-tertiary)",
								}}
							>
								<span className="font-mono text-[10px] text-muted-foreground">{block.lang}</span>
							</div>
							<pre className="px-3 py-2" style={{ fontSize: "11px", lineHeight: 1.6 }}>
								{block.code.split("\n").map((line, li) => (
									<div key={li} className="font-mono" style={{ color: "var(--syntax-keyword)" }}>
										{line}
									</div>
								))}
							</pre>
						</div>
					)
				}
				if (block.type === "tags") {
					return (
						<div key={i} className="flex flex-wrap gap-1.5 pt-1">
							{block.tags.map((tag) => (
								<span
									key={tag}
									className="rounded px-2 py-0.5 font-mono text-[10.5px]"
									style={{
										background: "var(--bg-tag)",
										color: "var(--accent-text)",
										border: "1px solid var(--border-subtle)",
									}}
								>
									{tag}
								</span>
							))}
						</div>
					)
				}
				return null
			})}
		</div>
	)
}

interface DesktopMockProps {
	activeFileIndex?: number
	onFileSelect?: (index: number) => void
}

export default function DesktopMock({ activeFileIndex = 0, onFileSelect }: DesktopMockProps) {
	const [internalActive, setInternalActive] = useState(0)
	const activeIndex = onFileSelect !== undefined ? activeFileIndex : internalActive
	const activeFile = vaultFiles[activeIndex]

	function handleFileClick(index: number) {
		if (onFileSelect) {
			onFileSelect(index)
		} else {
			setInternalActive(index)
		}
	}

	return (
		<div
			className="relative w-full overflow-hidden"
			style={{
				borderRadius: "12px",
				border: "1px solid var(--border)",
				background: "var(--bg-primary)",
				boxShadow: "0 32px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.14)",
			}}
		>
			{/* Title bar */}
			<div
				className="flex items-center gap-3 px-4 py-[10px]"
				style={{
					background: "var(--sidebar-bg)",
					borderBottom: "1px solid var(--border-subtle)",
				}}
			>
				<TrafficLights />
				<span
					className="flex-1 text-center font-mono text-[11px] text-muted-foreground"
					style={{ letterSpacing: "0.01em" }}
				>
					{activeFile.path} — Cortex
				</span>
			</div>

			{/* App body */}
			<div className="flex" style={{ height: "420px" }}>
				{/* Sidebar */}
				<div
					className="flex flex-col"
					style={{
						width: "185px",
						minWidth: "185px",
						background: "var(--sidebar-bg)",
						borderRight: "1px solid var(--border-subtle)",
					}}
				>
					{/* Vault name */}
					<div
						className="px-3 py-2.5 text-[11.5px] font-semibold text-primary"
						style={{ borderBottom: "1px solid var(--border-subtle)" }}
					>
						Meu Vault
					</div>

					{/* Files */}
					<div className="flex-1 overflow-auto py-1">
						{/* Root files */}
						{vaultFiles
							.filter((f) => !f.path.includes("/"))
							.map((file) => {
								const globalIndex = vaultFiles.findIndex((v) => v.name === file.name)
								return (
									<button
										key={file.name}
										type="button"
										onClick={() => handleFileClick(globalIndex)}
										className="flex w-full items-center gap-1.5 px-2.5 py-[4px] text-left text-[12px] transition-colors duration-100"
										style={{
											color:
												activeIndex === globalIndex ? "var(--text-primary)" : "var(--text-muted)",
											background: activeIndex === globalIndex ? "var(--bg-active)" : "transparent",
											borderRadius: "4px",
											margin: "1px 4px",
											width: "calc(100% - 8px)",
										}}
									>
										<SidebarFileIcon />
										<span className="truncate">{file.name}</span>
									</button>
								)
							})}

						{/* Folders */}
						{sidebarFolders.map((folder) => (
							<div key={folder.name}>
								<div className="flex items-center gap-1.5 px-2.5 py-[4px] text-[11.5px] font-medium text-muted-foreground">
									<FolderIcon open />
									<span>{folder.name}</span>
								</div>
								{folder.files.map((fname) => {
									const globalIndex = vaultFiles.findIndex((v) => v.name === fname)
									return (
										<button
											key={fname}
											type="button"
											onClick={() => handleFileClick(globalIndex)}
											className="flex w-full items-center gap-1.5 pl-6 pr-2.5 py-[4px] text-left text-[12px] transition-colors duration-100"
											style={{
												color:
													activeIndex === globalIndex ? "var(--text-primary)" : "var(--text-muted)",
												background:
													activeIndex === globalIndex ? "var(--bg-active)" : "transparent",
												borderRadius: "4px",
												margin: "1px 4px",
												width: "calc(100% - 8px)",
											}}
										>
											<SidebarFileIcon />
											<span className="truncate">{fname}</span>
										</button>
									)
								})}
							</div>
						))}
					</div>

					{/* Sidebar footer: tags */}
					<div className="px-3 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
						<div
							className="text-[10.5px] font-medium uppercase text-muted-foreground"
							style={{ letterSpacing: "0.06em" }}
						>
							Tags
						</div>
						<div className="mt-1.5 flex flex-wrap gap-1">
							{["#rust", "#grafos", "#início"].map((tag) => (
								<span
									key={tag}
									className="rounded px-1.5 py-0.5 font-mono text-[10px]"
									style={{
										background: "var(--bg-tag)",
										color: "var(--accent-text)",
									}}
								>
									{tag}
								</span>
							))}
						</div>
					</div>
				</div>

				{/* Editor area */}
				<div className="flex flex-1 flex-col overflow-hidden">
					{/* Tab bar */}
					<div
						className="flex items-end overflow-hidden"
						style={{
							background: "var(--tab-bg)",
							borderBottom: "1px solid var(--border-subtle)",
							minHeight: "34px",
						}}
					>
						{vaultFiles.map((file, i) => (
							<button
								key={file.name}
								type="button"
								onClick={() => handleFileClick(i)}
								className="flex items-center gap-1.5 px-3 py-[7px] text-[11.5px] transition-colors duration-100"
								style={{
									background: activeIndex === i ? "var(--tab-active-bg)" : "transparent",
									borderRight: "1px solid var(--border-subtle)",
									borderBottom:
										activeIndex === i ? "2px solid var(--tab-accent)" : "2px solid transparent",
									color: activeIndex === i ? "var(--text-primary)" : "var(--text-muted)",
									flexShrink: 0,
								}}
							>
								<SidebarFileIcon />
								<span>{file.name}</span>
							</button>
						))}
					</div>

					{/* Editor content */}
					<div
						className="flex-1 overflow-auto px-8 py-5"
						style={{ background: "var(--bg-primary)" }}
					>
						<EditorBody blocks={activeFile.content.body} />
					</div>

					{/* Status bar */}
					<div
						className="flex items-center justify-between px-4 py-1"
						style={{
							background: "var(--statusbar-bg)",
							borderTop: "1px solid var(--statusbar-border)",
						}}
					>
						<div className="flex items-center gap-3">
							<span className="font-mono text-[10px] text-muted-foreground">
								Markdown · Live Preview
							</span>
							<span className="text-[10px] text-muted-foreground">Ln 1, Col 1</span>
						</div>
						<SyncDot synced={activeIndex !== 2} />
					</div>
				</div>
			</div>
		</div>
	)
}
