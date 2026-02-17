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
  const adminKey = req.header('x-admin-key');
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

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
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) {
        return res.status(404).json({ message: 'Question not found' });
    }
    return res.json(question);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to update question', error: err.message });
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
    const questions = await Question.find().sort({ createdAt: -1 });
    return res.json(shuffleInPlace(questions));
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

module.exports = router;
