export const DISCLAIMER_ACK_KEY = 'disclaimer_ack_v1';

export function hasAcknowledgedDisclaimer() {
  try {
    return localStorage.getItem(DISCLAIMER_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function acknowledgeDisclaimer() {
  try {
    localStorage.setItem(DISCLAIMER_ACK_KEY, 'true');
  } catch {
    // localStorage kapalıysa da analiz engellenmesin; kapı her oturumda tekrar çıkar.
  }
}
