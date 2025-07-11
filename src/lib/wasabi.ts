import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Wasabi configuration
const wasabiAccessKey = import.meta.env.VITE_WASABI_ACCESS_KEY_ID
const wasabiSecretKey = import.meta.env.VITE_WASABI_SECRET_ACCESS_KEY
const wasabiBucket    = import.meta.env.VITE_WASABI_BUCKET_NAME
const wasabiRegion    = import.meta.env.VITE_WASABI_REGION || 'us-east-1'
const wasabiEndpoint  = import.meta.env.VITE_WASABI_ENDPOINT || 'https://s3.wasabisys.com'


// Log configuration for debugging
console.log('🔧 Wasabi Configuration Check:', {
  accessKey: wasabiAccessKey ? '✅ Set' : '❌ Missing',
  secretKey: wasabiSecretKey ? '✅ Set' : '❌ Missing',
  bucket: wasabiBucket ? '✅ Set' : '❌ Missing',
  region: wasabiRegion,
  endpoint: wasabiEndpoint,
})

// Validate environment variables
if (!wasabiAccessKey || !wasabiSecretKey || !wasabiBucket) {
  console.error('❌ Missing Wasabi environment variables:', {
    VITE_WASABI_ACCESS_KEY: !!wasabiAccessKey,
    VITE_WASABI_SECRET_KEY: !!wasabiSecretKey,
    VITE_WASABI_BUCKET: !!wasabiBucket,
  })
  throw new Error('Missing Wasabi environment variables. Please check your .env file.')
}

// Create S3 client for Wasabi
const s3Client = new S3Client({
  region: wasabiRegion,
  endpoint: wasabiEndpoint,
  credentials: {
    accessKeyId: wasabiAccessKey,
    secretAccessKey: wasabiSecretKey,
  },
  forcePathStyle: true, // Required for Wasabi
})

// Generate unique file key
const generateFileKey = (fileName: string, userId: string): string => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `documents/${userId}/${timestamp}_${randomString}_${sanitizedFileName}`
}

// Upload file to Wasabi
export const uploadToWasabi = async (file: File, userId: string): Promise<{ fileUrl: string; fileKey: string }> => {
  try {
    console.log('📤 Uploading file to Wasabi:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId,
    })

    // Validate file
    const maxSize = 50 * 1024 * 1024 // 50MB for documents
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
      throw new Error('File type not supported. Please upload PDF, DOC, DOCX, images, or text files.')
    }

    // Generate unique file key
    const fileKey = generateFileKey(file.name, userId)
    
    console.log(`📁 Uploading to key: ${fileKey}`)

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
        'uploaded-by': userId,
        'upload-timestamp': Date.now().toString(),
      },
    })

    await s3Client.send(uploadCommand)

    // Generate public URL
    const fileUrl = `${wasabiEndpoint}/${wasabiBucket}/${fileKey}`
    
    console.log('✅ File uploaded to Wasabi successfully:', fileUrl)
    
    return { fileUrl, fileKey }
  } catch (error) {
    console.error('❌ Error uploading to Wasabi:', error)
    throw error
  }
}

// Generate signed URL for secure viewing/downloading
export const generateSignedUrl = async (fileKey: string, expiresIn: number = 3600): Promise<string> => {
  try {
    console.log('🔗 Generating signed URL for:', fileKey)
    
    const command = new GetObjectCommand({
      Bucket: wasabiBucket,
      Key: fileKey,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    
    console.log('✅ Signed URL generated successfully')
    return signedUrl
  } catch (error) {
    console.error('❌ Error generating signed URL:', error)
    throw error
  }
}

// Generate signed URL for downloading with proper headers
export const generateDownloadUrl = async (fileKey: string, fileName: string, expiresIn: number = 3600): Promise<string> => {
  try {
    console.log('📥 Generating download URL for:', fileKey)
    
    const command = new GetObjectCommand({
      Bucket: wasabiBucket,
      Key: fileKey,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    })

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn })
    
    console.log('✅ Download URL generated successfully')
    return downloadUrl
  } catch (error) {
    console.error('❌ Error generating download URL:', error)
    throw error
  }
}

// Delete file from Wasabi
export const deleteFromWasabi = async (fileKey: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting file from Wasabi:', fileKey)
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: wasabiBucket,
      Key: fileKey,
    })

    await s3Client.send(deleteCommand)
    
    console.log('✅ File deleted from Wasabi successfully')
    return true
  } catch (error) {
    console.error('❌ Error deleting from Wasabi:', error)
    return false
  }
}

// Extract file key from Wasabi URL
export const extractFileKeyFromUrl = (url: string): string => {
  try {
    // Wasabi URL format: https://s3.wasabisys.com/bucket-name/file-key
    const urlParts = url.split('/')
    const bucketIndex = urlParts.findIndex(part => part === wasabiBucket)
    if (bucketIndex === -1) throw new Error('Invalid Wasabi URL format')
    
    // Get everything after the bucket name
    const fileKey = urlParts.slice(bucketIndex + 1).join('/')
    
    return fileKey
  } catch (error) {
    console.error('Error extracting file key from Wasabi URL:', error)
    throw new Error('Invalid Wasabi URL format')
  }
}

// Test Wasabi connection
export const testWasabiConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Wasabi connection...')
    
    // Create a small test file
    const testContent = 'Wasabi connection test'
    const testBuffer = new TextEncoder().encode(testContent)
    const testKey = `test/connection-test-${Date.now()}.txt`
    
    // Try to upload
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiBucket,
      Key: testKey,
      Body: testBuffer,
      ContentType: 'text/plain',
    })
    
    await s3Client.send(uploadCommand)
    
    // Clean up test file
    await deleteFromWasabi(testKey)
    
    console.log('✅ Wasabi connection test successful')
    return true
  } catch (error) {
    console.error('❌ Wasabi connection test failed:', error)
    return false
  }
}

// Get file metadata
export const getFileMetadata = async (fileKey: string): Promise<any> => {
  try {
    const command = new GetObjectCommand({
      Bucket: wasabiBucket,
      Key: fileKey,
    })

    const response = await s3Client.send(command)
    
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    }
  } catch (error) {
    console.error('Error getting file metadata:', error)
    throw error
  }
}

export { wasabiBucket, wasabiRegion, wasabiEndpoint }