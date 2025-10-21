import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service role key for admin operations to bypass RLS
  const supabase = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    // Get the request row
    const { data: reqRow, error: reqErr } = await supabase
      .from('requests').select('*').eq('id', id).maybeSingle()
    if (reqErr) {
      console.error('Error fetching request:', reqErr)
      return NextResponse.json({ error: reqErr.message }, { status: 400 })
    }
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    // Insert into theatres
    const { error: insErr } = await supabase.from('theatres').insert({
      id: reqRow.id,
      theatre_name: reqRow.theatre_name,
      name: reqRow.name ?? 'Owner',
      mail: reqRow.mail,
      phone_number: reqRow.phone_number,
      total_screens: reqRow.total_screens,
      address: reqRow.address,
      city: reqRow.city,
      state: reqRow.state,
      gst_number: reqRow.gst_number,
    })
    if (insErr) {
      console.error('Error inserting into theatres:', insErr)
      return NextResponse.json({ error: insErr.message }, { status: 400 })
    }

    // Mark request as approved
    const { error: updErr } = await supabase.from('requests').update({ status: 'approved' }).eq('id', id)
    if (updErr) {
      console.error('Error updating request status:', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Unexpected error in approve:', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


