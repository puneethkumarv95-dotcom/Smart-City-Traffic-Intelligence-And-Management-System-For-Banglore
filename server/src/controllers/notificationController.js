const Notification = require('../models/Notification');

/**
 * @desc Get user notifications and broadcast alerts
 * @route GET /api/notifications
 * @access Private (Authenticated)
 */
const getNotifications = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    const query = {
      $or: [
        { user: userId },
        { targetRole: userRole },
        { targetRole: 'all' }
      ]
    };

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ ...query, isRead: false })
    ]);

    res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark a notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private (Authenticated)
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private (Authenticated)
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    await Notification.updateMany(
      {
        $or: [{ user: userId }, { targetRole: userRole }, { targetRole: 'all' }],
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
