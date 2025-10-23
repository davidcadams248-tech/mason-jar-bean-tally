// Mason Jar Bean Tally - v7
// Changes from v6:
// 1) Jar volume shows % of the SELECTED BEAN within each player's jar (share of that color among that player's total).
//    If no bean is selected or player has 0 beans, level is 0. (You can change this to capacity-based easily.)
// 2) Reset/Remove stacked vertically under the jar to save space.
// 3) Tighter layout: smaller jar on cards, compact bean rows, tighter fonts/padding to fit better.
//
// Still includes: custom beans editor, summary chart, per-player jar color, click-jar to add selected bean, 50-bean capacity used only in header hint.

const JAR_MAX_BEANS = 50; // informational

/* ---------------------------- Defaults & Storage ---------------------------- */
const DEFAULT_BEANS = [
  { id: "black",    name: "Black",    hex: "#2b2b2b" },
  { id: "pinto",    name: "Pinto",    hex: "#a06a4a" },
  { id: "garbanzo", name: "Garbanzo", hex: "#d6b26e" },
  { id: "lima",     name: "Lima",     hex: "#9fd46b" },
  { id: "kidney",   name: "Kidney",   hex: "#7a1c26" },
  { id: "navy",     name: "Navy",     hex: "#f3ede2" },
];
const DEFAULT_PLAYERS = ["Player 1", "Player 2"];
const STORAGE_KEY = "mason-jar-bean-tally-v7";

