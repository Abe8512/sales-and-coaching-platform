# Welcome to your Lovable project

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
