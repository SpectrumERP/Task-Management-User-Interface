import { useNavigate, useParams } from 'react-router-dom';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import { MeetingListView } from '@/components/meetings/MeetingListView';

export default function MeetingNotesPage({ isListView = false }: { isListView?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();

  if (isListView) {
    return (
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gradient-to-br from-slate-50 to-[#e8f1f8] h-full">
        <MeetingListView />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gradient-to-br from-slate-50 to-[#e8f1f8] h-full flex flex-col relative">
      <MeetingForm 
        onComplete={() => navigate('/meetings')} 
        meetingNotesNo={id ? parseInt(id) : undefined} 
      />
    </div>
  );
}
