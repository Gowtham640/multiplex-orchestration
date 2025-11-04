'use client'
import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseclient";
import type { Session } from "@supabase/supabase-js";

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

type Booking = {
  row_number: number;
  col_number: number;
  is_booked: boolean;
};

type SeatState = 'available' | 'selected' | 'booked';

type ParkingDetails = {
  id: number;
  floor_number: number;
  total_rows: number;
  total_columns: number;
};

type ParkingState = 'available' | 'selected' | 'reserved';

function BookingPageContent() {
  const router = useRouter();
  const params = useParams();
  const showId = params?.showId as string | undefined;

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [theatre, setTheatre] = useState<TheatreDetails | null>(null);
  const [screen, setScreen] = useState<ScreenDetails | null>(null);
  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [parkings, setParkings] = useState<ParkingDetails[]>([]);
  const [reservedParkingSpots, setReservedParkingSpots] = useState<Set<string>>(new Set());
  const [selectedParkingSpot, setSelectedParkingSpot] = useState<{ parking_id: number; floor_number: number; row_number: number; col_number: number } | null>(null);
  const [showParking, setShowParking] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    } catch (e) {
      console.error('Error loading session:', e);
    }
  }, []);

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

  const loadBookings = useCallback(async () => {
    if (!showId) return;
    try {
      const res = await fetch(`/api/public/bookings/${showId}`);
      if (res.ok) {
        const { bookings } = await res.json();
        const bookedSet = new Set<string>();
        bookings.forEach((b: Booking) => {
          bookedSet.add(`${b.row_number}-${b.col_number}`);
        });
        setBookedSeats(bookedSet);
      }
    } catch (e) {
      console.error('Error loading bookings:', e);
    }
  }, [showId]);

  const loadParkings = useCallback(async () => {
    if (!show?.theatre_id) return;
    try {
      const res = await fetch(`/api/public/parkings/${show.theatre_id}`);
      if (res.ok) {
        const { parkings: parkingData, reserved_spots } = await res.json();
        setParkings(parkingData || []);
        const reservedSet = new Set<string>(reserved_spots || []);
        setReservedParkingSpots(reservedSet);
      }
    } catch (e) {
      console.error('Error loading parkings:', e);
    }
  }, [show?.theatre_id]);

  useEffect(() => {
    setMounted(true);
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (showId && mounted) {
      loadShowDetails();
      loadBookings();
    }
  }, [showId, mounted, loadShowDetails, loadBookings]);

  useEffect(() => {
    if (show?.theatre_id) {
      loadParkings();
    }
  }, [show?.theatre_id, loadParkings]);

  const getSeatState = (row: number, col: number): SeatState => {
    const seatKey = `${row}-${col}`;
    if (bookedSeats.has(seatKey)) return 'booked';
    if (selectedSeats.has(seatKey)) return 'selected';
    return 'available';
  };

  const toggleSeat = (row: number, col: number) => {
    const seatKey = `${row}-${col}`;
    if (bookedSeats.has(seatKey)) return; // Can't select booked seats

    setSelectedSeats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seatKey)) {
        newSet.delete(seatKey);
      } else {
        newSet.add(seatKey);
      }
      return newSet;
    });
  };

  const handleBookTickets = () => {
    if (!session) {
      const currentPath = `/booking/${showId}`;
      router.push(`/auth?mode=signin&redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (selectedSeats.size === 0) {
      setError('Please select at least one seat');
      return;
    }

    // Convert selected seats to array format for passing to payment page
    const seats = Array.from(selectedSeats).map(key => {
      const [row, col] = key.split('-').map(Number);
      return { row_number: row, col_number: col };
    });

    // Encode seats data as URL parameter
    const seatsParam = encodeURIComponent(JSON.stringify(seats));
    
    // Add parking reservation if selected
    const parkingParam = selectedParkingSpot 
      ? `&parking=${encodeURIComponent(JSON.stringify({
          parking_id: selectedParkingSpot.parking_id,
          floor_number: selectedParkingSpot.floor_number,
          row_number: selectedParkingSpot.row_number,
          col_number: selectedParkingSpot.col_number
        }))}`
      : '';
    
    router.push(`/payment/${showId}?seats=${seatsParam}${parkingParam}`);
  };

  const getRowLabel = (row: number): string => {
    return String.fromCharCode(65 + row); // A, B, C, etc.
  };

  const getParkingState = (parkingId: number, floorNumber: number, row: number, col: number): ParkingState => {
    const spotKey = `${parkingId}-${floorNumber}-${row}-${col}`;
    if (reservedParkingSpots.has(spotKey)) return 'reserved';
    if (selectedParkingSpot && selectedParkingSpot.parking_id === parkingId && 
        selectedParkingSpot.floor_number === floorNumber &&
        selectedParkingSpot.row_number === row && 
        selectedParkingSpot.col_number === col) return 'selected';
    return 'available';
  };

  const toggleParkingSpot = (parkingId: number, floorNumber: number, row: number, col: number) => {
    const spotKey = `${parkingId}-${floorNumber}-${row}-${col}`;
    if (reservedParkingSpots.has(spotKey)) return; // Can't select reserved spots

    setSelectedParkingSpot(prev => {
      if (prev && prev.parking_id === parkingId && prev.floor_number === floorNumber &&
          prev.row_number === row && prev.col_number === col) {
        return null; // Deselect
      }
      return { parking_id: parkingId, floor_number: floorNumber, row_number: row, col_number: col };
    });
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

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Loading show details...</p>
        </div>
      </main>
    );
  }

  if (error && !show) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
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

  if (!show || !theatre || !screen) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Show not found</p>
        </div>
      </main>
    );
  }

  const totalAmount = show.ticket_price * selectedSeats.size + (selectedParkingSpot ? 20 : 0);

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Show Details Section */}
        <div className="mb-6 rounded-lg bg-neutral-900 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{show.movie_name}</h1>
              <div className="space-y-1 text-sm text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Language:</span>
                  <span>{show.language || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Date:</span>
                  <span>{new Date(show.show_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Time:</span>
                  <span>{show.start_time} - {show.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Theatre:</span>
                  <span>{theatre.theatre_name} - {theatre.city}, {theatre.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Screen:</span>
                  <span>Screen {screen.screen_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Price:</span>
                  <span className="text-green-400 font-semibold">₹{show.ticket_price}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-400">Available Seats</div>
              <div className={`text-2xl font-bold ${show.available_seats > 10 ? 'text-green-400' : 'text-red-400'}`}>
                {show.available_seats}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/20 border border-red-800 p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Seat Layout Section */}
          <div className="flex-1">
            <div className="rounded-lg bg-neutral-900 p-6">
              <h2 className="text-lg font-semibold mb-4">Select Your Seats</h2>
              
              {/* Screen Indicator */}
              <div className="mb-6 text-center">
                <div className="inline-block rounded-t-lg bg-neutral-800 px-8 py-2 text-sm text-neutral-400">
                  SCREEN
                </div>
              </div>

              {/* Seat Legend */}
              <div className="mb-4 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-sm bg-green-600"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-sm bg-blue-600"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-sm bg-neutral-700"></div>
                  <span>Booked</span>
                </div>
              </div>

              {/* Seat Grid */}
              <div className="overflow-auto">
                <div className="inline-block">
                  {/* Column headers */}
                  <div className="flex mb-2">
                    <div className="w-8"></div>
                    {Array.from({ length: screen.total_columns }).map((_, col) => (
                      <div key={col} className="w-6 text-center text-xs text-neutral-400">
                        {col + 1}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {Array.from({ length: screen.total_rows }).map((_, row) => (
                    <div key={row} className="flex items-center gap-1 mb-1">
                      {/* Row label */}
                      <div className="w-8 text-xs text-neutral-400 text-right pr-2">
                        {getRowLabel(row)}
                      </div>
                      {/* Seats */}
                      {Array.from({ length: screen.total_columns }).map((_, col) => {
                        const state = getSeatState(row, col);
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => toggleSeat(row, col)}
                            disabled={state === 'booked'}
                            className={`h-6 w-6 rounded-sm text-xs transition-all ${
                              state === 'booked'
                                ? 'bg-neutral-700 cursor-not-allowed'
                                : state === 'selected'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                            title={
                              state === 'booked'
                                ? 'Booked'
                                : state === 'selected'
                                ? `Selected: ${getRowLabel(row)}${col + 1}`
                                : `Available: ${getRowLabel(row)}${col + 1}`
                            }
                          >
                            {state === 'selected' && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:w-80">
            <div className="rounded-lg bg-neutral-900 p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>
              
              {selectedSeats.size === 0 ? (
                <div className="text-sm text-neutral-400 mb-4">
                  Select seats to continue
                </div>
              ) : (
                <>
                  <div className="mb-4 space-y-2">
                    <div className="text-sm text-neutral-400">Selected Seats:</div>
                    <div className="space-y-1">
                      {Array.from(selectedSeats).map(seatKey => {
                        const [row, col] = seatKey.split('-').map(Number);
                        return (
                          <div key={seatKey} className="text-sm text-neutral-300">
                            {getRowLabel(row)}{col + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="mb-4 pt-4 border-t border-neutral-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-400">Number of Seats:</span>
                      <span className="text-sm font-semibold">{selectedSeats.size}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-400">Price per Seat:</span>
                      <span className="text-sm font-semibold">₹{show.ticket_price}</span>
                    </div>
                    {selectedParkingSpot && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-400">Parking Fee:</span>
                        <span className="text-sm font-semibold">₹20</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                      <span className="text-base font-semibold">Total Amount:</span>
                      <span className="text-lg font-bold text-green-400">₹{totalAmount}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Parking Section */}
              {parkings.length > 0 && (
                <div className="mb-4 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Parking Reservation</h3>
                    <button
                      onClick={() => setShowParking(!showParking)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {showParking ? 'Hide' : 'Show'} Parking
                    </button>
                  </div>
                  {showParking && (
                    <div className="space-y-3">
                      {parkings.map(parking => (
                        <div key={parking.id} className="rounded-md bg-neutral-800 p-3">
                          <div className="text-xs font-medium mb-2">Floor {parking.floor_number}</div>
                          <div className="overflow-auto">
                            <div className="inline-block">
                              {/* Column headers */}
                              <div className="flex mb-1">
                                <div className="w-6"></div>
                                {Array.from({ length: parking.total_columns }).map((_, col) => (
                                  <div key={col} className="w-4 text-center text-[8px] text-neutral-400">
                                    {col + 1}
                                  </div>
                                ))}
                              </div>
                              {/* Rows */}
                              {Array.from({ length: parking.total_rows }).map((_, row) => (
                                <div key={row} className="flex items-center gap-0.5 mb-0.5">
                                  {/* Row label */}
                                  <div className="w-6 text-[8px] text-neutral-400 text-right pr-1">
                                    {getRowLabel(row)}
                                  </div>
                                  {/* Parking spots */}
                                  {Array.from({ length: parking.total_columns }).map((_, col) => {
                                    const state = getParkingState(parking.id, parking.floor_number, row, col);
                                    return (
                                      <button
                                        key={col}
                                        type="button"
                                        onClick={() => toggleParkingSpot(parking.id, parking.floor_number, row, col)}
                                        disabled={state === 'reserved'}
                                        className={`h-4 w-4 rounded text-[8px] ${
                                          state === 'reserved'
                                            ? 'bg-neutral-700 cursor-not-allowed'
                                            : state === 'selected'
                                            ? 'bg-blue-600'
                                            : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                        title={
                                          state === 'reserved'
                                            ? 'Reserved'
                                            : state === 'selected'
                                            ? `Selected: F${parking.floor_number} ${getRowLabel(row)}${col + 1}`
                                            : `Available: F${parking.floor_number} ${getRowLabel(row)}${col + 1}`
                                        }
                                      >
                                        {state === 'selected' && '✓'}
                                      </button>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedParkingSpot && (
                        <div className="text-xs text-green-400">
                          Selected: Floor {selectedParkingSpot.floor_number} {getRowLabel(selectedParkingSpot.row_number)}{selectedParkingSpot.col_number + 1} (+₹20)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleBookTickets}
                disabled={selectedSeats.size === 0}
                className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {session ? 'Proceed to Payment' : 'Sign In to Book'}
              </button>

              {!session && (
                <p className="mt-3 text-xs text-center text-neutral-400">
                  You need to sign in to book tickets
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-neutral-400">Loading...</p>
        </div>
      </main>
    }>
      <BookingPageContent />
    </Suspense>
  );
}

