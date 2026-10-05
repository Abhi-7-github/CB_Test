const express = require('express');
const Question = require('../models/Question');

const router = express.Router();

function shuffleInPlace(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function requireAdmin(req, res, next) {
  const adminKey = req.header('x-admin-key') || req.body?.adminKey || req.query?.adminKey;
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: 'Admin access required. Provide x-admin-key header or adminKey in body/query.' });
  }
  return next();
}

router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const rawQuestions = Array.isArray(req.body)
      ? req.body
      : (Array.isArray(req.body?.questions) ? req.body.questions : null);

    if (!rawQuestions || rawQuestions.length === 0) {
      return res.status(400).json({
        message: 'Provide a non-empty array of question objects (e.g. [ ... ] or { questions: [ ... ] })',
      });
    }

    const operations = rawQuestions.map((q) => {
      const doc = {
        type: q.type || 'mcq',
        text: q.text,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer,
        marks: Number.isFinite(Number(q.marks)) ? Number(q.marks) : 1,
        ...(q.id ? { id: String(q.id).trim() } : {}),
        ...(q.fileUpload ? { fileUpload: q.fileUpload } : {}),
      };

      if (q.id) {
        return {
          updateOne: {
            filter: { id: String(q.id).trim() },
            update: { $set: doc },
            upsert: true,
          },
        };
      }

      return {
        insertOne: {
          document: doc,
        },
      };
    });

    const result = await Question.bulkWrite(operations, { ordered: false });
    const totalCount = await Question.countDocuments();

    return res.status(200).json({
      message: 'Bulk questions processed successfully',
      received: rawQuestions.length,
      upsertedCount: result.upsertedCount || 0,
      insertedCount: result.insertedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      matchedCount: result.matchedCount || 0,
      totalQuestionsInDB: totalCount,
    });
  } catch (err) {
    console.error('Error adding bulk questions:', err);
    return res.status(500).json({
      message: 'Failed to process bulk questions',
      error: err.message,
    });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      if (req.body.length === 0) {
        return res.status(400).json({ message: 'No questions provided' });
      }
      const saved = await Question.insertMany(req.body, { ordered: false });
      return res.status(201).json(saved);
    }

    const question = new Question(req.body);
    const saved = await question.save();
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to create question', error: err.message });
  }
});


router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    return res.json(question);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to update question', error: err.message });
  }
});

router.delete('/all', requireAdmin, async (req, res) => {
  try {
    const result = await Question.deleteMany({});
    return res.json({ message: 'All questions deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete all questions', error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    return res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete question', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const adminKey = req.header('x-admin-key');
    const isAdmin = Boolean(process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY);

    let query = Question.find().sort({ createdAt: -1 });
    if (!isAdmin) {
      query = query.select('-correctAnswer');
    }

    const questions = await query.lean();
    return res.json(shuffleInPlace(questions));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

module.exports = router;
