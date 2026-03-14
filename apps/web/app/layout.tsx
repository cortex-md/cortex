import type { Metadata } from "next"
import { DM_Mono, DM_Sans, Lora } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "./providers/theme-provider"

const dmSans = DM_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-dm-sans",
})

const lora = Lora({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-lora",
})

const dmMono = DM_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	display: "swap",
	variable: "--font-dm-mono",
})

export const metadata: Metadata = {
	title: "Cortex — Your thoughts, structured.",
	description:
		"Um segundo cérebro que cresce com você. Escreva, conecte ideias, navegue pelo grafo do seu conhecimento — tudo em arquivos Markdown que são seus para sempre.",
	keywords: ["markdown", "notas", "segundo cérebro", "knowledge base", "PKM", "local-first"],
	openGraph: {
		title: "Cortex — Your thoughts, structured.",
		description:
			"Um segundo cérebro que cresce com você. Escreva, conecte ideias, navegue pelo grafo do seu conhecimento.",
		type: "website",
	},
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="pt-BR"
			className={`${dmSans.variable} ${lora.variable} ${dmMono.variable}`}
			suppressHydrationWarning
		>
			<head />
			<ThemeProvider defaultTheme="dark">
				<body>{children}</body>
			</ThemeProvider>
		</html>
	)
}
