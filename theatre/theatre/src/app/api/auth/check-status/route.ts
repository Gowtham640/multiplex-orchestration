import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: user } = await supabase.auth.getUser()
  const userId = user.user?.id
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  // Check if user has an approved request
  const { data: request, error } = await supabase
    .from('requests')
    .select('status')
    .eq('id', userId)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ 
    approved: !!request,
    status: request?.status || 'pending'
  })
}
