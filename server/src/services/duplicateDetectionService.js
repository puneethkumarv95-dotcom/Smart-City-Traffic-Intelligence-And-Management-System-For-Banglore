const Incident = require('../models/Incident');

// Stop words to filter out during tokenization
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'near', 'is', 'are', 'was', 'were', 'it', 'this', 'that', 'there', 'road',
  'street', 'junction', 'flyover', 'main', 'cross', 'area', 'circle', 'lane'
]);

/**
 * Tokenize text into set of clean lowercase words
 */
const tokenize = (text) => {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
};

/**
 * Compute Jaccard similarity coefficient between two sets
 */
const jaccardSimilarity = (setA, setB) => {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
};

/**
 * Standardize category for comparison
 */
const normalizeCategory = (cat) => {
  if (!cat) return '';
  return cat.toLowerCase().replace(/[^a-z]/g, '');
};

/**
 * Find potential duplicates for given incident parameters
 */
const findDuplicates = async ({
  category,
  latitude,
  longitude,
  title = '',
  description = '',
  radiusMeters = 1000,
  excludeId = null
}) => {
  const normTargetCategory = normalizeCategory(category);
  const targetTokens = new Set([
    ...tokenize(title),
    ...tokenize(description)
  ]);

  // Find incidents within radius created in last 72 hours
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const query = {
    isArchived: false,
    status: { $nin: ['resolved', 'rejected'] },
    createdAt: { $gte: seventyTwoHoursAgo },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(radiusMeters, 10)
      }
    }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const candidateIncidents = await Incident.find(query)
    .populate('zone', 'name code')
    .populate('reportedBy', 'name role')
    .limit(10);

  const duplicates = [];

  for (const candidate of candidateIncidents) {
    const normCandidateCategory = normalizeCategory(candidate.category);
    const categoryMatches =
      normTargetCategory === normCandidateCategory ||
      normTargetCategory.includes(normCandidateCategory) ||
      normCandidateCategory.includes(normTargetCategory);

    // Text token similarity
    const candidateTokens = new Set([
      ...tokenize(candidate.title),
      ...tokenize(candidate.description)
    ]);
    const textSimilarity = jaccardSimilarity(targetTokens, candidateTokens);

    // Distance calculation (Haversine approx)
    const [candLng, candLat] = candidate.location.coordinates;
    const dLat = (candLat - latitude) * (Math.PI / 180);
    const dLng = (candLng - longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(latitude * (Math.PI / 180)) *
        Math.cos(candLat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = Math.round(6371000 * c);

    // Score components
    const distanceScore = Math.max(0, 1 - distanceMeters / radiusMeters); // 0 to 1
    const ageHours = (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60);
    const timeScore = Math.max(0, 1 - ageHours / 72); // 0 to 1
    const categoryWeight = categoryMatches ? 1.0 : 0.4;

    // Composite match percentage
    let confidence =
      (distanceScore * 0.4 + timeScore * 0.2 + textSimilarity * 0.4) * categoryWeight * 100;

    confidence = Math.min(99, Math.round(confidence));

    // Threshold for duplicate suggestion: 30%+ confidence
    if (confidence >= 30) {
      duplicates.push({
        incident: candidate,
        distanceMeters,
        confidence,
        reasons: [
          distanceMeters < 300 ? 'Very close location (<300m)' : `Nearby (~${distanceMeters}m)`,
          categoryMatches ? `Matching category (${candidate.category})` : 'Related hazard',
          textSimilarity > 0.2 ? 'Similar description keywords' : 'Recent occurrence in same corridor'
        ]
      });
    }
  }

  // Sort by highest confidence first
  return duplicates.sort((a, b) => b.confidence - a.confidence);
};

module.exports = {
  findDuplicates,
  tokenize,
  jaccardSimilarity
};
