import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      )
    }
    
    // Return the API key to the client
    // Note: In production, you might want to use temporary keys
    return NextResponse.json({ key: apiKey })
    
  } catch (error) {
    console.error('Deepgram token error:', error)
    return NextResponse.json(
      { error: 'Failed to get Deepgram key' },
      { status: 500 }
    )
  }
}