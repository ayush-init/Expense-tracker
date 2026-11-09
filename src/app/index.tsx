import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LoadingState, ScreenLayout } from '../components/ui';
import { useApp } from '../context/AppContext';

export default function IndexGateScreen() {
  const router = useRouter();
  const { isHydrated, currentUser, activeHousehold } = useApp();

  useEffect(() => {
    if (!isHydrated) return;
    if (!currentUser) {
      router.replace('/auth');
    } else if (!activeHousehold) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)');
    }
  }, [isHydrated, currentUser, activeHousehold, router]);

  return (
    <ScreenLayout>
      <LoadingState label="Opening RoomSync..." />
    </ScreenLayout>
  );
}
