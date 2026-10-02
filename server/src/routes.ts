import { Router, Request, Response, NextFunction } from 'express';
import db, { getAppState, setAppState } from './db.js';
import { getCurrentMode, getTodayDate, getTomorrowDate } from './config.js';

const router = Router();

// Wrap async route handlers to forward errors
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// GET /api/mode
router.get('/mode', (_req, res) => {
  const state = getAppState();
  res.json({
    mode: state.currentMode,
    today: state.currentDate,
  });
});

// POST /api/end-day
router.post('/end-day', (_req, res) => {
  const oldDate = getTodayDate();
  const newDate = getTomorrowDate();

  // Carry forward pending tasks from old today to new today
  const carryResult = db.prepare(
    "UPDATE tasks SET scheduled_date = ? WHERE scheduled_date = ?"
  ).run(newDate, oldDate);

  // Advance the day and enter planning mode
  setAppState(newDate, 'planning');

  res.json({
    newDate,
    mode: 'planning',
    carriedForwardCount: carryResult.changes,
  });
});

// POST /api/start-day — switch to focus mode without advancing the date
router.post('/start-day', (_req, res) => {
  const todayDate = getTodayDate();

  // Just switch to focus mode, don't advance the date
  setAppState(todayDate, 'focus');

  res.json({
    date: todayDate,
    mode: 'focus',
  });
});

// POST /api/set-date — change the current date without changing mode
router.post('/set-date', (req, res) => {
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date is required in YYYY-MM-DD format' });
    return;
  }

  const state = getAppState();
  setAppState(date, state.currentMode);

  res.json({
    today: date,
    mode: state.currentMode,
  });
});

// GET /api/tasks/today
router.get('/tasks/today', (_req, res) => {
  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY sort_order ASC'
  ).all(getTodayDate());
  res.json(tasks);
});

// GET /api/tasks/tomorrow
router.get('/tasks/tomorrow', (_req, res) => {
  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY sort_order ASC'
  ).all(getTomorrowDate());
  res.json(tasks);
});

// GET /api/tasks/date/:date
router.get('/tasks/date/:date', (req, res) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    return;
  }
  const tasks = db.prepare(
    'SELECT * FROM tasks WHERE scheduled_date = ? ORDER BY sort_order ASC'
  ).all(date);
  res.json(tasks);
});

// GET /api/tasks/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/tasks/calendar', (req, res) => {
  const { from, to } = req.query;
  if (
    typeof from !== 'string' || typeof to !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    res.status(400).json({ error: 'from and to query params required in YYYY-MM-DD format' });
    return;
  }
  const rows = db.prepare(`
    SELECT scheduled_date, COUNT(*) as count
    FROM tasks
    WHERE scheduled_date >= ? AND scheduled_date <= ?
    GROUP BY scheduled_date
  `).all(from, to) as { scheduled_date: string; count: number }[];

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.scheduled_date] = row.count;
  }
  res.json(result);
});

// POST /api/tasks
router.post('/tasks', asyncHandler(async (req, res) => {
  const { description, scheduled_date, time_start, time_end, location } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    res.status(400).json({ error: 'description is required' });
    return;
  }
  if (!scheduled_date) {
    res.status(400).json({ error: 'scheduled_date is required' });
    return;
  }

  // Determine next sort_order
  const maxRow = db.prepare(
    'SELECT MAX(sort_order) as max_order FROM tasks WHERE scheduled_date = ?'
  ).get(scheduled_date) as { max_order: number | null };
  const sortOrder = (maxRow?.max_order ?? -1) + 1;

  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO tasks (description, scheduled_date, sort_order, time_start, time_end, location, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    description.trim(),
    scheduled_date,
    sortOrder,
    time_start || null,
    time_end || null,
    location || null,
    now
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
}));

// PATCH /api/tasks/:id
router.patch('/tasks/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = ['description', 'time_start', 'time_end', 'location', 'sort_order'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  values.push(id);
  const result = db.prepare(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
}));

// PATCH /api/tasks/:id/complete — deletes the task entirely
router.patch('/tasks/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = db.prepare(
    "DELETE FROM tasks WHERE id = ?"
  ).run(id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Task not found or already completed' });
    return;
  }

  res.status(204).send();
}));

// PUT /api/tasks/reorder
router.put('/tasks/reorder', asyncHandler(async (req, res) => {
  const { taskIds } = req.body;

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    res.status(400).json({ error: 'taskIds must be a non-empty array' });
    return;
  }

  const reorder = db.transaction(() => {
    const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
    for (let i = 0; i < taskIds.length; i++) {
      stmt.run(i, taskIds[i]);
    }
  });

  reorder();
  res.json({ success: true });
}));

// DELETE /api/tasks/:id
router.delete('/tasks/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.status(204).send();
}));

export default router;
