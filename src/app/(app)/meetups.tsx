// app/(app)/meetups.tsx
import { ComingSoon } from '@/components/common/coming-soon';

export default function MeetupsScreen() {
  return (
    <ComingSoon
      title="Meetups"
      icon="people-circle-outline"
      description="Meetups scheduled with your programs will show up here."
    />
  );
}
