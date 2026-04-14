import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let _granted: boolean | null = null;

async function ensurePermission(): Promise<boolean> {
  if (_granted !== null) return _granted;
  try {
    _granted = await isPermissionGranted();
    if (!_granted) {
      const res = await requestPermission();
      _granted = res === "granted";
    }
    return _granted;
  } catch { _granted = false; return false; }
}

export async function notify(title: string, body: string): Promise<void> {
  try {
    if (await ensurePermission()) sendNotification({ title, body });
  } catch {}
}
