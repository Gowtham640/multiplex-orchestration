import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(req: Request) {
  try {
    // Use service role key to bypass any RLS issues
    const supabase = supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey)

    console.log('Using service key:', !!supabaseServiceKey)

    // First, let's get all shows without joins to debug
    const { data: showsData, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .order('show_date', { ascending: true })
      .order('start_time', { ascending: true })

    console.log('Shows query result:', { data: showsData?.length, error: showsError?.message })

    if (showsError) {
      console.error('Error fetching shows:', showsError)
      return NextResponse.json({ error: showsError.message }, { status: 400 })
    }

    if (!showsData || showsData.length === 0) {
      console.log('No shows found in database')
      return NextResponse.json({ movies: [] })
    }

    // Get theatre and screen info separately
    const theatreIds = [...new Set(showsData.map(s => s.theatre_id))]
    const screenIds = [...new Set(showsData.map(s => s.screen_id))]

    console.log('Theatre IDs:', theatreIds)
    console.log('Screen IDs:', screenIds)

    const { data: theatresData, error: theatresError } = await supabase
      .from('theatres')
      .select('id, theatre_name, city, state')
      .in('id', theatreIds)

    console.log('Theatres query result:', { data: theatresData?.length, error: theatresError?.message })

    const { data: screensData, error: screensError } = await supabase
      .from('screens')
      .select('id, screen_number')
      .in('id', screenIds)

    console.log('Screens query result:', { data: screensData?.length, error: screensError?.message })

    // Create lookup maps
    const theatresMap = new Map(theatresData?.map(t => [t.id, t]) || [])
    const screensMap = new Map(screensData?.map(s => [s.id, s]) || [])

    // Group shows by movie name to avoid duplicates
    const movieMap = new Map()
    
    showsData.forEach(show => {
      const theatre = theatresMap.get(show.theatre_id)
      const screen = screensMap.get(show.screen_id)
      
      if (!theatre || !screen) {
        console.warn('Missing theatre or screen data for show:', show.id, { theatre, screen })
        return
      }

      const movieKey = show.movie_name.toLowerCase()
      if (!movieMap.has(movieKey)) {
        movieMap.set(movieKey, {
          id: show.id,
          title: show.movie_name,
          language: show.language,
          price: show.ticket_price,
          theatres: new Set(),
          nextShow: null,
          totalShows: 0
        })
      }
      
      const movie = movieMap.get(movieKey)
      movie.theatres.add(`${theatre.theatre_name} - ${theatre.city}`)
      movie.totalShows++
      
      // Set the earliest upcoming show
      if (!movie.nextShow || show.show_date < movie.nextShow.show_date || 
          (show.show_date === movie.nextShow.show_date && show.start_time < movie.nextShow.start_time)) {
        movie.nextShow = {
          show_date: show.show_date,
          start_time: show.start_time,
          end_time: show.end_time,
          screen: screen.screen_number,
          theatre: `${theatre.theatre_name} - ${theatre.city}`,
          available_seats: show.available_seats
        }
      }
    })

    // Convert to array and format for frontend
    const movies = Array.from(movieMap.values()).map(movie => ({
      id: movie.id,
      title: movie.title,
      language: movie.language || 'N/A',
      price: movie.price,
      theatres: Array.from(movie.theatres),
      nextShow: movie.nextShow,
      totalShows: movie.totalShows
    }))

    console.log('Final movies:', movies.length)
    return NextResponse.json({ movies })
  } catch (e: any) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}