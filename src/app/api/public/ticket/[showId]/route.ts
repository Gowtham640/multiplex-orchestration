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

    // Get all bookings for this show
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, row_number, col_number, booked_at, user_id')
      .eq('show_id', showId)
      .eq('is_booked', true)
      .order('booked_at', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: bookingsError.message }, { status: 400 })
    }

    // Group bookings by user_id to show tickets per user
    const bookingsByUser = new Map<string, Array<{
      id: number;
      row_number: number;
      col_number: number;
      booked_at: string;
    }>>()

    bookings?.forEach((booking) => {
      const userId = booking.user_id || 'unknown'
      if (!bookingsByUser.has(userId)) {
        bookingsByUser.set(userId, [])
      }
      bookingsByUser.get(userId)!.push({
        id: booking.id,
        row_number: booking.row_number,
        col_number: booking.col_number,
        booked_at: booking.booked_at
      })
    })

    return NextResponse.json({
      show: {
        id: show.id,
        movie_name: show.movie_name,
        language: show.language,
        show_date: show.show_date,
        start_time: show.start_time,
        end_time: show.end_time,
        ticket_price: show.ticket_price,
        available_seats: show.available_seats
      },
      theatre: {
        theatre_name: theatre.theatre_name,
        address: theatre.address,
        city: theatre.city,
        state: theatre.state
      },
      screen: {
        screen_number: screen.screen_number
      },
      bookings: Array.from(bookingsByUser.values()),
      allBookings: bookings || []
    })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

