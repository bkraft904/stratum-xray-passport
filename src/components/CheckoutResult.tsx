import { Check, X } from 'lucide-react'
import { Container, Button, CardShell } from './ui'

// Rendered full-page in the new tab Stripe Checkout redirects back to
// (checkout is opened via window.open so the original Vault tab stays put).
// There's nothing to fetch here — Stripe's redirect itself is the signal;
// the actual unlock/subscription-active state is written by the webhook and
// picked up next time the original tab talks to the API, which is why the
// instruction is "refresh the other tab" rather than anything automatic.
export function CheckoutResult({ status }: { status: 'success' | 'cancel' }) {
  const canClose = window.opener != null

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-void">
      <Container className="flex justify-center">
        <CardShell className="flex max-w-md flex-col items-center gap-4 p-10 text-center">
          {status === 'success' ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-2xl border border-green/30 bg-green/10 text-green">
                <Check size={26} />
              </div>
              <h1 className="font-display text-xl text-fg">Thank you — payment received</h1>
              <p className="text-sm text-fg-dim">
                Your Stratum Vault account has been updated. Go back to your other browser tab and refresh the page
                to see it reflected.
              </p>
            </>
          ) : (
            <>
              <div className="flex size-14 items-center justify-center rounded-2xl border border-hair-strong bg-surface-2 text-fg-dim">
                <X size={26} />
              </div>
              <h1 className="font-display text-xl text-fg">Checkout cancelled</h1>
              <p className="text-sm text-fg-dim">No charge was made. You can close this tab and try again anytime from Stratum Vault.</p>
            </>
          )}
          {canClose ? (
            <Button variant="secondary" onClick={() => window.close()}>
              Close this tab
            </Button>
          ) : null}
        </CardShell>
      </Container>
    </div>
  )
}
