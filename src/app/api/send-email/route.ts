
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
        return NextResponse.json({ success: false, message: 'Missing `to`, `subject`, or `html` in request body.' }, { status: 400 });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
        console.error('SMTP environment variables are not set.');
        return NextResponse.json({ success: false, message: 'Server is not configured to send emails.' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: `Cawash <${SMTP_FROM}>`,
            to: to,
            subject: subject,
            html: html,
        });

        return NextResponse.json({ success: true, message: 'Email sent successfully.' });

    } catch (error: any) {
        console.error('Error sending email:', error);
        return NextResponse.json({ success: false, message: 'Failed to send email.' }, { status: 500 });
    }
}
