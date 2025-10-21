'use client'
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseclient";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

type TabKey =
  | 'overview'
  | 'movies'
  | 'screens'
  | 'bookings'
  | 'revenue'
  | 'feedback'
  | 'notifications'
  | 'settings'
  | 'support';

type Screen = {
  id: number;
  screen_number: number;
  total_rows: number;
  total_columns: number;
  removed: Set<string>;
  history: string[];
};

type Show = {
  id: number;
  theatre_id: string;
  screen_id: number;
  movie_name: string;
  language: string | null;
  show_date: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  available_seats: number;
  created_at: string;
  screens: {
    screen_number: number;
  };
};

export default function ManagementDashboardPage() {
  const [active, setActive] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const token = currentSession?.access_token;
        if (!token) {
          router.push('/auth');
          return;
        }

        setSession(currentSession);

        const res = await fetch('/api/auth/check-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (!res.ok) throw new Error(json.error || 'Failed to check status');
        
        if (!json.approved) {
          setError('Your theatre registration is still pending approval. Please wait for admin approval.');
          return;
        }
        
        setLoading(false);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Access denied'
        setError(errorMessage);
        setLoading(false);
      }
    }
    
    checkAccess();
  }, [router]);

  const tabs: { key: TabKey; label: string }[] = useMemo(() => [
    { key: 'overview', label: 'Dashboard' },
    { key: 'movies', label: 'Movies / Shows' },
    { key: 'screens', label: 'Screens' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'feedback', label: 'Feedback' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'settings', label: 'Profile & Settings' },
    { key: 'support', label: 'Support' },
  ], []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-400">Checking access...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => router.push('/register')}
              className="rounded-md bg-white px-4 py-2 text-black"
            >
              Register Theatre
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-10 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <h1 className="text-lg font-semibold">Management Dashboard</h1>
              <nav className="hidden gap-1 md:flex">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActive(t.key)}
                    className={`rounded-md px-3 py-1.5 text-sm ${active === t.key ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
              <div className="md:hidden">
                <select
                  value={active}
                  onChange={(e) => setActive(e.target.value as TabKey)}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200"
                >
                  {tabs.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-6 py-6">
            {active === 'overview' && <Overview />}
            {active === 'movies' && <MoviesShows session={session} />}
            {active === 'screens' && <ScreensSetup session={session} />}
            {active === 'bookings' && <Bookings />}
            {active === 'revenue' && <Revenue />}
            {active === 'feedback' && <Feedback />}
            {active === 'notifications' && <Notifications />}
            {active === 'settings' && <Settings />}
            {active === 'support' && <Support />}
          </div>
        </>
      )}
    </main>
  );
}

function Card(props: { title: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-900 bg-neutral-900 p-4 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">{props.title}</h2>
        {props.footer}
      </div>
      <div className="mt-3 text-sm text-neutral-300">
        {props.children}
      </div>
    </section>
  );
}

function Grid(props: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{props.children}</div>;
}

// 1) Overview
function Overview() {
  return (
    <div className="space-y-4">
      <Grid>
        <Card title="Bookings Today">
          <div className="text-2xl font-semibold">128</div>
          <div className="text-xs text-neutral-400">+12% vs yesterday</div>
        </Card>
        <Card title="Bookings This Week">
          <div className="text-2xl font-semibold">824</div>
          <div className="text-xs text-neutral-400">-3% vs last week</div>
        </Card>
        <Card title="Bookings This Month">
          <div className="text-2xl font-semibold">3,421</div>
          <div className="text-xs text-neutral-400">+8% vs last month</div>
        </Card>
      </Grid>

      <Grid>
        <Card title="Revenue Summary">
          <div className="text-2xl font-semibold">₹ 4,52,300</div>
          <div className="text-xs text-neutral-400">This month to date</div>
        </Card>
        <Card title="Currently Running Movies">
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Inception</li>
            <li>Interstellar</li>
            <li>Oppenheimer</li>
          </ul>
        </Card>
        <Card title="Upcoming Shows">
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Inception - 7:30 PM (Screen 1)</li>
            <li>Interstellar - 9:45 PM (Screen 2)</li>
          </ul>
        </Card>
      </Grid>

      <div className="flex flex-wrap gap-2">
        <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black">Add Show</button>
        <button className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Manage Seats</button>
        <button className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Add Movie</button>
      </div>
    </div>
  );
}

// 2) Movies / Shows
function MoviesShows({ session }: { session: Session | null }) {
  const [shows, setShows] = useState<Show[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState({
    screen_id: '',
    movie_name: '',
    language: '',
    show_date: '',
    start_time: '',
    duration: '', // in minutes
    ticket_price: ''
  });

  const loadShows = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const res = await fetch('/api/shows', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { shows: data } = await res.json();
        setShows(data);
      }
    } catch (e) {
      console.error('Failed to load shows:', e);
    }
  }, [session?.access_token]);

  const loadScreens = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const res = await fetch('/api/screens', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { screens: data } = await res.json();
        setScreens(data);
      }
    } catch (e) {
      console.error('Failed to load screens:', e);
    }
  }, [session?.access_token]);

  // Load shows and screens on component mount
  useEffect(() => {
    if (session) {
      loadShows();
      loadScreens();
    }
  }, [session, loadShows, loadScreens]);

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const addShow = async () => {
    if (!showForm.screen_id || !showForm.movie_name || !showForm.show_date || !showForm.start_time || !showForm.duration || !showForm.ticket_price) {
      alert('Please fill all required fields');
      return;
    }
    if (!session?.access_token) {
      alert('Session expired. Please refresh the page.');
      return;
    }
    
    setLoading(true);
    try {
      const durationMinutes = parseInt(showForm.duration);
      const endTime = calculateEndTime(showForm.start_time, durationMinutes);

      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          screen_id: showForm.screen_id,
          movie_name: showForm.movie_name,
          language: showForm.language || null,
          show_date: showForm.show_date,
          start_time: showForm.start_time,
          end_time: endTime,
          ticket_price: showForm.ticket_price,
        }),
      });

      if (res.ok) {
        const { show } = await res.json();
        setShows(prev => [...prev, show]);
        setShowForm({
          screen_id: '',
          movie_name: '',
          language: '',
          show_date: '',
          start_time: '',
          duration: '',
          ticket_price: ''
        });
      } else {
        const { error } = await res.json();
        alert(`Failed to add show: ${error}`);
      }
    } catch (e) {
      console.error('Failed to add show:', e);
      alert('Failed to add show');
    } finally {
      setLoading(false);
    }
  };

  const deleteShow = async (id: number) => {
    if (!confirm('Delete this show?')) return;
    if (!session?.access_token) {
      alert('Session expired. Please refresh the page.');
      return;
    }
    
    try {
      const res = await fetch('/api/shows', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setShows(prev => prev.filter(s => s.id !== id));
      } else {
        const { error } = await res.json();
        alert(`Failed to delete show: ${error}`);
      }
    } catch (e) {
      console.error('Failed to delete show:', e);
      alert('Failed to delete show');
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Add New Show">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Movie Name *">
            <Input 
              value={showForm.movie_name} 
              onChange={(e) => setShowForm({ ...showForm, movie_name: e.target.value })} 
              placeholder="Movie/Show title" 
            />
          </Field>
          <Field label="Language">
            <Input 
              value={showForm.language} 
              onChange={(e) => setShowForm({ ...showForm, language: e.target.value })} 
              placeholder="e.g., English" 
            />
          </Field>
          <Field label="Screen *">
            <select 
              className={inputClass}
              value={showForm.screen_id} 
              onChange={(e) => setShowForm({ ...showForm, screen_id: e.target.value })}
            >
              <option value="">Select Screen</option>
              {screens.map(screen => (
                <option key={screen.id} value={screen.id}>
                  Screen {screen.screen_number} ({screen.total_rows}x{screen.total_columns})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Show Date *">
            <Input 
              type="date" 
              value={showForm.show_date} 
              onChange={(e) => setShowForm({ ...showForm, show_date: e.target.value })} 
            />
          </Field>
          <Field label="Start Time *">
            <Input 
              type="time" 
              value={showForm.start_time} 
              onChange={(e) => setShowForm({ ...showForm, start_time: e.target.value })} 
            />
          </Field>
          <Field label="Duration (minutes) *">
            <Input 
              type="number" 
              value={showForm.duration} 
              onChange={(e) => setShowForm({ ...showForm, duration: e.target.value })} 
              placeholder="e.g., 150" 
            />
          </Field>
          <Field label="Ticket Price (₹) *">
            <Input 
              type="number" 
              value={showForm.ticket_price} 
              onChange={(e) => setShowForm({ ...showForm, ticket_price: e.target.value })} 
              placeholder="e.g., 250" 
            />
          </Field>
        </div>
        <div className="mt-3">
          <button
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
            onClick={addShow}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Show'}
          </button>
        </div>
      </Card>

      <Card title="Scheduled Shows">
        <div className="space-y-2">
          {shows.length === 0 && <div className="text-sm text-neutral-400">No shows scheduled yet.</div>}
          {shows.map(show => (
            <div key={show.id} className="flex items-center justify-between rounded-md bg-neutral-800 p-3 text-sm">
              <div>
                <div className="font-medium">{show.movie_name}</div>
                <div className="text-neutral-400">
                  Screen {show.screens.screen_number} • {show.language || 'N/A'} • ₹{show.ticket_price}
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(show.show_date).toLocaleDateString()} • {show.start_time} - {show.end_time} • {show.available_seats} seats
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded bg-neutral-700 px-2 py-1">Edit</button>
                <button className="rounded bg-red-600 px-2 py-1" onClick={() => deleteShow(show.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// 3) Screens / Theatre Setup
function ScreensSetup({ session }: { session: Session | null }) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [newScreen, setNewScreen] = useState({ screen_number: 1, rows: 10, cols: 20 });
  const [loading, setLoading] = useState(false);

  const loadScreens = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      const res = await fetch('/api/screens', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { screens: data } = await res.json();
        setScreens(data.map((s: Screen) => ({ 
          ...s, 
          removed: new Set(), 
          history: [] 
        })));
      }
    } catch (e) {
      console.error('Failed to load screens:', e);
    }
  }, [session?.access_token]);

  // Load screens on component mount
  useEffect(() => {
    if (session) {
      loadScreens();
    }
  }, [session, loadScreens]);

  const addScreen = async () => {
    if (!newScreen.screen_number || !newScreen.rows || !newScreen.cols) return;
    if (!session?.access_token) {
      alert('Session expired. Please refresh the page.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/screens', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          screen_number: newScreen.screen_number,
          total_rows: newScreen.rows,
          total_columns: newScreen.cols,
        }),
      });

      if (res.ok) {
        const { screen } = await res.json();
        setScreens(prev => [...prev, { 
          ...screen, 
          removed: new Set(), 
          history: [] 
        }]);
        setNewScreen({ screen_number: Math.max(...screens.map(s => s.screen_number), 0) + 1, rows: 10, cols: 20 });
      } else {
        const { error } = await res.json();
        alert(`Failed to add screen: ${error}`);
      }
    } catch (e) {
      console.error('Failed to add screen:', e);
      alert('Failed to add screen');
    } finally {
      setLoading(false);
    }
  };

  const deleteScreen = async (id: number) => {
    if (!confirm('Delete this screen?')) return;
    if (!session?.access_token) {
      alert('Session expired. Please refresh the page.');
      return;
    }
    
    try {
      const res = await fetch('/api/screens', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setScreens(prev => prev.filter(s => s.id !== id));
      } else {
        const { error } = await res.json();
        alert(`Failed to delete screen: ${error}`);
      }
    } catch (e) {
      console.error('Failed to delete screen:', e);
      alert('Failed to delete screen');
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Add / Edit Screen">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Screen Number">
            <Input 
              type="number" 
              value={newScreen.screen_number} 
              onChange={(e) => setNewScreen({ ...newScreen, screen_number: Number(e.target.value) })} 
              placeholder="1" 
            />
          </Field>
          <Field label="Rows">
            <Input type="number" value={newScreen.rows} onChange={(e) => setNewScreen({ ...newScreen, rows: Number(e.target.value) })} />
          </Field>
          <Field label="Columns">
            <Input type="number" value={newScreen.cols} onChange={(e) => setNewScreen({ ...newScreen, cols: Number(e.target.value) })} />
          </Field>
          <div className="flex items-end">
            <button
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
              onClick={addScreen}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Screen'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Define Seat Layout (preview)">
        {screens.length === 0 && <div className="text-sm text-neutral-400">No screens yet. Add one above.</div>}
        <div className="space-y-4">
          {screens.map(s => (
            <div key={s.id} className="rounded-md bg-neutral-800 p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <div className="font-medium">Screen {s.screen_number}</div>
                <div className="flex items-center gap-2 text-neutral-400">
                  <span>{s.total_rows} x {s.total_columns}</span>
                  <button
                    className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200"
                    onClick={() => setScreens(prev => prev.map(x => x.id === s.id ? { ...x, removed: new Set(), history: [] } : x))}
                  >
                    Reset
                  </button>
                  <button
                    className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200 disabled:opacity-50"
                    disabled={s.history.length === 0}
                    onClick={() => setScreens(prev => prev.map(x => {
                      if (x.id !== s.id) return x;
                      const history = [...x.history];
                      const last = history.pop();
                      if (!last) return x;
                      const removed = new Set(x.removed);
                      removed.delete(last);
                      return { ...x, removed, history };
                    }))}
                  >
                    Undo
                  </button>
                  <button
                    className="rounded bg-red-600 px-2 py-1 text-xs text-neutral-200"
                    onClick={() => deleteScreen(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="overflow-auto rounded border border-neutral-700">
                <div className="inline-block bg-neutral-900 p-2">
                  {Array.from({ length: s.total_rows }).map((_, r) => (
                    <div key={r} className="flex">
                      {Array.from({ length: s.total_columns }).map((_, c) => (
                        <Seat
                          key={c}
                          removed={s.removed.has(`${r}-${c}`)}
                          onRemove={() => setScreens(prev => prev.map(x => {
                            if (x.id !== s.id) return x;
                            const id = `${r}-${c}`;
                            if (x.removed.has(id)) return x;
                            const removed = new Set(x.removed);
                            removed.add(id);
                            const history = [...x.history, id];
                            return { ...x, removed, history };
                          }))}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Seat({ removed, onRemove }: { removed: boolean; onRemove: () => void }) {
  return (
    <button
      type="button"
      className={`m-0.5 h-4 w-4 rounded-sm ${removed ? 'bg-transparent' : 'bg-neutral-700'} relative group`}
      onClick={onRemove}
      title={removed ? 'Removed' : 'Remove seat'}
    >
      {!removed && (
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center text-[10px] text-white group-hover:flex">×</span>
      )}
    </button>
  );
}

// 4) Bookings
function Bookings() {
  const rows = [
    { show: 'Inception (7:30 PM)', customer: 'A. Sharma', seats: 'A1, A2', amount: 500, status: 'Confirmed' },
    { show: 'Interstellar (9:45 PM)', customer: 'R. Iyer', seats: 'B5, B6, B7', amount: 750, status: 'Pending' },
  ];

  function exportCSV() {
    const header = ['Show', 'Customer', 'Seats', 'Amount', 'Status'];
    const data = rows.map(r => [r.show, r.customer, r.seats, r.amount.toString(), r.status]);
    const csv = [header, ...data].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bookings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card title="Bookings">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-800 text-neutral-300">
              <tr>
                <th className="px-3 py-2">Show</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Seats</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i === 0 ? 'border-b border-neutral-800' : ''}>
                  <td className="px-3 py-2">{r.show}</td>
                  <td className="px-3 py-2">{r.customer}</td>
                  <td className="px-3 py-2">{r.seats}</td>
                  <td className="px-3 py-2">₹ {r.amount}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportCSV} className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Export CSV</button>
        <button className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200" disabled>Export PDF</button>
      </div>
    </div>
  );
}

// 5) Revenue / Analytics
function Revenue() {
  return (
    <div className="space-y-4">
      <Card title="Key Metrics">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total revenue" value="₹ 12,43,500" />
          <Stat label="Occupancy rate" value="72%" />
          <Stat label="Shows this month" value="138" />
          <Stat label="Avg. ticket price" value="₹ 240" />
        </div>
      </Card>
      <Card title="Trends (placeholder)">
        <div className="h-48 rounded bg-neutral-800" />
      </Card>
      <Card title="Top shows (placeholder)">
        <div className="h-48 rounded bg-neutral-800" />
      </Card>
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-neutral-800 p-3">
      <div className="text-xs text-neutral-400">{props.label}</div>
      <div className="text-lg font-semibold">{props.value}</div>
    </div>
  );
}

// 6) Feedback / Ratings
function Feedback() {
  return (
    <div className="space-y-4">
      <Card title="Recent Reviews">
        <ul className="space-y-3 text-sm">
          <li className="rounded-md bg-neutral-800 p-3">
            <div className="font-medium">Inception</div>
            <div className="text-neutral-300">“Amazing experience, great sound!”</div>
            <div className="text-xs text-neutral-500">4.5/5</div>
          </li>
          <li className="rounded-md bg-neutral-800 p-3">
            <div className="font-medium">Interstellar</div>
            <div className="text-neutral-300">“Loved the visuals, seating could improve.”</div>
            <div className="text-xs text-neutral-500">4.0/5</div>
          </li>
        </ul>
      </Card>
    </div>
  );
}

// 7) Notifications
function Notifications() {
  return (
    <div className="space-y-4">
      <Card title="Announcements">
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>Maintenance scheduled for Screen 2 on Friday.</li>
          <li>Payment gateway downtime 2–3 AM tonight.</li>
        </ul>
      </Card>
      <Card title="Alerts">
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>Show 8:00 PM nearing full capacity.</li>
          <li>Refund requested for booking #A1234.</li>
        </ul>
      </Card>
    </div>
  );
}

// 8) Profile & Settings
function Settings() {
  const [theatre, setTheatre] = useState({ name: '', address: '', contact: '' });
  const [bank, setBank] = useState({ accountName: '', accountNumber: '', ifsc: '' });

  return (
    <div className="space-y-4">
      <Card title="Theatre Info">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Name"><input className="input" value={theatre.name} onChange={(e) => setTheatre({ ...theatre, name: e.target.value })} /></Field>
          <Field label="Address"><input className="input" value={theatre.address} onChange={(e) => setTheatre({ ...theatre, address: e.target.value })} /></Field>
          <Field label="Contact"><input className="input" value={theatre.contact} onChange={(e) => setTheatre({ ...theatre, contact: e.target.value })} /></Field>
        </div>
        <div className="mt-3">
          <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black">Save</button>
        </div>
      </Card>
      <Card title="Payment Details / Bank Info">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Account name"><input className="input" value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} /></Field>
          <Field label="Account number"><input className="input" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} /></Field>
          <Field label="IFSC"><input className="input" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} /></Field>
        </div>
        <div className="mt-3">
          <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black">Save</button>
        </div>
      </Card>
      <Card title="Security">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="New password"><input className="input" type="password" placeholder="••••••••" /></Field>
          <Field label="Confirm password"><input className="input" type="password" placeholder="••••••••" /></Field>
          <div className="flex items-end">
            <button className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Update Password</button>
          </div>
        </div>
      </Card>
      <Card title="API Keys">
        <div className="flex items-center gap-2">
          <input className="input" placeholder="Generate to view" readOnly value="" />
          <button className="rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200">Generate</button>
        </div>
      </Card>
    </div>
  );
}

// 9) Support / Help
function Support() {
  return (
    <div className="space-y-4">
      <Card title="Raise a support ticket">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Subject"><input className="input" placeholder="Issue summary" /></Field>
          <div className="md:col-span-2">
            <Field label="Details"><textarea className="input min-h-28" placeholder="Describe the issue" /></Field>
          </div>
        </div>
        <div className="mt-3">
          <button className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black">Submit Ticket</button>
        </div>
      </Card>
      <Card title="FAQs">
        <ul className="list-inside list-disc space-y-1 text-sm">
          <li>How to add a new show?</li>
          <li>How to configure seat layout?</li>
          <li>How to process refunds?</li>
        </ul>
      </Card>
      <Card title="Contact admin portal">
        <div className="text-sm text-neutral-300">Email: admin@theatre.example</div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={`${inputClass} ${className || ''}`} {...rest} />;
}


