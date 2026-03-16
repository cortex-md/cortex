import Cta from "@/components/cta"
import EditorSection from "@/components/editor-section"
import Footer from "@/components/footer"
import GraphSection from "@/components/graph-section"
import Hero from "@/components/hero"
import Nav from "@/components/nav"
import PluginsSection from "@/components/plugins-section"
import SyncSection from "@/components/sync-section"

export default function Home() {
	return (
		<>
			<Nav />
			<Hero />
			<EditorSection />
			<GraphSection />
			<SyncSection />
			<PluginsSection />
			<Cta />
			<Footer />
		</>
	)
}
