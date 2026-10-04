import { useCallback, useEffect, useMemo, useState } from "react";
import type { Home, Me } from "@zeszyt/shared";
import { api } from "./api.ts";
import { Menu } from "./components/Chrome.tsx";
import { Login } from "./Login.tsx";
import { go, useRoute } from "./lib/router.ts";
import { SessionContext } from "./lib/useSection.ts";
import { ArticlePage } from "./pages/Article.tsx";
import { AttendancePage } from "./pages/Attendance.tsx";
import { EventsPage } from "./pages/Events.tsx";
import { GradesPage } from "./pages/Grades.tsx";
import { NewsPage } from "./pages/News.tsx";
import { PlanPage } from "./pages/Plan.tsx";
import { StartPage } from "./pages/Start.tsx";
import { load, requestPersistence, save, wipe } from "./store.ts";

export function App() {
  const [booted, setBooted] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Bumped after re-login so the open page remounts and refetches. */
  const [sessionVersion, setSessionVersion] = useState(0);
  const route = useRoute();

  useEffect(() => {
    void load("me").then((cached) => {
      setMe(cached?.data ?? null);
      setBooted(true);
    });
  }, []);

  const session = useMemo(() => ({ expire: () => setNeedsLogin(true) }), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const onHome = useCallback((home: Home) => {
    setMe(home.me);
    void save("me", home.me);
  }, []);

  async function handleLogin(next: Me) {
    if (me && me.studentId !== next.studentId) await wipe();
    requestPersistence();
    await save("me", next);
    setMe(next);
    setNeedsLogin(false);
    setSessionVersion((v) => v + 1);
  }

  async function handleLogout() {
    setMenuOpen(false);
    await api.logout().catch(() => undefined);
    await wipe();
    setMe(null);
    setNeedsLogin(false);
    go("#");
  }

  if (!booted) return null;
  if (!me) return <Login onSuccess={handleLogin} />;

  return (
    <SessionContext.Provider value={session}>
      <div className="app">
        {needsLogin && (
          <div className="relogin">
            <Login compact onSuccess={handleLogin} />
          </div>
        )}

        <main key={`${route.name}-${route.name === "article" ? route.id : ""}-${sessionVersion}`}>
          {route.name === "start" && <StartPage me={me} onMenu={openMenu} onHome={onHome} />}
          {route.name === "plan" && <PlanPage onMenu={openMenu} onHome={onHome} />}
          {route.name === "grades" && <GradesPage onMenu={openMenu} />}
          {route.name === "attendance" && <AttendancePage onMenu={openMenu} />}
          {route.name === "events" && <EventsPage onMenu={openMenu} onHome={onHome} />}
          {route.name === "news" && <NewsPage onMenu={openMenu} />}
          {route.name === "article" && <ArticlePage id={route.id} onMenu={openMenu} />}
        </main>

        <footer className="disclaimer">
          Nieoficjalny klient. Niezwiązany z IDU ani DAG s.c. Dane są zapisywane tylko na tym urządzeniu.
        </footer>
      </div>
      <Menu open={menuOpen} onClose={closeMenu} onLogout={handleLogout} />
    </SessionContext.Provider>
  );
}
