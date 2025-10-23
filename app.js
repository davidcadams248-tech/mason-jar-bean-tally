// Mason Jar Bean Tally - Enhanced Browser Build
// - Custom beans editor (name + color)
// - Summary chart modal (Chart.js)
// - Mobile responsive tweaks
// - Animations (Framer Motion if available; CSS fallback)
// - Resizable left score panel (desktop), persisted
//
// No imports/exports; uses UMD globals (React, ReactDOM, Chart).

/* ---------------------------- Utilities & State ---------------------------- */
const DEFAULT_BEANS = [
  { id: "black",    name: "Black",    hex: "#2b2b2b" },
  { id: "pinto",    name: "Pinto",    hex: "#a06a4a" },
  { id: "garbanzo", name: "Garbanzo", hex: "#d6b26e" },
  { id: "lima",     name: "Lima",     hex: "#9fd46b" },
  { id: "kidney",   name: "Kidney",   hex: "#7a1c26" },
  { id: "navy",     name: "Navy",     hex: "#f3ede2" },
];

const DEFAULT_PLAYERS = ["Player 1", "Player 2"];
const STORAGE_KEY = "mason-jar-bean-tally-v2"; // bump schema
const STORAGE_LAYOUT = "mason-jar-bean-tally-layout";

function uid() { return Math.random().toString(36).slice(2, 10); }

function newPlayer(name, beans) {
  const counts = Object.fromEntries(beans.map((b) => [b.id, 0]));
  return { id: uid(), name, counts };
}

/* ---------------------------------- SVGs ---------------------------------- */
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
    <svg viewBox="0 0 64 48" className="w-5 h-5">
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

/* ---------------------------- Reusable Components ---------------------------- */
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

function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;
  // Try Framer Motion if present
  const Motion = window["framer-motion"]?.motion;
  const Backdrop = ({ children }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">{children}</div>
    </div>
  );
  const Card = ({ children }) => (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200">
      {children}
    </div>
  );

  if (Motion) {
    return (
      <Backdrop>
        <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Motion.div initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
            <Card>
              <div className="px-5 py-4 border-b border-slate-200 font-semibold">{title}</div>
              <div className="p-5">{children}</div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{actions}</div>
            </Card>
          </Motion.div>
        </Motion.div>
      </Backdrop>
    );
  }
  // Fallback without Motion
  return (
    <Backdrop>
      <Card>
        <div className="px-5 py-4 border-b border-slate-200 font-semibold">{title}</div>
        <div className="p-5">{children}</div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{actions}</div>
      </Card>
    </Backdrop>
  );
}

