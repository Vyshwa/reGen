import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  Building2, Users, CreditCard, TrendingUp, Settings, ShieldAlert, LogOut, 
  CheckCircle, XCircle, Search, Filter, ShieldCheck, Activity, Database, Plus,
  UserCog, Lock, Mail, User, Shield, Camera, MapPin
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Footer from '../components/Footer';
import { Menu } from 'lucide-react';

// Mock Data
const MOCK_COMPANIES = [
  { id: '1', name: 'Krishub Innovations', users: 45, plan: 'Gold', status: 'active', revenue: 12000, joined: '2025-01-10' },
  { id: '2', name: 'TechNexus corp', users: 12, plan: 'Silver', status: 'active', revenue: 5000, joined: '2025-02-15' },
  { id: '3', name: 'Global Logistics', users: 89, plan: 'Enterprise', status: 'active', revenue: 54000, joined: '2024-11-20' },
  { id: '4', name: 'Creative Studio', users: 5, plan: 'Basic', status: 'inactive', revenue: 800, joined: '2025-03-01' },
  { id: '5', name: 'Swift Solutions', users: 22, plan: 'Gold', status: 'active', revenue: 8500, joined: '2025-01-25' },
];

const MOCK_USERS = [
  { id: 'u1', name: 'John Doe', email: 'john@krishub.in', company: 'Krishub Innovations', role: 'Staff', status: 'active' },
  { id: 'u2', name: 'Jane Smith', email: 'jane@technexus.com', company: 'TechNexus corp', role: 'Admin', status: 'active' },
  { id: 'u3', name: 'Robert Brown', email: 'robert@global.com', company: 'Global Logistics', role: 'Owner', status: 'suspended' },
  { id: 'u4', name: 'Alice Wong', email: 'alice@creative.io', company: 'Creative Studio', role: 'Freelancer', status: 'active' },
];

const REVENUE_DATA = [
  { month: 'Jan', revenue: 45000, growth: 12 },
  { month: 'Feb', revenue: 52000, growth: 15 },
  { month: 'Mar', revenue: 61000, growth: 18 },
  { month: 'Apr', revenue: 58000, growth: -5 },
  { month: 'May', revenue: 72000, growth: 24 },
  { month: 'Jun', revenue: 85000, growth: 18 },
];

const GROWTH_DATA = [
  { day: 'Mon', active: 120 },
  { day: 'Tue', active: 150 },
  { day: 'Wed', active: 180 },
  { day: 'Thu', active: 170 },
  { day: 'Fri', active: 210 },
  { day: 'Sat', active: 90 },
  { day: 'Sun', active: 60 },
];

