import { useState, useMemo, useEffect } from 'react';
import { useGetAllAttendance, useGetUserAttendance, useRecordAttendance, useUpdateAttendance, useGetAllUsers, useGetAllLeaveRequests, useGetUserLeaveRequests, useApplyLeave, useUpdateLeaveRequest } from '../../hooks/useQueries';
import { useCustomAuth } from '../../hooks/useCustomAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { User, Bell, Clock, Calendar, Download, History, Filter, Search, MapPin, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Principal } from '@dfinity/principal';

export default function AttendanceModule({ userProfile }) {
  const { identity } = useCustomAuth();
  const isAdmin = userProfile.role.hasOwnProperty('admin') || userProfile.role.hasOwnProperty('owner');
  
  const staffIdObj = userProfile.userId || userProfile.id || identity?.getPrincipal() || null;
  const staffIdStr = typeof staffIdObj === 'string' ? staffIdObj : (staffIdObj?.toText ? staffIdObj.toText() : String(staffIdObj || ''));

  // Queries
  const { data: allAttendance = [] } = useGetAllAttendance();
  const { data: userAttendance = [] } = useGetUserAttendance(staffIdObj || null);
  const { data: myLeaves = [] } = useGetUserLeaveRequests(identity?.getPrincipal() || null);
  const { data: allLeaves = [] } = useGetAllLeaveRequests();
  const applyLeave = useApplyLeave();
  const updateLeaveReq = useUpdateLeaveRequest();
  const { data: users = [] } = useGetAllUsers();
  
  // Mutations
  const recordAttendance = useRecordAttendance();
  const updateAttendance = useUpdateAttendance();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterDate, setFilterDate] = useState(new Date());
  const [leaveForm, setLeaveForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });
  const greeting = useMemo(() => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    if (h < 21) return 'Good Evening,';
    return 'Good Night,';
  }, [currentTime]);
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // -- Admin View Logic --
  const attendanceData = isAdmin ? allAttendance : userAttendance;
  
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysRecords = attendanceData.filter(r => r.date === today);
    
    return {
      present: todaysRecords.filter(r => r.status === 'present').length,
      absent: todaysRecords.filter(r => r.status === 'absent').length,
      late: todaysRecords.filter(r => r.status === 'late').length,
      halfDay: todaysRecords.filter(r => r.status === 'half_day').length,
    };
  }, [attendanceData]);

  const getUserDetails = (principalId) => {
    const pid = typeof principalId === 'string' ? principalId : (principalId?.toText ? principalId.toText() : String(principalId));
    return users.find(u => {
      const uid = u.userId?.toText ? u.userId.toText() : String(u.userId || u.id);
      return uid === pid;
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--';
    const d = new Date(timeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // -- User/Mobile View Logic --
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = userAttendance.find(r => r.date === todayStr);
  const isCheckedIn = !!todayRecord;
  const isCheckedOut = todayRecord && !!todayRecord.checkOut;

  const handleCheckIn = async () => {
    if (!identity) return;
    
    const now = new Date();
    // Logic to determine status (late vs present) could be here
    // For now, default to 'present'
    const status = { present: null }; 
    
    // Mock GeoLocation for now
    const mockGeo = "Office Main"; 

    try {
      await recordAttendance.mutateAsync({
        id: crypto.randomUUID(),
        userId: staffIdStr,
        date: todayStr,
        checkInTime: BigInt(now.getTime() * 1000000),
        status,
        workMode: 'office',
        notes: []
      }); 
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord || !identity) return;
    
    const now = new Date();
    
    try {
      await updateAttendance.mutateAsync({
        ...todayRecord,
        userId: staffIdStr,
        checkOutTime: [BigInt(now.getTime() * 1000000)],
      });
    } catch (error) {
      console.error("Check-out failed:", error);
    }
  };

  // --- Render Mobile/User View ---
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold">{greeting}</h2>
                <p className="text-muted-foreground">{userProfile?.name || userProfile?.username || (userProfile?.id?.toText ? userProfile.id.toText() : String(userProfile?.id || ''))}</p>
            </div>
            <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
            </div>
        </div>

        {/* Date & Time Card */}
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
            <CardContent className="p-6 text-center space-y-2">
                <p className="text-primary-foreground/80 text-sm">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
                <h1 className="text-4xl font-bold tracking-wider">
                    {format(currentTime, 'hh:mm')}
                    <span className="text-lg ml-1 font-normal">{format(currentTime, 'a')}</span>
                </h1>
                <div className="flex justify-center gap-2 items-center text-primary-foreground/80 text-sm mt-2">
                    <MapPin className="h-4 w-4" />
                    <span>Office Main Location</span>
                </div>
            </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
            <Button 
                className={cn(
                    "h-32 flex flex-col gap-3 rounded-2xl shadow-sm hover:shadow-md transition-all",
                    isCheckedIn ? "bg-muted text-muted-foreground border-2 border-transparent" : "bg-card text-green-600 border-2 border-green-100 dark:border-green-900 hover:border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                )}
                variant="ghost"
                disabled={isCheckedIn}
                onClick={handleCheckIn}
            >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", isCheckedIn ? "bg-muted" : "bg-green-100 dark:bg-green-900/30")}>
                    <LogIn className={cn("h-6 w-6", isCheckedIn ? "text-muted-foreground" : "text-green-600 dark:text-green-400")} />
                </div>
                <span className="font-semibold text-lg">Check In</span>
                {isCheckedIn && <span className="text-xs">Done at {formatTime(todayRecord?.checkIn)}</span>}
            </Button>

            <Button 
                className={cn(
                    "h-32 flex flex-col gap-3 rounded-2xl shadow-sm hover:shadow-md transition-all",
                    !isCheckedIn || isCheckedOut ? "bg-muted text-muted-foreground border-2 border-transparent" : "bg-card text-red-600 border-2 border-red-100 dark:border-red-900 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                )}
                variant="ghost"
                disabled={!isCheckedIn || isCheckedOut}
                onClick={handleCheckOut}
            >
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", !isCheckedIn || isCheckedOut ? "bg-muted" : "bg-red-100 dark:bg-red-900/30")}>
                    <LogOut className={cn("h-6 w-6", !isCheckedIn || isCheckedOut ? "text-muted-foreground" : "text-red-600 dark:text-red-400")} />
                </div>
                <span className="font-semibold text-lg">Check Out</span>
                {isCheckedOut && <span className="text-xs">Done at {formatTime(todayRecord?.checkOut)}</span>}
            </Button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
             <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                    <Clock className="h-6 w-6 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Working Hrs</span>
                    <span className="font-bold text-lg">08:00</span>
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                    <Calendar className="h-6 w-6 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Attendance</span>
                    <span className="font-bold text-lg">24 Days</span>
                </CardContent>
            </Card>
        </div>

        {/* Recent History */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Recent History</h3>
                <Button variant="link" className="text-blue-600 h-auto p-0">View All</Button>
            </div>
            
            <div className="space-y-3">
                {userAttendance.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                {new Date(record.date).getDate()}
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    {record.status === 'present' ? 'Present' : 'Absent'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatTime(record.checkIn)} - {record.checkOut ? formatTime(record.checkOut) : '...'}
                                </p>
                            </div>
                        </div>
                        <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            record.status === 'present' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        )}>
                            {record.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Leave Requests moved to Calendar page */}
      </div>
    );
  }

  // --- Render Admin View ---
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Daily Attendance Overview</h2>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employees..." className="pl-9 w-[250px]" />
            </div>
            <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present Today</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent Today</CardTitle>
            <User className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.late}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.halfDay}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {format(filterDate, 'PPP')}
            </Button>
            
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Filter by:</span>
                <Select defaultValue="all-depts">
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-depts">All Departments</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                    </SelectContent>
                </Select>
                <Select defaultValue="all-teams">
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-teams">All Teams</SelectItem>
                    </SelectContent>
                </Select>
                <Select defaultValue="all-employees">
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-employees">All Employees</SelectItem>
                    </SelectContent>
                </Select>
                <Select defaultValue="all-status">
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-status">All Statuses</SelectItem>
                    </SelectContent>
                </Select>
                 <Button variant="secondary" size="sm">
                    Apply Filters
                </Button>
            </div>
        </div>

        <div className="flex gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Download className="mr-2 h-4 w-4" />
                Export Report
            </Button>
            <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                View History
            </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>In Time</TableHead>
              <TableHead>Out Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Geo-Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceData.map((record) => {
                const user = getUserDetails(record.userId);
                const status = record.status;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{user?.id?.toText ? user.id.toText() : (record.userId?.toText ? record.userId.toText() : String(record.userId))}</TableCell>
                    <TableCell>{user?.name || user?.username || '--'}</TableCell>
                    <TableCell>{user?.department || '--'}</TableCell>
                    <TableCell>{formatTime(record.checkIn)}</TableCell>
                    <TableCell>{record.checkOut ? formatTime(record.checkOut) : '--'}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "capitalize px-2 py-1 rounded-full text-xs font-medium",
                        status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      )}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {record.geoLocation || 'Office Main'}
                        </div>
                    </TableCell>
                  </TableRow>
                );
            })}
            {attendanceData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No attendance records found for this date.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {attendanceData.length} entries</p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="bg-primary/10 text-primary border-primary/20">1</Button>
                <Button variant="outline" size="sm">Next</Button>
            </div>
        </div>
      </Card>
    </div>
  );
}
