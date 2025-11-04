import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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

    // Get all bookings for the user with show, theatre, and screen details
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        row_number,
        col_number,
        booked_at,
        show_id,
        theatre_id,
        screen_id,
        shows!inner(
          id,
          movie_name,
          language,
          show_date,
          start_time,
          end_time,
          ticket_price
        ),
        theatres!inner(
          theatre_name,
          city,
          state
        ),
        screens!inner(
          screen_number
        )
      `)
      .eq('user_id', userId)
      .eq('is_booked', true)
      .order('booked_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Group bookings by show_id for better display
    const groupedBookings = new Map()
    
    type BookingRow = {
      id: number;
      row_number: number;
      col_number: number;
      booked_at: string;
      show_id: number;
      theatre_id: string;
      screen_id: number;
      shows: Array<{
        id: number;
        movie_name: string;
        language: string;
        show_date: string;
        start_time: string;
        end_time: string;
        ticket_price: number;
      }>;
      theatres: Array<{
        theatre_name: string;
        city: string;
        state: string;
      }>;
      screens: Array<{
        screen_number: number;
      }>;
    };
    
    (bookings as unknown as BookingRow[])?.forEach((booking) => {
      const showId = booking.show_id.toString()
      const show = Array.isArray(booking.shows) ? booking.shows[0] : booking.shows
      const theatre = Array.isArray(booking.theatres) ? booking.theatres[0] : booking.theatres
      const screen = Array.isArray(booking.screens) ? booking.screens[0] : booking.screens
      
      if (!groupedBookings.has(showId)) {
        groupedBookings.set(showId, {
          show_id: booking.show_id,
          movie_name: show.movie_name,
          language: show.language,
          show_date: show.show_date,
          start_time: show.start_time,
          end_time: show.end_time,
          ticket_price: show.ticket_price,
          theatre_name: theatre.theatre_name,
          city: theatre.city,
          state: theatre.state,
          screen_number: screen.screen_number,
          booked_at: booking.booked_at,
          seats: [],
          total_amount: 0
        })
      }
      
      const bookingGroup = groupedBookings.get(showId)
      bookingGroup.seats.push({
        id: booking.id,
        row_number: booking.row_number,
        col_number: booking.col_number
      })
      bookingGroup.total_amount += show.ticket_price
    })

    // Convert map to array
    const bookingsList = Array.from(groupedBookings.values())

    return NextResponse.json({ bookings: bookingsList })
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

    const { show_id, seats, points_used } = await req.json()

    if (!show_id || !seats || !Array.isArray(seats) || seats.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate points_used if provided
    const pointsToUse = Math.max(0, Math.floor(points_used || 0))
    if (pointsToUse < 0) {
      return NextResponse.json({ error: 'Invalid points amount' }, { status: 400 })
    }

    // Get show details to verify and get theatre_id, screen_id
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, theatre_id, screen_id, ticket_price, available_seats')
      .eq('id', show_id)
      .single()

    if (showError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Check if seats are available (not already booked)
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('row_number, col_number')
      .eq('show_id', show_id)
      .eq('is_booked', true)

    if (bookingsError) {
      return NextResponse.json({ error: 'Error checking seat availability' }, { status: 400 })
    }

    const bookedSeats = new Set(
      (existingBookings || []).map(b => `${b.row_number}-${b.col_number}`)
    )

    // Validate seats are not already booked
    for (const seat of seats) {
      const seatKey = `${seat.row_number}-${seat.col_number}`
      if (bookedSeats.has(seatKey)) {
        return NextResponse.json({ 
          error: `Seat Row ${seat.row_number}, Col ${seat.col_number} is already booked` 
        }, { status: 400 })
      }
    }

    // Insert bookings
    const bookingData = seats.map((seat: { row_number: number; col_number: number }) => ({
      theatre_id: show.theatre_id,
      screen_id: show.screen_id,
      show_id: show.id,
      user_id: userId,
      row_number: seat.row_number,
      col_number: seat.col_number,
      is_booked: true
    }))

    const { data: insertedBookings, error: insertError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()

    if (insertError) {
      console.error('Error inserting bookings:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // Update available_seats in shows table
    const newAvailableSeats = show.available_seats - seats.length
    const { error: updateError } = await supabase
      .from('shows')
      .update({ available_seats: newAvailableSeats })
      .eq('id', show_id)

    if (updateError) {
      console.error('Error updating available seats:', updateError)
      // Don't fail the booking, just log the error
    }

    const totalAmount = show.ticket_price * seats.length

    // Get user's current points
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user points:', userError)
      return NextResponse.json({ error: 'Failed to fetch user points' }, { status: 400 })
    }

    const currentPoints = userData?.points || 0

    // Validate points if user wants to use them
    if (pointsToUse > 0) {
      if (pointsToUse > currentPoints) {
        return NextResponse.json({ 
          error: `Insufficient points. You have ${currentPoints} points, but trying to use ${pointsToUse}` 
        }, { status: 400 })
      }

      if (pointsToUse > totalAmount) {
        return NextResponse.json({ 
          error: `Cannot use more points than the total amount (₹${totalAmount})` 
        }, { status: 400 })
      }
    }

    // Calculate final amount after points deduction
    const finalAmount = Math.max(0, totalAmount - pointsToUse)

    // Calculate points to award (1 point per rupee spent)
    const pointsToAward = Math.floor(finalAmount)

    // Update user points: deduct used points and add earned points
    const newPoints = currentPoints - pointsToUse + pointsToAward

    // Ensure points value is within smallint range (but allow it to be larger if needed)
    const clampedPoints = Math.min(newPoints, 32767) // smallint max value

    // Use service role key to bypass RLS for points update
    const supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : supabase

    const { data: updatedUser, error: pointsUpdateError } = await supabaseAdmin
      .from('users')
      .update({ points: clampedPoints })
      .eq('id', userId)
      .select('points')
      .single()

    if (pointsUpdateError) {
      console.error('Error updating user points:', pointsUpdateError)
      return NextResponse.json({ 
        error: `Failed to update points: ${pointsUpdateError.message}` 
      }, { status: 400 })
    }

    if (!updatedUser) {
      console.error('Points update succeeded but no data returned')
      return NextResponse.json({ 
        error: 'Failed to verify points update' 
      }, { status: 400 })
    }

    console.log(`Points updated successfully: ${currentPoints} -> ${updatedUser.points} (requested: ${newPoints})`)

    return NextResponse.json({
      bookings: insertedBookings,
      total_amount: totalAmount,
      final_amount: finalAmount,
      points_used: pointsToUse,
      points_awarded: pointsToAward,
      points_balance: updatedUser.points,
      seats_booked: seats.length
    })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
