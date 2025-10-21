import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, mail, phone_number, theatre_name, address, city, state, total_screens, gst_number } = body || {}
    if (!name || !mail || !phone_number || !theatre_name || !address || !city || !state || !total_screens || !gst_number) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use client with the user's access token to satisfy RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    // Insert into requests; id should be user's id (FK to users.id)
    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    // Optionally sync user's name in profile
    await supabase.from('users').update({ name }).eq('id', userId)

    const { error } = await supabase.from('requests').insert({
      id: userId,
      name,
      mail,
      phone_number,
      theatre_name,
      address,
      city,
      state,
      total_screens,
      gst_number,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


