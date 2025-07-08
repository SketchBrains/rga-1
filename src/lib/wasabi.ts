import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const wasabiEndpoint = import.meta.env.VITE_WASABI_ENDPOINT
const wasabiAccessKeyId = import.meta.env.VITE_WASABI_ACCESS_KEY_ID
const wasabiSecretAccessKey = import.meta.env.VITE_WASABI_SECRET_ACCESS_KEY
const wasabiBucketName = import.meta.env.VITE_WASABI_BUCKET_NAME

if (!wasabiEndpoint || !wasabiAccessKeyId || !wasabiSecretAccessKey || !wasabiBucketName) {
  throw new Error('Missing Wasabi environment variables. Please check your .env file.')
}

const s3Client = new S3Client({
  endpoint: `https://${wasabiEndpoint}`,
  region: 'us-east-1', // Default region for Wasabi
  credentials: {
    accessKeyId: wasabiAccessKeyId,
    secretAccessKey: wasabiSecretAccessKey,
  },
  forcePathStyle: true, // Required for Wasabi compatibility
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
  return `https://${wasabiBucketName}.${wasabiEndpoint}/${key}`
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

export { s3Client, wasabiBucketName, PutObjectCommand, DeleteObjectCommand }