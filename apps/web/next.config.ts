import createMDX from "@next/mdx"
import type { NextConfig } from "next"
import rehypeHighlight from "rehype-highlight"

const withMDX = createMDX({
	options: {
		rehypePlugins: [rehypeHighlight],
	},
})

const nextConfig: NextConfig = {
	pageExtensions: ["js", "jsx", "mdx", "md", "ts", "tsx"],
}

export default withMDX(nextConfig)