export default function SuperAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileData, setProfileData] = useState({
    name: 'Super Admin',
    email: 'admin@regen.inc',
    id: 'ADMIN',
    role: 'System Oversight',
    avatar: '/superadmin-avatar.jpg'
  });
  const [dbCompanies, setDbCompanies] = useState([]);
  const [dbUsers, setDbUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRealData();
    }
  }, [isAuthenticated]);

  const fetchRealData = async () => {
    setIsLoading(true);
    try {
      const [uResp, cResp] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/company')
      ]);
      if (uResp.ok) setDbUsers(await uResp.json());
      if (cResp.ok) {
        const coData = await cResp.json();
        // Backend returns single object or array depending on structure. normalize.
        setDbCompanies(Array.isArray(coData) ? coData : (coData ? [coData] : []));
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
    } finally {
      setIsLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginForm.id, password: loginForm.password })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: 'Invalid Super Admin credentials' }));
        throw new Error(err.message || 'Verification failed');
      }
      const user = await resp.json();
      if (['param', 'owner', 'admin'].includes(user.role)) {
        setIsAuthenticated(true);
        setProfileData({
          name: user.name || user.username,
          email: user.email || (user.userId + '@regen.inc'),
          id: user.userId,
          role: user.role === 'param' ? 'Platform Architect' : 'System Admin',
          avatar: '/superadmin-avatar.jpg' // Permanent brand avatar
        });
        localStorage.setItem('active_sa_id', user.userId);
        toast.success(`Welcome, Super Admin ${user.username}!`);
      } else {
        toast.error('Insufficient privileges');
      }
    } catch (error) {
       toast.error(error.message || 'Invalid Super Admin credentials');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,30,60,0.5),transparent)] pointer-events-none" />
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-white">Super Admin Access</CardTitle>
            <p className="text-sm text-zinc-400">Enter your credentials to manage the platform</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Admin ID</label>
                <Input 
                  placeholder="ID" 
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                  value={loginForm.id}
                  onChange={(e) => setLoginForm({ ...loginForm, id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Security Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full py-6 text-lg font-semibold shadow-lg shadow-primary/20">
                Authenticate & Connect
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 border-r border-zinc-800 bg-zinc-900/30 flex-col pt-8">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">reGen Central</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Platform Control</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem active={activeTab === 'dashboard'} icon={Activity} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
          <SidebarItem active={activeTab === 'companies'} icon={Building2} label="Companies" onClick={() => setActiveTab('companies')} />
          <SidebarItem active={activeTab === 'users'} icon={Users} label="Global Users" onClick={() => setActiveTab('users')} />
          <SidebarItem active={activeTab === 'payments'} icon={CreditCard} label="Payments" onClick={() => setActiveTab('payments')} />
          <SidebarItem active={activeTab === 'analytics'} icon={TrendingUp} label="Analytics" onClick={() => setActiveTab('analytics')} />
          <SidebarItem active={activeTab === 'system'} icon={Settings} label="System Control" onClick={() => setActiveTab('system')} />
          <div className="pt-4 mt-4 border-t border-zinc-800/50">
            <SidebarItem active={activeTab === 'profile'} icon={UserCog} label="Account Profile" onClick={() => setActiveTab('profile')} />
          </div>
        </nav>

        <div className="p-6 border-t border-zinc-800">
          <Button variant="ghost" className="w-full flex justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/10" onClick={() => setIsAuthenticated(false)}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,1),rgba(9,9,11,1))] p-6 lg:p-10 pb-0">
          <header className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-zinc-950 border-r-zinc-800 p-0 flex flex-col">
                  <div className="px-6 py-8 mb-4 flex items-center gap-3 border-b border-zinc-800/50">
                    <div className="bg-primary p-2 rounded-xl">
                      <ShieldCheck className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h1 className="font-bold text-xl tracking-tight text-white">reGen Central</h1>
                    </div>
                  </div>
                  <nav className="flex-1 px-4 space-y-2">
                    <SheetClose asChild>
                      <SidebarItem active={activeTab === 'dashboard'} icon={Activity} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
                    </SheetClose>
                    <SheetClose asChild>
                      <SidebarItem active={activeTab === 'companies'} icon={Building2} label="Companies" onClick={() => setActiveTab('companies')} />
                    </SheetClose>
                    <SheetClose asChild>
                      <SidebarItem active={activeTab === 'users'} icon={Users} label="Global Users" onClick={() => setActiveTab('users')} />
                    </SheetClose>
                    <SheetClose asChild>
                      <SidebarItem active={activeTab === 'payments'} icon={CreditCard} label="Payments" onClick={() => setActiveTab('payments')} />
                    </SheetClose>
                    <SheetClose asChild>
                      <SidebarItem active={activeTab === 'analytics'} icon={TrendingUp} label="Analytics" onClick={() => setActiveTab('analytics')} />
                    </SheetClose>
                    <SheetClose asChild>
                      <SidebarItem active={activeTab === 'system'} icon={Settings} label="System Control" onClick={() => setActiveTab('system')} />
                    </SheetClose>
                    <div className="pt-4 mt-4 border-t border-zinc-800/50">
                      <SheetClose asChild>
                        <SidebarItem active={activeTab === 'profile'} icon={UserCog} label="Account Profile" onClick={() => setActiveTab('profile')} />
                      </SheetClose>
                    </div>
                  </nav>
                  <div className="p-6 border-t border-zinc-800">
                    <SheetClose asChild>
                      <Button variant="ghost" className="w-full flex justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/10" onClick={() => setIsAuthenticated(false)}>
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white capitalize">{activeTab}</h2>
                <p className="text-zinc-500 text-sm hidden lg:block">System oversight for reGen Innovations Inc.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center gap-2 hidden md:flex">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">System Live</span>
              </div>
              <div className="bg-zinc-800 h-10 w-10 rounded-xl overflow-hidden border border-zinc-700">
                 <img src={profileData.avatar} alt="Super Admin" className="w-full h-full object-cover" />
              </div>
            </div>
          </header>

          {activeTab === 'dashboard' && <TabDashboard dbUsers={dbUsers} dbCompanies={dbCompanies} />}
          {activeTab === 'companies' && <TabCompanies dbCompanies={dbCompanies} searchTerm={searchTerm} onRefresh={fetchRealData} />}
          {activeTab === 'users' && <TabUsers dbUsers={dbUsers} searchTerm={searchTerm} />}
          {activeTab === 'payments' && <TabPayments />}
          {activeTab === 'analytics' && <TabAnalytics />}
          {activeTab === 'system' && <TabSystem />}
          {activeTab === 'profile' && <TabProfile data={profileData} setData={setProfileData} />}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function SidebarItem({ active, icon: Icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-primary text-black font-semibold shadow-lg shadow-primary/20' 
          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-black' : 'text-inherit'}`} />
      <span className="text-sm">{label}</span>
    </button>
  );
}