/* ---------------------------------- App ---------------------------------- */
function App() {
  /* ---------- Persistent state ---------- */
  const [state, setState] = React.useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    // initial
    const beans = DEFAULT_BEANS;
    const players = DEFAULT_PLAYERS.map((n) => newPlayer(n, beans));
    return { beans, players };
  });

  const beans = state.beans;
  const players = state.players;

  const [selectedBean, setSelectedBean] = React.useState(beans[0]?.id || null);
  const [selectedPlayerId, setSelectedPlayerId] = React.useState(null);
  const [newName, setNewName] = React.useState("");

  // layout: resizable left panel width (desktop)
  const [leftWidth, setLeftWidth] = React.useState(() => {
    const w = localStorage.getItem(STORAGE_LAYOUT);
    return w ? parseInt(w, 10) : 360; // px
  });
  const leftRef = React.useRef(null);
  const dragging = React.useRef(false);

  // Persist
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_LAYOUT, String(leftWidth));
  }, [leftWidth]);

  /* ---------- Derived ---------- */
  const totals = React.useMemo(
    () => players.map((p) => ({ id: p.id, name: p.name, total: Object.values(p.counts).reduce((a, b) => a + b, 0) })),
    [players]
  );
  const sortedTotals = React.useMemo(() => [...totals].sort((a, b) => b.total - a.total), [totals]);

  /* ---------- Player actions ---------- */
  function addPlayer(name) {
    const n = (name || "").trim() || `Player ${players.length + 1}`;
    setState((s) => ({ ...s, players: [...s.players, newPlayer(n, s.beans)] }));
    setNewName("");
  }

  function removePlayer(id) {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
  }

  function renamePlayer(id, name) {
    setState((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, name } : p)) }));
  }

  function changeCount(id, beanId, delta) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id
          ? { ...p, counts: { ...p.counts, [beanId]: Math.max(0, (p.counts[beanId] || 0) + delta) } }
          : p
      ),
    }));
  }

  function resetPlayer(id) {
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id ? { ...p, counts: Object.fromEntries(s.beans.map((b) => [b.id, 0])) } : p
      ),
    }));
  }

  function resetAll() {
    if (!confirm("Reset all jars?")) return;
    setState((s) => ({
      ...s,
      players: s.players.map((p) => ({ ...p, counts: Object.fromEntries(s.beans.map((b) => [b.id, 0])) })),
    }));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
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
        if (Array.isArray(data.players) && Array.isArray(data.beans)) {
          setState(data);
        } else {
          alert("Invalid file (missing players/beans).");
        }
      } catch {
        alert("Couldn't read file");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Custom beans editor ---------- */
  const [beansOpen, setBeansOpen] = React.useState(false);

  function addBean() {
    const id = uid();
    const bean = { id, name: "New Bean", hex: "#888888" };
    setState((s) => {
      // add to players counts
      const players = s.players.map((p) => ({ ...p, counts: { ...p.counts, [id]: 0 } }));
      return { ...s, beans: [...s.beans, bean], players };
    });
    setSelectedBean(id);
  }

  function updateBean(id, patch) {
    setState((s) => ({ ...s, beans: s.beans.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  }

  function removeBean(id) {
    setState((s) => {
      const beans = s.beans.filter((b) => b.id !== id);
      const players = s.players.map((p) => {
        const { [id]: _, ...rest } = p.counts;
        return { ...p, counts: rest };
      });
      // pick another selected bean
      if (selectedBean === id) setSelectedBean(beans[0]?.id || null);
      return { ...s, beans, players };
    });
  }

  /* ---------- Summary Chart modal ---------- */
  const [chartOpen, setChartOpen] = React.useState(false);
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  React.useEffect(() => {
    if (!chartOpen) return;
    // Build totals per player
    const labels = players.map((p) => p.name || "Player");
    const totalsData = players.map((p) => Object.values(p.counts).reduce((a, b) => a + b, 0));
    const ctx = chartRef.current.getContext("2d");
    // Destroy old
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Total Beans",
          data: totalsData,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  }, [chartOpen, players]);

  /* ---------- Resizer Handlers ---------- */
  function onDown(e) {
    if (window.innerWidth < 1024) return; // desktop only
    dragging.current = true;
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging.current) return;
    const containerLeft = (document.body.clientWidth - Math.min(document.body.clientWidth, 1152)) / 2; // approx center for max-w-6xl
    const newW = Math.max(240, Math.min(560, e.clientX - containerLeft - 16)); // clamp + padding guess
    setLeftWidth(newW);
  }
  function onUp() { dragging.current = false; }

  React.useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <MasonJarSVG />
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Mason Jar Bean Tally</h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Select a bean, then click a jar — shift-click to remove. Add players and customize beans.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Reset all</button>
            <button onClick={exportJSON} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Export</button>
            <label className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm cursor-pointer">
              Import
              <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
            </label>
          </div>
        </div>
      </header>

      {/* Resizable two-column layout on lg+, stacked on mobile */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <div className="lg:flex lg:gap-2">
          {/* Left panel */}
          <section
            ref={leftRef}
            style={{ width: window.innerWidth >= 1024 ? leftWidth + "px" : "100%" }}
            className="lg:shrink-0"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Bean palette</h2>
                <button onClick={() => setBeansOpen(true)} className="text-xs px-2 py-1 rounded-lg bg-slate-900 text-white shadow hover:opacity-90">
                  Customize
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {beans.map((b) => (
                  <Chip key={b.id} active={selectedBean === b.id} onClick={() => setSelectedBean(b.id)}>
                    <BeanIcon hex={b.hex} />
                    <span>{b.name}</span>
                  </Chip>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">Tip: Select a bean, then click any jar. Shift-click a jar to remove.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Leaderboard</h2>
                <button onClick={() => setChartOpen(true)} className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
                  Summary chart
                </button>
              </div>
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

          {/* Resizer handle (desktop only) */}
          <div
            className="hidden lg:block w-1 relative cursor-col-resize select-none"
            onMouseDown={onDown}
            title="Drag to resize leaderboard panel"
          >
            <div className="absolute inset-y-0 left-0 right-0 mx-auto w-px bg-slate-300"></div>
          </div>

          {/* Right panel: jars */}
          <section className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New player name"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white shadow-inner"
                onKeyDown={(e) => { if (e.key === 'Enter') { addPlayer(newName); } }}
              />
              <button onClick={() => addPlayer(newName)} className="px-3 py-2 rounded-xl bg-slate-900 text-white shadow hover:opacity-90">Add jar</button>
              <div className="sm:hidden ml-auto flex items-center gap-2">
                <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm text-sm">Reset</button>
                <button onClick={exportJSON} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm text-sm">Export</button>
                <label className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm cursor-pointer text-sm">
                  Import
                  <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
                </label>
              </div>
            </div>

            {players.length === 0 && (
              <div className="p-6 text-center text-slate-600 bg-white border border-dashed rounded-2xl">No jars yet. Add one above.</div>
            )}

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {players.map((p) => {
                const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
                const isSelected = selectedPlayerId === p.id;

                // Try Motion for entry animation
                const Motion = window["framer-motion"]?.motion;
                const Card = ({ children }) => (
                  <div
                    className={"group relative bg-white border rounded-2xl p-4 shadow-sm transition " + (isSelected ? "border-slate-900" : "border-slate-200")}
                    onClick={(e) => {
                      if (e.target instanceof HTMLElement && e.target.closest('button,input,svg,path,label')) return;
                      const delta = e.shiftKey ? -1 : 1;
                      if (selectedBean) changeCount(p.id, selectedBean, delta);
                      setSelectedPlayerId(p.id);
                    }}
                  >
                    {children}
                    {isSelected && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs bg-slate-900 text-white rounded-full shadow">Selected</span>
                    )}
                  </div>
                );

                return Motion ? (
                  <Motion.div key={p.id} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
                    <Card>
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
                            {beans.map((b) => (
                              <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                                <div className="flex items-center gap-2">
                                  <BeanIcon hex={b.hex} />
                                  <span className="text-sm">{b.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => changeCount(p.id, b.id, -1)} className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">−</button>
                                  <span className="w-8 text-center font-mono tabular-nums">{p.counts[b.id] || 0}</span>
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
                    </Card>
                  </Motion.div>
                ) : (
                  <div key={p.id}>
                    <Card>
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
                            {beans.map((b) => (
                              <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                                <div className="flex items-center gap-2">
                                  <BeanIcon hex={b.hex} />
                                  <span className="text-sm">{b.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => changeCount(p.id, b.id, -1)} className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">−</button>
                                  <span className="w-8 text-center font-mono tabular-nums">{p.counts[b.id] || 0}</span>
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
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-center text-xs text-slate-500">
        <p>Data saves locally in your browser. No account needed.</p>
      </footer>

      {/* Beans Customize Modal */}
      <Modal
        open={beansOpen}
        onClose={() => setBeansOpen(false)}
        title="Customize Beans"
        actions={
          <>
            <button onClick={() => setBeansOpen(false)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">Close</button>
            <button onClick={addBean} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Add bean</button>
          </>
        }
      >
        <div className="space-y-2">
          {beans.map((b) => (
            <div key={b.id} className="flex items-center gap-2 border border-slate-200 rounded-xl p-2">
              <div className="w-8 h-8 rounded-full border" style={{ background: b.hex }}></div>
              <input
                value={b.name}
                onChange={(e) => updateBean(b.id, { name: e.target.value })}
                className="flex-1 px-2 py-1 rounded-lg border border-slate-300"
              />
              <input
                type="color"
                value={b.hex}
                onChange={(e) => updateBean(b.id, { hex: e.target.value })}
                className="w-10 h-9 p-0 border rounded-lg"
                title="Pick color"
              />
              <button onClick={() => removeBean(b.id)} className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50">Remove</button>
            </div>
          ))}
          {beans.length === 0 && <div className="text-sm text-slate-600">No beans yet. Click “Add bean”.</div>}
          <p className="text-xs text-slate-500">Changes save automatically. Removing a bean also removes its counts from all players.</p>
        </div>
      </Modal>

      {/* Chart Modal */}
      <Modal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        title="Scoring Summary"
        actions={<button onClick={() => setChartOpen(false)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">Close</button>}
      >
        <canvas ref={chartRef} height="200"></canvas>
      </Modal>
    </div>
  );
}

/* ------------------------------- Mount App ------------------------------- */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
