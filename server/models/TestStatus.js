const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const TestStatusSchema = new Schema(
  {
    isTestActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


module.exports = model('TestStatus', TestStatusSchema);
