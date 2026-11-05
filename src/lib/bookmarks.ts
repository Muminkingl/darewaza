import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalBookmarks } from '../../shared/localBookmarks';
const stores = new Map<string,LocalBookmarks>();
export function deviceBookmarks(userId: string) {
  let store=stores.get(userId);
  if (!store) { store=new LocalBookmarks(AsyncStorage,userId); stores.set(userId,store); }
  return store;
}
export async function deleteDeviceBookmarks(userId: string) {
  await deviceBookmarks(userId).clear();
  stores.delete(userId);
}
