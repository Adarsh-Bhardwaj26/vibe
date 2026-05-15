const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendTokens, generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/tokenUtils');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');

// ─── Register ──────────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res, next) => {
  const { fullName, username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    if (existingUser.email === email) throw new AppError('Email already registered.', 400);
    if (existingUser.username === username.toLowerCase()) throw new AppError('Username already taken.', 400);
  }

  // Create verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    verificationToken,
    verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });

  // Send verification email (don't block registration)
  sendVerificationEmail(user.email, user.fullName, verificationToken).catch(console.error);

  sendTokens(res, user, 201, 'Registration successful! Please verify your email.');
});

// ─── Login ─────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Please provide email and password.', 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  if (!user) throw new AppError('Invalid email or password.', 401);
  if (!user.isActive) throw new AppError('Your account has been deactivated. Contact support.', 403);

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) throw new AppError('Invalid email or password.', 401);

  // Save refresh token
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokens(res, user, 200, 'Login successful!');
});

// ─── Logout ────────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null }, { new: true });

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ─── Refresh Token ─────────────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new AppError('No refresh token provided.', 401);

  let decoded;
  try {
    decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new AppError('Refresh token is invalid. Please log in again.', 401);
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  res.cookie('accessToken', newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

  res.status(200).json({
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// ─── Verify Email ──────────────────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpiry: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Verification link is invalid or expired.', 400);

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Email verified successfully! You can now log in.' });
});

// ─── Forgot Password ───────────────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) throw new AppError('Please provide an email address.', 400);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Security: don't reveal if email exists
    return res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  sendPasswordResetEmail(user.email, user.fullName, resetToken).catch(console.error);

  res.status(200).json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
});

// ─── Reset Password ────────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters.', 400);
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Password reset link is invalid or expired.', 400);

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  user.refreshToken = undefined; // Invalidate all sessions
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

// ─── Get Current User ──────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('followers', 'username fullName avatar')
    .populate('following', 'username fullName avatar');

  res.status(200).json({ success: true, user });
});
