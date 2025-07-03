# Supabase Storage Integration Setup Guide

This project now uses Supabase storage for CSV data and text files instead of local file system storage. Follow this guide to set up Supabase integration.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in your Supabase dashboard

## Step 1: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (looks like `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)
   - **Service Role Key** (starts with `eyJ...` - keep this secret!)

## Step 2: Configure Environment Variables

Create a `.env.local` file in your project root with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: 
- Replace the placeholder values with your actual Supabase credentials
- Never commit the `.env.local` file to version control
- The service role key has admin privileges - keep it secure

## Step 3: Install Dependencies

The Supabase client is already included in the project dependencies. If you need to reinstall:

```bash
npm install @supabase/supabase-js
```

## Step 4: Initialize Storage Buckets

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the admin page: `http://localhost:3000/admin`

3. Log in with your admin credentials

4. Click the **"Setup Storage Buckets"** button in the Supabase Storage Setup section

5. Wait for the setup to complete successfully

This will create two storage buckets:
- `csv-data`: For training data CSV files
- `text-files`: For saved text submissions

## Project Structure Changes

### New Files Added:
- `src/utils/supabase.js` - Supabase client configuration and helper functions
- `src/utils/storage-setup.js` - Storage bucket initialization utilities
- `src/app/api/setup-storage/route.js` - API endpoint for bucket setup
- `src/app/api/download-csv/route.js` - CSV download from Supabase storage

### Modified Files:
- `src/app/api/save-csv/route.js` - Now saves to Supabase storage
- `src/app/api/fetch-sentence/route.js` - Now reads from Supabase storage
- `src/app/api/csv-stats/route.js` - Now analyzes files from Supabase storage
- `src/app/api/save-text/route.js` - Now saves to Supabase storage
- `src/app/api/check-csv/route.js` - Now checks files in Supabase storage
- `src/app/api/clear-csv/route.js` - Now clears files in Supabase storage
- `src/app/download/page.js` - Updated to download from Supabase storage
- `src/app/admin/page.js` - Added storage setup interface

## Features

### Storage Buckets
- **csv-data**: Stores training data CSV files
- **text-files**: Stores admin text submissions

### Security
- Private buckets (not publicly accessible)
- Authentication required for all operations
- Service role key used for server-side operations

### File Operations
- **Upload**: CSV data and text files to appropriate buckets
- **Download**: CSV files through authenticated API
- **Update**: Existing files with new content
- **Delete**: Clear CSV data when needed

## Usage

### For Users (Data Labeling)
1. Input text and select categories on the main page
2. Data is automatically saved to Supabase storage
3. No changes to the user interface

### For Admins (Text Submission)
1. Navigate to `/admin`
2. Submit text paragraphs
3. Text is saved to `saved_texts.txt` in Supabase storage
4. Use the storage setup button if buckets aren't initialized

### For Developers (Data Download)
1. Navigate to `/download`
2. View statistics of stored data
3. Download CSV files directly from Supabase
4. Clear data when needed

## Troubleshooting

### Common Issues

**1. Environment Variables Not Loaded**
- Ensure `.env.local` is in the project root
- Restart your development server after adding environment variables
- Check for typos in variable names

**2. Storage Bucket Creation Failed**
- Verify your service role key has admin permissions
- Check Supabase project billing status (free tier limits)
- Ensure project URL is correct

**3. File Upload/Download Errors**
- Check network connectivity
- Verify authentication tokens
- Ensure buckets are created properly

**4. Authentication Errors**
- Verify API keys are correct
- Check if keys have expired or been regenerated
- Ensure service role key is being used for server operations

### Debugging Tips

1. **Check Browser Console**: Look for JavaScript errors and network failures
2. **Check Server Logs**: Review API route logs for detailed error messages
3. **Supabase Dashboard**: Monitor storage usage and access logs
4. **Environment Check**: Verify all environment variables are loaded

## Migration from Local Storage

The project automatically migrates from local file storage to Supabase storage. Your existing local files in `public/saved-texts/` are no longer used, but they remain for reference.

To migrate existing data:
1. Manual upload of existing CSV files to Supabase (if needed)
2. Copy text content from local `saved_texts.txt` to admin interface

## Security Best Practices

1. **Environment Variables**: Never expose service role keys in client-side code
2. **Authentication**: All storage operations require valid authentication
3. **Access Control**: Use row-level security policies if storing user-specific data
4. **HTTPS**: Always use HTTPS in production (Supabase enforces this)

## Support

For issues specific to this integration:
1. Check the setup steps above
2. Review error messages in browser console and server logs
3. Verify Supabase configuration and billing status

For Supabase-specific issues:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Community Discord](https://discord.supabase.com/)
- [Supabase GitHub Issues](https://github.com/supabase/supabase/issues) 