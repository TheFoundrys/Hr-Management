import jwt from 'jsonwebtoken';

const QR_SECRET = process.env.QR_SECRET || 'university-attendance-secret-key';

export function generateQrToken(employeeId: string, tenantId: string) {
  return jwt.sign(
    { employeeId, tenantId, timestamp: Date.now() },
    QR_SECRET,
    { expiresIn: '1m' } // 60 seconds expiration
  );
}

export function verifyQrToken(token: string) {
  try {
    const payload = jwt.verify(token, QR_SECRET) as any;
    return {
      success: true,
      employeeId: payload.employeeId,
      tenantId: payload.tenantId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}
