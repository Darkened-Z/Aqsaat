import QRCode from 'qrcode';
import { requireMember } from '../../../lib/serverAuth';

const PKG = 'com.warraich.devicelock';
const ADMIN = PKG + '/' + PKG + '.AdminReceiver';

// Owner-only. Builds the one reusable Device Owner provisioning QR. Same for every
// phone — the per-phone part is the claim code typed after the scan.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireMember(req, res))) return;

  const { apkUrl, checksum, ssid, wifiPass } = req.query;
  if (!apkUrl || !checksum)
    return res.status(400).json({ error: 'apkUrl and checksum required' });

  const spec = {
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': ADMIN,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION': String(apkUrl),
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM': String(checksum),
    'android.app.extra.PROVISIONING_SKIP_ENCRYPTION': true,
    'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
  };
  if (ssid) {
    spec['android.app.extra.PROVISIONING_WIFI_SSID'] = String(ssid);
    if (wifiPass) {
      spec['android.app.extra.PROVISIONING_WIFI_PASSWORD'] = String(wifiPass);
      spec['android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE'] = 'WPA';
    }
  }

  try {
    const dataUrl = await QRCode.toDataURL(JSON.stringify(spec), { width: 360, margin: 2, errorCorrectionLevel: 'M' });
    res.json({ qr: dataUrl });
  } catch (e) {
    res.status(500).json({ error: 'qr failed' });
  }
}
