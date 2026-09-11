const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const SubmissionSchema = new Schema(
  {
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
    },
    responses: {
      type: Schema.Types.Mixed,
      default: {},
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    file: {
      url: String,
      publicId: String,
      originalName: String,
      mimeType: String,
      size: Number,
    },
    isSubmitted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = model('Submission', SubmissionSchema);
