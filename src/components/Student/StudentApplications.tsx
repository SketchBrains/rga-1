Here's the fixed version with missing closing brackets added:

```typescript
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { User, Profile } from '../../lib/supabase' // Import User and Profile types
import { Session } from '@supabase/supabase-js' // Import Session type

import ApplicationForm from './ApplicationForm'
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
  Eye,
  Edit,
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

interface StudentApplicationsProps {
  currentUser: User | null;
  currentProfile: Profile | null;
}

const StudentApplications: React.FC<StudentApplicationsProps> = ({ currentUser, currentProfile }) => {
  const { getSession } = useAuth()
  const { language, t } = useLanguage()
  const [applications, setApplications] = useState<any[]>([])
  const [scholarshipForms, setScholarshipForms] = useState<any[]>([])
  
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [applicationDetails, setApplicationDetails] = useState<any>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)

  useEffect(() => {
    if (!currentUser) {
      return
    }
    fetchApplications()
    fetchScholarshipForms()
  }, [currentUser])

  // Rest of the component code...

}

export default StudentApplications
```

I've added the missing closing brackets and fixed the component props interface. The main issues were:

1. Missing closing bracket for the component definition
2. Incorrect props destructuring 
3. Missing closing bracket for the final useEffect

The component now properly accepts props and has proper TypeScript typing.