import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const wasabiEndpoint = import.meta.env.VITE_WASABI_ENDPOINT
const wasabiAccessKeyId = import.meta.env.VITE_WASABI_ACCESS_KEY_ID
const wasabiSecretAccessKey = import.meta.env.VITE_WASABI_SECRET_ACCESS_KEY
const wasabiBucketName = import.meta.env.VITE_WASABI_BUCKET_NAME

console.log('🔧 Wasabi Configuration Check:', {
  endpoint: wasabiEndpoint ? '✅ Set' : '❌ Missing',
  accessKeyId: wasabiAccessKeyId ? '✅ Set' : '❌ Missing',
  secretAccessKey: wasabiSecretAccessKey ? '✅ Set' : '❌ Missing',
  bucketName: wasabiBucketName ? '✅ Set' : '❌ Missing'
})

if (!wasabiEndpoint || !wasabiAccessKeyId || !wasabiSecretAccessKey || !wasabiBucketName) {
  console.error('❌ Missing Wasabi environment variables:', {
    VITE_WASABI_ENDPOINT: !!wasabiEndpoint,
    VITE_WASABI_ACCESS_KEY_ID: !!wasabiAccessKeyId,
    VITE_WASABI_SECRET_ACCESS_KEY: !!wasabiSecretAccessKey,
    VITE_WASABI_BUCKET_NAME: !!wasabiBucketName
  })
  throw new Error('Missing Wasabi environment variables. Please check your .env file.')
}

// Ensure endpoint doesn't have protocol prefix
const cleanEndpoint = wasabiEndpoint.replace(/^https?:\/\//, '')

const s3Client = new S3Client({
  endpoint: `https://${cleanEndpoint}`,
  region: 'us-east-1', // Default region for Wasabi
  credentials: {
    accessKeyId: wasabiAccessKeyId,
    secretAccessKey: wasabiSecretAccessKey,
  },
  forcePathStyle: false, // Use virtual-hosted-style URLs for better compatibility
})

// Helper function to generate unique file paths
export const generateFilePath = (userId: string, category: string, fieldId?: string): string => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  
  if (fieldId) {
    return `${category}/${userId}/${fieldId}/${timestamp}_${randomId}`
  }
  return `${category}/${userId}/${timestamp}_${randomId}`
}

// Helper function to get public URL for uploaded file
export const getWasabiPublicUrl = (key: string): string => {
  return `https://${wasabiBucketName}.${cleanEndpoint}/${key}`
}

// Helper function to extract key from Wasabi URL
export const extractKeyFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    // Remove the first empty element from split
    return pathParts.slice(1).join('/')
  } catch (error) {
    console.error('Error parsing Wasabi URL:', error)
    throw new Error('Invalid Wasabi URL format')
  }
}

// Test function to verify Wasabi connection
export const testWasabiConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Wasabi connection...')
    
    // Create a small test file
    const testContent = new TextEncoder().encode('test-connection')
    const testKey = `test/${Date.now()}_connection_test.txt`
    
    const uploadCommand = new PutObjectCommand({
      Bucket: wasabiBucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      ACL: 'public-read',
    })

    await s3Client.send(uploadCommand)
    console.log('✅ Wasabi connection test successful')
    
    // Clean up test file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: wasabiBucketName,
      Key: testKey,
    })
    await s3Client.send(deleteCommand)
    
    return true
  } catch (error) {
    console.error('❌ Wasabi connection test failed:', error)
    return false
  }
}

export { s3Client, wasabiBucketName, PutObjectCommand, DeleteObjectCommand }