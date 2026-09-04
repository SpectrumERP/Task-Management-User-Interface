import { ComponentType } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { MasterType } from './shared/masterRoutes';
import { TypeForm } from './type/TypeForm';
import { TypeList } from './type/TypeList';
import { VesselForm } from './vessel/VesselForm';
import { VesselList } from './vessel/VesselList';
import { MeetingCategoryForm } from './meeting-category/MeetingCategoryForm';
import { MeetingCategoryList } from './meeting-category/MeetingCategoryList';
import { MeetingTypeForm } from './meeting-type/MeetingTypeForm';
import { MeetingTypeList } from './meeting-type/MeetingTypeList';
import { BusinessEntityTypeForm } from './business-entity-type/BusinessEntityTypeForm';
import { BusinessEntityTypeList } from './business-entity-type/BusinessEntityTypeList';
import { CountryForm } from './country/CountryForm';
import { CountryList } from './country/CountryList';
import { BenefitTypeForm } from './benefit-type/BenefitTypeForm';
import { BenefitTypeList } from './benefit-type/BenefitTypeList';
import { PriorityForm } from './priority/PriorityForm';
import { PriorityList } from './priority/PriorityList';
import { FolderForm } from './folder/FolderForm';
import { FolderList } from './folder/FolderList';
import { UserGroupForm } from './user-group/UserGroupForm';
import { UserGroupList } from './user-group/UserGroupList';
import { CategoryForm } from './category/CategoryForm';
import { CategoryList } from './category/CategoryList';
import { StateForm } from './state/StateForm';
import { StateList } from './state/StateList';
import { CityForm } from './city/CityForm';
import { CityList } from './city/CityList';
import { PortForm } from './port/PortForm';
import { PortList } from './port/PortList';
import { TaskCompanyForm } from './task-company/TaskCompanyForm';
import { TaskCompanyList } from './task-company/TaskCompanyList';
import { LocationForm } from './location/LocationForm';
import { LocationList } from './location/LocationList';
import { CompanyForm } from './company/CompanyForm';
import { CompanyList } from './company/CompanyList';

interface MasterManagerProps {
  type: MasterType;
}

interface EntityModule {
  Form: ComponentType<{ id?: string }>;
  List: ComponentType;
}

const ENTITY_REGISTRY: Record<MasterType, EntityModule> = {
  type: { Form: TypeForm, List: TypeList },
  vessel: { Form: VesselForm, List: VesselList },
  'meeting-category': { Form: MeetingCategoryForm, List: MeetingCategoryList },
  'meeting-type': { Form: MeetingTypeForm, List: MeetingTypeList },
  'business-entity-type': { Form: BusinessEntityTypeForm, List: BusinessEntityTypeList },
  country: { Form: CountryForm, List: CountryList },
  'benefit-type': { Form: BenefitTypeForm, List: BenefitTypeList },
  priority: { Form: PriorityForm, List: PriorityList },
  folder: { Form: FolderForm, List: FolderList },
  'user-group': { Form: UserGroupForm, List: UserGroupList },
  category: { Form: CategoryForm, List: CategoryList },
  state: { Form: StateForm, List: StateList },
  city: { Form: CityForm, List: CityList },
  port: { Form: PortForm, List: PortList },
  'task-company': { Form: TaskCompanyForm, List: TaskCompanyList },
  location: { Form: LocationForm, List: LocationList },
  company: { Form: CompanyForm, List: CompanyList },
};

export function MasterManager({ type }: MasterManagerProps) {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isFormPage = location.pathname.endsWith('/new') || !!id;

  const { Form, List } = ENTITY_REGISTRY[type];
  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {isFormPage ? <Form id={id} /> : <List />}
    </div>
  );
}
