const mongoose = require('mongoose');

const savedRouteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Route nickname is required (e.g. Daily Commute, Home to Office)'],
      trim: true,
      maxlength: 100
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    origin: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    },
    destination: {
      address: { type: String, required: true },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    },
    distanceKm: {
      type: Number,
      required: true
    },
    estimatedDurationMin: {
      type: Number,
      required: true
    },
    // Optional GeoJSON LineString of the route path
    routeGeometry: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString'
      },
      coordinates: {
        type: [[Number]], // array of [lng, lat]
        default: []
      }
    },
    alertRadiusKm: {
      type: Number,
      default: 1.5 // Alert if hazards occur within 1.5km of corridor
    },
    isMonitored: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SavedRoute', savedRouteSchema);

