// ZetHub Task Planner Manager
import memoryDb from '../memory/database.js';
import aiRouter from '../utils/ai-router.js';

export class TaskManager {
  static getTasks() {
    return memoryDb.getCollection('tasks');
  }

  static createTask(title, description = '', priority = 'medium', deadline = null, projectId = null) {
    const task = {
      title,
      description,
      priority,
      status: 'pending',
      deadline,
      projectId,
      subtasks: [],
      history: []
    };
    return memoryDb.insert('tasks', task);
  }

  static updateTaskStatus(taskId, status) {
    const task = memoryDb.getItem('tasks', taskId);
    if (!task) return false;

    const history = task.history || [];
    history.push({ status, timestamp: new Date().toISOString() });

    return memoryDb.update('tasks', taskId, { status, history });
  }

  static async generateSubtasksWithAI(taskId) {
    const task = memoryDb.getItem('tasks', taskId);
    if (!task) throw new Error('Task not found');

    const prompt = `Decompose the following high-level task into 4 to 6 concrete sequential subtasks:
Task: "${task.title}"
Description: "${task.description || 'N/A'}"

Return ONLY a JSON array of strings representing subtasks. Example:
["Step 1: Inspect environment", "Step 2: Modify code", "Step 3: Run verification tests"]`;

    const res = await aiRouter.chat(prompt, { temperature: 0.2 });
    let subtasks = [];
    try {
      let raw = res.content.trim();
      if (raw.startsWith('```')) raw = raw.replace(/^```(json)?\n?|\n?```$/g, '').trim();
      subtasks = JSON.parse(raw);
    } catch (e) {
      subtasks = res.content.split('\n').filter(l => l.trim().length > 0).map(l => l.replace(/^[-*\d.]+\s*/, ''));
    }

    const formattedSubtasks = subtasks.map((st, i) => ({
      id: `st_${Date.now()}_${i}`,
      title: typeof st === 'string' ? st : (st.title || String(st)),
      completed: false
    }));

    memoryDb.update('tasks', taskId, { subtasks: formattedSubtasks });
    return formattedSubtasks;
  }
}

export default TaskManager;
