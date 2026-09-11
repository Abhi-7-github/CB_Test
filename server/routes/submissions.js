const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const Score = require('../models/Score');

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'cb_test/submissions',
    resource_type: 'auto',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/questions/:id/submissions', upload.single('file'), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.type !== 'file') {
      return res.status(400).json({ message: 'This question does not accept file uploads' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const submission = new Submission({
      question: question._id,
      studentEmail: req.body.studentEmail,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });

    const saved = await submission.save();
    return res.status(201).json(saved);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to upload submission', error: err.message });
  }
});

function resolveCorrectIndex(question) {
  if (!question || !Array.isArray(question.options)) return null;
  const total = question.options.length;
  const raw = question.correctAnswer;
  if (raw === null || raw === undefined) return null;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw >= 0 && raw < total) return raw;
    if (raw >= 1 && raw <= total) return raw - 1;
    return null;
  }

  const text = String(raw).trim();
  if (!text) return null;

  if (/^[A-Za-z]$/.test(text)) {
    const idx = text.toUpperCase().charCodeAt(0) - 65;
    return idx >= 0 && idx < total ? idx : null;
  }

  if (/^\d+$/.test(text)) {
    const num = Number(text);
    if (num >= 0 && num < total) return num;
    if (num >= 1 && num <= total) return num - 1;
    return null;
  }

  const exactIdx = question.options.indexOf(text);
  if (exactIdx !== -1) return exactIdx;

  const lowered = text.toLowerCase();
  const ciIdx = question.options.findIndex((opt) => String(opt).toLowerCase() === lowered);
  return ciIdx !== -1 ? ciIdx : null;
}

router.post('/submit-test', async (req, res) => {
  try {
    const { studentEmail, responses } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ message: 'Student email is required' });
    }

    const normalizedEmail = String(studentEmail).trim().toLowerCase();

    const existingScore = await Score.findOne({ studentEmail: normalizedEmail });
    if (existingScore) {
      return res.status(403).json({
        message: 'Exam already submitted. You are not allowed to rewrite the exam.',
        hasSubmitted: true,
        score: existingScore.score,
        totalMarks: existingScore.totalMarks
      });
    }

    const responsesObj = responses || {};
    const questionIds = Object.keys(responsesObj);

    // Filter valid MongoDB ObjectIds to prevent CastError crashes
    const validObjectIds = questionIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Find questions by _id or custom id
    const questions = await Question.find({
      $or: [
        { _id: { $in: validObjectIds } },
        { id: { $in: questionIds } }
      ]
    });

    const allQuestions = await Question.find({}); 
    const totalPossibleMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

    let totalScore = 0;

    const questionMap = new Map();
    questions.forEach(q => {
      if (q._id) questionMap.set(q._id.toString(), q);
      if (q.id) questionMap.set(q.id.toString(), q);
    });

    for (const [qId, selectedIdx] of Object.entries(responsesObj)) {
      const question = questionMap.get(qId);
      if (question) {
        const correctIdx = resolveCorrectIndex(question);
        const isCorrect = correctIdx !== null && Number(selectedIdx) === Number(correctIdx);
        const marks = isCorrect ? (question.marks || 1) : 0;
        totalScore += marks;
      }
    }

    const scoreDoc = await Score.findOneAndUpdate(
      { studentEmail: normalizedEmail },
      {
        score: totalScore,
        totalMarks: totalPossibleMarks,
        responses: responsesObj,
        isSubmitted: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const submissionDoc = await Submission.create({
      studentEmail: normalizedEmail,
      responses: responsesObj,
      score: totalScore,
      totalMarks: totalPossibleMarks,
      isSubmitted: true
    });

    return res.status(200).json({
      message: 'Test submitted',
      score: totalScore,
      totalMarks: totalPossibleMarks,
      isSubmitted: true,
      scoreDoc,
      submissionDoc
    });
  } catch (err) {
    console.error('Error submitting test:', err);
    return res.status(500).json({ message: 'Failed to submit test', error: err.message });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ createdAt: -1 });
    return res.status(200).json(submissions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch submissions', error: err.message });
  }
});

router.get('/scores/check/:email', async (req, res) => {
  try {
    const email = String(req.params.email).trim().toLowerCase();
    const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const existingScore = await Score.findOne({ studentEmail: emailRegex });
    if (existingScore) {
      return res.json({ hasSubmitted: true, isSubmitted: true, score: existingScore });
    }
    const existingSubmission = await Submission.findOne({ studentEmail: emailRegex });
    if (existingSubmission) {
      return res.json({ hasSubmitted: true, isSubmitted: true, submission: existingSubmission });
    }
    return res.json({ hasSubmitted: false, isSubmitted: false });
  } catch (err) {
    console.error('Error checking student score status:', err);
    return res.status(500).json({ message: 'Failed to check score status', error: err.message });
  }
});

router.delete('/scores/reset/:email', async (req, res) => {
  try {
    const email = String(req.params.email).trim().toLowerCase();
    const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    await Score.deleteMany({ studentEmail: emailRegex });
    await Submission.deleteMany({ studentEmail: emailRegex });
    return res.json({ message: `Successfully reset test attempt and scores for ${email}` });
  } catch (err) {
    console.error('Error resetting score status:', err);
    return res.status(500).json({ message: 'Failed to reset score status', error: err.message });
  }
});

router.get('/scores', async (req, res) => {
    try {
        const scores = await Score.find().sort({ score: -1 });
        res.status(200).json(scores);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch scores', error: err.message });
    }
});

router.post('/scores/bulk', async (req, res) => {
  try {
    const scores = Array.isArray(req.body) ? req.body : req.body?.scores;

    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        message: 'Provide a non-empty array of score objects',
      });
    }

    const invalidIndex = scores.findIndex((item) => !item?.studentEmail);
    if (invalidIndex !== -1) {
      return res.status(400).json({
        message: `studentEmail is required at index ${invalidIndex}`,
      });
    }

    const operations = scores.map((item) => ({
      updateOne: {
        filter: { studentEmail: String(item.studentEmail).trim().toLowerCase() },
        update: {
          $set: {
            score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0,
            totalMarks: Number.isFinite(Number(item.totalMarks)) ? Number(item.totalMarks) : 0,
          },
          $setOnInsert: {
            studentEmail: String(item.studentEmail).trim().toLowerCase(),
          },
        },
        upsert: true,
      },
    }));

    const result = await Score.bulkWrite(operations, { ordered: false });

    return res.status(200).json({
      message: 'Bulk scores processed successfully',
      received: scores.length,
      inserted: result.upsertedCount || 0,
      updated: result.modifiedCount || 0,
      matched: result.matchedCount || 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to process bulk scores', error: err.message });
  }
});

module.exports = router;
