import { supabaseAdmin, STORAGE_BUCKETS } from './supabase.js'

// Function to create storage buckets if they don't exist
export async function createStorageBuckets() {
  const results = []
  
  for (const [bucketKey, bucketName] of Object.entries(STORAGE_BUCKETS)) {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
      
      if (listError) {
        throw listError
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === bucketName)
      
      if (!bucketExists) {
        // Create bucket
        const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: false, // Private bucket for security
          allowedMimeTypes: ['text/plain', 'text/csv', 'application/csv'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
        })
        
        if (error) {
          throw error
        }
        
        results.push({
          bucket: bucketName,
          action: 'created',
          success: true,
          data
        })
        
        console.log(`✅ Created storage bucket: ${bucketName}`)
      } else {
        results.push({
          bucket: bucketName,
          action: 'exists',
          success: true,
          message: 'Bucket already exists'
        })
        
        console.log(`ℹ️ Storage bucket already exists: ${bucketName}`)
      }
    } catch (error) {
      results.push({
        bucket: bucketName,
        action: 'failed',
        success: false,
        error: error.message
      })
      
      console.error(`❌ Failed to create storage bucket ${bucketName}:`, error)
    }
  }
  
  return results
}

// Function to verify bucket permissions and setup
export async function verifyStorageSetup() {
  const results = []
  
  for (const [bucketKey, bucketName] of Object.entries(STORAGE_BUCKETS)) {
    try {
      // Test upload a small file
      const testContent = 'test'
      const testFileName = 'test-setup.txt'
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(testFileName, testContent, {
          contentType: 'text/plain'
        })
      
      if (uploadError) {
        throw uploadError
      }
      
      // Test download the file
      const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(testFileName)
      
      if (downloadError) {
        throw downloadError
      }
      
      // Clean up test file
      await supabaseAdmin.storage.from(bucketName).remove([testFileName])
      
      results.push({
        bucket: bucketName,
        success: true,
        message: 'Upload and download test successful'
      })
      
      console.log(`✅ Storage bucket ${bucketName} is working correctly`)
    } catch (error) {
      results.push({
        bucket: bucketName,
        success: false,
        error: error.message
      })
      
      console.error(`❌ Storage bucket ${bucketName} test failed:`, error)
    }
  }
  
  return results
} 