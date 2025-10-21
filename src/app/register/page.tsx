'use client'
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseclient";

type UserInfo = {
  name: string;
  email: string;
  phone: string;
};

type TheatreInfo = {
  theatreName: string;
  address: string;
  city: string;
  state: string;
  totalScreens: string;
};

type ProofInfo = {
  gstNumber: string;
};

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [user, setUser] = useState<UserInfo>({ name: '', email: '', phone: '' });
  const [theatre, setTheatre] = useState<TheatreInfo>({ theatreName: '', address: '', city: '', state: '', totalScreens: '' });
  const [proof, setProof] = useState<ProofInfo>({ gstNumber: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from('users')
        .select('name, mail')
        .eq('id', uid)
        .maybeSingle();
      if (error) return;
      setUser((prev) => ({
        ...prev,
        name: (data?.name as string) || prev.name,
        email: (data?.mail as string) || prev.email,
      }));
    }
    loadProfile();
  }, []);

  function canProceedFromStep1() {
    return user.name && user.email && user.phone;
  }

  function canProceedFromStep2() {
    return theatre.theatreName && theatre.address && theatre.city && theatre.state && theatre.totalScreens;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          mail: user.email,
          phone_number: user.phone,
          theatre_name: theatre.theatreName,
          address: theatre.address,
          city: theatre.city,
          state: theatre.state,
          total_screens: Number(theatre.totalScreens),
          gst_number: proof.gstNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit');
      setMessage('Request submitted successfully.');
      setStep(1);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8 sm:p-12">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Register your theatre</h1>
        <p className="mt-1 text-sm text-neutral-400">3 quick steps to get started</p>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
          <div className={`rounded-md px-2 py-2 ${step === 1 ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}>1. Account</div>
          <div className={`rounded-md px-2 py-2 ${step === 2 ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}>2. Theatre</div>
          <div className={`rounded-md px-2 py-2 ${step === 3 ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}>3. Proof</div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {step === 1 && (
            <section className="space-y-4">
              <Field label="Name">
                <input
                  name="name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  autoComplete="name"
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Phone number">
                <input
                  name="phone"
                  type="tel"
                  value={user.phone}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  placeholder="99999 99999"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  autoComplete="tel"
                  required
                />
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <Field label="Theatre name">
                <input
                  name="theatreName"
                  type="text"
                  value={theatre.theatreName}
                  onChange={(e) => setTheatre({ ...theatre, theatreName: e.target.value })}
                  placeholder="e.g., Grand Plaza Cinemas"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  required
                />
              </Field>
              <Field label="Address">
                <input
                  name="address"
                  type="text"
                  value={theatre.address}
                  onChange={(e) => setTheatre({ ...theatre, address: e.target.value })}
                  placeholder="Street, Area"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    name="city"
                    type="text"
                    value={theatre.city}
                    onChange={(e) => setTheatre({ ...theatre, city: e.target.value })}
                    placeholder="City"
                    className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                    required
                  />
                </Field>
                <Field label="State">
                  <input
                    name="state"
                    type="text"
                    value={theatre.state}
                    onChange={(e) => setTheatre({ ...theatre, state: e.target.value })}
                    placeholder="State"
                    className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                    required
                  />
                </Field>
              </div>
              <Field label="Total screens">
                <input
                  name="totalScreens"
                  type="number"
                  min={1}
                  value={theatre.totalScreens}
                  onChange={(e) => setTheatre({ ...theatre, totalScreens: e.target.value })}
                  placeholder="e.g., 3"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  required
                />
              </Field>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <Field label="GST number">
                <input
                  name="gstNumber"
                  type="text"
                  value={proof.gstNumber}
                  onChange={(e) => setProof({ ...proof, gstNumber: e.target.value })}
                  placeholder="GSTIN"
                  className="w-full rounded-md border border-transparent bg-neutral-900 px-3 py-2 text-sm placeholder-neutral-500 outline-none focus:border-neutral-700"
                  required
                />
              </Field>
            </section>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
              className="rounded-md bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
              disabled={step === 1}
            >
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !canProceedFromStep1()) return;
                  if (step === 2 && !canProceedFromStep2()) return;
                  setStep((s) => ((s + 1) as 1 | 2 | 3));
                }}
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
              >
                Next
              </button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {error && <p className="text-sm text-red-400">{error}</p>}
                {message && <p className="text-sm text-green-400">{message}</p>}
                <button type="submit" disabled={loading} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50">
                  {loading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-300">{label}</span>
      {children}
    </label>
  );
}


