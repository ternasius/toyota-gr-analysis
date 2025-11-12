/**
 * DashboardLayout Component
 * 
 * Main layout component for the Race Telemetry Dashboard.
 * Implements responsive grid layout with breakpoints:
 * - Mobile: < 768px (stacked vertical layout with collapsible sidebars)
 * - Tablet: 768px - 1024px (two-column layout with collapsible left sidebar)
 * - Desktop: > 1024px (three-column layout with persistent sidebars)
 * 
 * Requirements: 6.5, 6.6
 */

import { useState, type ReactNode } from 'react';
import { Menu, BarChart3 } from 'lucide-react';
import { MobileSidebar } from './MobileSidebar';

interface DashboardLayoutProps {
  navbar: ReactNode;
  summaryCards: ReactNode;
  leftSidebar?: ReactNode;
  mainContent: ReactNode;
  rightSidebar?: ReactNode;
}

export function DashboardLayout({
  navbar,
  summaryCards,
  leftSidebar,
  mainContent,
  rightSidebar,
}: DashboardLayoutProps) {
  // Mobile sidebar state
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  
  // Tablet sidebar state (collapsed by default)
  const [isTabletLeftSidebarCollapsed, setIsTabletLeftSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-racing-bg text-white flex flex-col">
      {/* Navbar - Full width at top */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-racing-bg/95 backdrop-blur" role="banner">
        {navbar}
      </header>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Summary Cards - Full width below navbar */}
        {summaryCards}

        {/* Dashboard Grid Layout */}
        <div className="flex-1 flex flex-col lg:flex-row relative">
          {/* Left Sidebar - Desktop & Tablet (collapsible on tablet) */}
          {leftSidebar && (
            <aside 
              className={`
                hidden md:block
                ${isTabletLeftSidebarCollapsed ? 'md:w-0 lg:w-64 xl:w-80' : 'md:w-64 lg:w-64 xl:w-80'}
                border-r border-gray-800 bg-gray-900/30
                transition-all duration-300 ease-in-out
                overflow-hidden
              `}
              aria-label="Driver selection sidebar"
              aria-hidden={isTabletLeftSidebarCollapsed}
            >
              <div className="h-full overflow-y-auto">
                {leftSidebar}
              </div>
            </aside>
          )}

          {/* Main Chart Area - Takes remaining space */}
          <main className="flex-1 overflow-y-auto" role="main" aria-label="Telemetry visualization">
            <div className="p-3 md:p-4 lg:p-6">
              {mainContent}
            </div>
          </main>

          {/* Right Sidebar - Desktop only (narrower for more chart space) */}
          {rightSidebar && (
            <aside className="hidden xl:block w-[400px] 2xl:w-[500px] border-l border-gray-800 bg-gray-900/30" aria-label="Statistics sidebar">
              <div className="h-full overflow-y-auto overflow-x-auto">
                {rightSidebar}
              </div>
            </aside>
          )}

          {/* Tablet Left Sidebar Toggle Button */}
          {leftSidebar && (
            <button
              onClick={() => setIsTabletLeftSidebarCollapsed(!isTabletLeftSidebarCollapsed)}
              className="
                hidden md:block lg:hidden
                fixed left-0 top-1/2 -translate-y-1/2 z-30
                bg-gray-900 border border-gray-800 rounded-r-lg
                p-2 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors
              "
              aria-label={isTabletLeftSidebarCollapsed ? 'Expand driver selection sidebar' : 'Collapse driver selection sidebar'}
              aria-expanded={!isTabletLeftSidebarCollapsed}
              title={isTabletLeftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={20} className="text-gray-400" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around py-2">
          {/* Driver Selection Button */}
          {leftSidebar && (
            <button
              onClick={() => setIsLeftSidebarOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Open driver selection panel"
              aria-expanded={isLeftSidebarOpen}
            >
              <Menu size={20} className="text-racing-red" aria-hidden="true" />
              <span className="text-xs text-gray-400">Drivers</span>
            </button>
          )}

          {/* Statistics Button */}
          {rightSidebar && (
            <button
              onClick={() => setIsRightSidebarOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Open statistics panel"
              aria-expanded={isRightSidebarOpen}
            >
              <BarChart3 size={20} className="text-racing-red" aria-hidden="true" />
              <span className="text-xs text-gray-400">Stats</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Sidebars (Bottom Sheets) */}
      <MobileSidebar
        isOpen={isLeftSidebarOpen}
        onClose={() => setIsLeftSidebarOpen(false)}
        title="Driver Selection"
        position="bottom"
      >
        <div className="p-4">
          {leftSidebar}
        </div>
      </MobileSidebar>

      <MobileSidebar
        isOpen={isRightSidebarOpen}
        onClose={() => setIsRightSidebarOpen(false)}
        title="Statistics"
        position="bottom"
      >
        <div className="p-4">
          {rightSidebar}
        </div>
      </MobileSidebar>

      {/* Add padding to bottom of main content on mobile to account for bottom nav */}
      <style>{`
        @media (max-width: 767px) {
          main {
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </div>
  );
}
