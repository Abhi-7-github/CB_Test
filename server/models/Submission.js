const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const SubmissionSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    file: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
      originalName: String,
      mimeType: String,
      size: Number,
    },
  },
  { timestamps: true }
);

module.exports = model('Submission', SubmissionSchema);
