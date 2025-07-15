import React, { useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { User } from '../../lib/supabase'
import { Profile } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Utility function to sanitize text content
const sanitizeText = (text: string): string => {
  // Basic XSS prevention - remove potentially dangerous characters
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

interface MarqueeProps {
  currentUser: User | null;
  currentProfile: Profile | null;
}

const Marquee: React.FC<MarqueeProps> = ({ currentUser, currentProfile }) => {
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const { language } = useLanguage()
  const { getSession } = useAuth();

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching announcements:', error);
    else setAnnouncements(data || []);
  };
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
                {sanitizeText(language === 'hindi' && announcement.message_hindi 
                  ? announcement.message_hindi 
                  : announcement.message
                )}
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
                {sanitizeText(language === 'hindi' && announcement.message_hindi 
                  ? announcement.message_hindi 
                  : announcement.message
                )}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Marquee