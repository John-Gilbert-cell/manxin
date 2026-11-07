import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AnimatedRoutes } from '@/components/AnimatedRoutes'
import { PageTransition } from '@/components/PageTransition'
import { SessionProvider, useSession } from '@/lib/session'

const Welcome = lazy(() => import('./pages/Welcome'))
const Home = lazy(() => import('./pages/Home'))
const Write = lazy(() => import('./pages/Write'))
const LetterPage = lazy(() => import('./pages/LetterPage'))
const Letters = lazy(() => import('./pages/Letters'))
const Me = lazy(() => import('./pages/Me'))
const Admin = lazy(() => import('./pages/Admin'))
const NotFound = lazy(() => import('./pages/NotFound'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
})

function Guard({ children }: { children: React.ReactNode }) {
  const { member, loading } = useSession()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-[13px] tracking-[0.24em] text-[#b3bab4]">慢 信</span>
      </div>
    )
  }
  if (!member) return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-center" />
        <SessionProvider>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center">
                  <span className="text-[13px] tracking-[0.24em] text-[#b3bab4]">慢 信</span>
                </div>
              }
            >
              <AnimatedRoutes>
                <Route path="/" element={<Welcome />} />
                <Route path="/home" element={<Guard><PageTransition transition="fade"><Home /></PageTransition></Guard>} />
                <Route path="/letters" element={<Guard><PageTransition transition="fade"><Letters /></PageTransition></Guard>} />
                <Route path="/write" element={<Guard><PageTransition transition="fade"><Write /></PageTransition></Guard>} />
                <Route path="/write/:id" element={<Guard><PageTransition transition="fade"><Write /></PageTransition></Guard>} />
                <Route path="/letter/:id" element={<Guard><PageTransition transition="fade"><LetterPage /></PageTransition></Guard>} />
                <Route path="/me" element={<Guard><PageTransition transition="fade"><Me /></PageTransition></Guard>} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </AnimatedRoutes>
            </Suspense>
          </BrowserRouter>
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
