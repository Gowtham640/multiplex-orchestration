'use client'
import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";

type TicketData = {
  show: {
    id: number;
    movie_name: string;
    language: string;
    show_date: string;
    start_time: string;
    end_time: string;
    ticket_price: number;
    available_seats: number;
  };
  theatre: {
    theatre_name: string;
    address: string;
    city: string;
    state: string;
  };
  screen: {
    screen_number: number;
  };
  bookings: Array<Array<{
    id: number;
    row_number: number;
    col_number: number;
    booked_at: string;
  }>>;
  allBookings: Array<{
    id: number;
    row_number: number;
    col_number: number;
    booked_at: string;
  }>;
};

function TicketPageContent() {
  const params = useParams();
  const showId = params?.showId as string | undefined;

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showId) return;

    const loadTicketData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/public/ticket/${showId}`);
        
        if (!res.ok) {
          const error = await res.json();
          setError(error.error || 'Failed to load ticket details');
          return;
        }

        const data = await res.json();
        setTicketData(data);
      } catch (e) {
        console.error('Error loading ticket:', e);
        setError('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };

    loadTicketData();
  }, [showId]);

  const getRowLabel = (row: number): string => {
    return String.fromCharCode(65 + row); // A, B, C, etc.
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-neutral-400">Loading ticket details...</div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !ticketData) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-900/20 border border-red-800 p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Ticket Not Found</h1>
            <p className="text-red-400">{error || 'Invalid ticket'}</p>
          </div>
        </div>
      </main>
    );
  }

  const { show, theatre, screen, allBookings } = ticketData;
  const totalAmount = show.ticket_price * allBookings.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <div className="text-6xl mb-2">🎬</div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Movie Ticket</h1>
          <p className="text-neutral-400">Ticket Verification</p>
        </div>

        {/* Ticket Card */}
        <div className="rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 overflow-hidden shadow-2xl">
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
            <h2 className="text-2xl font-bold mb-1">{show.movie_name}</h2>
            <p className="text-blue-100 text-sm">{show.language || 'N/A'}</p>
          </div>

          {/* Ticket Body */}
          <div className="p-6 space-y-6">
            {/* Show Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-neutral-400 mb-1">Date & Time</div>
                <div className="text-lg font-semibold">
                  {new Date(show.show_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-neutral-300">
                  {show.start_time} - {show.end_time}
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-400 mb-1">Venue</div>
                <div className="text-lg font-semibold">{theatre.theatre_name}</div>
                <div className="text-neutral-300 text-sm">
                  {theatre.city}, {theatre.state}
                </div>
                <div className="text-neutral-400 text-xs mt-1">
                  Screen {screen.screen_number}
                </div>
              </div>
            </div>

            {/* Seats Section */}
            <div className="pt-4 border-t border-neutral-700">
              <div className="text-xs text-neutral-400 mb-3">Booked Seats ({allBookings.length})</div>
              <div className="flex flex-wrap gap-2">
                {allBookings.map((booking) => (
                  <span
                    key={booking.id}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium shadow-lg"
                  >
                    {getRowLabel(booking.row_number)}{booking.col_number + 1}
                  </span>
                ))}
              </div>
            </div>

            {/* Price Section */}
            <div className="pt-4 border-t border-neutral-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Price per Seat</span>
                <span className="font-semibold">₹{show.ticket_price}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-700">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-green-400">₹{totalAmount}</span>
              </div>
            </div>

            {/* Booking Info */}
            <div className="pt-4 border-t border-neutral-700">
              <div className="text-xs text-neutral-400 mb-1">Booking Reference</div>
              <div className="text-sm font-mono text-neutral-300">
                Show ID: {show.id}
              </div>
              {allBookings.length > 0 && (
                <div className="text-xs text-neutral-500 mt-1">
                  Booked on {new Date(allBookings[0].booked_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-neutral-800/50 p-4 text-center">
            <p className="text-xs text-neutral-400">
              Present this ticket at the theatre entrance
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Please arrive 15 minutes before showtime
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-neutral-500">
            This is a digital ticket. Scan the QR code or show this page at the theatre.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-neutral-400">Loading...</div>
          </div>
        </div>
      </main>
    }>
      <TicketPageContent />
    </Suspense>
  );
}

