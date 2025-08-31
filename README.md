# AI Video Subtitle Generator

A powerful web application that automatically generates subtitles for videos using AI transcription and allows users to embed customized subtitles directly into their videos.

## Features

### Core Functionality
- **AI-Powered Transcription**: Converts speech in videos to accurate text using AssemblyAI
- **SRT File Generation**: Creates standard subtitle files compatible with all video players
- **Custom Subtitle Styling**: Customize font, size, color, position, and outline
- **Video Processing**: Embed subtitles directly into videos (burn-in subtitles)
- **Multiple Download Options**: Download both SRT files and processed videos

### User Experience
- **Drag & Drop Upload**: Easy video file uploading with visual feedback
- **Real-time Progress**: Live status updates during transcription and processing
- **Preview Functionality**: Preview videos with subtitles before processing
- **Responsive Design**: Beautiful, modern UI that works on all devices

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - Modern React patterns for state management

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL database and file storage
- **AssemblyAI** - AI-powered speech-to-text transcription
- **FFmpeg** - Video processing and subtitle embedding

### Infrastructure
- **Supabase Storage** - File storage for videos and subtitles
- **PostgreSQL** - Relational database for metadata

## Database Schema

### Videos Table
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR NOT NULL,
  storage_path VARCHAR NOT NULL,
  processed_video_path VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Transcriptions Table
```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  assemblyai_id VARCHAR NOT NULL,
  status VARCHAR CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  transcript_text TEXT,
  srt_content TEXT,
  srt_storage_path VARCHAR,
  processing_status VARCHAR CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- AssemblyAI account
- FFmpeg installed locally (for video processing)

### Environment Variables
Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AssemblyAI Configuration
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-video-subtitle-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Create the database tables using the schema above
   - Set up storage buckets: `videos`, `subtitles`, `processed-videos`
   - Configure Row Level Security (RLS) policies as needed

4. **Install FFmpeg**
   - macOS: `brew install ffmpeg`
   - Ubuntu/Debian: `sudo apt install ffmpeg`
   - Windows: Download from [FFmpeg.org](https://ffmpeg.org/download.html)

5. **Configure environment variables**
   - Add your Supabase and AssemblyAI credentials to `.env.local`

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   - Navigate to `http://localhost:3000`

## Usage

### Basic Workflow

1. **Upload Video**
   - Drag and drop a video file or click to browse
   - Supports: MP4, MOV, AVI, WebM (max 100MB)

2. **AI Transcription**
   - The system automatically transcribes the audio
   - Progress is displayed in real-time

3. **Download SRT**
   - Once transcription is complete, download the SRT file
   - Compatible with all video players and streaming platforms

4. **Customize Subtitles (Optional)**
   - Adjust font size, color, position, and outline
   - Preview changes before processing

5. **Process Video**
   - Generate a new video with embedded subtitles
   - Download the processed video

### Supported Video Formats
- **Input**: MP4, MOV, AVI, WebM, and most common video formats
- **Output**: MP4 with embedded subtitles
- **Subtitles**: SRT format (SubRip)

## API Endpoints

### Upload Video
```
POST /api/upload
Content-Type: multipart/form-data

Body: FormData with 'video' file
```

### Start Transcription
```
POST /api/transcribe
Content-Type: application/json

Body: { videoId: string }
```

### Check Transcription Status
```
GET /api/transcribe?id={transcriptionId}
```

### Process Video with Subtitles
```
POST /api/process-video
Content-Type: application/json

Body: { 
  transcriptionId: string,
  subtitleStyle: SubtitleStyle 
}
```

### Check Processing Status
```
GET /api/process-video?id={transcriptionId}
```

## Customization Options

### Subtitle Styling
- **Font Size**: 16px - 48px
- **Font Color**: White, Yellow, Red, Blue, Green
- **Position**: Bottom, Center, Top
- **Outline Width**: 0px - 5px
- **Outline Color**: Black (default)

### Video Processing
- **Output Format**: MP4
- **Quality**: High (CRF 23)
- **Codec**: H.264 for compatibility

## Deployment Limitations

### Why Not Deployed
This project is **not deployed on Vercel** because:

1. **FFmpeg Dependency**: Vercel's serverless environment doesn't support FFmpeg
2. **Processing Time**: Video processing can exceed serverless function timeouts
3. **Memory Constraints**: Large video files require more memory than available

### Alternative Deployment Options
- **Docker + Cloud Run**: Google Cloud Run with Docker container
- **AWS Lambda**: With FFmpeg layer (limited by execution time)
- **Traditional VPS**: DigitalOcean, Linode, or AWS EC2
- **Dedicated Servers**: For high-volume processing

### SRT-Only Version
A simplified version supporting only SRT file generation (without video processing) **has been deployed** and works perfectly on Vercel since it doesn't require FFmpeg.

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Implement proper error handling
4. Add loading states for better UX
5. Test with various video formats

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper commit messages
4. Test thoroughly
5. Submit a pull request with description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the existing GitHub issues
2. Create a new issue with detailed information
3. Include error logs and reproduction steps

## Acknowledgments

- **AssemblyAI** for accurate speech-to-text transcription
- **Supabase** for database and storage infrastructure
- **FFmpeg** for video processing capabilities
- **Next.js** team for the excellent framework