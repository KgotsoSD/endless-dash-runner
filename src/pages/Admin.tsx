import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, FileText, Plus, Trash2 } from 'lucide-react';
import { exportCSV, exportPDF } from '@/lib/exports';

interface Sess { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string; capacity: number; }
interface Bk { id: string; session_id: string; user_id: string; status: string; checked_in_at: string | null; created_at: string; }
interface Prof { user_id: string; display_name: string | null; email: string | null; }

const STATUSES = ['booked', 'checked_in', 'cancelled', 'no_show'] as const;
const COLORS = ['hsl(220 80% 55%)', 'hsl(142 70% 45%)', 'hsl(0 0% 60%)', 'hsl(30 90% 55%)'];

export default function Admin() {
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [bookings, setBookings] = useState<Bk[]>([]);
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '', ends_at: '', capacity: 20 });

  const load = async () => {
    const [s, b, p] = await Promise.all([
      supabase.from('sessions').select('*').order('starts_at', { ascending: false }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('user_id, display_name, email'),
    ]);
    if (s.error) toast.error(s.error.message); else setSessions(s.data as any);
    if (b.error) toast.error(b.error.message); else setBookings(b.data as any);
    if (p.error) toast.error(p.error.message); else setProfiles(p.data as any);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const profMap = useMemo(() => Object.fromEntries(profiles.map(p => [p.user_id, p])), [profiles]);
  const sessMap = useMemo(() => Object.fromEntries(sessions.map(s => [s.id, s])), [sessions]);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.starts_at || !form.ends_at) { toast.error('Title, start and end required'); return; }
    const { error } = await supabase.from('sessions').insert({
      title: form.title, description: form.description || null, location: form.location || null,
      starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(),
      capacity: Number(form.capacity),
    });
    if (error) toast.error(error.message);
    else { toast.success('Session created'); setForm({ title: '', description: '', location: '', starts_at: '', ends_at: '', capacity: 20 }); }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this session and its bookings?')) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) toast.error(error.message); else toast.success('Deleted');
  };

  const updateBooking = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === 'checked_in') patch.checked_in_at = new Date().toISOString();
    const { error } = await supabase.from('bookings').update(patch).eq('id', id);
    if (error) toast.error(error.message); else toast.success('Updated');
  };

  // Analytics
  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
    return days.map(d => {
      const key = format(d, 'MMM d');
      const dayBookings = bookings.filter(b => startOfDay(new Date(b.created_at)).getTime() === d.getTime());
      return {
        date: key,
        booked: dayBookings.length,
        attended: dayBookings.filter(b => b.status === 'checked_in').length,
      };
    });
  }, [bookings]);

  const statusBreakdown = useMemo(() => STATUSES.map(s => ({ name: s.replace('_', ' '), value: bookings.filter(b => b.status === s).length })), [bookings]);

  const exportRows = () => bookings.map(b => [
    sessMap[b.session_id]?.title ?? '—',
    sessMap[b.session_id] ? format(new Date(sessMap[b.session_id].starts_at), 'yyyy-MM-dd HH:mm') : '',
    profMap[b.user_id]?.display_name ?? '—',
    profMap[b.user_id]?.email ?? '—',
    b.status,
    b.checked_in_at ? format(new Date(b.checked_in_at), 'yyyy-MM-dd HH:mm') : '',
  ]);
  const headers = ['Session', 'Starts at', 'User', 'Email', 'Status', 'Checked in at'];

  return (
    <div className="container-main px-4 py-10 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display font-black text-3xl">Admin Console</h1>
          <p className="text-muted-foreground text-sm">Manage sessions, attendance & analytics.</p>
        </div>
        <Button asChild variant="outline"><Link to="/dashboard">My dashboard</Link></Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Sessions', value: sessions.length },
              { label: 'Total bookings', value: bookings.length },
              { label: 'Checked in', value: bookings.filter(b => b.status === 'checked_in').length },
              { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length },
            ].map(s => (
              <Card key={s.label} className="p-5">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-display font-black mt-1">{s.value}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h3 className="font-bold mb-4">Bookings — last 14 days</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="booked" fill="hsl(220 80% 55%)" name="Booked" />
                  <Bar dataKey="attended" fill="hsl(142 70% 45%)" name="Attended" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold mb-4">Status breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={90} label>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-6 space-y-6">
          <Card className="p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4" />Create session</h3>
            <form onSubmit={createSession} className="grid md:grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} required /></div>
              <div><Label>Ends at</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} required /></div>
              <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button type="submit" className="md:col-span-2">Create</Button>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold mb-4">All sessions</h3>
            <div className="space-y-2">
              {sessions.map(s => {
                const count = bookings.filter(b => b.session_id === s.id && b.status !== 'cancelled').length;
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.starts_at), 'PPp')} · {count}/{s.capacity}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteSession(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                );
              })}
              {sessions.length === 0 && <p className="text-muted-foreground text-sm">No sessions.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6 space-y-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV('attendance.csv', headers, exportRows())}><Download className="w-4 h-4 mr-2" />CSV</Button>
            <Button variant="outline" size="sm" onClick={() => exportPDF('Attendance Report', headers, exportRows())}><FileText className="w-4 h-4 mr-2" />PDF</Button>
          </div>
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left"><tr>
                <th className="p-3">Session</th><th className="p-3">User</th><th className="p-3">When</th><th className="p-3">Status</th><th className="p-3">Action</th>
              </tr></thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">{sessMap[b.session_id]?.title ?? '—'}</td>
                    <td className="p-3">
                      <div>{profMap[b.user_id]?.display_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{profMap[b.user_id]?.email}</div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {sessMap[b.session_id] && format(new Date(sessMap[b.session_id].starts_at), 'PPp')}
                    </td>
                    <td className="p-3"><Badge variant="secondary">{b.status.replace('_', ' ')}</Badge></td>
                    <td className="p-3">
                      <Select value={b.status} onValueChange={(v) => updateBooking(b.id, v)}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No bookings yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
