import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Always use anon key with user token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { data, error } = await supabase
      .from('screens')
      .select('*')
      .eq('theatre_id', userId)
      .order('screen_number')

    if (error) {
      console.error('Error fetching screens:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ screens: data })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Always use anon key with user token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { screen_number, total_rows, total_columns } = await req.json()
    if (!screen_number || !total_rows || !total_columns) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('screens')
      .insert({
        theatre_id: userId,
        screen_number: Number(screen_number),
        total_rows: Number(total_rows),
        total_columns: Number(total_columns),
      })
      .select()

    if (error) {
      console.error('Error inserting screen:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ screen: data[0] })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Always use anon key with user token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('screens')
      .delete()
      .eq('id', id)
      .eq('theatre_id', userId)

    if (error) {
      console.error('Error deleting screen:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
