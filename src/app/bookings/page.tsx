'use client'
import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "../lib/supabaseclient";
import type { Session } from "@supabase/supabase-js";
import { generateQrCode } from "../lib/qrService";

type Booking = {
  show_id: number;
  movie_name: string;
  language: string;
  show_date: string;
  start_time: string;
  end_time: string;
  ticket_price: number;
  theatre_name: string;
  city: string;
  state: string;
  screen_number: number;
  booked_at: string;
  seats: Array<{
    id: number;
    row_number: number;
    col_number: number;
  }>;
  total_amount: number;
};

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Map<number, string>>(new Map());
  const [loadingQr, setLoadingQr] = useState<Set<number>>(new Set());

  const loadSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        router.push('/auth?mode=signin&redirect=/bookings');
      }
    } catch (e) {
      console.error('Error loading session:', e);
    }
  }, [router]);

  const loadBookings = useCallback(async () => {
    if (!session?.access_token) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const error = await res.json();
        setError(error.error || 'Failed to load bookings');
        return;
      }

      const data = await res.json();
      setBookings(data.bookings || []);
      
      // Show success message if redirected from payment
      if (bookingId) {
        setSuccessMessage('Booking confirmed successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (e) {
      console.error('Error loading bookings:', e);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, bookingId]);

  useEffect(() => {
    setMounted(true);
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session && mounted) {
      loadBookings();
    }
  }, [session, mounted, loadBookings]);

  const getRowLabel = (row: number): string => {
    return String.fromCharCode(65 + row); // A, B, C, etc.
  };

  const handleGenerateQr = async (booking: Booking) => {
    const bookingKey = booking.show_id;
    
    // Check if QR code already exists
    if (qrCodes.has(bookingKey)) {
      return;
    }

    try {
      setLoadingQr(prev => new Set(prev).add(bookingKey));
      
      // Get user info from session for customer name
      const userEmail = session?.user?.email || 'Guest';
      const userName = session?.user?.user_metadata?.name || userEmail;
      
      // Format ticket data as JSON string
      const ticketData = JSON.stringify({
        bookingId: `${booking.show_id}-${booking.seats[0]?.id || ''}`,
        movieName: booking.movie_name,
        showTime: `${booking.show_date}T${booking.start_time}`,
        seats: booking.seats.map(seat => `${getRowLabel(seat.row_number)}${seat.col_number + 1}`),
        totalPrice: booking.total_amount,
        theatreName: booking.theatre_name,
        screenNumber: booking.screen_number,
        city: booking.city,
        state: booking.state,
        customerName: userName
      });

      const qrImage = await generateQrCode(ticketData);
      setQrCodes(prev => new Map(prev).set(bookingKey, qrImage));
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoadingQr(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingKey);
        return newSet;
      });
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Please sign in to view your bookings</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Loading your bookings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Bookings</h1>
            <p className="mt-1 text-sm text-neutral-400">View all your ticket bookings</p>
          </div>
          <button
            onClick={() => router.push('/home')}
            className="rounded-md bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
          >
            Browse Movies
          </button>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-900/20 border border-green-800 p-4">
            <p className="text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="rounded-lg bg-neutral-900 p-12 text-center">
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold mb-2">No Bookings Yet</h2>
            <p className="text-neutral-400 mb-6">You haven&apos;t booked any tickets yet.</p>
            <button
              onClick={() => router.push('/home')}
              className="rounded-md bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
            >
              Browse Movies
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking, idx) => (
              <div key={idx} className="rounded-lg bg-neutral-900 p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold mb-1">{booking.movie_name}</h2>
                        <div className="text-sm text-neutral-400">
                          {booking.language || 'N/A'} • {booking.theatre_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-neutral-400">Total Amount</div>
                        <div className="text-xl font-bold text-green-400">₹{booking.total_amount}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">Date & Time</div>
                        <div className="text-sm">
                          {new Date(booking.show_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-neutral-300">
                          {booking.start_time} - {booking.end_time}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 mb-1">Theatre & Screen</div>
                        <div className="text-sm">{booking.theatre_name}</div>
                        <div className="text-sm text-neutral-300">
                          {booking.city}, {booking.state} • Screen {booking.screen_number}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                      <div className="text-xs text-neutral-400 mb-2">Booked Seats ({booking.seats.length})</div>
                      <div className="flex flex-wrap gap-2">
                        {booking.seats.map((seat) => (
                          <span
                            key={seat.id}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium"
                          >
                            {getRowLabel(seat.row_number)}{seat.col_number + 1}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-neutral-400">Ticket QR Code</div>
                        {!qrCodes.has(booking.show_id) && !loadingQr.has(booking.show_id) && (
                          <button
                            onClick={() => handleGenerateQr(booking)}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            Generate QR Code
                          </button>
                        )}
                      </div>
                      
                      {loadingQr.has(booking.show_id) && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-sm text-neutral-400">Generating QR code...</div>
                        </div>
                      )}
                      
                      {qrCodes.has(booking.show_id) && (
                        <div className="flex flex-col items-center">
                          <Image
                            src={`data:image/png;base64,${qrCodes.get(booking.show_id)}`}
                            alt="Ticket QR Code"
                            width={192}
                            height={192}
                            className="w-48 h-48 bg-white p-2 rounded-lg"
                            unoptimized
                          />
                          <p className="text-xs text-neutral-500 mt-2">Scan for ticket verification</p>
                        </div>
                      )}
                      
                      {!qrCodes.has(booking.show_id) && !loadingQr.has(booking.show_id) && (
                        <div className="text-xs text-neutral-500 text-center py-4">
                          Click &quot;Generate QR Code&quot; to create your ticket QR code
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                  <div>
                    Booked on {new Date(booking.booked_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div>
                    Booking ID: {booking.show_id}-{booking.seats[0]?.id || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}

