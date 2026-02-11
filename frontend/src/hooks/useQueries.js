import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Principal } from '@dfinity/principal';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// User Management Queries
export function useGetAllUsers() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerProfile() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['callerProfile'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Task Queries
export function useGetAllTasks() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTasks();
    },
    enabled: !!actor && !isFetching,
  });
}

// Notifications
export function useGetUserNotifications(userId) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['notifications', userId?.toString()],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserNotifications(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

// Task Progress Updates
export function useGetTaskUpdatesForTask(taskId) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['taskUpdates', taskId],
    queryFn: async () => {
      if (!actor || !taskId) return [];
      return actor.getTaskUpdatesForTask(taskId);
    },
    enabled: !!actor && !isFetching && !!taskId,
  });
}

export function useGetAllTaskUpdates() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['taskUpdates', 'all'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTaskUpdates();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTaskUpdate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTaskUpdate(update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskUpdates'] });
    },
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createTask(task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateTask(task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Attendance Queries
export function useGetAllAttendance() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAttendance();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000, // Poll every 30s so active user counts stay live
  });
}

// Leave Requests
export function useGetAllLeaveRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['leaves', 'all'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllLeaveRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserLeaveRequests(userId) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['leaves', userId?.toString()],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserLeaveRequests(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useApplyLeave() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leave) => {
      if (!actor) throw new Error('Actor not available');
      return actor.applyLeave(leave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
}

export function useUpdateLeaveRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateLeaveRequest(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'leaves'
      });
    },
  });
}
export function useGetUserAttendance(userId) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['attendance', userId?.toString()],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserAttendance(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useRecordAttendance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendance) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordAttendance(attendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useUpdateAttendance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendance) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateAttendance(attendance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

// Message Queries
export function useGetAllMessages() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMessages();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendMessage(message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMessage(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['messages'] });
      const previous = queryClient.getQueryData(['messages']);
      queryClient.setQueryData(['messages'], (old = []) =>
        old.filter(m => ((m._id ?? m.messageId ?? m.id)) !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['messages'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });
}

// Meeting Notes Queries
export function useGetAllMeetingNotes() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['meetingNotes'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMeetingNotes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddMeetingNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addMeetingNote(note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
    },
  });
}

export function useUpdateMeetingNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMeetingNote(note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
    },
  });
}

export function useDeleteMeetingNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMeetingNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingNotes'] });
    },
  });
}

// Scrum Notes Queries
export function useGetUserScrumNotes(userId) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['scrumNotes', userId?.toString()],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserScrumNotes(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useGetAllScrumNotes() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['scrumNotes', 'all'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllScrumNotes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddScrumNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addScrumNote(note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrumNotes'] });
    },
  });
}

export function useUpdateScrumNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateScrumNote(note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrumNotes'] });
    },
  });
}

// Holiday Queries
export function useGetAllHolidays() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllHolidays();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddHoliday() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addHoliday(holiday);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

export function useUpdateHoliday() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateHoliday(holiday);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}

export function useDeleteHoliday() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteHoliday(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
}


// Payment Queries
export function useGetAllPayments() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserPayments(userId) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['payments', userId?.toString()],
    queryFn: async () => {
      if (!actor || !userId) return [];
      return actor.getUserPayments(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useRecordPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordPayment(payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useUpdatePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePayment(payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useDeletePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePayment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

// Company Info Queries
export function useGetCompanyInfo() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['companyInfo'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCompanyInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveCompanyInfo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (info) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCompanyInfo(info);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyInfo'] });
    },
  });
}

// Check if caller is admin
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}
