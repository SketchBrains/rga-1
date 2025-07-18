import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { User } from '../../lib/supabase';
import { Profile } from '../../lib/supabase';
import {
  Home,
  FileText,
  FolderOpen,
  Clock,
  Users,
  PlusCircle,
  Download,
  Megaphone,
  X,
  UserSearch,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  currentProfile: Profile | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, currentUser, currentProfile, isOpen = true, onClose }) => {
  const { } = useAuth(); // No direct use of user from context
  const { t } = useLanguage();

  const studentTabs = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'applications', label: t('nav.applications'), icon: FileText },
    { id: 'documents', label: t('nav.documents'), icon: FolderOpen },
    { id: 'history', label: t('nav.history'), icon: Clock },
  ];

  const adminTabs = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'forms', label: 'Create/Edit Forms', icon: PlusCircle },
    { id: 'applications', label: 'View Applications', icon: Users },
    { id: 'student-detail', label: 'Student Details', icon: UserSearch },
    { id: 'user-management', label: 'User Management', icon: Users },
    { id: 'marquee', label: 'Marquee Editor', icon: Megaphone },
    { id: 'export', label: 'Export Data', icon: Download },
  ];

  const tabs = currentUser?.role === 'admin' ? adminTabs : studentTabs;

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`
          fixed lg:static top-16 lg:top-0 bottom-0 left-0 z-50 lg:z-auto
          w-64 bg-white border-r border-gray-200 h-full
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {onClose && (
          <div className="lg:hidden flex justify-end p-4">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <nav className="mt-4 lg:mt-8 px-4 h-full overflow-y-auto">
          <ul className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