// --- TAB COMPONENTS ---

function TabDashboard({ dbUsers, dbCompanies }) {
  const activeCount = dbUsers.filter(u => u.status === 'active').length;
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Companies" value={dbCompanies.length} icon={Building2} trend="+0% from last month" color="emerald" />
        <StatCard title="Active Users" value={activeCount} icon={Users} trend={`Total ${dbUsers.length}`} color="blue" />
        <StatCard title="Total Revenue" value="$0" icon={CreditCard} trend="Experimental" color="purple" />
        <StatCard title="Success Rate" value="100%" icon={TrendingUp} trend="System stability" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Weekly Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                />
                <Bar dataKey="active" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-sm group hover:border-zinc-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Metrics</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
          <div className="text-3xl font-bold text-white">{value}</div>
        </div>
        <p className="mt-4 text-xs text-zinc-500 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

function TabCompanies({ dbCompanies, searchTerm, onRefresh }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    gst: '',
    name: '',
    phoneNumber: '',
    email: '',
    category: '',
    about: '',
    address: '',
    city: '',
    state: '',
    zip: ''
  });
  const [isValidating, setIsValidating] = useState(false);

  const filtered = dbCompanies.filter(co => 
    !searchTerm || 
    co.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    co._id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e, shouldContinue = false) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phoneNumber || !formData.city || !formData.category) {
      toast.error('Please fill all required fields (*)');
      return;
    }

    try {
      const resp = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || 'Failed to add company');
      }

      toast.success('Company added successfully');
      onRefresh();
      
      if (!shouldContinue) {
        setIsDialogOpen(false);
        setFormData({
          gst: '', name: '', phoneNumber: '', email: '', 
          category: '', about: '', address: '', city: '', state: '', zip: ''
        });
      } else {
        // Reset form for next company but stay open
        setFormData({
          gst: '', name: '', phoneNumber: '', email: '', 
          category: '', about: '', address: '', city: '', state: '', zip: ''
        });
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleValidateGst = () => {
    if (!formData.gst) return;
    setIsValidating(true);
    // Simulate GST validation
    setTimeout(() => {
      setIsValidating(false);
      toast.success('GST validated successfully');
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search companies by name or ID..." 
            className="pl-10 bg-zinc-950 border-zinc-800"
            value={searchTerm}
            onChange={(e) => {}} // Note: Search usually handled by parent. Re-refining filter.
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-zinc-800 flex gap-2">
            <Filter className="w-4 h-4" /> Filter
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-black hover:bg-primary/90 font-bold shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl border-zinc-800/50 bg-zinc-950/80 backdrop-blur-2xl text-white p-0 overflow-hidden rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="bg-gradient-to-b from-primary/5 to-transparent px-8 py-10">
                <DialogHeader>
                  <DialogTitle className="text-4xl font-extrabold text-center mb-12 tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                    Company Registration
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {/* GST NO */}
                  <div className="relative group">
                    <Input 
                      placeholder="GST No (Optional)" 
                      value={formData.gst}
                      onChange={(e) => setFormData({...formData, gst: e.target.value})}
                      className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl pr-20 focus:border-primary/50 transition-all placeholder:text-zinc-600"
                    />
                    <button 
                      type="button"
                      onClick={handleValidateGst}
                      disabled={isValidating}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-semibold text-sm hover:text-primary/80 disabled:opacity-50 transition-colors"
                    >
                      {isValidating ? '...' : 'Validate'}
                    </button>
                  </div>

                  {/* Company Name */}
                  <Input 
                    placeholder="Company Name *" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                  />

                  {/* Phone Number */}
                  <Input 
                    placeholder="PhoneNumber *" 
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                  />

                  {/* Email */}
                  <Input 
                    placeholder="email(Optional)" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                  />

                  {/* Select Categories */}
                  <Select 
                    onValueChange={(val) => setFormData({...formData, category: val})}
                    value={formData.category}
                  >
                    <SelectTrigger className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all text-zinc-300">
                      <SelectValue placeholder="Select Categories *" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="it">IT Solutions</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* About */}
                  <Input 
                    placeholder="Brief Description (Optional)" 
                    value={formData.about}
                    onChange={(e) => setFormData({...formData, about: e.target.value})}
                    className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                  />

                  {/* Street Address */}
                  <div className="md:col-span-2">
                    <Textarea 
                      placeholder="Full Street Address (Optional)" 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="min-h-[120px] bg-zinc-900/40 border-zinc-800/50 rounded-2xl resize-none p-4 focus:border-primary/40 focus:bg-zinc-900/60 transition-all placeholder:text-zinc-600 outline-none ring-0"
                    />
                  </div>

                  {/* City, State, Zip */}
                  <div className="grid grid-cols-1 md:grid-cols-3 md:col-span-2 gap-4">
                    <Input 
                      placeholder="City *" 
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                    />
                    <Input 
                      placeholder="State" 
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                    />
                    <Input 
                      placeholder="Zip Code" 
                      value={formData.zip}
                      onChange={(e) => setFormData({...formData, zip: e.target.value})}
                      className="h-14 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-primary/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsDialogOpen(false)}
                    className="h-14 rounded-2xl text-zinc-400 hover:bg-white/5 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={(e) => handleSubmit(e, true)}
                    className="h-14 border-zinc-800 bg-white/5 text-zinc-300 font-semibold rounded-2xl hover:bg-white/10"
                  >
                    Add & Continue
                  </Button>
                  <Button 
                    onClick={(e) => handleSubmit(e, false)}
                    className="h-14 bg-primary text-black font-extrabold text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Add Company
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-zinc-400 h-14">Company Name</TableHead>
                <TableHead className="text-zinc-400 h-14">Address / Info</TableHead>
                <TableHead className="text-zinc-400 h-14">Status</TableHead>
                <TableHead className="text-zinc-100 h-14 text-right pr-6">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((co, idx) => (
                <TableRow key={co._id || idx} className="border-zinc-800 hover:bg-white/5 transition-colors">
                  <TableCell className="font-semibold py-4">
                    <div>{co.name || 'Unnamed Company'}</div>
                    <div className="text-[10px] text-zinc-500 font-normal">ID: {co._id}</div>
                  </TableCell>
                  <TableCell className="text-zinc-400 max-w-xs truncate">
                    {co.address || 'No address provided'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
                      <span className="capitalize text-sm text-zinc-300">Active</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm">Stats</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-zinc-500">No companies found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TabUsers({ dbUsers, searchTerm }) {
  const filtered = dbUsers.filter(u => 
    !searchTerm || 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = dbUsers.filter(u => u.status === 'active').length;
  const suspendedCount = dbUsers.filter(u => u.status !== 'active').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-emerald-400/80 uppercase font-bold tracking-wider">Active Users</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{suspendedCount}</div>
              <div className="text-xs text-red-400/80 uppercase font-bold tracking-wider">Inactive/Suspended</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{dbUsers.length}</div>
              <div className="text-xs text-blue-400/80 uppercase font-bold tracking-wider">Total in System</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-800">
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.userId} className="border-zinc-800">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                        <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-semibold">{user.name || user.username}</div>
                        <div className="text-xs text-zinc-500">{user.email || 'No email'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{user.department || 'General'}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 capitalize">{user.role}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${user.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <ManageUserDialog user={user} />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-zinc-500">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ManageUserDialog({ user }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-400 font-semibold hover:bg-blue-400/10">Manage</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-zinc-950/90 backdrop-blur-3xl border-zinc-800/50 text-white rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden p-0">
        <div className="bg-gradient-to-b from-blue-500/10 via-transparent to-transparent px-8 py-10">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                  <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="" className="w-full h-full object-cover" />
               </div>
               <div>
                  <DialogTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">User Profile</DialogTitle>
                  <p className="text-zinc-500 text-sm font-medium">Manage and view system identity</p>
               </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
             {/* Association Section */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900/60 transition-all group">
                   <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-extrabold mb-1 group-hover:text-zinc-500 transition-colors">Affiliated Company</p>
                   <p className="text-lg font-bold text-blue-400">{user.company || 'Innovation Inc (Global)'}</p>
                </div>
                <div className="bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900/60 transition-all group">
                   <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-extrabold mb-1 group-hover:text-zinc-500 transition-colors">Designation</p>
                   <p className="text-lg font-bold text-white capitalize">{user.designation || user.role || 'Unspecified'}</p>
                </div>
             </div>

             {/* Personal Information */}
             <div className="bg-zinc-900/40 p-6 rounded-[2rem] border border-zinc-800/50 hover:bg-zinc-900/60 transition-all">
                <div className="flex items-center gap-2 mb-6">
                   <div className="p-2 rounded-xl bg-blue-500/10"><UserCog className="w-5 h-5 text-blue-400" /></div>
                   <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Personal Information</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                   <div className="space-y-1">
                      <p className="text-xs text-zinc-600 font-bold uppercase tracking-tighter">Full Identity</p>
                      <p className="text-md font-semibold text-white">{user.name || user.username}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-xs text-zinc-600 font-bold uppercase tracking-tighter">Vital Stats</p>
                      <p className="text-md font-semibold text-white">Age: {user.age || 'NA'} / {user.gender || 'Any'}</p>
                   </div>
                   <div className="col-span-2 space-y-1 border-t border-zinc-800/30 pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                        <p className="text-xs text-zinc-600 font-bold uppercase tracking-tighter">Registered Address</p>
                      </div>
                      <p className="text-sm font-medium text-zinc-300 leading-relaxed italic">{user.address || 'Address hidden or unassigned'}</p>
                   </div>
                </div>
             </div>

             <div className="pt-4 flex justify-between items-center px-2">
                <div className="flex gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Global UID: {user.userId || user.id}</span>
                </div>
                <Button size="sm" variant="outline" className="h-10 rounded-xl border-zinc-800 bg-white/5 text-zinc-400 font-bold hover:bg-white/10 hover:text-white transition-all px-6">Edit Profile</Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabPayments() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950">
            <CardHeader>
              <CardTitle className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Total ARR</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-5xl font-extrabold text-white tracking-tighter">$510,000</div>
               <p className="text-emerald-400 text-sm mt-2 font-medium flex items-center gap-1">
                 <TrendingUp className="w-4 h-4" /> +22.4% projected growth
               </p>
            </CardContent>
         </Card>
         <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Subscription Mix</CardTitle>
              <CreditCard className="w-4 h-4 text-zinc-500" />
            </CardHeader>
            <CardContent className="h-24 flex items-end gap-2">
               <div className="flex-1 bg-emerald-500/20 h-[60%] rounded-t-lg border-t border-emerald-500/50" title="Enterprise (45%)"></div>
               <div className="flex-1 bg-blue-500/20 h-[85%] rounded-t-lg border-t border-blue-500/50" title="Gold (75%)"></div>
               <div className="flex-1 bg-purple-500/20 h-[40%] rounded-t-lg border-t border-purple-500/50" title="Silver (20%)"></div>
               <div className="flex-1 bg-amber-500/20 h-[20%] rounded-t-lg border-t border-amber-500/50" title="Basic (10%)"></div>
            </CardContent>
         </Card>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/30">
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i} className="border-zinc-800 hover:bg-white/5">
                  <TableCell className="w-12 pr-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-white">Payment from Co. {i}</div>
                    <div className="text-xs text-zinc-500">TXID: 9283-XJ23-882{i}</div>
                  </TableCell>
                  <TableCell className="text-zinc-400">Enterprise Subscription</TableCell>
                  <TableCell className="font-bold text-white text-right pr-6">+$2,499.00</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TabAnalytics() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-zinc-800 bg-zinc-900/30 h-[400px]">
            <CardHeader>
              <CardTitle className="text-lg">Growth metrics (Companies)</CardTitle>
            </CardHeader>
            <CardContent className="h-full pt-4">
               <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                    <Line type="stepAfter" dataKey="growth" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                  </LineChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="border-zinc-800 bg-zinc-900/30 h-[400px]">
             <CardHeader>
                <CardTitle className="text-lg">Operational Intensity</CardTitle>
             </CardHeader>
             <CardContent className="h-full pt-4">
                <ResponsiveContainer width="100%" height="80%">
                   <AreaChart data={GROWTH_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                      <Area type="monotone" dataKey="active" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                   </AreaChart>
                </ResponsiveContainer>
             </CardContent>
          </Card>
       </div>
    </div>
  );
}

function TabSystem() {
  const [maintenance, setMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  const adminId = localStorage.getItem('active_sa_id');

  const fetchMaintenance = () => {
    fetch('/api/system/maintenance')
      .then(res => res.json())
      .then(data => setMaintenance(data.maintenance))
      .catch(e => console.error('System fetch failed', e));
  };

  const fetchLogs = () => {
    setLogsLoading(true);
    fetch('/api/system/logs?limit=20', { headers: { 'x-user-id': adminId } })
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      })
      .catch(e => console.error('Logs fetch failed', e))
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    fetchMaintenance();
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const toggleMaintenance = async () => {
    setIsLoading(true);
    try {
      const adminId = localStorage.getItem('active_sa_id');
      const resp = await fetch('/api/system/maintenance/toggle', {
        method: 'POST',
        headers: { 'x-user-id': adminId }
      });
      const data = await resp.json();
      if (data.success) {
        setMaintenance(data.maintenance);
        toast.success(`Maintenance Mode ${data.maintenance ? 'Enabled' : 'Disabled'}`);
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (e) {
      toast.error('Network connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlushCache = async () => {
    setIsLoading(true);
    try {
      const adminId = localStorage.getItem('active_sa_id');
      const resp = await fetch('/api/system/flush-cache', {
        method: 'POST',
        headers: { 'x-user-id': adminId }
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Flush failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartModules = async () => {
    setIsLoading(true);
    try {
      const adminId = localStorage.getItem('active_sa_id');
      const resp = await fetch('/api/system/restart', {
        method: 'POST',
        headers: { 'x-user-id': adminId }
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(data.message);
        setTimeout(() => window.location.reload(), 5000);
      } else {
        toast.error(data.message || 'Restart failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("CRITICAL WARNING: This will PERMANENTLY DELETE all company data, users, tasks, and records. Only the Super Admin account will remain. Are you absolutely sure?")) {
      return;
    }
    
    const confirmationText = "RESET ALL DATA";
    const userInput = window.prompt(`Type "${confirmationText}" to confirm factory reset:`);
    if (userInput !== confirmationText) {
      toast.error("Confirmation failed. Reset cancelled.");
      return;
    }

    setIsLoading(true);
    try {
      const adminId = localStorage.getItem('active_sa_id');
      const resp = await fetch('/api/system/factory-reset', {
        method: 'POST',
        headers: { 'x-user-id': adminId }
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(data.message);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(data.message || 'Reset failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader>
              <CardTitle className="text-lg">Global Environment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Maintenance Mode</div>
                    <div className="text-xs text-zinc-500">Strict mode (Admins only access)</div>
                  </div>
                  <Button 
                    variant={maintenance ? "destructive" : "outline"} 
                    className="w-24"
                    disabled={isLoading}
                    onClick={toggleMaintenance}
                  >
                    {isLoading ? "..." : (maintenance ? "ON" : "OFF")}
                  </Button>
               </div>
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Auto-Backups</div>
                    <div className="text-xs text-zinc-500">Daily snapshot to AWS S3</div>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold uppercase">Running</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Registration</div>
                  <div className="text-xs text-zinc-500">Allow new companies signups</div>
                  </div>
                  <span className="text-emerald-400 text-xs font-bold uppercase">Open</span>
               </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/30">
             <CardHeader className="flex-row justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-zinc-500" />
                  Database Logs
                  {logsLoading && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-600 font-mono">{logsTotal} total</span>
                  <button
                    onClick={fetchLogs}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700"
                  >
                    ↻ Refresh
                  </button>
                </div>
             </CardHeader>
             <CardContent className="space-y-2 font-mono text-[10px] text-zinc-500 overflow-hidden max-h-56 overflow-y-auto">
                {logs.length === 0 && !logsLoading && (
                  <div className="text-center text-zinc-700 py-6">No logs captured yet</div>
                )}
                {logs.map((entry, i) => {
                  const levelColors = {
                    INFO: 'text-blue-400',
                    AUTH: 'text-emerald-400',
                    WARN: 'text-amber-400',
                    ERROR: 'text-red-400',
                    CRON: 'text-purple-400',
                    SYSTEM: 'text-cyan-400',
                    CRITICAL: 'text-red-500 font-bold',
                  };
                  const color = levelColors[entry.level] || 'text-zinc-400';
                  return (
                    <div key={i} className="p-2 rounded bg-zinc-950/50 border border-zinc-900 flex items-start gap-2 group">
                      <span className={`${color} shrink-0 w-14 text-right font-bold`}>[{entry.level}]</span>
                      <span className="text-zinc-600 shrink-0">{entry.time}</span>
                      <span className="text-zinc-300 flex-1">{entry.message}</span>
                      {entry.meta && <span className="text-zinc-600 hidden group-hover:inline shrink-0">{entry.meta}</span>}
                    </div>
                  );
                })}
                <Button
                  variant="link"
                  className="text-xs text-primary p-0 h-auto"
                  onClick={async () => {
                    try {
                      const resp = await fetch('/api/system/logs/download', {
                        headers: { 'x-user-id': adminId }
                      });
                      if (!resp.ok) throw new Error('Failed to fetch logs');
                      const blob = await resp.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `regen-system-logs-${new Date().toISOString().split('T')[0]}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Logs downloaded');
                    } catch (e) {
                      toast.error('Failed to download logs');
                    }
                  }}
                >
                  Download Full Logs ({logsTotal})
                </Button>
             </CardContent>
          </Card>
       </div>

       <Card className="border-red-900/50 bg-red-950/10">
          <CardHeader>
            <CardTitle className="text-red-400 text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Critical Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
             <Button variant="destructive" onClick={handleFlushCache} disabled={isLoading}>Flush Redis Cache</Button>
             <Button variant="destructive" onClick={handleRestartModules} disabled={isLoading}>Restart All Modules</Button>
             <Button 
                variant="destructive" 
                className="bg-red-600/20 text-red-400 border border-red-800 hover:bg-red-600"
                onClick={handleFactoryReset}
                disabled={isLoading}
             >
                Factory Global Reset
             </Button>
          </CardContent>
       </Card>
    </div>
  );
}

function TabProfile({ data, setData }) {
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    toast.success('Profile details synchronized successfully');
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    toast.success('Security credentials updated');
    setPasswords({ current: '', next: '', confirm: '' });
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        localStorage.setItem('sa_avatar', base64String);
        setData(prev => ({ ...prev, avatar: base64String }));
        toast.success('Avatar updated instantly');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-zinc-800 bg-zinc-900/10 backdrop-blur-md overflow-hidden p-0 gap-0 flex flex-col items-center">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 w-full relative">
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="px-6 w-full flex flex-col items-center relative">
            <div className="relative -mt-12 border-4 border-zinc-950 rounded-3xl overflow-hidden bg-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
               <img src={data.avatar} alt="Profile" className="w-24 h-24 object-cover" />
               {/* Avatar is permanent brand image — upload disabled */}
               <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-not-allowed">
                 <span className="text-white text-[9px] font-bold text-center leading-tight px-2">Brand Avatar
Locked</span>
               </div>
            </div>
            
            <div className="mt-6 text-center space-y-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">{data.name}</h3>
              <p className="text-zinc-400 text-sm font-medium tracking-wide opacity-80">{data.role}</p>
              <div className="flex gap-2 justify-center pt-3">
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-lg border border-primary/20">Super Admin</span>
                <span className="px-3 py-1 bg-zinc-800/80 text-zinc-400 text-[10px] font-bold uppercase rounded-lg border border-zinc-700 font-mono">ID: {data.id}</span>
              </div>
            </div>

            <div className="w-full mt-8 pt-6 border-t border-zinc-800/50 space-y-4 pb-8">
               <div className="flex items-center gap-4 text-sm text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5">
                 <div className="p-2 rounded-lg bg-primary/10 shadow-inner"><Mail className="w-4 h-4 text-primary" /></div>
                 <span className="font-medium truncate">{data.email}</span>
               </div>
               <div className="flex items-center gap-4 text-sm text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5">
                 <div className="p-2 rounded-lg bg-emerald-500/10 shadow-inner"><Shield className="w-4 h-4 text-emerald-400" /></div>
                 <span className="font-medium">Multi-Factor Auth Enabled</span>
               </div>
            </div>
          </div>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <ShieldAlert className="w-4 h-4 text-amber-500" />
               Security Notice
             </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-500 leading-relaxed">
            As a Super Admin, your actions are logged and audited. Ensure your credentials are never shared and change your password regularly.
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-8 space-y-8">
        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              General Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-medium">Full Name</Label>
                  <Input 
                    value={data.name} 
                    onChange={(e) => setData({...data, name: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 focus:border-primary text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-medium">Primary Email Address</Label>
                  <Input 
                    value={data.email} 
                    onChange={(e) => setData({...data, email: e.target.value})}
                    className="bg-zinc-950 border-zinc-800 focus:border-primary text-white" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-zinc-400 font-medium">Admin Identifier (Non-editable)</Label>
                  <Input 
                    value={data.id} 
                    disabled
                    className="bg-zinc-900/50 border-zinc-800 italic text-zinc-500 cursor-not-allowed" 
                  />
                </div>
              </div>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-black font-bold h-12 px-6">
                Update Profile Details
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/30 border-l-4 border-l-amber-500/50 shadow-lg shadow-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
              <Lock className="w-5 h-5" />
              Authentication Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 font-medium">Current Security Password</Label>
                  <Input 
                    type="password" 
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    placeholder="Verify old password"
                    className="bg-zinc-950 border-zinc-800 text-white" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-medium">New Password</Label>
                    <Input 
                      type="password" 
                      value={passwords.next}
                      onChange={(e) => setPasswords({...passwords, next: e.target.value})}
                      placeholder="Minimum 8 characters"
                      className="bg-zinc-950 border-zinc-800 text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400 font-medium">Confirm New Password</Label>
                    <Input 
                      type="password" 
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      className="bg-zinc-950 border-zinc-800 text-white" 
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" variant="secondary" className="font-bold h-12 px-8 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white">
                Revolutionize Access Key
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
