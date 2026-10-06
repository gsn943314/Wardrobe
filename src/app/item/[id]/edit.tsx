import { router, useLocalSearchParams } from 'expo-router';

import { ItemForm } from '@/components/ItemForm';
import { Empty } from '@/components/ui';
import { useWardrobe } from '@/store/WardrobeStore';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useWardrobe().getItem(id);
  if (!item) return <Empty title="找不到這件單品" />;
  return <ItemForm initial={item} onSaved={() => router.back()} />;
}
