import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarCheck, LogOut, Shield, Plus } from 'lucide-react';

interface BookingRow {
  id: string;
  status: string;
  checked_in_at: string | null;
  sessions: { id: string; title: string; starts_at: string; ends_at: string; location: string | null } | null;
}

export default function Dashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('id, status, checked_in_at, sessions(id, title, starts_at, ends_at, location)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setBookings(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const ch = supabase.channel('my-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const cancel = async (id: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) toast.error(error.message); else toast.success('Booking cancelled');
  };

  const statusColor = (s: string) => ({
    booked: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    checked_in: 'bg-green-500/15 text-green-700 dark:text-green-300',
    cancelled: 'bg-muted text-muted-foreground',
    no_show: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  }[s] || '');

  return (
    <div className="container-main px-4 py-10 max-w-5xl">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl">My Dashboard</h1>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <Button asChild variant="outline"><Link to="/admin"><Shield className="w-4 h-4 mr-2" />Admin</Link></Button>}
          <Button asChild><Link to="/book"><Plus className="w-4 h-4 mr-2" />Book session</Link></Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>

      <h2 className="font-display font-bold text-xl mb-4">My bookings</h2>
      {loading ? <p className="text-muted-foreground">Loading…</p> :
        bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No bookings yet.</p>
            <Button asChild><Link to="/book">Browse sessions</Link></Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <Card key={b.id} className="p-5 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h3 className="font-bold">{b.sessions?.title ?? 'Session removed'}</h3>
                  {b.sessions && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(b.sessions.starts_at), 'PPp')} — {format(new Date(b.sessions.ends_at), 'p')}
                      {b.sessions.location && ` · ${b.sessions.location}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColor(b.status)}>{b.status.replace('_', ' ')}</Badge>
                  {b.status === 'booked' && (
                    <Button size="sm" variant="outline" onClick={() => cancel(b.id)}>Cancel</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
