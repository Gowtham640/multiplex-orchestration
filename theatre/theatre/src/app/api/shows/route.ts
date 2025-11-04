import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { data, error } = await supabase
      .from('shows')
      .select(`
        *,
        screens!inner(screen_number)
      `)
      .eq('theatre_id', userId)
      .order('show_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching shows:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ shows: data })
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { 
      screen_id, 
      movie_name, 
      language, 
      show_date, 
      start_time, 
      end_time, 
      ticket_price 
    } = await req.json()

    if (!screen_id || !movie_name || !show_date || !start_time || !end_time || !ticket_price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get screen capacity to calculate available seats
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('total_rows, total_columns')
      .eq('id', screen_id)
      .eq('theatre_id', userId)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 400 })
    }

    const available_seats = screen.total_rows * screen.total_columns

    const { data, error } = await supabase
      .from('shows')
      .insert({
        theatre_id: userId,
        screen_id: Number(screen_id),
        movie_name,
        language: language || null,
        show_date,
        start_time,
        end_time,
        ticket_price: Number(ticket_price),
        available_seats,
      })
      .select(`
        *,
        screens!inner(screen_number)
      `)

    if (error) {
      console.error('Error inserting show:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ show: data[0] })
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('shows')
      .delete()
      .eq('id', id)
      .eq('theatre_id', userId)

    if (error) {
      console.error('Error deleting show:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
