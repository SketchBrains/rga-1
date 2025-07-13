import React from 'react'
import LoadingSkeleton from './LoadingSkeleton'

interface SkeletonCardProps {
  showImage?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showButton?: boolean
  className?: string
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  showTitle = true,
  showDescription = true,
  showButton = true,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 ${className}`}>
      {showImage && (
        <div className="mb-4">
          <LoadingSkeleton height="h-32" width="w-full" />
        </div>
      )}
      
      {showTitle && (
        <div className="mb-3">
          <LoadingSkeleton height="h-6" width="w-3/4" />
        </div>
      )}
      
      {showDescription && (
        <div className="mb-4 space-y-2">
          <LoadingSkeleton height="h-4" width="w-full" />
          <LoadingSkeleton height="h-4" width="w-5/6" />
        </div>
      )}
      
      {showButton && (
        <div className="flex justify-end">
          <LoadingSkeleton height="h-10" width="w-24" />
        </div>
      )}
    </div>
  )
}

export default SkeletonCard