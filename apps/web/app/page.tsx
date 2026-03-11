import Cta from "@/components/cta"
import DemoSection from "@/components/demo-section"
import Features from "@/components/features"
import Footer from "@/components/footer"
import GraphSection from "@/components/graph-section"
import Hero from "@/components/hero"
import Nav from "@/components/nav"
import Stats from "@/components/stats"
import Testimonials from "@/components/testimonials"
import UseCases from "@/components/use-cases"

export default function Home() {
	return (
		<>
			<Nav />
			<Hero />
			<Features />
			<DemoSection />
			<UseCases />
			<GraphSection />
			<Stats />
			<Testimonials />
			<Cta />
			<Footer />
		</>
	)
}
