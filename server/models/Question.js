const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const QuestionSchema = new Schema(
  {
    id: { type: String, unique: true, sparse: true },
    type: {
      type: String,
      enum: ['mcq', 'coding', 'file'],
      default: 'mcq',
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      default: [],
    },
    correctAnswer: {
      type: Schema.Types.Mixed,
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
    
    initialCode: String,
    example: {
      input: String,
      output: String,
    },
    fileUpload: {
      required: {
        type: Boolean,
        default: false,
      },
      accept: {
        type: [String],
        default: [],
      },
      maxSizeMb: {
        type: Number,
        default: 5,
        min: 1,
      },
    },
  },
  { timestamps: true }
);

module.exports = model('Question', QuestionSchema);