/* ---------------------------------- Helpers -------------------------------- */
function uid() { return Math.random().toString(36).slice(2, 10); }
function hexToRGB(hex) {
  const s = hex.replace('#','');
  const v = s.length === 3 ? s.split('').map(c=>c+c).join('') : s;
  const n = parseInt(v, 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}
function contrastColor(hex) {
  try {
    const {r,g,b} = hexToRGB(hex);
    const L = (0.299*r + 0.587*g + 0.114*b)/255;
    return L > 0.6 ? '#111827' : '#ffffff';
  } catch { return '#111827'; }
}
function newPlayer(name, beans) {
  const counts = Object.fromEntries(beans.map((b) => [b.id, 0]));
  return { id: uid(), name, counts, jarColor: "#dbeafe" }; // default tint
}

/* ---------------------------------- SVGs ---------------------------------- */
function BeanIcon({ hex, className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 64 48" className={`shrink-0 ${className}`}>
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
        strokeWidth="1"
      />
    </svg>
  );
}

/** Jar3D: 3D-style glass jar with fill level (0..1) and tint color */
function Jar3D({ level = 0, label = "", tint = "#dbeafe", onClick, size = "md" }) {
  const lvl = Math.max(0, Math.min(1, level));
  const fillTop = 120 - lvl * 84;
  const cls = size === "sm" ? "w-14 h-[78px]" : "w-16 h-[88px] md:w-20 md:h-[110px]";
  return (
    <button
      onClick={onClick}
      title="Click to drop selected bean"
      className="focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-xl"
      style={{ lineHeight: 0 }}
    >
      <svg viewBox="0 0 128 180" className={`drop-shadow-sm ${cls}`} aria-label={label}>
        <defs>
          <linearGradient id={"glassGrad"+tint} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor={tint} stopOpacity="0.9" />
          </linearGradient>
          <clipPath id={"jarCavity"+tint}>
            <rect x="24" y="44" width="80" height="100" rx="12" />
          </clipPath>
          <linearGradient id={"beanFill"+tint} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c28e6b" />
            <stop offset="100%" stopColor="#6b3f2a" />
          </linearGradient>
          <linearGradient id={"rim"+tint} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#b0b8c6" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>
        </defs>
        <rect x="28" y="6" width="72" height="18" rx="4" fill={"url(#rim"+tint+")"} />
        <rect x="24" y="24" width="80" height="12" rx="6" fill="#cbd5e1" />
        <rect x="16" y="36" width="96" height="120" rx="18" fill={"url(#glassGrad"+tint+")"} stroke="#94a3b8" strokeWidth="3" />
        <rect x="22" y="42" width="84" height="108" rx="14" fill="white" opacity="0.35" />
        <g clipPath={"url(#jarCavity"+tint+")"}>
          <rect x="24" y={fillTop} width="80" height={140 - fillTop} fill={"url(#beanFill"+tint+")"} />
          <rect x="24" y={fillTop} width="80" height="3" fill="white" opacity="0.45" />
        </g>
        <path d="M26 48 c0 0 18 -6 26 -6 s26 6 26 6 v86 c-12 10 -52 10 -52 0 z" fill="white" opacity="0.15" />
        <ellipse cx="64" cy="170" rx="40" ry="6" fill="#000" opacity="0.08" />
      </svg>
    </button>
  );
}

/* ---------------------------- Reusable Components ---------------------------- */
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={(active ? "bg-slate-900 text-white border-slate-900 " : "bg-white border-slate-200 ") +
                 "px-3 py-1 rounded-full border text-sm flex items-center gap-2 transition shadow-sm hover:shadow"}
    >
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 font-semibold">{title}</div>
        <div className="p-5">{children}</div>
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

/* ---------------------------------- App ---------------------------------- */
function App() {
  // Load state
  const [state, setState] = React.useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    const beans = DEFAULT_BEANS;
    const players = DEFAULT_PLAYERS.map((n) => newPlayer(n, beans));
    return { beans, players };
  });
  const beans = state.beans;
  const players = state.players;

  const [selectedBean, setSelectedBean] = React.useState(state.beans?.[0]?.id || null);
  const [newName, setNewName] = React.useState("");
  const [beansOpen, setBeansOpen] = React.useState(false);
  const [chartOpen, setChartOpen] = React.useState(false);

  React.useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  // Totals & levels
  function totalFor(p) { return Object.values(p.counts).reduce((a,b)=>a+b,0); }
  function levelFor(p) {
    const total = totalFor(p);
    if (!selectedBean || total === 0) return 0;
    const beanCount = p.counts[selectedBean] || 0;
    return Math.max(0, Math.min(1, beanCount / total)); // % share of selected bean
  }

  /* ---------- Player actions ---------- */
  function addPlayer(name) {
    const n = (name || "").trim() || `Player ${players.length + 1}`;
    setState((s) => ({ ...s, players: [...s.players, newPlayer(n, s.beans)] }));
    setNewName("");
  }
  function removePlayer(id) {
    setState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) }));
  }
  function renamePlayer(id, name) {
    setState((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, name } : p)) }));
  }
  function setPlayerColor(id, color) {
    setState((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, jarColor: color } : p)) }));
  }
  function changeCount(id, beanId, delta) {
    if (!beanId) return;
    setState((s) => ({
      ...s,
      players: s.players.map((p) =>
        p.id === id ? { ...p, counts: { ...p.counts, [beanId]: Math.max(0, (p.counts[beanId] || 0) + delta) } } : p
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

  /* ---------- Beans editor ---------- */
  function addBean() {
    const id = uid();
    const bean = { id, name: "New Bean", hex: "#888888" };
    setState((s) => {
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
        const { [id]: _removed, ...rest } = p.counts;
        return { ...p, counts: rest };
      });
      if (selectedBean === id) setSelectedBean(beans[0]?.id || null);
      return { ...s, beans, players };
    });
  }

  /* ---------- Chart modal ---------- */
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);
  React.useEffect(() => {
    if (!chartOpen) return;
    const labels = players.map((p) => p.name || "Player");
    const totalsData = players.map((p) => totalFor(p));
    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ label: "Total Beans", data: totalsData }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
    });
  }, [chartOpen, players]);

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Jar3D level={0.2} tint="#dbeafe" />
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">
              Mason Jar Bean Tally <span className="align-middle text-xs font-normal px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">v7</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">Pick a bean, then click jars to drop it • Jar fill shows each jar’s % of that bean.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Reset all</button>
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = `bean-tally-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
            }} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Export</button>
            <label className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm cursor-pointer">
              Import
              <input type="file" accept="application/json" className="hidden" onChange={(e) => {
                const file = e.target.files && e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = () => { try {
                  const data = JSON.parse(reader.result);
                  if (Array.isArray(data.players) && Array.isArray(data.beans)) setState(data);
                  else alert("Invalid file (missing players/beans).");
                } catch { alert("Couldn't read file"); } };
                reader.readAsText(file);
              }} />
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <div className="grid sm:grid-cols-1 lg:grid-cols-[minmax(250px,320px)_1fr] gap-3">
          {/* Left: Palette + Leaderboard */}
          <section>
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
                    <BeanIcon hex={b.hex} className="w-3.5 h-3.5" />
                    <span className="text-sm">{b.name}</span>
                  </Chip>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Leaderboard</h2>
                <button onClick={() => setChartOpen(true)} className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
                  Summary chart
                </button>
              </div>
              <ol className="space-y-2">
                {players.map((p) => {
                  const total = totalFor(p);
                  const level = levelFor(p);
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <Jar3D
                        level={level}
                        tint={p.jarColor || "#dbeafe"}
                        label={p.name + ' total jar'}
                        onClick={() => selectedBean && changeCount(p.id, selectedBean, 1)}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="font-semibold tabular-nums">{total}</span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-100 mt-2">
                          <div className="h-full rounded" style={{ width: `${Math.max(3, level*100)}%`, background: p.jarColor || "#64748b" }}></div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Right: Player Cards */}
          <section className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New player name"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white shadow-inner"
                onKeyDown={(e) => { if (e.key === 'Enter') addPlayer(newName); }}
              />
              <button onClick={() => addPlayer(newName)} className="px-3 py-2 rounded-xl bg-slate-900 text-white shadow hover:opacity-90">Add jar</button>
            </div>

            {players.length === 0 && (
              <div className="p-6 text-center text-slate-600 bg-white border border-dashed rounded-2xl">No jars yet. Add one above.</div>
            )}

            {/* Compact, better-fitting bean rows */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {players.map((p) => {
                const total = totalFor(p);
                const tint = p.jarColor || "#dbeafe";
                const level = levelFor(p);
                return (
                  <div key={p.id} className="group relative bg-white border rounded-2xl p-3 shadow-sm border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <Jar3D
                          level={level}
                          tint={tint}
                          label={p.name + ' card jar'}
                          onClick={() => selectedBean && changeCount(p.id, selectedBean, 1)}
                          size="sm"
                        />
                        <label className="text-[10px] text-slate-500 -mt-1">Jar color</label>
                        <input
                          type="color"
                          value={tint}
                          onChange={(e) => setPlayerColor(p.id, e.target.value)}
                          className="w-8 h-6 p-0 border rounded"
                          title="Choose jar color"
                        />
                        {/* Stacked Reset/Remove */}
                        <div className="mt-2 flex flex-col gap-1 w-full">
                          <button onClick={() => { if (confirm('Reset this jar?')) resetPlayer(p.id); }} className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-xs">Reset</button>
                          <button onClick={() => removePlayer(p.id)} className="px-2 py-1 rounded bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs">Remove</button>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <input
                          value={p.name}
                          onChange={(e) => renamePlayer(p.id, e.target.value)}
                          className="w-full text-base font-semibold bg-transparent outline-none border-b border-transparent focus:border-slate-300"
                        />
                        <div className="text-xs text-slate-600">Total: <span className="font-semibold tabular-nums">{total}</span> • <span className="text-slate-500">{Math.round(level*100)}% {selectedBean ? 'of ' + (beans.find(b=>b.id===selectedBean)?.name || 'bean') : ''}</span></div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {state.beans.map((b) => {
                            const count = p.counts[b.id] || 0;
                            const textColor = contrastColor(b.hex);
                            return (
                              <div key={b.id} className="flex items-center justify-between gap-1 rounded-xl border border-slate-200 px-2 py-1">
                                {/* Borderless tiny buttons */}
                                <button onClick={() => changeCount(p.id, b.id, -1)} className="px-2 py-0.5 rounded text-xs hover:bg-slate-50">−</button>
                                {/* Center chip with overlay count */}
                                <div className="relative flex-1 flex items-center justify-center">
                                  <div className="px-2 py-1 rounded-full" style={{ background: b.hex }}>
                                    <div className="flex items-center gap-1.5">
                                      <BeanIcon hex={b.hex} className="w-3.5 h-3.5" />
                                      <span className="text-xs truncate" style={{ color: textColor }}>{b.name}</span>
                                      <span className="w-7 text-center font-mono text-xs tabular-nums" style={{ color: textColor }}>{count}</span>
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => changeCount(p.id, b.id, 1)} className="px-2 py-0.5 rounded text-xs hover:bg-slate-50">+</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

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

      {/* Summary Chart Modal */}
      <Modal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        title="Scoring Summary"
        actions={<button onClick={() => setChartOpen(false)} className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50">Close</button>}
      >
        <canvas ref={chartRef} height="220"></canvas>
      </Modal>
    </div>
  );
}

/* ------------------------------- Mount App ------------------------------- */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
