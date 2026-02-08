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

  },
  { timestamps: true }
);

module.exports = model('Score', ScoreSchema);
