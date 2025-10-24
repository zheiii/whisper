<a href="https://github.com/nutlope/whisper-app">
  <img alt="Whisper App" src="./public/og.jpg">
  <h1 align="center">Whisper App</h1>
</a>

<p align="center">
  An open source audio transcription and transformation app. Powered by Lemonfox WhisperAPI and OpenRouter.
</p>

## Tech stack

- Lemonfox WhisperAPI for audio transcription (STT)
- OpenRouter for LLM-powered transformations (summaries, notes, etc.)
- Vercel's AI SDK as the LLM framework
- Clerk for authentication
- Neon for postgres
- Next.js App Router
- S3 for object storage (audio files)
- Upstash Redis for rate limiting
- Prisma for ORM
- Vercel for hosting

## How it works

1. Create an account on the site with Clerk
2. Upload an audio file, which gets uploaded to S3
3. The audio is transcribed using Lemonfox WhisperAPI (Whisper model)
4. Optionally, transform the transcription using OpenRouter LLMs (summarize, extract, blog posts, emails, etc.)
5. View and manage your transcriptions in your dashboard

## Cloning & running

1. Fork or clone the repo
2. Create an account at [Lemonfox](https://lemonfox.ai) for audio transcription API
3. Create an account at [OpenRouter](https://openrouter.ai) for LLM API
4. Create an account at [Upstash](https://upstash.com/) for Redis (rate limiting)
5. Create an account at [AWS](https://aws.amazon.com/) for S3 (file storage)
6. Create an account at [Neon](https://neon.com/) for PostgreSQL database
7. Create a Clerk account at [Clerk](https://clerk.com/) for authentication
8. Create a `.env` file (use `.env.example` for reference) and add your API keys:
   - `LEMONFOX_API_KEY` - Your Lemonfox API key for transcription
   - `OPENROUTER_API_KEY` - Your OpenRouter API key for LLM transformations
   - Additional configuration options available in `.env.example`
9. Run `npm install` and `npm run dev` to install dependencies and start the app locally

### Optional: Bring Your Own Keys (BYOK)

Users of your deployed app can optionally provide their own API keys for unlimited usage:
- Lemonfox API key → unlimited transcription minutes
- OpenRouter API key → unlimited transformations per day

Keys are entered through the app UI and stored in the browser's session storage.
