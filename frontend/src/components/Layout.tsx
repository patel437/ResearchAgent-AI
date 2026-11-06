import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, MessageSquare, FileText, Lightbulb,
  Beaker, BookOpen, BookMarked, Settings, LogOut, ChevronLeft,
  ChevronRight, Brain, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/search', icon: Search, label: 'Research Search' },
  { to: '/app/assistant', icon: MessageSquare, label: 'AI Assistant' },
  { to: '/app/summarizer', icon: FileText, label: 'Paper Summarizer' },
  { to: '/app/gaps', icon: Lightbulb, label: 'Research Gaps' },
  { to: '/app/hypotheses', icon: Beaker, label: 'Hypotheses' },
  { to: '/app/reports', icon: BookOpen, label: 'Report Generator' },
  { to: '/app/references', icon: BookMarked, label: 'References' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)]">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
          <Brain size={20} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-[15px] text-white leading-tight">ResearchAgent</div>
            <div className="text-[11px] text-[var(--color-muted)]">AI Research Platform</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all text-[14px] font-medium
              ${isActive
                ? 'bg-[rgba(79,124,255,0.15)] text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]'
              }`
            }
            title={collapsed ? label : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--color-border)] p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-error)] transition-all text-[14px]"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} relative flex-shrink-0`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface2)] transition-colors z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface2)]"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Brain size={18} color="var(--color-accent)" />
            <span className="font-bold text-[15px]">ResearchAgent AI</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
