// Secure Wasabi integration using Supabase Edge Functions
// All sensitive credentials are now handled server-side

import { supabase } from './supabase'

// Generate unique file key for organization
const generateFileKey = (fileName: string, userId: string): string => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `documents/${userId}/${timestamp}_${randomString}_${sanitizedFileName}`
}

// Helper function to handle Edge Function errors
const handleEdgeFunctionError = (result: any, operation: string) => {
  if (!result.success) {
    const error = new Error(result.error || `${operation} failed`)
    
    // Add error code for better handling
    if (result.code) {
      (error as any).code = result.code
    }
    
    // Handle session expiration specifically
    if (result.code === 'SESSION_EXPIRED') {
      console.error('🔐 Session expired during', operation)
      // The AuthContext will handle this through the error boundary
      throw new Error('Your session has expired. Please log in again.')
    }
    
    throw error
  }
}

// Get current session token for Edge Function calls
const getSessionToken = async (): Promise<string> => {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session?.access_token) {
    console.error('❌ No valid session found:', error)
    throw new Error('Authentication required. Please log in again.')
  }
  
  return session.access_token
}

// Upload file to Wasabi via Edge Function
export const uploadToWasabi = async (file: File, userId: string): Promise<{ fileKey: string }> => {
  try {
    console.log('📤 Uploading file via Edge Function:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId,
    })

    // Validate file client-side first
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
      throw new Error('File type not supported. Please upload PDF, DOC, DOCX, images, or text files.')
    }

    // Get current session token
    const token = await getSessionToken()

    // Create form data
    const formData = new FormData()
    formData.append('file', file)

    // Call Edge Function with authentication
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-file`
    const headers = {
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: formData,
    })

    const result = await response.json()
    
    // Handle Edge Function errors
    handleEdgeFunctionError(result, 'upload')

    console.log('✅ File uploaded successfully via Edge Function:', result.fileKey)
    return { fileKey: result.fileKey }
  } catch (error) {
    console.error('❌ Error uploading via Edge Function:', error)
    throw error
  }
}

// Generate presigned URL for viewing via Edge Function
export const generateSignedUrl = async (fileKey: string, expiresIn: number = 3600): Promise<string> => {
  try {
    console.log('🔗 Generating signed URL via Edge Function:', fileKey)
    
    // Get current session token
    const token = await getSessionToken()
    
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-signed-url`
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileKey,
        expiresIn,
        download: false,
      }),
    })

    const result = await response.json()

    // Handle Edge Function errors
    handleEdgeFunctionError(result, 'generate signed URL')

    console.log('✅ Signed URL generated successfully via Edge Function')
    return result.signedUrl
  } catch (error) {
    console.error('❌ Error generating signed URL via Edge Function:', error)
    throw error
  }
}

// Generate presigned URL for downloading via Edge Function
export const generateDownloadUrl = async (fileKey: string, fileName: string, expiresIn: number = 3600): Promise<string> => {
  try {
    console.log('📥 Generating download URL via Edge Function:', fileKey)
    
    // Get current session token
    const token = await getSessionToken()
    
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-signed-url`
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileKey,
        fileName,
        expiresIn,
        download: true,
      }),
    })

    const result = await response.json()

    // Handle Edge Function errors
    handleEdgeFunctionError(result, 'generate download URL')

    console.log('✅ Download URL generated successfully via Edge Function')
    return result.signedUrl
  } catch (error) {
    console.error('❌ Error generating download URL via Edge Function:', error)
    throw error
  }
}

// Delete file from Wasabi via Edge Function
export const deleteFromWasabi = async (fileKey: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting file via Edge Function:', fileKey)
    
    // Get current session token
    const token = await getSessionToken()
    
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-file`
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileKey,
      }),
    })

    const result = await response.json()

    // Handle Edge Function errors
    handleEdgeFunctionError(result, 'delete file')

    console.log('✅ File deleted successfully via Edge Function')
    return true
  } catch (error) {
    console.error('❌ Error deleting via Edge Function:', error)
    
    // For delete operations, we might want to be more lenient
    // If it's a session error, throw it, otherwise just return false
    if (error.message?.includes('session has expired') || error.message?.includes('Authentication required')) {
      throw error
    }
    
    return false
  }
}

// Extract file key from Wasabi URL (for legacy URLs, if needed)
export const extractFileKeyFromUrl = (url: string): string => {
  try {
    // Handle both old direct URLs and new file keys
    if (url.startsWith('documents/')) {
      return url // Already a file key
    }
    
    // Extract from full URL
    const urlParts = url.split('/')
    const documentsIndex = urlParts.findIndex(part => part === 'documents')
    if (documentsIndex === -1) throw new Error('Invalid URL format')
    
    const fileKey = urlParts.slice(documentsIndex).join('/')
    return fileKey
  } catch (error) {
    console.error('Error extracting file key from URL:', error)
    throw new Error('Invalid URL format')
  }
}

// Test connection via Edge Function
export const testWasabiConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Wasabi connection via Edge Function...')
    
    // Create a small test file
    const testContent = 'Wasabi connection test'
    const testFile = new File([testContent], 'connection-test.txt', { type: 'text/plain' })
    
    // Try to upload and then delete
    const { fileKey } = await uploadToWasabi(testFile, 'test-user')
    const deleted = await deleteFromWasabi(fileKey)
    
    if (deleted) {
      console.log('✅ Wasabi connection test successful via Edge Function')
      return true
    } else {
      console.warn('⚠️ Upload succeeded but delete failed')
      return false
    }
  } catch (error) {
    console.error('❌ Wasabi connection test failed via Edge Function:', error)
    return false
  }
}

// Get file metadata (placeholder - would need additional Edge Function)
export const getFileMetadata = async (fileKey: string): Promise<any> => {
  try {
    // This would require an additional Edge Function to implement
    // For now, return basic metadata
    return {
      fileKey,
      message: 'Metadata retrieval requires additional Edge Function implementation'
    }
  } catch (error) {
    console.error('Error getting file metadata:', error)
    throw error
  }
}

// Export configuration info (without sensitive data)
export const wasabiConfig = {
  message: 'Wasabi integration now secured via Supabase Edge Functions with session validation',
  features: [
    'Secure credential handling',
    'Server-side file operations',
    'Session validation and authentication',
    'File ownership verification',
    'Presigned URL generation',
    'File upload/download/delete with proper authorization'
  ]
}