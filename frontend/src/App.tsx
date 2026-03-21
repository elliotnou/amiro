import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './lib/auth'
import { SidebarProvider, useSidebar } from './lib/SidebarContext'
import Sidebar from './components/Sidebar'
import LoadingScreen from './components/LoadingScreen'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Home from './pages/Home'
import Friends from './pages/Friends'
import FriendProfile from './pages/FriendProfile'
import Hangouts from './pages/Hangouts'
import HangoutDetail from './pages/HangoutDetail'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import AI, { AIGiftIdeas, AICatchupBrief, AIHangoutIdeas, AIFriendshipStory } from './pages/AI'
import Upgrade from './pages/Upgrade'
import Onboarding from './pages/Onboarding'

function AppLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}${ready ? ' sidebar-ready' : ''}`}>
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  )
}

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Redirects already-signed-in users away from auth pages */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/home" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <SidebarProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />

        {/* Protected */}
        <Route path="/home" element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><AppLayout><Friends /></AppLayout></ProtectedRoute>} />
        <Route path="/friends/:id" element={<ProtectedRoute><AppLayout><FriendProfile /></AppLayout></ProtectedRoute>} />
        <Route path="/hangouts" element={<ProtectedRoute><AppLayout><Hangouts /></AppLayout></ProtectedRoute>} />
        <Route path="/hangouts/:id" element={<ProtectedRoute><AppLayout><HangoutDetail /></AppLayout></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><AppLayout><Stats /></AppLayout></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AppLayout><AI /></AppLayout></ProtectedRoute>} />
        <Route path="/ai/gifts/:friendId" element={<ProtectedRoute><AppLayout><AIGiftIdeas /></AppLayout></ProtectedRoute>} />
        <Route path="/ai/catchup/:friendId" element={<ProtectedRoute><AppLayout><AICatchupBrief /></AppLayout></ProtectedRoute>} />
        <Route path="/ai/hangout-ideas/:friendId" element={<ProtectedRoute><AppLayout><AIHangoutIdeas /></AppLayout></ProtectedRoute>} />
        <Route path="/ai/story/:friendId" element={<ProtectedRoute><AppLayout><AIFriendshipStory /></AppLayout></ProtectedRoute>} />
        <Route path="/upgrade" element={<ProtectedRoute><AppLayout><Upgrade /></AppLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Routes>
    </SidebarProvider>
  )
}
