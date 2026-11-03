import { Redirect } from 'expo-router';

import { StatusView } from '../components/StatusView';
import { useAuth } from '../store/authStore';

export default function Index() {
  const { hydrated, account } = useAuth();
  if (!hydrated) return <StatusView loading message="Abrindo…" />;
  return <Redirect href={account ? '/categories' : '/login'} />;
}
