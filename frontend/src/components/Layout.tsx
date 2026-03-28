import { NavLink, Outlet } from "react-router-dom";
import { DatasetInfo } from "./DatasetInfo";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/map", label: "Map" },
  { to: "/analytics", label: "Analytics" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/chapters", label: "Chapters" },
  { to: "/data", label: "Data" },
];

export function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-bn-mint/40 bg-white/90 backdrop-blur-sm sticky top-0 z-[1000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-display text-xl text-bn-forest font-semibold tracking-tight">BetterNature</p>
            <p className="text-xs text-bn-leaf/90">Donation optimization & food insecurity mapping</p>
          </div>
          <nav className="flex flex-wrap gap-1 sm:gap-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-bn-forest text-white"
                      : "text-bn-forest/80 hover:bg-bn-mint/30"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <DatasetInfo />
        </div>
        <Outlet />
      </main>
      <footer className="border-t border-bn-mint/30 py-4 text-center text-xs text-bn-leaf/70">
        BetterNature internal planning tool · need data is demo unless you upload your own CSV
      </footer>
    </div>
  );
}
