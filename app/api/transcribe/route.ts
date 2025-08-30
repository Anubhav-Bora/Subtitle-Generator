import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'
import { supabaseAdmin } from '../../lib/supabase-server'
import { transcribeAudio, getTranscriptionStatus, generateSRT } from '../../lib/assemblyai'

// Add maxDuration for longer operations
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      console.error('Video fetch error:', videoError)
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(video.storage_path)

    if (!urlData.publicUrl) {
      return NextResponse.json({ error: 'Could not get video URL' }, { status: 500 })
    }

    try {
      const transcriptId = await transcribeAudio(urlData.publicUrl)

      const { data: transcription, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          video_id: videoId,
          assemblyai_id: transcriptId,
          status: 'processing',
          processing_status: 'pending'
        })
        .select()
        .single()

      if (transcriptionError) {
        console.error('Transcription creation error:', transcriptionError)
        return NextResponse.json({ error: 'Failed to create transcription record' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        transcriptionId: transcription.id,
        assemblyaiId: transcriptId
      })

    } catch (aiError) {
      console.error('AssemblyAI error:', aiError)
      return NextResponse.json({ 
        error: 'Failed to start transcription with AI service',
        details: process.env.NODE_ENV === 'development' ? (aiError as Error).message : undefined
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ 
      error: 'Failed to start transcription',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptionId = searchParams.get('id')

    if (!transcriptionId) {
      return NextResponse.json({ error: 'Transcription ID required' }, { status: 400 })
    }

    const { data: transcription, error } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (error || !transcription) {
      console.error('Transcription fetch error:', error)
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 })
    }

    if (!transcription.assemblyai_id) {
      return NextResponse.json({ error: 'No AssemblyAI ID found' }, { status: 400 })
    }

    try {
      const result = await getTranscriptionStatus(transcription.assemblyai_id)

      if (result.status === 'completed' && result.text) {
        const srtContent = generateSRT(result.words || [])
        
        // Create SRT filename - use video_id for uniqueness
        const srtFilename = `${transcription.video_id}.srt`

        try {
          // Upload SRT file using admin client for better permissions
          const { error: srtUploadError } = await supabaseAdmin.storage
            .from('subtitles')
            .upload(srtFilename, new Blob([srtContent], { type: 'text/plain' }), {
              upsert: true,
              contentType: 'text/plain'
            })

          if (srtUploadError) {
            console.error('SRT upload error:', srtUploadError)
          }

          // Update transcription record
          const { error: updateError } = await supabase
            .from('transcriptions')
            .update({
              status: 'completed',
              transcript_text: result.text,
              srt_content: srtContent,
              srt_storage_path: srtFilename,
              updated_at: new Date().toISOString()
            })
            .eq('id', transcriptionId)

          if (updateError) {
            console.error('Transcription update error:', updateError)
          }

          // Get SRT public URL using admin client
          const { data: srtUrlData } = supabaseAdmin.storage
            .from('subtitles')
            .getPublicUrl(srtFilename)

          return NextResponse.json({
            status: 'completed',
            text: result.text,
            srtContent,
            srtUrl: srtUrlData.publicUrl,
            readyForProcessing: true
          })

        } catch (uploadError) {
          console.error('SRT upload/update error:', uploadError)
          
          // Even if upload fails, return the completed transcription
          await supabase
            .from('transcriptions')
            .update({
              status: 'completed',
              transcript_text: result.text,
              srt_content: srtContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', transcriptionId)

          return NextResponse.json({
            status: 'completed',
            text: result.text,
            srtContent,
            readyForProcessing: true,
            warning: 'Transcription completed but SRT file upload failed'
          })
        }
      }

      // Update status if it has changed
      if (transcription.status !== result.status) {
        await supabase
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

    } catch (aiError) {
      console.error('AssemblyAI status check error:', aiError)
      return NextResponse.json({ 
        error: 'Failed to check transcription status',
        details: process.env.NODE_ENV === 'development' ? (aiError as Error).message : undefined
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check transcription status',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}