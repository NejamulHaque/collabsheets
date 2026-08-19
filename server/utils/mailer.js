const nodemailer = require('nodemailer');

async function sendPaymentAlert({ username, email, amount, utr }) {
  const subject = `💰 New UPI payment from ${username} — approval needed`;
  const text = `User ${username} (${email}) says they paid ₹${amount} via UPI.\nUTR/Reference: ${utr || 'Not provided'}\n\nOpen your Admin Dashboard to approve or reject.`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('📧 EMAIL NOT CONFIGURED — add EMAIL_USER + EMAIL_PASS (Gmail App Password) to server/.env');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"CollabSheets" <${process.env.EMAIL_USER}>`,
      to: 'nejamulhaque.works@gmail.com',
      subject,
      text,
    });

    console.log('📧 Payment alert email SENT to nejamulhaque.works@gmail.com');
  } catch (e) {
    console.error('📧 EMAIL FAILED:', e.message);
  }
}

module.exports = { sendPaymentAlert };