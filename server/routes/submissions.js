const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Question = require('../models/Question');
const Submission = require('../models/Submission');

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

module.exports = router;
