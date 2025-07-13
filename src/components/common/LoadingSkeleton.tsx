import React from 'react'

interface LoadingSkeletonProps {
  className?: string
  count?: number
  height?: string
  width?: string
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = '', 
  count = 1, 
  height = 'h-4', 
  width = 'w-full' 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`}
        />
      ))}
    </>
  )
}

export default LoadingSkeleton