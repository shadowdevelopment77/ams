import { Button } from '@/components/ui/button'

// Placeholder — routing, auth, and the real screens land in the next phase.
// This just proves Vite + Tailwind + shadcn/ui are wired up correctly.
function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">AMS</h1>
      <p className="text-muted-foreground">Frontend scaffold ready.</p>
      <Button>shadcn/ui button</Button>
    </div>
  )
}

export default App
