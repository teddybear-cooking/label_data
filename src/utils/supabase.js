import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client-side Supabase client (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (with service role key for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Storage bucket names
export const STORAGE_BUCKETS = {
  CSV_DATA: 'csv-data',
  TEXT_FILES: 'text-files'
}

// Helper function to check if Supabase is configured
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey)
}

// Helper function to handle file uploads to storage
export async function uploadToStorage(bucket, fileName, fileContent, isPublic = false) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, fileContent, {
        upsert: true,
        contentType: 'text/plain'
      })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error(`Error uploading to storage bucket ${bucket}:`, error)
    return { success: false, error: error.message }
  }
}

// Helper function to download from storage
export async function downloadFromStorage(bucket, fileName) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(fileName)

    if (error) {
      throw error
    }

    const text = await data.text()
    return { success: true, data: text }
  } catch (error) {
    console.error(`Error downloading from storage bucket ${bucket}:`, error)
    return { success: false, error: error.message }
  }
}

// Helper function to update file content in storage
export async function updateFileInStorage(bucket, fileName, content) {
  try {
    // First try to remove the existing file
    await supabaseAdmin.storage.from(bucket).remove([fileName])
    
    // Then upload the new content
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, content, {
        contentType: 'text/plain'
      })

    if (error) {
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error(`Error updating file in storage bucket ${bucket}:`, error)
    return { success: false, error: error.message }
  }
}

// Helper function to check if file exists in storage
export async function fileExistsInStorage(bucket, fileName) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list('', {
        search: fileName
      })

    if (error) {
      return false
    }

    return data && data.some(file => file.name === fileName)
  } catch (error) {
    console.error(`Error checking file existence in storage bucket ${bucket}:`, error)
    return false
  }
}

// Helper function to get file size and metadata
export async function getFileInfo(bucket, fileName) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list('', {
        search: fileName
      })

    if (error) {
      throw error
    }

    const file = data.find(f => f.name === fileName)
    return file ? { success: true, data: file } : { success: false, error: 'File not found' }
  } catch (error) {
    console.error(`Error getting file info from storage bucket ${bucket}:`, error)
    return { success: false, error: error.message }
  }
} 