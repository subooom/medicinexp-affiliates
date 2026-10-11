// app/(app)/inventory.tsx
import { ComingSoon } from '@/components/common/coming-soon';

export default function InventoryScreen() {
  return (
    <ComingSoon
      title="My Stock"
      icon="cube-outline"
      description="The marketing materials and supplies you're carrying will show up here."
    />
  );
}
