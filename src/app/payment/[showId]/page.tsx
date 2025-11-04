'use client'
import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseclient";
import type { Session } from "@supabase/supabase-js";
import { generateQrCode } from "../../lib/qrService";

type ShowDetails = {
  id: number;
  movie_name: string;
  language: string;
  show_date: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  available_seats: number;
  theatre_id: string;
  screen_id: number;
};

type TheatreDetails = {
  id: string;
  theatre_name: string;
  address: string;
  city: string;
  state: string;
};

type ScreenDetails = {
  id: number;
  screen_number: number;
  total_rows: number;
  total_columns: number;
};

type Seat = {
  row_number: number;
  col_number: number;
};

function PaymentPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const showId = params?.showId as string | undefined;

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [theatre, setTheatre] = useState<TheatreDetails | null>(null);
  const [screen, setScreen] = useState<ScreenDetails | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        router.push('/auth?mode=signin&redirect=' + encodeURIComponent(`/payment/${showId}?${searchParams.toString()}`));
      }
    } catch {
      // Silent error handling
    }
  }, [router, showId, searchParams]);

  const loadShowDetails = useCallback(async () => {
    if (!showId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/public/shows/${showId}`);
      if (!res.ok) {
        const error = await res.json();
        setError(error.error || 'Failed to load show details');
        return;
      }
      const data = await res.json();
      setShow(data.show);
      setTheatre(data.theatre);
      setScreen(data.screen);
    } catch (e) {
      console.error('Error loading show:', e);
      setError('Failed to load show details');
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    setMounted(true);
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (showId && mounted) {
      loadShowDetails();
      // Parse seats from URL params
      const seatsParam = searchParams.get('seats');
      if (seatsParam) {
        try {
          const parsedSeats = JSON.parse(decodeURIComponent(seatsParam)) as Seat[];
          setSeats(parsedSeats);
        } catch {
          setError('Invalid seat selection');
        }
      }
    }
  }, [showId, mounted, searchParams, loadShowDetails]);

  const getRowLabel = (row: number): string => {
    return String.fromCharCode(65 + row); // A, B, C, etc.
  };

  const generateUpiQrCode = useCallback(async () => {
    if (!show || seats.length === 0) return;

    try {
      setLoadingQr(true);
      
      const totalAmount = show.ticket_price * seats.length;
      
      // Build UPI payment link with pre-filled amount
      const upiParams = new URLSearchParams({
        pa: 'grizigowtham@okhdfcbank',
        pn: 'Gowtham Ramakrishna Rayapureddi',
        am: totalAmount.toFixed(2),
        cu: 'INR',
        aid: 'uGICAgIDjkPzTJw'
      });
      
      const upiLink = `upi://pay?${upiParams.toString()}`;
      
      // Generate QR code from UPI link
      const qrImage = await generateQrCode(upiLink);
      setQrCodeImage(qrImage);
    } catch (err) {
      console.error('Error generating UPI QR code:', err);
      setError('Failed to generate payment QR code');
    } finally {
      setLoadingQr(false);
    }
  }, [show, seats]);

  useEffect(() => {
    if (show && seats.length > 0 && mounted) {
      generateUpiQrCode();
    }
  }, [show, seats, mounted, generateUpiQrCode]);

  const handleConfirmPayment = async () => {
    if (!session || !showId || seats.length === 0) {
      setError('Missing required information');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const token = session.access_token;
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ show_id: parseInt(showId), seats })
      });

      if (!res.ok) {
        const error = await res.json();
        setError(error.error || 'Failed to complete booking');
        return;
      }

      const data = await res.json();
      // Redirect to bookings page after successful booking
      router.push(`/bookings?booking_id=${data.bookings[0]?.id || ''}`);
    } catch (e) {
      console.error('Error completing booking:', e);
      setError('Failed to complete booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-neutral-400">Loading payment details...</p>
        </div>
      </main>
    );
  }

  if (error && !show) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-900/20 border border-red-800 p-4">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => router.push('/home')}
              className="mt-4 rounded-md bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!show || !theatre || !screen || seats.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-neutral-400">Invalid booking information</p>
          <button
            onClick={() => router.push('/home')}
            className="mt-4 rounded-md bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
          >
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  const totalAmount = show.ticket_price * seats.length;

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Side - Booking Summary */}
          <div className="space-y-4">
            <div className="rounded-lg bg-neutral-900 p-6">
              <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-neutral-400">Movie</div>
                  <div className="font-medium">{show.movie_name}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">Language</div>
                  <div>{show.language || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">Date & Time</div>
                  <div>{new Date(show.show_date).toLocaleDateString()} • {show.start_time} - {show.end_time}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">Theatre</div>
                  <div>{theatre.theatre_name}</div>
                  <div className="text-sm text-neutral-400">{theatre.city}, {theatre.state}</div>
                </div>
                <div>
                  <div className="text-sm text-neutral-400">Screen</div>
                  <div>Screen {screen.screen_number}</div>
                </div>
                <div className="pt-3 border-t border-neutral-800">
                  <div className="text-sm text-neutral-400 mb-2">Selected Seats</div>
                  <div className="flex flex-wrap gap-2">
                    {seats.map((seat, idx) => (
                      <span key={idx} className="rounded bg-blue-600 px-2 py-1 text-xs">
                        {getRowLabel(seat.row_number)}{seat.col_number + 1}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400">Number of Seats</span>
                    <span className="font-semibold">{seats.length}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-400">Price per Seat</span>
                    <span className="font-semibold">₹{show.ticket_price}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-xl font-bold text-green-400">₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Payment */}
          <div className="space-y-4">
            <div className="rounded-lg bg-neutral-900 p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
              
              <div className="space-y-4">
                {/* UPI Payment QR Code */}
                <div className="bg-white rounded-lg p-6 flex items-center justify-center">
                  <div className="text-center">
                    {loadingQr ? (
                      <div className="w-48 h-48 mx-auto bg-neutral-200 rounded-lg flex items-center justify-center mb-4">
                        <div className="text-neutral-600 text-xs text-center p-4">
                          <div className="text-sm">Generating QR Code...</div>
                        </div>
                      </div>
                    ) : qrCodeImage ? (
                      <>
                        <img
                          src={`data:image/png;base64,${qrCodeImage}`}
                          alt="UPI Payment QR Code"
                          className="w-48 h-48 mx-auto mb-4"
                        />
                        <div className="text-xs text-neutral-400 mb-2">
                          Amount: ₹{show ? (show.ticket_price * seats.length).toFixed(2) : '0.00'}
                        </div>
                      </>
                    ) : (
                      <div className="w-48 h-48 mx-auto bg-neutral-200 rounded-lg flex items-center justify-center mb-4">
                        <div className="text-neutral-600 text-xs text-center p-4">
                          <div className="text-lg mb-2">📱</div>
                          <div>QR Code</div>
                          <div className="mt-2 text-[10px]">Scan to Pay</div>
                          <div className="mt-1 text-[8px] text-neutral-500">
                            UPI ID: grizigowtham@okhdfcbank
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-neutral-400">
                      Scan QR code with your UPI app to pay
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="space-y-2 text-sm text-neutral-300">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Open your UPI app (GPay, PhonePe, Paytm, etc.)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Scan the QR code above</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Enter amount: ₹{totalAmount}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Complete payment</span>
                  </div>
                </div>

                {/* Alternative Payment */}
                <div className="pt-4 border-t border-neutral-800">
                  <div className="text-sm text-neutral-400 mb-2">Or pay directly</div>
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-300">
                      UPI ID: <span className="font-mono">theatre@payments</span>
                    </div>
                    <div className="text-sm text-neutral-300">
                      Amount: <span className="font-semibold text-green-400">₹{totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Payment Button */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={processing}
                  className="w-full rounded-md bg-green-600 px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {processing ? 'Processing...' : 'Confirm Payment'}
                </button>

                <p className="text-xs text-center text-neutral-400">
                  By confirming, you agree that payment has been completed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}

