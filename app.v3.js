// Mason Jar Bean Tally - v3 cache-busted build
// Includes: 3D tally jar + no-overlap controls + visible version badge.
//
// NOTE: file name must be app.v3.js to match index.html

const DEFAULT_BEANS = [
  { id: "black",    name: "Black",    hex: "#2b2b2b" },
  { id: "pinto",    name: "Pinto",    hex: "#a06a4a" },
  { id: "garbanzo", name: "Garbanzo", hex: "#d6b26e" },
  { id: "lima",     name: "Lima",     hex: "#9fd46b" },
  { id: "kidney",   name: "Kidney",   hex: "#7a1c26" },
  { id: "navy",     name: "Navy",     hex: "#f3ede2" },
];
const DEFAULT_PLAYERS = ["Player 1", "Player 2"];
const STORAGE_KEY = "mason-jar-bean-tally-v3";

function BeanIcon({ hex }) {
  return (
    <svg viewBox="0 0 64 48" className="w-5 h-5 shrink-0">
      <defs>
        <linearGradient id={"g" + hex} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={hex} />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path d="M49 7c-4-4-12-4-18 0-6 4-7 10-14 12-6 2-10 7-9 12 1 6 7 10 17 10 9 0 19-4 24-10 6-7 4-17 0-24z"
        fill={"url(#g" + hex + ")"} stroke="#111827" strokeWidth="1.2" className="drop-shadow-sm" />
    </svg>
  );
}

function Jar3D({ level = 0, label = "" }) {
  const lvl = Math.max(0, Math.min(1, level));
  const fillTop = 120 - lvl * 84;
  return (
    <svg viewBox="0 0 128 180" className="w-16 h-[88px] md:w-20 md:h-[110px] drop-shadow-sm" aria-label={label}>
      <defs>
        <linearGradient id="glassGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id="jarCavity">
          <rect x="24" y="44" width="80" height="100" rx="12" />
        </clipPath>
        <linearGradient id="beanFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c28e6b" />
          <stop offset="100%" stopColor="#6b3f2a" />
        </linearGradient>
        <linearGradient id="rim" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#b0b8c6" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <rect x="28" y="6" width="72" height="18" rx="4" fill="url(#rim)" />
      <rect x="24" y="24" width="80" height="12" rx="6" fill="#cbd5e1" />
      <rect x="16" y="36" width="96" height="120" rx="18" fill="url(#glassGrad)" stroke="#94a3b8" strokeWidth="3" />
      <rect x="22" y="42" width="84" height="108" rx="14" fill="white" opacity="0.35" />
      <g clipPath="url(#jarCavity)">
        <rect x="24" y={fillTop} width="80" height={140 - fillTop} fill="url(#beanFill)" />
        <rect x="24" y={fillTop} width="80" height="3" fill="white" opacity="0.45" />
      </g>
      <path d="M26 48 c0 0 18 -6 26 -6 s26 6 26 6 v86 c-12 10 -52 10 -52 0 z" fill="white" opacity="0.15" />
      <ellipse cx="64" cy="170" rx="40" ry="6" fill="#000" opacity="0.08" />
    </svg>
  );
}

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

function uid() { return Math.random().toString(36).slice(2, 10); }
function newPlayer(name, beans) {
  const counts = Object.fromEntries(beans.map((b) => [b.id, 0]));
  return { id: uid(), name, counts };
}

