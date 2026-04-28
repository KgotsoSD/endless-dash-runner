import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, MapPin, Users } from 'lucide-react';

interface SessionRow {
  id: string; title: string; description: string | null; location: string | null;
  starts_at: string; ends_at: string; capacity: number;
  bookings: { id: string; user_id: string; status: string }[];
}

export default function Book() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, bookings(id, user_id, status)')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at');
    if (error) toast.error(error.message); else setSessions(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel('book-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const book = async (sessionId: string) => {
    if (!user) return;
    const { error } = await supabase.from('bookings').insert({ session_id: sessionId, user_id: user.id });
    if (error) toast.error(error.message.includes('duplicate') ? 'Already booked' : error.message);
    else toast.success('Booked!');
  };

  return (
    <div className="container-main px-4 py-10 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-black text-3xl">Available sessions</h1>
          <p className="text-muted-foreground text-sm">Reserve your spot in upcoming sessions.</p>
        </div>
        <Button asChild variant="outline"><Link to="/dashboard">My dashboard</Link></Button>
      </div>

      {loading ? <p>Loading…</p> :
        sessions.length === 0 ? <Card className="p-12 text-center text-muted-foreground">No upcoming sessions yet.</Card> :
        <div className="grid gap-4 md:grid-cols-2">
          {sessions.map(s => {
            const active = s.bookings.filter(b => b.status !== 'cancelled');
            const myBooking = active.find(b => b.user_id === user?.id);
            const full = active.length >= s.capacity;
            return (
              <Card key={s.id} className="p-5">
                <h3 className="font-display font-bold text-lg">{s.title}</h3>
                {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                <div className="text-sm text-muted-foreground mt-3 space-y-1">
                  <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{format(new Date(s.starts_at), 'PPp')} — {format(new Date(s.ends_at), 'p')}</div>
                  {s.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{s.location}</div>}
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" />{active.length} / {s.capacity} booked</div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {myBooking ? <Badge>Booked</Badge> : full ? <Badge variant="secondary">Full</Badge> : <span />}
                  {!myBooking && !full && <Button size="sm" onClick={() => book(s.id)}>Book now</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
}
