// Mason Jar Bean Tally - Browser build (no bundler)
// Uses React/ReactDOM UMD globals and Babel in the browser.
// Do NOT include import/export syntax in this file.

const BEANS = [
  { id: "black", name: "Black", hex: "#2b2b2b" },
  { id: "pinto", name: "Pinto", hex: "#a06a4a" },
  { id: "garbanzo", name: "Garbanzo", hex: "#d6b26e" },
  { id: "lima", name: "Lima", hex: "#9fd46b" },
  { id: "kidney", name: "Kidney", hex: "#7a1c26" },
  { id: "navy", name: "Navy", hex: "#f3ede2" },
];

const DEFAULT_PLAYERS = ["Player 1", "Player 2"];
const STORAGE_KEY = "mason-jar-bean-tally-v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function newPlayer(name) {
  const counts = Object.fromEntries(BEANS.map((b) => [b.id, 0]));
  return { id: uid(), name, counts };
}

function MasonJarSVG({ fill = "#e0e7ff" }) {
  return (
    <svg viewBox="0 0 128 160" className="w-10 h-12 drop-shadow-sm">
      <defs>
        <linearGradient id="jarGlass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect x="28" y="6" width="72" height="18" rx="4" fill="#9ca3af" />
      <rect x="24" y="22" width="80" height="12" rx="6" fill="#cbd5e1" />
      <rect x="16" y="34" width="96" height="112" rx="16" fill="url(#jarGlass)" stroke="#94a3b8" strokeWidth="3" />
      <rect x="24" y="46" width="80" height="88" rx="10" fill="transparent" stroke="white" strokeOpacity="0.5" />
      <rect x="20" y="112" width="88" height="30" rx="10" fill={fill} opacity="0.2" />
    </svg>
  );
}

function BeanIcon({ hex }) {
  return (
    <svg viewBox="0 0 64 48" className="w-6 h-6">
      <defs>
        <linearGradient id={"g" + hex} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={hex} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path
        d="M49 7c-4-4-12-4-18 0-6 4-7 10-14 12-6 2-10 7-9 12 1 6 7 10 17 10 9 0 19-4 24-10 6-7 4-17 0-24z"
        fill={"url(#g" + hex + ")"}
        stroke="#111827"
        strokeWidth="1.2"
        className="drop-shadow-sm"
      />
    </svg>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1 rounded-full border text-sm flex items-center gap-2 transition shadow-sm hover:shadow " +
        (active ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200")
      }
    >
      {children}
    </button>
  );
}

function App() {
  const [players, setPlayers] = React.useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_PLAYERS.map((n) => newPlayer(n));
  });

  const [selectedBean, setSelectedBean] = React.useState(BEANS[0].id);
  const [selectedPlayerId, setSelectedPlayerId] = React.useState(null);
  const [newName, setNewName] = React.useState("");

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  }, [players]);

  const totals = React.useMemo(
    () => players.map((p) => ({ id: p.id, name: p.name, total: Object.values(p.counts).reduce((a, b) => a + b, 0) })),
    [players]
  );

  const sortedTotals = React.useMemo(() => [...totals].sort((a, b) => b.total - a.total), [totals]);

  function addPlayer(name) {
    const n = (name || "").trim() || `Player ${players.length + 1}`;
    setPlayers((ps) => [...ps, newPlayer(n)]);
  }

  function removePlayer(id) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
  }

  function renamePlayer(id, name) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function changeCount(id, beanId, delta) {
    setPlayers((ps) =>
      ps.map((p) =>
        p.id === id
          ? { ...p, counts: { ...p.counts, [beanId]: Math.max(0, (p.counts[beanId] || 0) + delta) } }
          : p
      )
    );
  }

  function resetPlayer(id) {
    setPlayers((ps) =>
      ps.map((p) => (p.id === id ? { ...p, counts: Object.fromEntries(BEANS.map((b) => [b.id, 0])) } : p))
    );
  }

  function resetAll() {
    if (!confirm("Reset all jars?")) return;
    setPlayers((ps) => ps.map((p) => ({ ...p, counts: Object.fromEntries(BEANS.map((b) => [b.id, 0])) })));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ players }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bean-tally-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.players)) setPlayers(data.players);
        else alert("Invalid file");
      } catch (err) {
        alert("Couldn't read file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <MasonJarSVG />
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Mason Jar Bean Tally</h1>
            <p className="text-sm text-slate-600">Tap a bean, then a jar — or use +/− on each jar. Perfect for keeping score for trivia, spelling bees, and offline games.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Reset all</button>
            <button onClick={exportJSON} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Export</button>
            <label className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm cursor-pointer">
              Import
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Bean palette</h2>
            <div className="flex flex-wrap gap-2">
              {BEANS.map((b) => (
                <Chip key={b.id} active={selectedBean === b.id} onClick={() => setSelectedBean(b.id)}>
                  <BeanIcon hex={b.hex} />
                  <span>{b.name}</span>
                </Chip>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">Tip: Select a bean, then click any jar to drop a bean. Shift-click a jar to remove one.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-4">
            <h2 className="font-semibold mb-3">Leaderboard</h2>
            <ol className="space-y-2">
              {sortedTotals.map((t, i) => (
                <li key={t.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-7 text-center font-mono">{i + 1}.</span> {t.name}</span>
                  <span className="font-semibold tabular-nums">{t.total}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New player name"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white shadow-inner"
              onKeyDown={(e) => { if (e.key === 'Enter') { addPlayer(newName); setNewName(""); } }}
            />
            <button onClick={() => { addPlayer(newName); setNewName(""); }} className="px-3 py-2 rounded-xl bg-slate-900 text-white shadow hover:opacity-90">Add jar</button>
          </div>

          {players.length === 0 && (
            <div className="p-6 text-center text-slate-600 bg-white border border-dashed rounded-2xl">No jars yet. Add one above.</div>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {players.map((p) => {
              const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
              const isSelected = selectedPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  className={"group relative bg-white border rounded-2xl p-4 shadow-sm transition " + (isSelected ? "border-slate-900" : "border-slate-200")}
                  onClick={(e) => {
                    if (e.target instanceof HTMLElement && e.target.closest('button,input,svg,path')) return;
                    const delta = e.shiftKey ? -1 : 1;
                    changeCount(p.id, selectedBean, delta);
                    setSelectedPlayerId(p.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <MasonJarSVG />
                    <div className="flex-1">
                      <input
                        value={p.name}
                        onChange={(e) => renamePlayer(p.id, e.target.value)}
                        className="w-full text-lg font-semibold bg-transparent outline-none border-b border-transparent focus:border-slate-300"
                      />
                      <div className="text-sm text-slate-600">Total: <span className="font-semibold tabular-nums">{total}</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {BEANS.map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                            <div className="flex items-center gap-2">
                              <BeanIcon hex={b.hex} />
                              <span className="text-sm">{b.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => changeCount(p.id, b.id, -1)} className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">−</button>
                              <span className="w-8 text-center font-mono tabular-nums">{p.counts[b.id]}</span>
                              <button onClick={() => changeCount(p.id, b.id, 1)} className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">+</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-slate-500">Tip: Click the card to drop the selected bean. Shift-click to remove.</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => resetPlayer(p.id)} className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-sm">Reset</button>
                          <button onClick={() => removePlayer(p.id)} className="px-2 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-sm">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs bg-slate-900 text-white rounded-full shadow">Selected</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-center text-xs text-slate-500">
        <p>Data saves locally in your browser. No account needed.</p>
      </footer>
    </div>
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
