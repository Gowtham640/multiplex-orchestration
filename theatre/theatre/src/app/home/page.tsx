'use client'
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Show = {
  showId: number;
  show_date: string;
  start_time: string;
  end_time: string;
  screen: number;
  screen_id: number;
  theatre: string;
  theatre_id: string;
  available_seats: number;
  ticket_price: number;
};

type Movie = {
  title: string;
  language: string;
  price: number;
  theatres: string[];
  shows: Show[];
  nextShow: {
    showId: number;
    show_date: string;
    start_time: string;
    end_time: string;
    screen: number;
    theatre: string;
    available_seats: number;
  };
  totalShows: number;
};

export default function HomePage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedMovie, setExpandedMovie] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadMovies();
  }, []);

  const loadMovies = async () => {
    try {
      const res = await fetch('/api/public/shows');
      if (res.ok) {
        const { movies: data } = await res.json();
        console.log('Loaded movies:', data); // Debug log
        setMovies(data);
      } else {
        const error = await res.json();
        console.error('API Error:', error);
      }
    } catch (e) {
      console.error('Failed to load movies:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-8 sm:p-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold">Available Movies & Shows</h1>
          <p className="mt-1 text-sm text-neutral-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8 sm:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-end">
          <details className="relative">
            <summary className="list-none cursor-pointer select-none rounded-full bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700">
              Profile
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 shadow-lg">
              <a href="/bookings" className="block px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">My Bookings</a>
              <a href="#" className="block px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">My profile</a>
              <a href="#" className="block px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">Settings</a>
              <a href="/register" className="block px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">Add your theatre</a>
              <a href="#" className="block px-3 py-2 text-sm text-red-300 hover:bg-neutral-800">Sign out</a>
            </div>
          </details>
        </div>
        <h1 className="text-2xl font-semibold">Available Movies & Shows</h1>
        <p className="mt-1 text-sm text-neutral-400">Currently playing in theatres</p>

        {loading ? (
          <div className="mt-8 text-center text-neutral-400">Loading movies...</div>
        ) : movies.length === 0 ? (
          <div className="mt-8 text-center text-neutral-400">No movies currently available</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {movies.map((movie) => (
              <article key={movie.title} className="overflow-hidden rounded-lg bg-neutral-900 shadow">
                <div className="relative aspect-[2/3] w-full bg-neutral-800">
                  <Image
                    src="/window.svg"
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                      Movie
                    </span>
                    <span className="text-sm font-semibold text-green-400">₹{movie.price}</span>
                  </div>
                  <h2 className="text-lg font-medium mb-2">{movie.title}</h2>
                  <div className="space-y-1 text-sm text-neutral-300">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Language:</span>
                      <span>{movie.language}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Next Show:</span>
                      <span>{new Date(movie.nextShow.show_date).toLocaleDateString()} at {movie.nextShow.start_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Screen:</span>
                      <span>{movie.nextShow.screen}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Available Seats:</span>
                      <span className={movie.nextShow.available_seats > 10 ? 'text-green-400' : 'text-red-400'}>
                        {movie.nextShow.available_seats}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400">Theatres:</span>
                      <span>{movie.theatres.length} location{movie.theatres.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-800">
                    <div className="text-xs text-neutral-500 mb-2">
                      {movie.totalShows} show{movie.totalShows !== 1 ? 's' : ''} scheduled
                    </div>
                    <button
                      onClick={() => setExpandedMovie(expandedMovie === movie.title ? null : movie.title)}
                      className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                    >
                      {expandedMovie === movie.title ? 'Hide Shows' : 'View All Shows'}
                    </button>
                  </div>
                  
                  {expandedMovie === movie.title && (
                    <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2 max-h-64 overflow-y-auto">
                      {movie.shows.map((show) => (
                        <button
                          key={show.showId}
                          onClick={() => router.push(`/booking/${show.showId}`)}
                          className="w-full text-left rounded-md bg-neutral-800 p-3 hover:bg-neutral-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{show.theatre}</span>
                            <span className="text-xs text-green-400">₹{show.ticket_price}</span>
                          </div>
                          <div className="text-xs text-neutral-400 space-y-0.5">
                            <div>Screen {show.screen}</div>
                            <div>{new Date(show.show_date).toLocaleDateString()} • {show.start_time} - {show.end_time}</div>
                            <div className={show.available_seats > 10 ? 'text-green-400' : 'text-red-400'}>
                              {show.available_seats} seats available
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


