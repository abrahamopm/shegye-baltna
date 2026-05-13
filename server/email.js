const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

function canSendEmail() {
  return Boolean(SMTP_USER && SMTP_PASS && SMTP_FROM);
}

async function sendOrderApprovalEmail(order) {
  if (!canSendEmail()) {
    return { ok: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const toEmail = order.user?.email || order.userId;
  if (!toEmail) {
    return { ok: false, error: 'Missing recipient email' };
  }

  const total = order.totals?.total ? `${order.totals.total} ETB` : 'your total';
  const itemsLine = Array.isArray(order.items)
    ? order.items.map((item) => `${item.qty}x ${item.name}`).join(', ')
    : '';

  await transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: 'Shegye Baltna order approved',
    text: `Hello ${order.user?.name || ''},\n\nYour order has been approved.\nOrder ID: ${order.id}\nTotal: ${total}\nItems: ${itemsLine}\n\nThank you for shopping with us.`,
  });

  return { ok: true };
}

module.exports = {
  sendOrderApprovalEmail,
};