function App() {
  const [state, setState] = React.useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    const beans = DEFAULT_BEANS;
    const players = DEFAULT_PLAYERS.map((n) => newPlayer(n, beans));
    return { beans, players };
  });
  const beans = state.beans, players = state.players;
  const [selectedBean, setSelectedBean] = React.useState(beans[0]?.id || null);
  const [newName, setNewName] = React.useState("");

  React.useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const totals = React.useMemo(() => players.map(p => ({
    id: p.id, name: p.name, total: Object.values(p.counts).reduce((a,b)=>a+b,0)
  })), [players]);
  const maxTotal = Math.max(1, ...totals.map(t=>t.total));

  function addPlayer(name) {
    const n = (name || "").trim() || `Player ${players.length + 1}`;
    setState(s => ({ ...s, players: [...s.players, newPlayer(n, s.beans)] }));
    setNewName("");
  }
  function removePlayer(id) {
    setState(s => ({ ...s, players: s.players.filter(p=>p.id!==id) }));
  }
  function renamePlayer(id, name) {
    setState(s => ({ ...s, players: s.players.map(p => p.id===id ? { ...p, name } : p) }));
  }
  function changeCount(id, beanId, delta) {
    setState(s => ({
      ...s,
      players: s.players.map(p => p.id===id
        ? { ...p, counts: { ...p.counts, [beanId]: Math.max(0, (p.counts[beanId]||0) + delta) } }
        : p)
    }));
  }
  function resetPlayer(id) {
    setState(s => ({
      ...s,
      players: s.players.map(p => p.id===id ? { ...p, counts: Object.fromEntries(s.beans.map(b=>[b.id,0])) } : p)
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-slate-50/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <Jar3D level={0.2} />
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Mason Jar Bean Tally <span className="align-middle text-xs font-normal px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">v3</span></h1>
            <p className="text-xs sm:text-sm text-slate-600">Select a bean, then click a jar — shift-click to remove.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => {
              if (!confirm('Reset all jars?')) return;
              setState(s => ({ ...s, players: s.players.map(p => ({...p, counts: Object.fromEntries(s.beans.map(b=>[b.id,0]))})) }));
            }} className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 shadow-sm">Reset all</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <div className="grid sm:grid-cols-1 lg:grid-cols-[minmax(260px,360px)_1fr] gap-3">
          <section>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h2 className="font-semibold mb-3">Bean palette</h2>
              <div className="flex flex-wrap gap-2">
                {beans.map((b) => (
                  <Chip key={b.id} active={selectedBean === b.id} onClick={() => setSelectedBean(b.id)}>
                    <BeanIcon hex={b.hex} />
                    <span>{b.name}</span>
                  </Chip>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-3">
              <h2 className="font-semibold mb-2">Leaderboard</h2>
              <ol className="space-y-2">
                {players.map((p) => {
                  const total = Object.values(p.counts).reduce((a,b)=>a+b,0);
                  const level = total / maxTotal;
                  return (
                    <li key={p.id} className="flex items-center gap-3">
                      <Jar3D level={level} label={p.name + ' total jar'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="font-semibold tabular-nums">{total}</span>
                        </div>
                        <div className="h-1.5 rounded bg-slate-100 mt-2">
                          <div className="h-full rounded bg-slate-400" style={{ width: `${Math.max(3, level*100)}%` }}></div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

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

            {/* Prevent +/- overlap with stacked rows on small screens */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-2 gap-3">
              {players.map((p) => {
                const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
                return (
                  <div key={p.id} className="group relative bg-white border rounded-2xl p-4 shadow-sm border-slate-200">
                    <div className="flex items-start gap-3">
                      <Jar3D level={total/Math.max(1,maxTotal)} label={p.name + ' card jar'} />
                      <div className="flex-1 min-w-0">
                        <input
                          value={p.name}
                          onChange={(e) => renamePlayer(p.id, e.target.value)}
                          className="w-full text-lg font-semibold bg-transparent outline-none border-b border-transparent focus:border-slate-300"
                        />
                        <div className="text-sm text-slate-600">Total: <span className="font-semibold tabular-nums">{total}</span></div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {state.beans.map((b) => (
                            <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <BeanIcon hex={b.hex} />
                                <span className="text-sm truncate">{b.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => changeCount(p.id, b.id, -1)} className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">−</button>
                                <span className="w-10 text-center font-mono tabular-nums">{p.counts[b.id] || 0}</span>
                                <button onClick={() => changeCount(p.id, b.id, 1)} className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100">+</button>
                              </div>
                            </div>
                          ))}
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
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
