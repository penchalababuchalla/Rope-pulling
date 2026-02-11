const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
  },
  { timestamps: true }
);

// Index for quick lookup by username (find-or-create on login)
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);
