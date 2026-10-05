const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const ScoreSchema = new Schema(
  {
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    studentName: {
      type: String,
      trim: true,
      default: '',
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    responses: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isSubmitted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = model('Score', ScoreSchema);
