"use client"

import { useState } from "react"

type EditorMode = "preview" | "source" | "split"

const modeLabels: Record<EditorMode, string> = {
	preview: "Live Preview",
	source: "Source",
	split: "Side-by-side",
}

const sourceContent = `# Graph Theory

A graph **G = (V, E)** consists of a set of
vertices V and a set of edges E.

## Properties

See also: [[rust-notes]] for Rust implementations.

> Every Cortex vault is a graph. Notes are
> vertices, wikilinks are edges.

\`\`\`rust
struct Graph {
    nodes: Vec<Node>,
    edges: Vec<Edge>,
}
\`\`\`

#mathematics #graphs #cs`

function PreviewPane() {
	return (
		<div className="flex-1 overflow-auto px-8 py-6" style={{ background: "var(--bg-primary)" }}>
			<h1
				className="font-editor font-bold text-primary"
				style={{
					fontSize: "22px",
					lineHeight: 1.2,
					letterSpacing: "-0.02em",
					marginBottom: "16px",
				}}
			>
				Graph Theory
			</h1>
			<p
				style={{
					fontSize: "13.5px",
					lineHeight: 1.75,
					color: "var(--text-primary)",
					marginBottom: "14px",
				}}
			>
				A graph <strong className="font-semibold">G = (V, E)</strong> consists of a set of vertices
				V and a set of edges E.
			</p>
			<h2
				className="font-editor font-semibold text-primary"
				style={{
					fontSize: "16px",
					lineHeight: 1.3,
					letterSpacing: "-0.01em",
					marginBottom: "12px",
				}}
			>
				Properties
			</h2>
			<p
				style={{
					fontSize: "13.5px",
					lineHeight: 1.75,
					color: "var(--text-primary)",
					marginBottom: "14px",
				}}
			>
				See also:{" "}
				<span className="cursor-pointer font-medium" style={{ color: "var(--link)" }}>
					rust-notes
				</span>{" "}
				for Rust implementations.
			</p>
			<blockquote
				style={{
					fontSize: "13.5px",
					lineHeight: 1.65,
					borderLeft: "2px solid var(--accent)",
					paddingLeft: "14px",
					color: "var(--text-muted)",
					fontStyle: "italic",
					marginBottom: "14px",
				}}
			>
				Every Cortex vault is a graph. Notes are vertices, wikilinks are edges.
			</blockquote>
			<div
				className="overflow-hidden rounded-md"
				style={{ background: "var(--bg-code)", border: "1px solid var(--border-subtle)" }}
			>
				<div
					className="px-3 py-1.5 font-mono text-[10.5px] text-muted-foreground"
					style={{
						borderBottom: "1px solid var(--border-subtle)",
						background: "var(--bg-tertiary)",
					}}
				>
					rust
				</div>
				<pre className="px-3 py-2.5" style={{ fontSize: "12px", lineHeight: 1.65 }}>
					{["struct Graph {", "    nodes: Vec<Node>,", "    edges: Vec<Edge>,", "}"].map(
						(line, i) => (
							<div key={i} className="font-mono" style={{ color: "var(--syntax-keyword)" }}>
								{line}
							</div>
						),
					)}
				</pre>
			</div>
			<div className="mt-4 flex flex-wrap gap-1.5">
				{["#mathematics", "#graphs", "#cs"].map((tag) => (
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
		</div>
	)
}

function SourcePane() {
	return (
		<div className="flex-1 overflow-auto px-8 py-6" style={{ background: "var(--bg-primary)" }}>
			<pre
				className="font-mono"
				style={{
					fontSize: "12.5px",
					lineHeight: 1.8,
					color: "var(--text-primary)",
					whiteSpace: "pre-wrap",
				}}
			>
				{sourceContent.split("\n").map((line, i) => {
					let style: React.CSSProperties = { color: "var(--text-primary)" }
					if (line.startsWith("# ")) style = { color: "var(--syntax-keyword)", fontWeight: 700 }
					else if (line.startsWith("## "))
						style = { color: "var(--syntax-keyword)", fontWeight: 600 }
					else if (line.startsWith(">")) style = { color: "var(--text-muted)", fontStyle: "italic" }
					else if (line.startsWith("#")) style = { color: "var(--accent-text)" }
					else if (line.startsWith("```") || line.startsWith("    ") || line === "}")
						style = { color: "var(--syntax-string)" }
					return (
						<div key={i} style={style}>
							{line || "\u00A0"}
						</div>
					)
				})}
			</pre>
		</div>
	)
}

function EditorWindowMock({ mode }: { mode: EditorMode }) {
	return (
		<div
			className="relative w-full overflow-hidden"
			style={{
				borderRadius: "12px",
				border: "1px solid var(--border)",
				background: "var(--bg-primary)",
				boxShadow: "0 24px 56px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.1)",
				height: "460px",
			}}
		>
			{/* Title bar */}
			<div
				className="flex items-center gap-3 px-4 py-[9px]"
				style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--border-subtle)" }}
			>
				<div className="flex items-center gap-[6px]">
					<div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
					<div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
					<div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
				</div>
				<span className="flex-1 text-center font-mono text-[11px] text-muted-foreground">
					graph-theory.md — Cortex
				</span>
				<span
					className="rounded px-2 py-0.5 text-[10.5px] font-medium"
					style={{
						background: "var(--accent-subtle)",
						color: "var(--accent-text)",
						border: "1px solid var(--accent-border)",
					}}
				>
					{modeLabels[mode]}
				</span>
			</div>

			{/* Content */}
			<div className="flex" style={{ height: "calc(100% - 34px - 26px)" }}>
				{mode === "preview" && <PreviewPane />}
				{mode === "source" && <SourcePane />}
				{mode === "split" && (
					<>
						<div
							className="flex flex-1 flex-col overflow-hidden"
							style={{ borderRight: "1px solid var(--border-subtle)" }}
						>
							<div
								className="px-3 py-1 text-[10.5px] font-medium text-muted-foreground"
								style={{
									background: "var(--bg-tertiary)",
									borderBottom: "1px solid var(--border-subtle)",
								}}
							>
								Source
							</div>
							<SourcePane />
						</div>
						<div className="flex flex-1 flex-col overflow-hidden">
							<div
								className="px-3 py-1 text-[10.5px] font-medium text-muted-foreground"
								style={{
									background: "var(--bg-tertiary)",
									borderBottom: "1px solid var(--border-subtle)",
								}}
							>
								Preview
							</div>
							<PreviewPane />
						</div>
					</>
				)}
			</div>

			{/* Status bar */}
			<div
				className="flex items-center justify-between px-4 py-1"
				style={{
					background: "var(--statusbar-bg)",
					borderTop: "1px solid var(--statusbar-border)",
				}}
			>
				<span className="font-mono text-[10px] text-muted-foreground">
					Markdown · {modeLabels[mode]}
				</span>
				<span className="font-mono text-[10px] text-muted-foreground">Ln 1, Col 1</span>
			</div>
		</div>
	)
}

const modes: EditorMode[] = ["preview", "source", "split"]

export default function EditorSection() {
	const [activeMode, setActiveMode] = useState<EditorMode>("preview")

	return (
		<section
			id="editor"
			className="overflow-hidden px-6 py-24"
			style={{ background: "var(--bg-secondary)" }}
		>
			<div className="mx-auto max-w-[1100px]">
				{/* Section header */}
				<div className="mb-14 flex flex-col items-center text-center">
					<div
						className="mb-3.5 text-[11.5px] font-semibold uppercase"
						style={{ letterSpacing: "0.08em", color: "var(--accent)" }}
					>
						02 — Editor
					</div>
					<h2
						className="font-editor font-bold text-primary"
						style={{
							fontSize: "clamp(28px, 4vw, 44px)",
							lineHeight: 1.12,
							letterSpacing: "-0.025em",
							maxWidth: "600px",
						}}
					>
						Write in any mode.{" "}
						<em className="not-italic" style={{ color: "var(--accent)" }}>
							Your choice.
						</em>
					</h2>
					<p
						className="mt-5 text-muted-foreground"
						style={{ fontSize: "16px", lineHeight: 1.7, maxWidth: "520px" }}
					>
						Cortex renders Markdown live as you type, or get out of the way and show you raw source.
						Side-by-side gives you both at once.
					</p>
				</div>

				{/* Mode toggle */}
				<div className="mb-8 flex justify-center">
					<div
						className="flex gap-1 rounded-lg p-1"
						style={{
							background: "var(--bg-tertiary)",
							border: "1px solid var(--border-subtle)",
						}}
					>
						{modes.map((mode) => (
							<button
								key={mode}
								type="button"
								onClick={() => setActiveMode(mode)}
								className="rounded-md px-4 py-1.5 text-[13px] font-medium transition-all duration-150"
								style={{
									background: activeMode === mode ? "var(--bg-elevated)" : "transparent",
									color: activeMode === mode ? "var(--text-primary)" : "var(--text-muted)",
									border: activeMode === mode ? "1px solid var(--border)" : "1px solid transparent",
									boxShadow: activeMode === mode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
								}}
							>
								{modeLabels[mode]}
							</button>
						))}
					</div>
				</div>

				{/* Editor mock */}
				<EditorWindowMock mode={activeMode} />

				{/* Feature bullets */}
				<div className="mt-12 grid gap-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
					{[
						{
							title: "Wikilinks",
							description:
								"[[note-name]] creates bidirectional links. Click any wikilink to navigate instantly.",
						},
						{
							title: "Live syntax highlighting",
							description:
								"Headings, code blocks, tags, and checkboxes are styled as you type — no mode switch needed.",
						},
						{
							title: "Plain files, always",
							description:
								"Every note is a .md file on disk. Open it in any editor, Git diff it, back it up anywhere.",
						},
					].map((feature) => (
						<div
							key={feature.title}
							className="rounded-xl p-5"
							style={{
								background: "var(--bg-elevated)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							<div className="mb-1 text-[13.5px] font-semibold text-primary">{feature.title}</div>
							<p className="text-[13px] text-muted-foreground" style={{ lineHeight: 1.65 }}>
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
