const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['citizen', 'police', 'emergency', 'operator', 'admin'],
      default: 'citizen',
      index: true
    },
    badgeNumber: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      trim: true,
      default: ''
    },
    assignedZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityZone',
      default: null
    },
    isApproved: {
      type: Boolean,
      default: function () {
        // Citizens are auto-approved; official roles require approval if self-created
        return this.role === 'citizen';
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'kn', 'hi'],
      default: 'en'
    },
    notificationRadiusKm: {
      type: Number,
      default: 5,
      min: 1,
      max: 50
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

