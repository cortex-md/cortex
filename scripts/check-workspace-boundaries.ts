import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

interface WorkspacePackage {
	name: string
	directory: string
	manifest: {
		dependencies?: Record<string, string>
		devDependencies?: Record<string, string>
		peerDependencies?: Record<string, string>
	}
}

const workspaceRoots = ["apps", "packages", "plugins"]
const allowedDependencies: Record<string, readonly string[]> = {
	"@cortex/platform": [],
	"@cortex/renderer": [],
	"@cortex/theme": [],
	"@cortex/theme-mobile": [],
	"@cortex/settings": ["@cortex/platform"],
	"@cortex/core": ["@cortex/platform", "@cortex/settings"],
	"@cortex/editor": ["@cortex/renderer"],
	"@cortex/ipc": ["@cortex/platform"],
	"cortex-plugin-api": [],
	"@cortex/plugin-runtime": ["@cortex/platform", "@cortex/renderer", "cortex-plugin-api"],
	"@cortex/ui": [],
	"@cortex/search": ["@cortex/core", "@cortex/platform"],
	"@cortex/hotkeys": ["@cortex/platform"],
	"@cortex/marketplace": ["@cortex/platform", "@cortex/plugin-runtime", "@cortex/theme"],
	"@cortex/plugin-github-emoji": ["cortex-plugin-api"],
}

const forbiddenDependencies: Record<string, readonly string[]> = {
	"@cortex/desktop": ["@cortex/theme-mobile"],
	"@cortex/marketplace": ["@cortex/theme-mobile"],
	"@cortex/theme": ["@cortex/theme-mobile"],
}

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, "utf8")) as T
}

function collectWorkspacePackages(): WorkspacePackage[] {
	const packages: WorkspacePackage[] = []
	for (const root of workspaceRoots) {
		for (const entry of readdirSync(root)) {
			const directory = join(root, entry)
			const manifestPath = join(directory, "package.json")
			if (!existsSync(manifestPath)) continue
			const manifest = readJson<WorkspacePackage["manifest"] & { name?: string }>(manifestPath)
			if (manifest.name) packages.push({ name: manifest.name, directory, manifest })
		}
	}
	return packages
}

function collectSourceFiles(directory: string): string[] {
	const files: string[] = []
	const visit = (currentDirectory: string) => {
		for (const entry of readdirSync(currentDirectory)) {
			if (entry === "dist" || entry === "node_modules" || entry === "target") continue
			const path = join(currentDirectory, entry)
			const stats = statSync(path)
			if (stats.isDirectory()) visit(path)
			else if (/\.[cm]?[jt]sx?$/.test(entry)) files.push(path)
		}
	}
	const sourceDirectory = join(directory, "src")
	if (existsSync(sourceDirectory)) visit(sourceDirectory)
	return files
}

function collectModuleSpecifiers(path: string): string[] {
	const source = readFileSync(path, "utf8")
	const sourceFile = ts.createSourceFile(
		path,
		source,
		ts.ScriptTarget.Latest,
		true,
		path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	)
	const specifiers: string[] = []
	const visit = (node: ts.Node) => {
		if (
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
		) {
			specifiers.push(node.moduleSpecifier.text)
		}
		if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments.length === 1 &&
			ts.isStringLiteral(node.arguments[0])
		) {
			specifiers.push(node.arguments[0].text)
		}
		ts.forEachChild(node, visit)
	}
	visit(sourceFile)
	return specifiers
}

function resolveWorkspacePackage(
	specifier: string,
	workspaceNames: readonly string[],
): string | undefined {
	return workspaceNames.find((name) => specifier === name || specifier.startsWith(`${name}/`))
}

function findCycles(graph: Map<string, Set<string>>): string[][] {
	const cycles: string[][] = []
	const visiting = new Set<string>()
	const visited = new Set<string>()
	const path: string[] = []
	const visit = (name: string) => {
		if (visiting.has(name)) {
			const start = path.indexOf(name)
			cycles.push([...path.slice(start), name])
			return
		}
		if (visited.has(name)) return
		visiting.add(name)
		path.push(name)
		for (const dependency of graph.get(name) ?? []) visit(dependency)
		path.pop()
		visiting.delete(name)
		visited.add(name)
	}
	for (const name of graph.keys()) visit(name)
	return cycles
}

const workspacePackages = collectWorkspacePackages()
const workspaceNames = workspacePackages.map((workspacePackage) => workspacePackage.name)
const graph = new Map<string, Set<string>>()
const errors: string[] = []

for (const workspacePackage of workspacePackages) {
	const imports = new Set<string>()
	for (const path of collectSourceFiles(workspacePackage.directory)) {
		for (const specifier of collectModuleSpecifiers(path)) {
			const importedWorkspace = resolveWorkspacePackage(specifier, workspaceNames)
			if (importedWorkspace && importedWorkspace !== workspacePackage.name) {
				imports.add(importedWorkspace)
			}
		}
	}
	graph.set(workspacePackage.name, imports)
	const declared = {
		...workspacePackage.manifest.dependencies,
		...workspacePackage.manifest.devDependencies,
		...workspacePackage.manifest.peerDependencies,
	}
	const declaredWorkspaceDependencies = Object.entries(declared)
		.filter(([, version]) => version.startsWith("workspace:"))
		.map(([name]) => name)

	for (const importedWorkspace of imports) {
		if (!declared[importedWorkspace]) {
			errors.push(`${workspacePackage.name} imports undeclared workspace ${importedWorkspace}`)
		}
	}
	for (const dependency of declaredWorkspaceDependencies) {
		if (!imports.has(dependency)) {
			errors.push(`${workspacePackage.name} declares unused workspace ${dependency}`)
		}
	}
	for (const forbiddenDependency of forbiddenDependencies[workspacePackage.name] ?? []) {
		if (declared[forbiddenDependency] || imports.has(forbiddenDependency)) {
			errors.push(
				`${workspacePackage.name} must not depend on or import ${forbiddenDependency}`,
			)
		}
	}

	const allowed = allowedDependencies[workspacePackage.name]
	if (allowed) {
		for (const importedWorkspace of imports) {
			if (!allowed.includes(importedWorkspace)) {
				errors.push(
					`${workspacePackage.name} violates its layer by importing ${importedWorkspace}`,
				)
			}
		}
	}
}

for (const cycle of findCycles(graph)) errors.push(`workspace cycle: ${cycle.join(" -> ")}`)

if (errors.length > 0) {
	for (const error of errors) console.error(error)
	process.exit(1)
}

console.log(`Workspace boundaries valid for ${workspacePackages.length} packages`)
