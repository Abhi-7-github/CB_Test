const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const StudentSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: function requiredEmail() {
        return this.role === 'student';
      },
      validate: {
        validator: function validateEmail(value) {
          if (this.role !== 'student') return true;
          return /@klu\.ac\.in$/i.test(value || '');
        },
        message: 'Student email must end with @klu.ac.in',
      },
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model('Student', StudentSchema);
