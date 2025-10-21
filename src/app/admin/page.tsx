'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseclient'

type RequestRow = {
  id: string
  name?: string
  mail: string
  phone_number: string
  theatre_name: string
  address: string
  city: string
  state: string
  total_screens: number
  gst_number: string
  status: string
}

export default function AdminPage() {
  const [pendingRows, setPendingRows] = useState<RequestRow[]>([])
  const [oldRows, setOldRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/admin/requests', { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      const allRequests = json.requests as RequestRow[]
      setPendingRows(allRequests.filter(r => r.status === 'pending'))
      setOldRows(allRequests.filter(r => r.status === 'approved' || r.status === 'rejected'))
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Error'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAction(id: string, action: 'approve' | 'reject') {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`/api/admin/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      await load()
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Action failed'
      setError(errorMessage)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold">Admin – Requests</h1>
        <p className="mt-1 text-sm text-neutral-400">Approve or reject theatre registration requests.</p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        
        {loading ? (
          <p className="mt-6 text-sm text-neutral-400">Loading…</p>
        ) : (
          <div className="mt-6 space-y-8">
            {/* Pending Requests */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Pending Requests</h2>
              {pendingRows.length === 0 ? (
                <p className="text-sm text-neutral-400">No pending requests.</p>
              ) : (
                <div className="overflow-auto rounded border border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900 text-neutral-300">
                      <tr>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Theatre</th>
                        <th className="px-3 py-2">Screens</th>
                        <th className="px-3 py-2">GST</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRows.map(r => (
                        <tr key={r.id} className="border-t border-neutral-800">
                          <td className="px-3 py-2">{r.name || '-'}</td>
                          <td className="px-3 py-2">{r.mail}</td>
                          <td className="px-3 py-2">{r.phone_number}</td>
                          <td className="px-3 py-2">{r.theatre_name}</td>
                          <td className="px-3 py-2">{r.total_screens}</td>
                          <td className="px-3 py-2">{r.gst_number}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button onClick={() => handleAction(r.id, 'approve')} className="rounded bg-white px-2 py-1 text-black">Approve</button>
                              <button onClick={() => handleAction(r.id, 'reject')} className="rounded bg-red-600 px-2 py-1">Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Old Requests */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Old Requests</h2>
              {oldRows.length === 0 ? (
                <p className="text-sm text-neutral-400">No processed requests.</p>
              ) : (
                <div className="overflow-auto rounded border border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900 text-neutral-300">
                      <tr>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Theatre</th>
                        <th className="px-3 py-2">Screens</th>
                        <th className="px-3 py-2">GST</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oldRows.map(r => (
                        <tr key={r.id} className="border-t border-neutral-800">
                          <td className="px-3 py-2">{r.name || '-'}</td>
                          <td className="px-3 py-2">{r.mail}</td>
                          <td className="px-3 py-2">{r.phone_number}</td>
                          <td className="px-3 py-2">{r.theatre_name}</td>
                          <td className="px-3 py-2">{r.total_screens}</td>
                          <td className="px-3 py-2">{r.gst_number}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              r.status === 'approved' ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}


