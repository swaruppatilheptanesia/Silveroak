import { useRole } from '@/contexts/RoleContext';
import MyProfile from '../shared/MyProfile';

export default function AdminProfile() {
  const { currentRole } = useRole();
  const label = currentRole === 'tpo_employee' ? 'TPO Employee' : 'TPO Admin';
  return <MyProfile roleLabel={label} />;
}
