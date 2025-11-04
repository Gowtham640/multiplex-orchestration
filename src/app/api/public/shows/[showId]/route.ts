import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(
  req: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId: showIdParam } = await params
    const showId = parseInt(showIdParam)
    if (isNaN(showId)) {
      return NextResponse.json({ error: 'Invalid show ID' }, { status: 400 })
    }

    // Use service role key to bypass any RLS issues
    const supabase = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey)

    // Get show details
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single()

    if (showError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Get theatre details
    const { data: theatre, error: theatreError } = await supabase
      .from('theatres')
      .select('id, theatre_name, address, city, state')
      .eq('id', show.theatre_id)
      .single()

    if (theatreError || !theatre) {
      return NextResponse.json({ error: 'Theatre not found' }, { status: 404 })
    }

    // Get screen details
    const { data: screen, error: screenError } = await supabase
      .from('screens')
      .select('id, screen_number, total_rows, total_columns')
      .eq('id', show.screen_id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: 'Screen not found' }, { status: 404 })
    }

    return NextResponse.json({
      show: {
        id: show.id,
        movie_name: show.movie_name,
        language: show.language,
        show_date: show.show_date,
        start_time: show.start_time,
        end_time: show.end_time,
        ticket_price: show.ticket_price,
        available_seats: show.available_seats,
        theatre_id: show.theatre_id,
        screen_id: show.screen_id
      },
      theatre: {
        id: theatre.id,
        theatre_name: theatre.theatre_name,
        address: theatre.address,
        city: theatre.city,
        state: theatre.state
      },
      screen: {
        id: screen.id,
        screen_number: screen.screen_number,
        total_rows: screen.total_rows,
        total_columns: screen.total_columns
      }
    })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

