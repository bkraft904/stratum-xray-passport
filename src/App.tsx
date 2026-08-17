import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { HowItWorks } from './components/HowItWorks'
import { FeatureGrid } from './components/FeatureGrid'
import { FloorplanDemo } from './components/FloorplanDemo'
import { ScanLab } from './components/ScanLab'
import { BuildingPassport } from './components/BuildingPassport'
import { BusinessModel } from './components/BusinessModel'
import { Trust } from './components/Trust'
import { CTA } from './components/CTA'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="relative min-h-screen bg-void">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <FeatureGrid />
        <FloorplanDemo />
        <ScanLab />
        <BuildingPassport />
        <BusinessModel />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
