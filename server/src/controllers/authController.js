const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../config/jwt');

// Helper to save refresh token in MongoDB
const saveRefreshToken = async (user, tokenStr, ipAddress) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const refreshTokenDoc = await RefreshToken.create({
    token: tokenStr,
    user: user._id,
    expiresAt,
    createdByIp: ipAddress || ''
  });

  return refreshTokenDoc;
};

/**
 * @desc Register a new citizen account
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, preferredLanguage, notificationRadiusKm } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Public registration MUST strictly create 'citizen' accounts only
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'citizen',
      isApproved: true,
      preferredLanguage,
      notificationRadiusKm
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user, refreshToken, req.ip);

    // Audit Log
    await AuditLog.create({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      details: { role: user.role, name: user.name },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(201).json({
      success: true,
      message: 'Citizen account registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          notificationRadiusKm: user.notificationRadiusKm,
          isApproved: user.isApproved
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Login user & return tokens
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password').populate('assignedZone');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your official account is pending administrator approval before login.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await saveRefreshToken(user, refreshToken, req.ip);

    // Audit Log
    await AuditLog.create({
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id.toString(),
      details: { role: user.role },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          badgeNumber: user.badgeNumber,
          department: user.department,
          assignedZone: user.assignedZone,
          preferredLanguage: user.preferredLanguage,
          notificationRadiusKm: user.notificationRadiusKm,
          isApproved: user.isApproved,
          lastLogin: user.lastLogin
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Refresh access token with refresh token rotation
 * @route POST /api/auth/refresh
 * @access Public
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }

    // Find the token in database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not recognized or already invalidated.'
      });
    }

    if (tokenDoc.revokedAt) {
      // Possible token reuse attempt: revoke all tokens for this user for security
      await RefreshToken.updateMany(
        { user: tokenDoc.user },
        { revokedAt: new Date() }
      );
      return res.status(403).json({
        success: false,
        message: 'Compromised refresh token detected. All active sessions have been revoked.'
      });
    }

    if (Date.now() >= tokenDoc.expiresAt.getTime()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please log in again.'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account inactive.'
      });
    }

    // Generate new tokens (Rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Invalidate the old refresh token and link replacement
    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedByToken = newRefreshToken;
    await tokenDoc.save();

    // Save newly issued refresh token
    await saveRefreshToken(user, newRefreshToken, req.ip);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Logout user and revoke refresh token
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { revokedAt: new Date() }
      );
    }

    if (req.user) {
      await AuditLog.create({
        actor: req.user._id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'USER_LOGOUT',
        resourceType: 'User',
        resourceId: req.user._id.toString(),
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get current authenticated user details
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedZone');
    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department,
        assignedZone: user.assignedZone,
        isApproved: user.isApproved,
        isActive: user.isActive,
        preferredLanguage: user.preferredLanguage,
        notificationRadiusKm: user.notificationRadiusKm,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update user profile details
 * @route PATCH /api/auth/profile
 * @access Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferredLanguage, notificationRadiusKm } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (notificationRadiusKm) user.notificationRadiusKm = notificationRadiusKm;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        notificationRadiusKm: user.notificationRadiusKm
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile
};

