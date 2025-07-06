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

// Helper function to create training_data table if it doesn't exist
export async function createTrainingDataTable() {
  try {
    console.log('Creating training_data table...');
    
    // Use direct SQL execution to create the table
    const { data, error } = await supabaseAdmin
      .from('training_data')
      .select('id')
      .limit(1);
    
    // If the query succeeds, table already exists
    if (!error) {
      console.log('✅ training_data table already exists');
      return { success: true };
    }
    
    // If table doesn't exist, we need to create it
    // Since we can't execute CREATE TABLE directly via the client,
    // we'll return an error with instructions
    if (error.message.includes('relation "training_data" does not exist') || 
        error.message.includes('table "training_data" does not exist')) {
      
      console.log('⚠️  training_data table does not exist');
      console.log('Please create the table manually in your Supabase SQL editor:');
      console.log(`
        CREATE TABLE training_data (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          label TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_training_data_label ON training_data(label);
        CREATE INDEX idx_training_data_created_at ON training_data(created_at);
      `);
      
      return { 
        success: false, 
        error: 'Table does not exist. Please create it manually in Supabase SQL editor.',
        sql: `
          CREATE TABLE training_data (
            id SERIAL PRIMARY KEY,
            text TEXT NOT NULL,
            label TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX idx_training_data_label ON training_data(label);
          CREATE INDEX idx_training_data_created_at ON training_data(created_at);
        `
      };
    }
    
    // For other errors, just return the error
    return { success: false, error: error.message };
    
  } catch (error) {
    console.error('Error checking/creating training_data table:', error);
    return { success: false, error: error.message };
  }
} 