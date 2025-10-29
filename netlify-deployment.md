# Netlify Deployment Setup

## Environment Variables

After making these code changes, you need to configure the environment variables on Netlify:

### 1. Remove the old environment variable
- Go to your Netlify site dashboard
- Navigate to **Site settings** → **Build & deploy** → **Environment variables**
- **DELETE** the `VITE_OPENAI_API_KEY` variable if it exists

### 2. Add the new server-side environment variable
- In the same Environment variables section, click **Add variable**
- Set the key as: `OPENAI_API_KEY` (no VITE_ prefix)
- Set the value as your actual OpenAI API key
- Click **Save**

## What Changed

1. **Security Fix**: Moved OpenAI API key from client-side to server-side
2. **Added Netlify Function**: Created `netlify/functions/openai-proxy.js` to handle OpenAI API calls
3. **Updated Frontend**: All OpenAI API calls now go through the Netlify function instead of direct calls

## Files Modified

- `src/PdfUploadChatGPTApp.jsx` - Updated to use Netlify function
- `netlify/functions/openai-proxy.js` - New server-side proxy function

## Deploy Instructions

1. Commit and push these changes to your repository
2. Configure the environment variables as described above
3. Trigger a new deployment on Netlify

The deployment should now succeed without the secrets scanning error!

## Testing

After deployment, test the application to ensure:
- PDF upload works
- OCR functionality works (for image-based PDFs)
- Description generation works
- All features function the same as before

The only difference is that API calls are now securely handled server-side.
