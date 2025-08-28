import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, fileName } = body

    if (action === 'initiate') {
      const fileExtension = fileName.split('.').pop()
      const uniqueFilename = `${uuidv4()}.${fileExtension}`
      const storagePath = `videos/${uniqueFilename}`

      return NextResponse.json({
        success: true,
        uploadId: uuidv4(),
        storagePath,
        uniqueFilename
      })
    }

    if (action === 'upload-chunk') {
      return NextResponse.json({
        success: true,
        message: 'Chunk received'
      })
    }

    if (action === 'complete') {
      return NextResponse.json({
        success: true,
        message: 'Upload completed'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Chunked upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}