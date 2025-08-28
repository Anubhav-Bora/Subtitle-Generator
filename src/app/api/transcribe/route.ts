import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { transcribeAudio, getTranscriptionStatus, generateSRT } from '@/app/lib/assemblyai'

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()

    
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }


    const { data: urlData } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(video.storage_path)

    const transcriptId = await transcribeAudio(urlData.publicUrl)

    
    const { data: transcription, error: transcriptionError } = await supabaseAdmin
      .from('transcriptions')
      .insert({
        video_id: videoId,
        assemblyai_id: transcriptId,
        status: 'processing'
      })
      .select()
      .single()

    if (transcriptionError) {
      return NextResponse.json({ error: 'Failed to create transcription record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      transcriptionId: transcription.id,
      assemblyaiId: transcriptId
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Failed to start transcription' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptionId = searchParams.get('id')

    if (!transcriptionId) {
      return NextResponse.json({ error: 'Transcription ID required' }, { status: 400 })
    }

    
    const { data: transcription, error } = await supabaseAdmin
      .from('transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (error || !transcription) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
    }

    
    const result = await getTranscriptionStatus(transcription.assemblyai_id)

    if (result.status === 'completed' && result.text) {

      const srtContent = generateSRT(result.words || [])
      
      
      const srtFilename = `${transcription.video_id}.srt`
      const srtPath = `subtitles/${srtFilename}`
      
      const { error: srtUploadError } = await supabaseAdmin.storage
        .from('subtitles')
        .upload(srtPath, new Blob([srtContent], { type: 'text/plain' }), {
          upsert: true
        })

      if (srtUploadError) {
        console.error('SRT upload error:', srtUploadError)
      }

    
      await supabaseAdmin
        .from('transcriptions')
        .update({
          status: 'completed',
          transcript_text: result.text,
          srt_content: srtContent,
          srt_storage_path: srtPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptionId)


      const { data: srtUrlData } = supabaseAdmin.storage
        .from('subtitles')
        .getPublicUrl(srtPath)

      return NextResponse.json({
        status: 'completed',
        text: result.text,
        srtContent,
        srtUrl: srtUrlData.publicUrl,
        readyForProcessing: true
      })
    }

    
    if (transcription.status !== result.status) {
      await supabaseAdmin
        .from('transcriptions')
        .update({
          status: result.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptionId)
    }

    return NextResponse.json({
      status: result.status
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ error: 'Failed to check transcription status' }, { status: 500 })
  }
}