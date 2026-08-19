import { lazy, Suspense } from 'react'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Problem } from './components/Problem'
import { HowItWorks } from './components/HowItWorks'
import { FeatureGrid } from './components/FeatureGrid'
import { FloorplanDemo } from './components/FloorplanDemo'
import { BuildingPassport } from './components/BuildingPassport'
import { BusinessModel } from './components/BusinessModel'
import { Trust } from './components/Trust'
import { CTA } from './components/CTA'
import { Footer } from './components/Footer'

// Split out below-the-fold and route-like sections so the initial bundle
// only carries what's needed for the first paint — these still load right
// away, just as separate chunks the browser can fetch in parallel instead
// of one large blocking bundle.
const ScanLab = lazy(() => import('./components/ScanLab').then((m) => ({ default: m.ScanLab })))
const VaultPanel = lazy(() => import('./components/VaultPanel').then((m) => ({ default: m.VaultPanel })))
const PublicPropertyView = lazy(() =>
  import('./components/PublicPropertyView').then((m) => ({ default: m.PublicPropertyView }))
)
const CheckoutResult = lazy(() =>
  import('./components/CheckoutResult').then((m) => ({ default: m.CheckoutResult }))
)

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const publicPropertyId = params.get('vault_view')
  if (publicPropertyId) {
    return (
      <Suspense fallback={null}>
        <PublicPropertyView propertyId={publicPropertyId} />
      </Suspense>
    )
  }

  const checkoutStatus = params.get('vault_checkout')
  if (checkoutStatus === 'success' || checkoutStatus === 'cancel') {
    return (
      <Suspense fallback={null}>
        <CheckoutResult status={checkoutStatus} />
      </Suspense>
    )
  }

  return (
    <div className="relative min-h-screen bg-void">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <FeatureGrid />
        <FloorplanDemo />
        <Suspense fallback={null}>
          <ScanLab />
        </Suspense>
        <Suspense fallback={null}>
          <VaultPanel />
        </Suspense>
        <BuildingPassport />
        <BusinessModel />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
