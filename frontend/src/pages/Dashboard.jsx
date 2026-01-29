import { useEffect, useState } from 'react';
import { useCustomAuth } from '../hooks/useCustomAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Users, Calendar, ClipboardList, MessageSquare, FileText, DollarSign, Building2, LogOut, Home, Clock, Settings, Bell } from 'lucide-react';
import UsersModule from '../components/modules/UsersModule';
import AttendanceModule from '../components/modules/AttendanceModule';
import SchedulesModule from '../components/modules/SchedulesModule';
import MessengerModule from '../components/modules/MessengerModule';
import ScrumModule from '../components/modules/ScrumModule';
import CalendarModule from '../components/modules/CalendarModule';
import PaymentsModule from '../components/modules/PaymentsModule';
import CompanyModule from '../components/modules/CompanyModule';
import DashboardHome from '../components/modules/DashboardHome';
import StaffProfileModule from '../components/modules/StaffProfileModule';
import { useIsMobile } from '../hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ModeToggle } from '@/components/mode-toggle';
import { useGetUserNotifications } from '../hooks/useQueries';
import { toast } from 'sonner';

export default function Dashboard({ userProfile }) {
  const { logout } = useCustomAuth();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState(userProfile?.mustChangePassword ? 'profile' : 'home');
  const isMobile = useIsMobile();
  const [logoError, setLogoError] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/logo.jpeg');
  const [showNotif, setShowNotif] = useState(false);
  const { data: myNotifications = [] } = useGetUserNotifications(userProfile.id);
  const [seenNotifications, setSeenNotifications] = useState({});

  useEffect(() => {
    if (userProfile?.mustChangePassword) {
      setActiveModule('profile');
      toast.error('Please change your default password');
    }
  }, [userProfile?.mustChangePassword]);

  useEffect(() => {
    if (!myNotifications.length) return;
    const unseen = myNotifications.filter(n => !seenNotifications[n.id]);
    if (!unseen.length) return;
    unseen.forEach(n => toast(`${n.title}: ${n.message}`));
    setSeenNotifications(prev => {
      const next = { ...prev };
      unseen.forEach(n => { next[n.id] = true; });
      return next;
    });
  }, [myNotifications]);

  const isAdmin = userProfile.role.hasOwnProperty('admin');
  const isOwner = userProfile.role.hasOwnProperty('owner');
  const isStaff = userProfile.role.hasOwnProperty('staff');

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
  };

  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: Home, show: true },
    { id: 'users', label: 'Users', icon: Users, show: isAdmin || isOwner },
    { id: 'attendance', label: 'Attendance', icon: Clock, show: true },
    { id: 'schedules', label: 'Schedules', icon: ClipboardList, show: true },
    { id: 'messenger', label: 'Messenger', icon: MessageSquare, show: true },
    { id: 'scrum', label: 'Scrum', icon: FileText, show: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar, show: true },
    { id: 'payments', label: 'Payments', icon: DollarSign, show: isAdmin || isOwner },
    { id: 'company', label: 'Company', icon: Building2, show: isAdmin || isOwner },
    { id: 'profile', label: 'Settings', icon: Settings, show: true },
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'home':
        return <DashboardHome userProfile={userProfile} onNavigate={setActiveModule} />;
      case 'users':
        return <UsersModule userProfile={userProfile} />;
      case 'attendance':
        return <AttendanceModule userProfile={userProfile} />;
      case 'schedules':
        return <SchedulesModule userProfile={userProfile} />;
      case 'messenger':
        return <MessengerModule userProfile={userProfile} />;
      case 'scrum':
        return <ScrumModule userProfile={userProfile} />;
      case 'calendar':
        return <CalendarModule userProfile={userProfile} />;
      case 'payments':
        return <PaymentsModule userProfile={userProfile} />;
      case 'company':
        return <CompanyModule userProfile={userProfile} />;
      case 'profile':
        return <StaffProfileModule userProfile={userProfile} />;
      default:
        return <DashboardHome userProfile={userProfile} onNavigate={setActiveModule} />;
    }
  };

  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-3 md:px-6">
          <div className="flex items-center gap-3">
            {logoError ? (
              <div className="h-8 w-8 md:h-10 md:w-10" />
            ) : (
              <img
                src={logoSrc}
                alt="reGen"
                className="h-8 w-8 md:h-10 md:w-10"
                onError={() => {
                  if (logoSrc === '/logo.jpeg') {
                    setLogoSrc('/logo.png');
                  } else {
                    setLogoError(true);
                  }
                }}
              />
            )}
            <div className="hidden md:block">
              <h2 className="font-bold text-lg">reGen</h2>
              <p className="text-xs text-muted-foreground">{userProfile?.name}</p>
            </div>
          </div>
          <nav className="flex-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1">
              {menuItems.filter(item => item.show).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-colors flex-shrink-0",
                    activeModule === item.id 
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>
          <div className="flex items-center gap-2 pl-2 relative">
            <button
              className="relative rounded-md p-2 hover:bg-accent"
              onClick={() => setShowNotif(v => !v)}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {myNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {Math.min(9, myNotifications.length)}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute right-20 top-10 z-20 w-72 border border-border bg-popover text-popover-foreground rounded-md shadow-md">
                <div className="px-3 py-2 text-sm font-medium border-b">Notifications</div>
                <div className="max-h-64 overflow-y-auto">
                  {(myNotifications.slice(0,5)).map(n => (
                    <div key={n.id} className="px-3 py-2 text-sm border-b last:border-b-0">
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-muted-foreground">{n.message}</div>
                    </div>
                  ))}
                  {myNotifications.length === 0 && (
                    <div className="px-3 py-4 text-sm text-muted-foreground">No notifications</div>
                  )}
                </div>
              </div>
            )}
            <ModeToggle />
            <Button variant="outline" onClick={handleLogout} className="hidden md:inline-flex">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("flex-1 bg-background text-foreground", isMobile ? "p-6" : "p-12")}>
        <ErrorBoundary key={activeModule}>
          {renderModule()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
