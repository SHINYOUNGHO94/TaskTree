"use client";

import { useState } from "react";
import { AlertCircle, Calendar, CheckSquare, Square, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CaseDetail,
  CaseService,
  CaseTaskDetail,
  CaseTaskStatus,
  UpdateCaseTaskInput,
  UserProfile,
} from "@task/core";
import { CASE_TASK_STATUS_LABELS, resolveDisplayName, shortId } from "../dashboard/caseLabels";
import { canManageCaseTask } from "./caseDetailPermissions";

const TASK_STATUS_STYLES: Record<CaseTaskStatus, string> = {
  [CaseTaskStatus.TODO]: "bg-gray-100 text-gray-600 border border-gray-200",
  [CaseTaskStatus.IN_PROGRESS]: "bg-blue-50 text-blue-600 border border-blue-100",
  [CaseTaskStatus.REVIEW_REQUESTED]: "bg-purple-50 text-purple-600 border border-purple-100",
  [CaseTaskStatus.DONE]: "bg-green-50 text-green-600 border border-green-100",
  [CaseTaskStatus.ON_HOLD]: "bg-yellow-50 text-yellow-600 border border-yellow-100",
  [CaseTaskStatus.CANCELED]: "bg-red-50 text-red-600 border border-red-100",
};

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 my-3">
    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
    <span>{message}</span>
  </div>
);

export interface CaseTasksSectionProps {
  caseId: string;
  caseDetail: CaseDetail;
  caseTasks: CaseTaskDetail[];
  isTasksLoading: boolean;
  tasksError: string | null;
  currentUserId: string | null;
  currentProfile: UserProfile | null;
  userMap: Map<string, { name: string; email: string }>;
  onTaskChange: () => Promise<void>;
}

