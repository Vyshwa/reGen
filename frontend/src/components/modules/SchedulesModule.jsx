import { useMemo, useState, useEffect } from 'react';
import { useGetAllTasks, useCreateTask, useUpdateTask, useDeleteTask, useGetAllUsers, useGetAllTaskUpdates, useAddTaskUpdate, useGetAllHolidays, useGetAllLeaveRequests } from '../../hooks/useQueries';
import { useCustomAuth } from '../../hooks/useCustomAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SchedulesModule({ userProfile }) {
  const { identity } = useCustomAuth();
  const { data: tasks = [], isLoading } = useGetAllTasks();
  const { data: users = [] } = useGetAllUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: holidays = [] } = useGetAllHolidays();
  const { data: allLeaves = [] } = useGetAllLeaveRequests();

  const { data: allTaskUpdates = [] } = useGetAllTaskUpdates();
  const addTaskUpdate = useAddTaskUpdate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
    durationValue: '',
    durationUnit: 'days',
    startDate: '',
    endDate: '',
  });

  const isAdmin = userProfile.role.hasOwnProperty('admin');
  const isOwner = userProfile.role.hasOwnProperty('owner') || userProfile.role.hasOwnProperty('param');
  const isStaff = userProfile.role.hasOwnProperty('staff') || userProfile.role.hasOwnProperty('intern') || userProfile.role.hasOwnProperty('freelancer');
  const canManage = isAdmin || isOwner;

  const currentUserId = userProfile.id || null;

  const toIdText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (val.toText) return val.toText();
    return String(val);
  };
  const formatUserLabel = (user) => {
    const idTxt = toIdText(user.id);
    const nm = user.name || user.username || '';
    return `${nm} - ${idTxt}`.trim();
  };
  const isAssignedToMe = (task) => toIdText(task.assignee) === toIdText(userProfile.id);

  const toUiStatus = (s) => {
    const key = typeof s === 'string' ? s : Object.keys(s || {})[0];
    if (key === 'in_progress') return 'inProgress';
    if (key === 'done' || key === 'completed') return 'completed';
    return 'todo';
  };

  const formatStatusLabel = (ui) => {
    if (ui === 'inProgress') return 'In Progress';
    if (ui === 'completed') return 'Completed';
    return 'To Do';
  };

  // Filter tasks based on role
  const visibleTasks = tasks.filter(task => {
    if (isAdmin || isOwner) return true;
    if (isStaff) {
      const myId = toIdText(userProfile?.userId || userProfile?.id || '');
      const assigneeId = toIdText(task.assignee || task.assignedTo || '');
      return assigneeId === myId;
    }
    return false;
  });

  // Filter users for assignee dropdown
  const assigneeOptions = users.filter(user => {
    if (isAdmin) return true;
    if (isOwner) return user.role.hasOwnProperty('staff') || user.role.hasOwnProperty('intern') || user.role.hasOwnProperty('freelancer') || user.role.hasOwnProperty('admin') || user.role.hasOwnProperty('param');
    return false;
  });
  const supervisorOptions = users.filter(user => user.role && (user.role.hasOwnProperty('admin') || user.role.hasOwnProperty('owner') || user.role.hasOwnProperty('param')));

  const [updateForms, setUpdateForms] = useState({});
  const [updateDateFilter, setUpdateDateFilter] = useState(null);
  const [updateStaffFilter, setUpdateStaffFilter] = useState('all');

  const todayIso = new Date().toISOString().split('T')[0];

  const staffOptions = useMemo(() => {
    return users.filter(user => user.role && (user.role.hasOwnProperty('staff') || user.role.hasOwnProperty('intern') || user.role.hasOwnProperty('freelancer')));
  }, [users]);
  const holidaySet = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);
  const approvedLeaveMap = useMemo(() => {
    const map = new Map();
    const addRange = (uid, s, e) => {
      const start = new Date(s);
      const end = new Date(e);
      let d = new Date(start);
      while (d <= end) {
        const iso = d.toISOString().slice(0, 10);
        const set = map.get(uid) || new Set();
        set.add(iso);
        map.set(uid, set);
        d.setDate(d.getDate() + 1);
      }
    };
    allLeaves.forEach(l => {
      if (String(l.status) === 'approved') {
        const uid = toIdText(l.userId);
        addRange(uid, l.startDate, l.endDate);
      }
    });
    return map;
  }, [allLeaves]);

  const computeEndDate = useMemo(() => {
    return (startIso, durationValue, durationUnit, assignee) => {
      if (!startIso || !durationValue || durationValue <= 0) return '';
      
      // Convert hours to days (8 hours = 1 working day)
      let daysCount = durationUnit === 'hours' ? Math.ceil(durationValue / 8) : Math.floor(durationValue);
      if (daysCount <= 0) return '';
      
      const uid = assignee ? toIdText(assignee) : '';
      const leaveSet = uid ? (approvedLeaveMap.get(uid) || new Set()) : new Set();
      
      const isWorkDay = (dateStr) => {
        return !holidaySet.has(dateStr) && !leaveSet.has(dateStr);
      };

      // Parse date as UTC to avoid timezone issues
      const parts = startIso.split('-');
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      let day = parseInt(parts[2], 10);
      
      // Create UTC date
      let currentDate = new Date(Date.UTC(year, month, day));
      let dateStr = currentDate.toISOString().slice(0, 10);
      
      // Ensure start date is a working day
      while (!isWorkDay(dateStr)) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        dateStr = currentDate.toISOString().slice(0, 10);
      }

      // Count working days starting from start date (inclusive)
      let workingDaysCount = 0;
      
      while (workingDaysCount < daysCount) {
        if (isWorkDay(dateStr)) {
          workingDaysCount++;
        }
        if (workingDaysCount < daysCount) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          dateStr = currentDate.toISOString().slice(0, 10);
        }
      }
      
      return dateStr;
    };
  }, [holidaySet, approvedLeaveMap]);

  // Auto-adjust End Date when Start/Duration/Assignee changes
  useEffect(() => {
    if (formData.startDate && formData.durationValue) {
      const next = computeEndDate(formData.startDate, formData.durationValue, formData.durationUnit, formData.assignee || formData.assignedTo);
      if (next && next !== formData.endDate) {
        setFormData(prev => ({ ...prev, endDate: next }));
      }
    }
  }, [formData.startDate, formData.durationValue, formData.durationUnit, formData.assignee, formData.assignedTo, computeEndDate]);

  // Auto-adjust Start Date if Assignee is on leave or holiday or past date
  useEffect(() => {
    if (!formData.startDate || !formData.assignee) return;
    
    const uid = toIdText(formData.assignee);
    const leaveSet = approvedLeaveMap.get(uid) || new Set();
    
    const isWorkDay = (dateStr) => {
      return !holidaySet.has(dateStr) && !leaveSet.has(dateStr);
    };

    // Parse date as UTC
    const parts = formData.startDate.split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let day = parseInt(parts[2], 10);
    let cur = new Date(Date.UTC(year, month, day));
    let dateStr = cur.toISOString().slice(0, 10);
    
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    let adjusted = false;
    
    // Check past date
    if (dateStr < todayStr) {
      cur = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      dateStr = cur.toISOString().slice(0, 10);
      adjusted = true;
    }
    
    // Check holiday or leave
    while (!isWorkDay(dateStr)) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      dateStr = cur.toISOString().slice(0, 10);
      adjusted = true;
    }
    
    if (adjusted && dateStr !== formData.startDate) {
      setFormData(prev => ({ ...prev, startDate: dateStr }));
      toast.info(`Start date adjusted to next available working day: ${dateStr}`);
    }
  }, [formData.startDate, formData.assignee, holidaySet, approvedLeaveMap]);

  const availableAssigneeOptions = useMemo(() => {
    const startIso = formData.startDate;
    const endIso = formData.endDate;
    if (!startIso || !endIso) return assigneeOptions;
    
    const start = new Date(startIso + 'T00:00:00');
    const end = new Date(endIso + 'T00:00:00');
    const rangeIso = new Set();
    let d = new Date(start);
    while (d <= end) {
      rangeIso.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    
    return assigneeOptions.filter(user => {
      const uid = toIdText(user.userId || user.id);
      const leaveSet = approvedLeaveMap.get(uid) || new Set();
      for (const iso of rangeIso) {
        if (leaveSet.has(iso)) return false;
      }
      return true;
    });
  }, [assigneeOptions, formData.startDate, formData.endDate, approvedLeaveMap]);

  const getUpdateForm = (taskId) => {
    const existing = updateForms[taskId];
    if (existing) return existing;
    return { details: '', status: 'in_progress' };
  };

  const setUpdateFormForTask = (taskId, form) => {
    setUpdateForms(prev => ({
      ...prev,
      [taskId]: form,
    }));
  };

  const getFilteredUpdatesForTask = (task) => {
    const base = allTaskUpdates.filter(u => u.taskId === task.id);

    let filtered = base;

    if (!canManage && currentUserId) {
      filtered = filtered.filter(u => toIdText(u.staffId) === toIdText(currentUserId));
    } else {
      if (updateStaffFilter !== 'all') {
        filtered = filtered.filter(u => toIdText(u.staffId) === updateStaffFilter);
      }
    }

    if (updateDateFilter) {
      const target = updateDateFilter.toISOString().split('T')[0];
      filtered = filtered.filter(u => {
        const d = new Date(Number(u.createdAt) / 1000000);
        return d.toISOString().split('T')[0] === target;
      });
    }

    return filtered.sort((a, b) => Number(b.createdAt - a.createdAt));
  };

  const handleSaveUpdate = async (task) => {
    if (!currentUserId) return;
    const form = getUpdateForm(task.id);
    const trimmed = form.details.trim();
    if (!trimmed) {
      toast.error('Please enter task update details');
      return;
    }

    const now = new Date();
    const timestamp = BigInt(now.getTime() * 1000000);

    const update = {
      id: crypto.randomUUID(),
      taskId: task.id,
      staffId: currentUserId,
      details: trimmed,
      status: form.status,
      createdAt: timestamp,
    };

    try {
      await addTaskUpdate.mutateAsync(update);
      toast.success('Task update saved');
      setUpdateFormForTask(task.id, { details: '', status: 'in_progress' });
    } catch (error) {
      toast.error('Failed to save task update');
      console.error(error);
    }
  };

  const formatUpdateTime = (timestamp) => {
    const d = new Date(Number(timestamp) / 1000000);
    return d.toLocaleString();
  };
  const handleMarkCompleted = async (task) => {
    try {
      const updated = {
        id: task.id,
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        status: { completed: null },
        startDate: task.startDate,
        endDate: task.endDate
      };
      await updateTask.mutateAsync(updated);
      toast.success('Task marked as completed');
    } catch (error) {
      toast.error(error?.message || 'Failed to mark completed');
    }
  };

  // Mock Data for Task Details
  const mockAttachments = [
    { name: 'Project_Requirements.pdf', size: '2.4 MB', type: 'pdf' },
    { name: 'Design_Assets.zip', size: '15 MB', type: 'zip' },
    { name: 'Screenshot_01.png', size: '1.2 MB', type: 'image' },
  ];

  const mockComments = [
    { id: 1, user: 'Jane Cooper', text: 'I have started working on the initial wireframes.', time: '2 hours ago', avatar: 'https://i.pravatar.cc/150?u=3' },
    { id: 2, user: 'Robert Fox', text: 'Great! Please make sure to include the new brand colors.', time: '1 hour ago', avatar: 'https://i.pravatar.cc/150?u=4' },
    { id: 3, user: 'You', text: 'Will do. I will update the status once done.', time: 'Just now', avatar: userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.name}` },
  ];

  const handleOpenDialog = (task) => {
    if (task) {
      setEditingTask(task);
      // Handle both BigInt timestamps and ISO string formats
      const parseDate = (dateValue) => {
        if (!dateValue) return '';
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
          return dateValue.split('T')[0];
        }
        if (typeof dateValue === 'bigint' || typeof dateValue === 'number') {
          return new Date(Number(dateValue) / 1000000).toISOString().split('T')[0];
        }
        return '';
      };
      setFormData({
        title: task.title,
        description: task.description,
        assignee: toIdText(task.assignee),
        priority: task.priority || 'medium',
        durationValue: task.durationValue ?? '',
        durationUnit: task.durationUnit || 'days',
        startDate: parseDate(task.startDate),
        endDate: parseDate(task.endDate),
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        durationValue: '',
        durationUnit: 'days',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.assignee) {
      toast.error('Please select assignee');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    
    const start = new Date(formData.startDate + 'T00:00:00');
    const end = new Date(formData.endDate + 'T00:00:00');
    const durVal = parseFloat(formData.durationValue);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    if (start < todayStart) {
      toast.error('Start date cannot be in the past');
      return;
    }
    if (end < start) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      const task = {
        id: editingTask ? editingTask.id : crypto.randomUUID(),
        title: formData.title,
        description: formData.description,
        assignee: formData.assignee,
        assignorName: userProfile.name,
        priority: formData.priority,
        durationValue: !isNaN(durVal) && durVal > 0 ? durVal : undefined,
        durationUnit: !isNaN(durVal) && durVal > 0 ? formData.durationUnit : undefined,
        status: { todo: null },
        startDate: formData.startDate,
        endDate: formData.endDate,
      };

      if (editingTask) {
        await updateTask.mutateAsync(task);
        toast.success('Task updated successfully');
      } else {
        await createTask.mutateAsync(task);
        toast.success(`Task assigned to ${assigneeOptions.find(u => u.id.toText() === formData.assignee)?.username || 'staff'}`);
      }

      setIsDialogOpen(false);
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        durationValue: '',
        durationUnit: 'days',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask.mutateAsync(id);
        toast.success('Task deleted successfully');
      } catch (error) {
        toast.error('Failed to delete task');
        console.error(error);
      }
    }
  };

  const getStatusColor = (status) => {
    const ui = typeof status === 'string' ? status : toUiStatus(status);
    if (ui === 'completed') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (ui === 'inProgress') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Schedules & Tasks</h2>
          <p className="text-sm md:text-base text-muted-foreground">Manage your daily tasks and schedules.</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl md:w-auto">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="assignee">Assignee *</Label>
                    <Select value={formData.assignee} onValueChange={(value) => setFormData({ ...formData, assignee: value })}>
                      <SelectTrigger className="w-full min-w-0 truncate text-sm">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {assigneeOptions.map((user) => (
                          <SelectItem key={toIdText(user.id)} value={toIdText(user.id)}>
                            {formatUserLabel(user)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                      <SelectTrigger className="w-full min-w-0 truncate text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationValue">Duration</Label>
                    <div className="flex gap-2">
                      <Input
                        id="durationValue"
                        type="number"
                        min="0"
                        value={formData.durationValue}
                        onChange={(e) => setFormData({ ...formData, durationValue: e.target.value })}
                        placeholder="e.g., 8"
                      />
                      <Select value={formData.durationUnit} onValueChange={(value) => setFormData({ ...formData, durationUnit: value })}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">End Date auto-calculates</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createTask.isPending || updateTask.isPending}>
                  {(createTask.isPending || updateTask.isPending) ? 'Saving...' : 'Save Task'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Task progress updates help track completion and delays.
        </div>
        {canManage && (
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Date</span>
              <Input
                type="date"
                className="h-8 w-full md:w-auto"
                value={updateDateFilter ? updateDateFilter.toISOString().split('T')[0] : ''}
                onChange={e =>
                  setUpdateDateFilter(
                    e.target.value ? new Date(e.target.value + 'T00:00:00') : null
                  )
                }
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Staff</span>
              <Select
                value={updateStaffFilter}
                onValueChange={value => setUpdateStaffFilter(value)}
              >
                <SelectTrigger className="h-8 w-full md:w-40">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {staffOptions.map(user => (
                    <SelectItem key={toIdText(user.id)} value={toIdText(user.id)}>
                      {formatUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isLoading ? (
          <p className="col-span-full text-center py-8 text-muted-foreground">Loading tasks...</p>
        ) : visibleTasks.length === 0 ? (
          <p className="col-span-full text-center py-8 text-sm text-muted-foreground">No tasks found</p>
        ) : (
          visibleTasks.map((task) => (
            <Card
              key={task.id}
              className={`${toUiStatus(task.status) === 'completed' ? 'border-green-300 bg-green-50 dark:bg-green-900/30' : ''} hover:shadow-md transition-shadow`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base md:text-lg font-semibold tracking-tight text-foreground">
                    {task.title}
                  </CardTitle>
                  <div className="flex flex-col items-end gap-1">
                    {task.assignorName && (
                      <span className="text-[11px] text-muted-foreground">Assigned by {task.assignorName}</span>
                    )}
                    {canManage && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {((isStaff && currentUserId && (toIdText(task.assignee) === toIdText(currentUserId))) || canManage) && (
                  <div className="mt-3 border-t border-primary/40 pt-3">
                    {isStaff && isAssignedToMe(task) && toUiStatus(task.status) !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleMarkCompleted(task)}
                        disabled={updateTask.isPending}
                      >
                        {updateTask.isPending ? 'Updating...' : 'Mark Completed'}
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${getStatusColor(task.status)} h-5 text-[11px] px-2`}>
                    {formatStatusLabel(toUiStatus(task.status))}
                  </Badge>
                  <Badge className={
                    task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }>
                    {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                  <div className="flex items-center justify-between gap-2 min-w-0 sm:col-span-2">
                    <span className="text-muted-foreground">Assignee:</span>
                    <span className="truncate text-right" title={
                      (() => {
                        const u = users.find(x => toIdText(x.id) === toIdText(task.assignee));
                        return u ? formatUserLabel(u) : toIdText(task.assignee);
                      })()
                    }>
                      {(() => {
                        const u = users.find(x => toIdText(x.id) === toIdText(task.assignee));
                        return u ? formatUserLabel(u) : toIdText(task.assignee);
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Start:</span>
                    <span className="text-right">{new Date(Number(task.startDate) / 1000000).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">End:</span>
                    <span className="text-right">{new Date(Number(task.endDate) / 1000000).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-sm md:text-[13px] text-muted-foreground break-words line-clamp-2 text-balance">
                  {task.description}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task Details: {selectedTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-1">Description</h4>
                  <p className="text-muted-foreground">{selectedTask?.description}</p>
                </div>
                <div>
                   <h4 className="font-semibold mb-1">Timeline</h4>
                   <p className="text-muted-foreground">
                      {selectedTask && new Date(Number(selectedTask.startDate) / 1000000).toLocaleDateString()} - {selectedTask && new Date(Number(selectedTask.endDate) / 1000000).toLocaleDateString()}
                   </p>
                </div>
             </div>

             <div className="space-y-3">
                <h4 className="font-semibold text-sm">Updates History</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                   {selectedTask && getFilteredUpdatesForTask(selectedTask).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No updates recorded yet.</p>
                   ) : (
                      selectedTask && getFilteredUpdatesForTask(selectedTask).map(update => (
                        <div key={update.id} className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                           <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>
                                 {users.find(u => u.id.toText && u.id.toText() === update.staffId.toText())?.username || 'Staff'}
                              </span>
                              <span>{formatUpdateTime(update.createdAt)}</span>
                           </div>
                           <p>{update.details}</p>
                           <div className="flex justify-end">
                              <Badge variant="outline" className="text-[10px] h-5">
                                 {update.status === 'completed' ? 'Completed' : 'In Progress'}
                              </Badge>
                           </div>
                        </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
