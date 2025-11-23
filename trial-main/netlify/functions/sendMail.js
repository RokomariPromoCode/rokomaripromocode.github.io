// functions/sendMail.js (Netlify)
const nodemailer = require('nodemailer');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, contact, product } = body;
    if (!name || !contact || !product) return { statusCode: 400, body: JSON.stringify({ error:'Missing fields' }) };

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mail = {
      from: `"Site Request" <${process.env.SMTP_USER}>`,
      to: process.env.REQUEST_RECEIVER || process.env.SMTP_USER,
      subject: `New request from ${name}`,
      text: `Name: ${name}\nContact: ${contact}\nProduct: ${product}`,
      html: `<p><strong>Name:</strong> ${name}</p><p><strong>Contact:</strong> ${contact}</p><p><strong>Product:</strong> ${product}</p>`
    };

    await transporter.sendMail(mail);
    return { statusCode: 200, body: JSON.stringify({ ok:true }) };

  } catch(err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'server error' }) };
  }
};
