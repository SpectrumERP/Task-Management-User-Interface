import { useLocation } from 'react-router-dom';
import { DealForm } from './DealForm';
import { DealSearchPage } from './DealSearchPage';

export function DealManager() {
  const location = useLocation();
  const isFormPage = location.pathname.endsWith('/new') || location.pathname.includes('/edit/') || /^\/sales\/deals\/[^/]+$/.test(location.pathname);

  return isFormPage ? <DealForm /> : <DealSearchPage />;
}
