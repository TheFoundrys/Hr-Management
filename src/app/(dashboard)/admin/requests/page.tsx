'use client';
import { useEffect, useState } from 'react';
import { 
  MessageSquare, User, Calendar, CheckCircle2, 
  XCircle, Clock, Search, Loader2, Filter,
  ExternalLink, Check, X, MessageSquareQuote
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SupportRequestsAdmin() {
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'support' | 'users'>('support');
  const router = useRouter();

  useEffect(() => {
    fetchRequests();
    fetchPendingUsers();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/support/requests');
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch('/api/admin/users/pending');
      const data = await res.json();
      if (data.success) setUsers(data.pendingUsers);
    } catch (err) {
      console.error(err);
    }
  };

  const approveUser = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      alert('Failed to approve user');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/support/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setRequests(requests.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border p-8 rounded-3xl shadow-soft">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
            <MessageSquare className="text-primary w-8 h-8" />
            Approvals Dashboard
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-2">Manage personnel requests and registrations</p>
        </div>
        
        <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
          <button 
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'support' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-primary'}`}
          >
            Support Logs ({requests.length})
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-primary'}`}
          >
            User Approvals ({users.length})
          </button>
        </div>
      </div>

      {activeTab === 'support' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                className="pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl focus:ring-2 ring-primary/20 outline-none text-xs font-bold w-full"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2.5 bg-muted/30 border border-border rounded-xl outline-none text-[10px] font-black uppercase tracking-widest"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((req) => (
              <div key={req.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all group relative overflow-hidden">
                 <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                   req.status === 'pending' ? 'bg-amber-500' : 
                   req.status === 'approved' ? 'bg-emerald-500' : 
                   req.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                 }`} />
                 
                 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-5 flex-1">
                       <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0">
                         {req.employee_name?.[0] || 'U'}
                       </div>
                       <div className="space-y-2">
                         <div className="flex items-center gap-3">
                            <h3 className="font-black text-sm uppercase tracking-tight">{req.employee_name}</h3>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none ${
                              req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                              req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                              req.status === 'completed' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {req.status}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded">
                              {req.category}
                            </span>
                         </div>
                         <p className="text-xs font-medium text-muted-foreground leading-relaxed max-w-2xl">
                           {req.description}
                         </p>
                         <div className="flex items-center gap-4 pt-2">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock size={12} />
                              <span className="text-[9px] font-black uppercase tracking-widest">{new Date(req.created_at).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User size={12} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Employee: {req.employee_id}</span>
                            </div>
                         </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                       {req.status === 'pending' && (
                         <>
                            <button 
                              onClick={() => updateStatus(req.id, 'approved')}
                              disabled={updatingId === req.id}
                              className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                              title="Approve"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => updateStatus(req.id, 'rejected')}
                              disabled={updatingId === req.id}
                              className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                         </>
                       )}
                       {req.status === 'approved' && (
                         <button 
                            onClick={() => updateStatus(req.id, 'completed')}
                            disabled={updatingId === req.id}
                            className="p-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all flex items-center gap-2"
                            title="Mark Complete"
                          >
                            <CheckCircle2 size={16} />
                            <span className="text-[9px] font-black uppercase tracking-widest px-1">Mark Done</span>
                          </button>
                       )}
                       <button 
                        onClick={() => router.push(`/employees/${req.employee_id}`)}
                        className="p-2.5 bg-muted hover:bg-primary hover:text-white rounded-xl transition-all"
                        title="View Employee Profile"
                       >
                         <ExternalLink size={16} />
                       </button>
                    </div>
                 </div>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="py-20 text-center bg-card border border-border border-dashed rounded-3xl">
                 <MessageSquareQuote size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No support requests found</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all group relative overflow-hidden">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-5 flex-1">
                     <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-xl shrink-0">
                       {u.name?.[0] || 'U'}
                     </div>
                     <div className="space-y-2">
                       <h3 className="font-black text-sm uppercase tracking-tight">{u.name}</h3>
                       <p className="text-xs font-medium text-muted-foreground">{u.email}</p>
                       <div className="flex items-center gap-4 pt-2">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Registered: {new Date(u.created_at).toLocaleString()}</span>
                          </div>
                       </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <select 
                      id={`role-${u.id}`}
                      className="bg-muted border border-border px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:border-primary transition-all"
                      defaultValue="STAFF"
                    >
                      <option value="FACULTY">Faculty</option>
                      <option value="HOD">HOD</option>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                      <option value="NON_TEACHING">Non-Teaching</option>
                    </select>
                    <button 
                      onClick={() => {
                        const role = (document.getElementById(`role-${u.id}`) as HTMLSelectElement).value;
                        approveUser(u.id, role);
                      }}
                      disabled={updatingId === u.id}
                      className="px-6 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                      {updatingId === u.id ? 'Processing...' : 'Approve & Assign'}
                    </button>
                  </div>
               </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="py-20 text-center bg-card border border-border border-dashed rounded-3xl">
               <User size={40} className="mx-auto text-muted-foreground/30 mb-4" />
               <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No pending registrations</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
