import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'

interface Announcement {
  id: string
  message: string
  message_hindi?: string
  is_active: boolean
  created_at: string
}

const Marquee: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const { language } = useLanguage()

  useEffect(() => {
    fetchAnnouncements()

    // Set up real-time subscription for announcements
    const subscription = supabase
      .channel('announcements')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          fetchAnnouncements()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching announcements:', error)
        return
      }

      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    }
  }

  if (announcements.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        {announcements.map((announcement, index) => (
          <span key={announcement.id} className="mx-4 sm:mx-8 inline-flex items-center">
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
  )
}

export default Marquee