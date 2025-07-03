import { createStorageBuckets, verifyStorageSetup } from '../../../utils/storage-setup.js'
import { checkAuthHeader } from '../../../utils/auth.js'

export async function POST(request) {
  try {
    // Check authentication
    if (!checkAuthHeader(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Setting up Supabase storage buckets...')
    
    // Create buckets
    const createResults = await createStorageBuckets()
    
    // Verify setup
    const verifyResults = await verifyStorageSetup()
    
    const allSuccessful = createResults.every(r => r.success) && verifyResults.every(r => r.success)
    
    return Response.json({
      success: allSuccessful,
      createResults,
      verifyResults,
      message: allSuccessful 
        ? 'Storage buckets setup completed successfully' 
        : 'Some issues occurred during setup'
    })
    
  } catch (error) {
    console.error('Error setting up storage:', error)
    return Response.json(
      { 
        success: false,
        error: 'Failed to setup storage buckets',
        details: error.message
      }, 
      { status: 500 }
    )
  }
} 