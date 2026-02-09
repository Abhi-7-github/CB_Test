const express = require('express');
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

router.post('/submit-test', async (req, res) => {
  try {
    const { studentEmail, responses } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ message: 'Student email is required' });
    }

    
    const questionIds = Object.keys(responses || {});
   
    
    const questions = await Question.find({ _id: { $in: questionIds }, type: 'mcq' });

    let totalScore = 0;
    let totalPossibleMarks = 0;
    const scoreResponses = [];


    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    for (const [qId, selectedIdx] of Object.entries(responses)) {
        const question = questionMap.get(qId);
        if (question) {
            const isCorrect = Number(selectedIdx) === Number(question.correctAnswer);
            const marks = isCorrect ? (question.marks || 1) : 0;
            
            totalScore += marks;
            totalPossibleMarks += (question.marks || 1);
            
            scoreResponses.push({
                questionId: question._id,
                selectedOption: selectedIdx,
                isCorrect,
                marksObtained: marks
            });
        }
    }

    await Score.findOneAndUpdate(
      { studentEmail },
      {
        score: totalScore,
        totalMarks: totalPossibleMarks
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Test submitted', score: totalScore, totalMarks: totalPossibleMarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit test', error: err.message });
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

module.exports = router;
