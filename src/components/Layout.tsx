import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { detectPlatform } from '../infrastructure/platform-detector';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/exercise', label: 'Exercise' },
  { to: '/drill', label: 'Drill' },
  { to: '/progress', label: 'Progress' },
  { to: '/custom-sets', label: 'Custom Sets' },
  { to: '/settings/reserved', label: 'Reserved Keys' },
] as const;

export default function Layout() {
  const { isMacOS } = detectPlatform();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Platform notice banner */}
      {!isMacOS && !bannerDismissed && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          <p>
            This app is optimized for macOS. Key mappings may differ on other
            platforms.
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 rounded px-2 py-1 text-amber-600 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-800/50"
            aria-label="Dismiss platform notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <ul className="flex gap-1 overflow-x-auto py-2">
            {navItems.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `block rounded px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
