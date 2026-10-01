import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { MeetingForm } from '@/components/meetings/MeetingForm';
import { MeetingListView } from '@/components/meetings/MeetingListView';
import { useFormRights } from '@/hooks/useFormRights';

export default function MeetingNotesPage({ isListView = false }: { isListView?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isSave, isUpdate } = useFormRights(1559);

  const isNew = !id && !isListView;
  const isEdit = !!id && !isListView;

  useEffect(() => {
    if (isNew && !isSave) {
      toast.error('You do not have permission to create meeting notes.', { id: 'no-create-meeting-permission' });
      navigate('/meetings', { replace: true });
    }
    if (isEdit && !isUpdate) {
      toast.error('You do not have permission to edit meeting notes.', { id: 'no-update-meeting-permission' });
      navigate('/meetings', { replace: true });
    }
  }, [isNew, isEdit, isSave, isUpdate, navigate]);

  if (isListView) {
    return <MeetingListView />;
  }

  return (
    <div className="page-shell-scroll flex flex-col relative">
      <MeetingForm 
        onComplete={() => navigate('/meetings')} 
        meetingNotesNo={id ? parseInt(id) : undefined} 
      />
    </div>
  );
}
