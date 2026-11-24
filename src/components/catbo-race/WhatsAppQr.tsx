import { qrMatrix, qrPath } from "@/lib/qr";
import { whatsapp } from "@/lib/whatsapp";
import { OTP_REQUEST_TEXT } from "@/lib/game-claims";

// The QR code for the game's code: scanned with the customer's own phone, it opens our WhatsApp chat
// there with "GET OTP" typed. Drawn from the WhatsApp number in the settings, so it follows it.
const QUIET = 3; // the white margin scanners need, in modules
const matrix = qrMatrix(whatsapp(OTP_REQUEST_TEXT));
const path = matrix ? qrPath(matrix) : "";

export function WhatsAppQr({ className = "" }: { className?: string }) {
  if (!matrix) return null;
  const size = matrix.length + QUIET * 2;
  return (
    <svg
      viewBox={`${-QUIET} ${-QUIET} ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code: opens WhatsApp on your phone with ${OTP_REQUEST_TEXT} ready to send`}
      className={`aspect-square rounded-xl bg-white ${className}`}
    >
      <path d={path} fill="#003049" />
    </svg>
  );
}
