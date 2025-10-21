import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const origin = new URL(req.url).origin
    const emailRedirectTo = `${origin}/auth?mode=signin`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo,
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const userId = data.user?.id
    if (userId) {
      // RLS should allow insert for the authed context per template policy
      await supabase.from('users').insert({ id: userId, name: name || 'User', mail: email })
    }

    return NextResponse.json({ ok: true, message: 'Confirmation email sent' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


