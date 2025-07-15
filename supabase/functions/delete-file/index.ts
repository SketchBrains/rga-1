import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.844.0'
import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Create Supabase client for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate user session from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      throw new Error('Invalid or expired session. Please log in again.')
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const { fileKey } = await req.json()

    if (!fileKey) {
      throw new Error('Missing fileKey')
    }

    // Verify file ownership - check if the fileKey belongs to the authenticated user
    // Extract user ID from fileKey path (format: documents/{userId}/...)
    const fileKeyParts = fileKey.split('/')
    if (fileKeyParts.length < 2 || fileKeyParts[0] !== 'documents') {
      throw new Error('Invalid file key format')
    }
    
    const fileOwnerUserId = fileKeyParts[1]
    if (fileOwnerUserId !== user.id) {
      // Additional check: verify ownership through database
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .select('uploaded_by')
        .eq('file_key', fileKey)
        .single()
      
      if (dbError || !document || document.uploaded_by !== user.id) {
        console.error('File ownership verification failed:', { 
          fileKey, 
          requestedBy: user.id, 
          fileOwner: fileOwnerUserId,
          dbDocument: document 
        })
        throw new Error('Access denied: You do not have permission to delete this file')
      }
    }

    console.log('✅ File ownership verified for user:', user.id)

    // Get Wasabi credentials from environment
    const wasabiAccessKey = Deno.env.get('WASABI_ACCESS_KEY_ID')
    const wasabiSecretKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY')
    const wasabiBucket = Deno.env.get('WASABI_BUCKET_NAME')
    const wasabiRegion = Deno.env.get('WASABI_REGION') || 'us-east-1'

    if (!wasabiAccessKey || !wasabiSecretKey || !wasabiBucket) {
      throw new Error('Missing Wasabi configuration')
    }

    const wasabiEndpoint = `https://s3.${wasabiRegion === 'us-east-1' ? '' : wasabiRegion + '.'}wasabisys.com`

    // Create S3 client
    const s3Client = new S3Client({
      region: wasabiRegion,
      endpoint: wasabiEndpoint,
      credentials: {
        accessKeyId: wasabiAccessKey,
        secretAccessKey: wasabiSecretKey,
      },
      forcePathStyle: true,
    })

    // Delete from Wasabi
    const deleteCommand = new DeleteObjectCommand({
      Bucket: wasabiBucket,
      Key: fileKey,
    })

    await s3Client.send(deleteCommand)

    console.log('✅ File deleted successfully:', fileKey)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'File deleted successfully',
        fileKey,
        userId: user.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Delete error:', error)
    
    // Determine appropriate status code based on error type
    let statusCode = 400
    if (error.message?.includes('Invalid or expired session') || 
        error.message?.includes('Missing or invalid authorization')) {
      statusCode = 401
    } else if (error.message?.includes('Access denied')) {
      statusCode = 403
    } else if (error.message?.includes('Missing Supabase configuration') ||
               error.message?.includes('Missing Wasabi configuration')) {
      statusCode = 500
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Delete failed',
        code: statusCode === 401 ? 'SESSION_EXPIRED' : 
              statusCode === 403 ? 'ACCESS_DENIED' : 'DELETE_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})