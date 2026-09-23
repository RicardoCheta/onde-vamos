import { Linking, Platform } from 'react-native';

export async function openDirections(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  const appleUrl = `maps://?daddr=${lat},${lng}&q=${encodedLabel}`;
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const url = Platform.OS === 'ios' ? appleUrl : googleUrl;
  const canOpen = await Linking.canOpenURL(url);
  await Linking.openURL(canOpen ? url : googleUrl);
}
