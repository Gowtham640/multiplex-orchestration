const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface QrCodeRequest {
  ticketData: string;
}

export interface QrCodeResponse {
  qrCodeImage: string;
}

export async function generateQrCode(ticketData: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/qr/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QR API Error:', response.status, errorText);
      throw new Error(`Failed to generate QR code: ${response.status} ${response.statusText}`);
    }

    const data: QrCodeResponse = await response.json();
    
    if (!data.qrCodeImage) {
      throw new Error('QR code image not found in response');
    }
    
    return data.qrCodeImage;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error:', error);
      throw new Error(`Cannot connect to QR service at ${API_URL}. Please ensure the backend is running.`);
    }
    throw error;
  }
}
