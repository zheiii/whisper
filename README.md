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
5. Create an account at [AWS](https://aws.amazon.com/) for S3 (file storage). 
   If this is the first time you're setting up AWS, then:
   - Create a bucket (e.g. `whisper-rogue-bucket`) in your region.
   - Under **Permissions → CORS**, add rules allowing your dev and production origins to issue `PUT`/`OPTIONS`/`GET` requests. Example:
     ```json
     [
       {
         "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain"],
         "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "OPTIONS"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3000
       }
     ]
     ```
   - Create an IAM user (programmatic access) and attach S3 permissions (`AmazonS3FullAccess` or a scoped policy for your bucket).
   - On that user, add an inline policy allowing STS federation so `next-s3-upload` can mint temporary credentials:
      - Go to IAM Console
      → Users → click on your user whisperer.

      - Go to the Permissions tab.

      - Click Add permissions → Create inline policy.

      - In the visual editor, choose:

      Service: STS (Security Token Service)

      Actions: expand and scroll → enable GetFederationToken

      Resources: choose “All resources”

      It should look like:

      Service: Security Token Service (STS)
      Actions: GetFederationToken
      Resources: All resources


      Click Next, give it a name like:

      AllowGetFederationToken

      - and click Create policy.

   - Store the access key ID/secret for this user in `S3_UPLOAD_KEY` / `S3_UPLOAD_SECRET`, and the bucket/region in `S3_UPLOAD_BUCKET` / `S3_UPLOAD_REGION`. Objects should remain private; the app now generates presigned GET URLs when it needs to download an upload for transcription.
6. Create an account at [Neon](https://neon.com/) for PostgreSQL database. For the first time you're setting up Neon, you'll need to create a new project.
7. Create a Clerk account at [Clerk](https://clerk.com/) for authentication
8. Create a `.env` file (use `.env.example` for reference) and add your API keys:
   - `LEMONFOX_API_KEY` - Your Lemonfox API key for transcription
   - `OPENROUTER_API_KEY` - Your OpenRouter API key for LLM transformations
   - Additional configuration options available in `.env.example`
9.  Run `npm install` and then `npm run db:push` to push the schema to Neon and then `npm run dev` to install dependencies and start the app locally

### Optional: Bring Your Own Keys (BYOK)

Users of your deployed app can optionally provide their own API keys for unlimited usage:
- Lemonfox API key → unlimited transcription minutes
- OpenRouter API key → unlimited transformations per day

Keys are entered through the app UI and stored in the browser's session storage.