export const CaseTasksSection = ({
  caseId,
  caseDetail,
  caseTasks,
  isTasksLoading,
  tasksError,
  currentUserId,
  currentProfile,
  userMap,
  onTaskChange,
}: CaseTasksSectionProps) => {
  const { t } = useTranslation("ui");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreateError, setTaskCreateError] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<CaseTaskDetail | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState<CaseTaskStatus>(CaseTaskStatus.TODO);
  const [editTaskAssigneeId, setEditTaskAssigneeId] = useState<string>("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState<string | null>(null);

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState<string | null>(null);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      setTaskCreateError(t("Please enter a title."));
      return;
    }
    setIsCreatingTask(true);
    setTaskCreateError(null);
    try {
      await CaseService.createCaseTask(caseId, {
        title: newTaskTitle.trim(),
        description: newTaskDescription,
        dueDate: newTaskDueDate || null,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate("");
      setShowTaskForm(false);
      await onTaskChange();
    } catch {
      setTaskCreateError(t("Failed to create task. Please try again."));
    } finally {
      setIsCreatingTask(false);
    }
  };

  const openEditTask = (task: CaseTaskDetail) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description);
    setEditTaskStatus(task.status);
    setEditTaskAssigneeId(task.assigneeId ?? "");
    setEditTaskDueDate(task.dueDate ?? "");
    setEditTaskError(null);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    if (!editTaskTitle.trim()) {
      setEditTaskError(t("Please enter a title."));
      return;
    }
    setIsEditingTask(true);
    setEditTaskError(null);
    try {
      const input: UpdateCaseTaskInput = {
        title: editTaskTitle.trim(),
        description: editTaskDescription,
        status: editTaskStatus,
        assigneeId: editTaskAssigneeId || null,
        dueDate: editTaskDueDate || null,
      };
      await CaseService.updateCaseTask(caseId, editingTask.taskId, input);
      setEditingTask(null);
      await onTaskChange();
    } catch {
      setEditTaskError(t("Failed to update task. Please try again."));
    } finally {
      setIsEditingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    setIsDeletingTask(true);
    setDeleteTaskError(null);
    try {
      await CaseService.deleteCaseTask(caseId, deletingTaskId);
      setDeletingTaskId(null);
      await onTaskChange();
    } catch {
      setDeleteTaskError(t("Failed to delete task. Please try again."));
    } finally {
      setIsDeletingTask(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{t("Tasks")}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{t("Checklist of tasks to complete")}</p>
          </div>
          <button
            onClick={() => {
              setShowTaskForm(!showTaskForm);
              setTaskCreateError(null);
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            {showTaskForm ? t("Cancel") : t("+ Add Task")}
          </button>
        </div>

        {showTaskForm && (
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="space-y-4">
              {taskCreateError && <ErrorAlert message={taskCreateError} />}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Title")}</label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={t("Enter task title")}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Content (optional)")}</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder={t("Enter task details...")}
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Due Date (optional)")}</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingTask ? t("Creating...") : t("Create Task")}
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {isTasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
          ) : tasksError ? (
            <ErrorAlert message={tasksError} />
          ) : caseTasks.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
              <p className="text-sm text-gray-400">{t("No tasks yet.")}</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {caseTasks.map((task) => {
                const isCompleted = task.status === CaseTaskStatus.DONE;
                const canManageTask = canManageCaseTask(task, caseDetail, currentUserId, currentProfile);
                return (
                  <li
                    key={task.taskId}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all shadow-sm"
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-green-500" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-gray-800 truncate ${isCompleted ? "line-through text-gray-400 font-normal" : ""}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.description && (
                          <p className="text-xs text-gray-400 truncate">{task.description}</p>
                        )}
                        {task.assigneeId && (
                          <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                            <User size={10} />
                            {resolveDisplayName(task.assigneeId, userMap)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${TASK_STATUS_STYLES[task.status]}`}>
                        {t(CASE_TASK_STATUS_LABELS[task.status])}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} />
                          {task.dueDate}
                        </span>
                      )}
                      {canManageTask && (
                        <>
                          <button
                            onClick={() => openEditTask(task)}
                            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors font-medium whitespace-nowrap"
                          >
                            {t("Edit")}
                          </button>
                          <button
                            onClick={() => {
                              setDeletingTaskId(task.taskId);
                              setDeleteTaskError(null);
                            }}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors font-medium whitespace-nowrap"
                          >
                            {t("Delete")}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">{t("Edit Task")}</h3>
            </div>
            <div className="p-6 space-y-4">
              {editTaskError && <ErrorAlert message={editTaskError} />}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Title")}</label>
                <input
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Content")}</label>
                <textarea
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Status")}</label>
                <select
                  value={editTaskStatus}
                  onChange={(e) => setEditTaskStatus(e.target.value as CaseTaskStatus)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  {Object.values(CaseTaskStatus).map((s) => (
                    <option key={s} value={s}>{t(CASE_TASK_STATUS_LABELS[s])}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Assignee")}</label>
                <select
                  value={editTaskAssigneeId}
                  onChange={(e) => setEditTaskAssigneeId(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">{t("No assignee")}</option>
                  {Array.from(userMap.entries()).map(([uid, u]) => (
                    <option key={uid} value={uid}>{u.name || u.email || shortId(uid)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t("Due Date (optional)")}</label>
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditingTask(null)}
                disabled={isEditingTask}
                className="text-sm font-bold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleUpdateTask}
                disabled={isEditingTask}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isEditingTask ? t("Updating...") : t("Update")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirm Modal */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-2">{t("Delete Task")}</h3>
              <p className="text-sm text-gray-500">{t("Are you sure you want to delete this task? This action cannot be undone.")}</p>
              {deleteTaskError && <div className="mt-3"><ErrorAlert message={deleteTaskError} /></div>}
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => { setDeletingTaskId(null); setDeleteTaskError(null); }}
                disabled={isDeletingTask}
                className="text-sm font-bold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                {t("Cancel")}
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={isDeletingTask}
                className="text-sm font-bold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isDeletingTask ? t("Deleting...") : t("Delete (confirm)")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
