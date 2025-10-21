import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Test 1: Try to get shows count
    const { count: showsCount, error: showsError } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true })

    console.log('Shows count:', showsCount, 'Error:', showsError)

    // Test 2: Try to get all shows
    const { data: allShows, error: allShowsError } = await supabase
      .from('shows')
      .select('*')

    console.log('All shows:', allShows, 'Error:', allShowsError)

    // Test 3: Try to get theatres
    const { data: theatres, error: theatresError } = await supabase
      .from('theatres')
      .select('*')

    console.log('Theatres:', theatres, 'Error:', theatresError)

    // Test 4: Try to get screens
    const { data: screens, error: screensError } = await supabase
      .from('screens')
      .select('*')

    console.log('Screens:', screens, 'Error:', screensError)

    return NextResponse.json({ 
      showsCount, 
      showsError: showsError?.message,
      allShows: allShows?.length || 0,
      allShowsError: allShowsError?.message,
      theatres: theatres?.length || 0,
      theatresError: theatresError?.message,
      screens: screens?.length || 0,
      screensError: screensError?.message
    })
  } catch (e: unknown) {
    console.error('Unexpected error:', e)
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
