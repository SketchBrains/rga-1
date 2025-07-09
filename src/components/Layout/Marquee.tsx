import React, { useEffect } from 'react'
import { useData } from '../../contexts/DataContext'
import { useLanguage } from '../../contexts/LanguageContext'

const Marquee: React.FC = () => {
  const { announcements, fetchAnnouncements } = useData()
  const { language } = useLanguage()

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  if (announcements.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap flex">
        {/* First set of announcements */}
        <div className="flex">
          {announcements.map((announcement, index) => (
            <span key={`first-${announcement.id}`} className="mx-4 sm:mx-8 inline-flex items-center">
              <span className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold mr-2">
                NEW
              </span>
              <span className="text-sm sm:text-base">
                {language === 'hindi' && announcement.message_hindi 
                  ? announcement.message_hindi 
                  : announcement.message
                }
              </span>
            </span>
          ))}
        </div>
        
        {/* Spacer */}
        <div className="mx-8 sm:mx-16"></div>
        
        {/* Second set of announcements (duplicate for seamless loop) */}
        <div className="flex">
          {announcements.map((announcement, index) => (
            <span key={`second-${announcement.id}`} className="mx-4 sm:mx-8 inline-flex items-center">
              <span className="bg-white text-blue-600 px-2 py-1 rounded-full text-xs font-bold mr-2">
                NEW
              </span>
              <span className="text-sm sm:text-base">
                {language === 'hindi' && announcement.message_hindi 
                  ? announcement.message_hindi 
                  : announcement.message
                }
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Marquee