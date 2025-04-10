# Sales & Coaching Platform

AI-powered sales call analysis and coaching platform using Supabase and OpenAI.

## Project Overview

This application allows sales teams to upload audio recordings of their sales calls. These recordings are then transcribed using OpenAI's Whisper API, and the resulting transcripts are analyzed by an AI model (via Supabase Edge Functions) to extract key metrics such as:

*   Overall sentiment and sentiment score
*   Relevant keywords
*   Calculated call score
*   (Future) Talk time ratio between agent and customer

The platform provides dashboards for sales representatives, managers, and administrators to view call history, analyze performance metrics, identify trends, and gain insights for coaching and improvement.

## Core Technologies

*   **Frontend:** React, Vite, TypeScript
*   **UI:** shadcn/ui, Tailwind CSS
*   **Backend:** Supabase (PostgreSQL Database, Auth, Edge Functions, Storage, Realtime)
*   **AI:** OpenAI (Whisper for transcription, GPT models for analysis via Edge Function)

## Setup & Configuration

### Supabase Setup

This project requires a Supabase project to function. You will need the following:

1.  **Project URL & Anon Key:** Obtainable from your Supabase project settings (API section).
2.  **Service Role Key:** Obtainable from your Supabase project settings (API section). **Keep this secret!** It's required for the Edge Functions to have admin privileges to update tables.
3.  **OpenAI API Key:** You need an API key from OpenAI to use the Whisper transcription and analysis features. **Keep this secret!**

### Environment Variables

Create a `.env.local` file in the project root by copying `.env.example`:

```sh
cp .env.example .env.local
```

Update `.env.local` with your specific keys:

```plaintext
# Supabase
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# OpenAI (primarily used by WhisperService on the client-side)
VITE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY 
```

### Supabase Edge Function Secrets

The `analyze-transcript` Edge Function requires secrets to be set directly in the Supabase dashboard:

1.  Navigate to your project -> Edge Functions -> analyze-transcript.
2.  Go to the "Secrets" section.
3.  Add the following secrets:
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.
    *   `OPENAI_API_KEY`: Your OpenAI API Key.

## Database Schema Overview

The primary data is stored in a PostgreSQL database managed by Supabase. Key tables in the `public` schema include:

*   `auth.users`: (Built-in) Stores authentication information (email, password hash, user ID).
*   `public.profiles`: Stores minimal user profile data, critically linked `user_id` to `auth.users.id`. Used as the target for foreign keys in `calls` and `call_transcripts`.
*   `public.users`: **(Redundancy Issue)** Stores additional user details including `role` (`admin`, `manager`, `rep`), `team_id`, `manager_id`. Referenced by RLS policies but not directly by foreign keys from core data tables.
*   `public.teams`: Stores team information (`id`, `name`, `manager_id`).
*   `public.calls`: Stores parent metadata for a call instance (`id`, `user_id` -> `profiles.user_id`, `created_at`, `duration`). Primarily exists to satisfy foreign key constraints.
*   `public.call_transcripts`: The main table holding transcript text, segments, words, filename, and analysis results (`sentiment`, `sentiment_score`, `keywords`, `call_score`, `analysis_completed_at`). Linked to `calls` and `profiles`.

**Note:** There is known redundancy and potential inconsistency between `public.profiles` and `public.users` that needs to be resolved.

## Core Data Flow

1.  **Upload:** A user uploads an audio file via the application UI.
2.  **Transcription (Client-side):** The `WhisperService` sends the audio file directly to the OpenAI Whisper API using the API key configured in the client's environment (`VITE_OPENAI_API_KEY`).
3.  **Initial Insert (Client-side):** Upon receiving the transcript from Whisper, `WhisperService` performs two database inserts:
    *   Inserts a record into the `public.calls` table (using the user's ID from `AuthContext`).
    *   Inserts the main transcript data (text, segments, etc.) into `public.call_transcripts`, linking it to the newly created `calls` record and the user's profile ID.
4.  **Webhook Trigger:** A Supabase Database Webhook configured on the `public.call_transcripts` table fires upon successful insertion.
5.  **Analysis (Edge Function):** The webhook triggers the `analyze-transcript` Supabase Edge Function, passing the newly inserted transcript data.
6.  **AI Analysis:** The Edge Function calls the OpenAI API (using secrets configured in Supabase) to perform sentiment analysis, keyword extraction, and call scoring based on the transcript text.
7.  **Update Transcript:** The Edge Function updates the corresponding row in `public.call_transcripts` with the analysis results.

## Running Locally

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Abe8512/sales-and-coaching-platform.git
    cd sales-and-coaching-platform
    ```
2.  **Install dependencies:**
    ```sh
    npm install
    ```
3.  **Set up environment variables:** Create `.env.local` as described in "Supabase Setup".
4.  **Link Supabase Project (if developing locally with CLI):**
    ```sh
    supabase login
    supabase link --project-ref YOUR_PROJECT_ID
    ```
5.  **Apply Migrations (if needed):**
    ```sh
    supabase db push # Or apply migrations individually
    ```
6.  **Start the development server:**
    ```sh
    npm run dev
    ```

## Known Issues & Next Steps

*   **User Model Consolidation:** The duplicate `public.users` and `public.profiles` tables need to be merged into a single source of truth.
*   **`calls` Table Necessity:** Evaluate if the `calls` table is truly necessary or if its data/role can be merged into `call_transcripts`.
*   **RLS Hardening:** Row Level Security policies need to be reviewed and hardened, especially for admin/manager roles, once the user model is consolidated.
*   **Dashboard Performance:** Investigate and fix reported UI lag/refresh loops on the dashboard.
*   **Edge Function Deployment:** Troubleshoot the local SSL/TLS certificate issue preventing deployment via the Supabase CLI.
*   **Error Handling:** Improve robustness of error handling, especially around API calls and async operations.
*   **Feature Implementation:** Continue implementing features outlined in the original development plan (Phases 2-5).

## Project info

**URL**: https://lovable.dev/projects/99795928-ebcf-46fe-98ad-dd8cea9e64ed

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/99795928-ebcf-46fe-98ad-dd8cea9e64ed) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create a local environment file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Variables

This project uses environment variables for configuration:

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_SUPABASE_URL | Your Supabase project URL | Yes |
| VITE_SUPABASE_ANON_KEY | Your Supabase anonymous key | Yes |
| VITE_API_BASE_URL | Base URL for other API calls | No |
| VITE_APP_ENV | Application environment (development, production) | No |
| VITE_ENABLE_ANALYTICS | Enable/disable analytics (true/false) | No |
| VITE_ENABLE_LOGGING | Enable/disable detailed logging (true/false) | No |

For local development:
1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials
3. Run the development server

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase for database and realtime features

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/99795928-ebcf-46fe-98ad-dd8cea9e64ed) and click on Share -> Publish.

Make sure to set the required environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) when deploying to production.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
