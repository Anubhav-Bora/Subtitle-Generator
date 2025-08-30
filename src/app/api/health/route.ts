import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET() {
  try {
    const { error } = await supabase.from('videos').select('id').limit(1)
    return NextResponse.json({ 
      status: error ? 'unhealthy' : 'healthy',
      database: !error,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: 'Connection failed' }, { status: 500 })
  }
}