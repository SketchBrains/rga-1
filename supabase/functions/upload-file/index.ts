import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.844.0'
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

    // Parse request body
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('No file provided')
    }

    // Validate file
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB')
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported')
    }

    // Generate unique file key using authenticated user ID
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileKey = `documents/${user.id}/${timestamp}_${randomString}_${sanitizedFileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Wasabi
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiBucket,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        'original-name': file.name,
        'uploaded-by': user.id,
        'upload-timestamp': timestamp.toString(),
        'user-email': user.email || 'unknown',
      },
    })

    await s3Client.send(uploadCommand)

    console.log('✅ File uploaded successfully:', fileKey)

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileKey,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: user.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Upload error:', error)
    
    // Determine appropriate status code based on error type
    let statusCode = 400
    if (error.message?.includes('Invalid or expired session') || 
        error.message?.includes('Missing or invalid authorization')) {
      statusCode = 401
    } else if (error.message?.includes('Missing Supabase configuration') ||
               error.message?.includes('Missing Wasabi configuration')) {
      statusCode = 500
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Upload failed',
        code: statusCode === 401 ? 'SESSION_EXPIRED' : 'UPLOAD_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})