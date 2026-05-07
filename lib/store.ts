import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'usuario' | 'psm'
export type MatrixColor = 'green' | 'red' | 'orange' | 'blue' | 'pink'

interface UIState {
  // Role management
  role: UserRole
  setRole: (role: UserRole) => void
  
  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  
  // Theme state
  theme: 'light' | 'dark' | 'matrix'
  setTheme: (theme: 'light' | 'dark' | 'matrix') => void
  toggleTheme: () => void
  
  // Matrix color customization
  matrixColor: MatrixColor
  setMatrixColor: (color: MatrixColor) => void
  
  // Note: Authentication state is now handled by WaaP directly
  // No need for mock auth state in the store
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Role management
      role: 'usuario',
      setRole: (role) => set({ role }),
      
      // Sidebar state
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Theme state
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : state.theme === 'dark' ? 'matrix' : 'light'
      })),
      
      // Matrix color customization
      matrixColor: 'green',
      setMatrixColor: (color) => set({ matrixColor: color }),
      
      // Authentication is now handled by WaaP - no mock state needed
    }),
    {
      name: 'motusdao-ui-storage',
      partialize: (state) => ({
        role: state.role,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        matrixColor: state.matrixColor,
      }),
    }
  )
)

// Navigation items based on role
export const getNavigationItems = (role: UserRole) => {
  const coreItems = [
    { name: 'Chat Clínico', href: '/motusai', icon: 'Bot' },
    { name: 'Perfil', href: '/perfil', icon: 'User' },
    { name: 'Certificados', href: '/certificados', icon: 'Award' },
  ]

  // Keep role support in state, but share one simple navigation for both.
  if (role === 'usuario' || role === 'psm') {
    return coreItems
  }

  return coreItems
}
