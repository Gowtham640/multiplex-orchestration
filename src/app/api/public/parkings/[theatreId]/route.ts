import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(
  req: Request,
  { params }: { params: Promise<{ theatreId: string }> }
) {
  try {
    const { theatreId } = await params
    
    // Use service role key to bypass any RLS issues
    const supabase = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey)

    // Get all parkings for this theatre
    const { data: parkings, error } = await supabase
      .from('parkings')
      .select('id, floor_number, total_rows, total_columns')
      .eq('theatre_id', theatreId)
      .order('floor_number')

    if (error) {
      console.error('Error fetching parkings:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get reserved parking spots for this theatre
    const { data: reservations } = await supabase
      .from('parking_reservations')
      .select('parking_id, floor_number, row_number, col_number')
      .eq('theatre_id', theatreId)
      .eq('is_reserved', true)

    const reservedSpots = new Set<string>()
    reservations?.forEach((r) => {
      reservedSpots.add(`${r.parking_id}-${r.floor_number}-${r.row_number}-${r.col_number}`)
    })

    return NextResponse.json({ 
      parkings: parkings || [], 
      reserved_spots: Array.from(reservedSpots) 
    })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

