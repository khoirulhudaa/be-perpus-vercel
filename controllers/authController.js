const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Nodemailer Config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: Kirim Email
const sendEmail = async (to, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: `"Sistem Perpus Digital" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Gagal kirim email:', error);
  }
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, schoolId, role } = req.body;

    const userExists = await User.findOne({ 
      where: { [Op.or]: [{ username }, { email }] } 
    });
    
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Username atau Email sudah terdaftar' });
    }

    // Generate PIN 4 Digit
    const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      username,
      email,
      password: hashedPassword,
      schoolId,
      role,
      verificationPin, // Simpan PIN ke DB
      isVerified: false
    });

    // Template Email PIN
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
        <h2 style="color: #1f2937; text-align: center;">Verifikasi Akun Anda</h2>
        <p>Halo <strong>${username}</strong>,</p>
        <p>Terima kasih telah mendaftar di Sistem Perpustakaan Digital. Gunakan kode PIN di bawah ini untuk memverifikasi akun Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; background: #f3f4f6; padding: 10px 20px; border-radius: 8px; color: #2563eb;">
            ${verificationPin}
          </span>
        </div>
        <p style="font-size: 12px; color: #6b7280; text-align: center;">Jangan berikan kode ini kepada siapapun.</p>
      </div>
    `;

    await sendEmail(email, 'Kode Verifikasi Akun Perpus', emailHtml);

    res.status(201).json({ 
      success: true, 
      message: 'Registrasi berhasil. Silakan cek email untuk kode PIN verifikasi.' 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({ 
      where: { 
        [Op.or]: [{ username: identifier }, { email: identifier }],
        isActive: true 
      } 
    });

    if (!user) return res.status(404).json({ success: false, message: 'Akun tidak ditemukan' });
    
    // Proteksi Login jika belum verifikasi email
    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Akun belum diverifikasi. Silakan verifikasi email Anda.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Password salah' });

    const token = jwt.sign(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      process.env.JWT_SECRET || 'PERPUSNEW',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: { username: user.username, email: user.email, role: user.role, schoolId: user.schoolId, isActive: user.isActive, schoolName: '', logoUrl: '', lat: '', long: '' }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. VERIFIKASI PIN
exports.verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    const user = await User.findOne({ where: { email, verificationPin: pin } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'PIN salah atau email tidak ditemukan' });
    }

    user.isVerified = true;
    user.verificationPin = null; // Hapus PIN setelah verifikasi
    await user.save();

    res.json({ success: true, message: 'Akun berhasil diverifikasi. Silakan login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- FORGOT PASSWORD ---
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email tidak ditemukan' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 Jam
    await user.save();

    // Sesuaikan dengan URL Frontend Anda
    const resetUrl = `https://admin.kiraproject.id/auth/reset-password/${resetToken}`;

    // Template Email Premium
    const emailHtml = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: white; padding: 40px 0; color: #1f2937;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 24px 20px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #111827;">Atur Ulang Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 30px 24px; text-align: center;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Halo, kami menerima permintaan untuk mengatur ulang password akun <strong>Dashboard</strong> Anda.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 40px 24px; text-align: center;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                Reset Password Sekarang
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 30px 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                Link ini hanya berlaku selama 60 menit
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 24px; background-color: #f3f4f6; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; 2026 Vokadash Team. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    await sendEmail(email, 'Reset Kata Sandi', emailHtml);

    res.json({ success: true, message: 'Instruksi reset password telah dikirim ke email' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- RESET PASSWORD ---
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // 1. Cari user berdasarkan token yang masih berlaku
    const user = await User.findOne({ 
      where: { 
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: Date.now() } 
      } 
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token tidak valid atau sudah kadaluarsa' 
      });
    }

    // 2. Hash password baru secara manual
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 3. Update data user
    user.password = hashedPassword; 
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await user.save();

    res.json({ success: true, message: 'Password berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};