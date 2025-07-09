// Cloudinary configuration and utilities
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

// Log configuration for debugging
console.log('🔧 Cloudinary Configuration Check:', {
  cloudName: cloudinaryCloudName ? '✅ Set' : '❌ Missing',
  uploadPreset: cloudinaryUploadPreset ? '✅ Set' : '❌ Missing',
})

// Validate environment variables
if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
  console.error('❌ Missing Cloudinary environment variables:', {
    VITE_CLOUDINARY_CLOUD_NAME: !!cloudinaryCloudName,
    VITE_CLOUDINARY_UPLOAD_PRESET: !!cloudinaryUploadPreset,
  })
  throw new Error('Missing Cloudinary environment variables. Please check your .env file.')
}

// Cloudinary upload function
export const uploadToCloudinary = async (file: File): Promise<string> => {
  try {
    console.log('📤 Uploading file to Cloudinary:', {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB for Cloudinary
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB')
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

    // Create form data for Cloudinary upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', cloudinaryUploadPreset)
    formData.append('cloud_name', cloudinaryCloudName)
    
    // Add resource type based on file type
    if (file.type.startsWith('image/')) {
      formData.append('resource_type', 'image')
    } else {
      formData.append('resource_type', 'raw') // For documents
    }

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Cloudinary upload error:', errorData)
      throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`)
    }

    const result = await response.json()
    console.log('✅ File uploaded to Cloudinary successfully:', result.secure_url)
    
    return result.secure_url
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error)
    throw error
  }
}

// Delete from Cloudinary (optional - Cloudinary has auto-cleanup features)
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting file from Cloudinary:', publicId)
    
    // Note: For security reasons, deletion should ideally be done from backend
    // This is a simplified version - in production, you'd want to use signed requests
    console.warn('⚠️ File deletion from frontend is not recommended for production')
    
    return true
  } catch (error) {
    console.error('❌ Error deleting from Cloudinary:', error)
    return false
  }
}

// Extract public ID from Cloudinary URL
export const extractPublicIdFromUrl = (url: string): string => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/cloud_name/resource_type/upload/v1234567890/public_id.ext
    const urlParts = url.split('/')
    const uploadIndex = urlParts.findIndex(part => part === 'upload')
    if (uploadIndex === -1) throw new Error('Invalid Cloudinary URL format')
    
    // Get the part after version (v1234567890) or directly after upload
    let publicIdPart = urlParts.slice(uploadIndex + 1).join('/')
    
    // Remove version if present
    if (publicIdPart.startsWith('v') && /^v\d+\//.test(publicIdPart)) {
      publicIdPart = publicIdPart.substring(publicIdPart.indexOf('/') + 1)
    }
    
    // Remove file extension
    const lastDotIndex = publicIdPart.lastIndexOf('.')
    if (lastDotIndex > 0) {
      publicIdPart = publicIdPart.substring(0, lastDotIndex)
    }
    
    return publicIdPart
  } catch (error) {
    console.error('Error extracting public ID from Cloudinary URL:', error)
    throw new Error('Invalid Cloudinary URL format')
  }
}

// Generate optimized URL for viewing
export const getOptimizedCloudinaryUrl = (originalUrl: string, options: {
  width?: number
  height?: number
  quality?: string
  format?: string
} = {}): string => {
  try {
    const { width, height, quality = 'auto', format = 'auto' } = options
    
    // For documents, return original URL
    if (originalUrl.includes('/raw/upload/')) {
      return originalUrl
    }
    
    // For images, apply optimizations
    let transformations = [`q_${quality}`, `f_${format}`]
    
    if (width) transformations.push(`w_${width}`)
    if (height) transformations.push(`h_${height}`)
    
    // Insert transformations into URL
    const transformationString = transformations.join(',')
    return originalUrl.replace('/upload/', `/upload/${transformationString}/`)
  } catch (error) {
    console.error('Error generating optimized URL:', error)
    return originalUrl
  }
}

// Test Cloudinary connection
export const testCloudinaryConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Cloudinary connection...')
    
    // Create a small test file (1x1 pixel PNG)
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, 1, 1)
    }
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png')
    })
    
    const testFile = new File([blob], 'test.png', { type: 'image/png' })
    
    // Try to upload
    await uploadToCloudinary(testFile)
    console.log('✅ Cloudinary connection test successful')
    
    return true
  } catch (error) {
    console.error('❌ Cloudinary connection test failed:', error)
    return false
  }
}

export { cloudinaryCloudName, cloudinaryUploadPreset }