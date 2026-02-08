const express = require('express');
const Question = require('../models/Question');

const router = express.Router();

function requireAdmin(req, res, next) {
  const role = req.header('x-role');
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

router.post('/', requireAdmin, async (req, res) => {
  try {
    const question = new Question(req.body);
    const saved = await question.save();
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to create question', error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    return res.json(questions);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch questions' });
  }
});

module.exports = router;
