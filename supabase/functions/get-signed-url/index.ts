import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3.844.0'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.844.0'

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
    const { fileKey, fileName, expiresIn = 3600, download = false } = await req.json()

    if (!fileKey) {
      throw new Error('Missing fileKey')
    }

    // Create command for getting object
    const commandParams: any = {
      Bucket: wasabiBucket,
      Key: fileKey,
    }

    // If download is true, set content disposition for download
    if (download && fileName) {
      commandParams.ResponseContentDisposition = `attachment; filename="${fileName}"`
    }

    const command = new GetObjectCommand(commandParams)

    // Generate signed URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })

    return new Response(
      JSON.stringify({ 
        success: true, 
        signedUrl,
        expiresIn
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Signed URL generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate signed URL' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})