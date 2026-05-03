import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Invalid email address.' }, { status: 400 });
    }

    // 1. Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Expire in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3. Upsert into password_reset_otps table
    // Note: Make sure this table exists in your Supabase DB.
    const { error: dbError } = await supabaseAdmin
      .from('password_reset_otps')
      .upsert({ email: email.toLowerCase().trim(), otp, expires_at: expiresAt });

    if (dbError) {
      console.error("DB Error storing OTP:", dbError);
      return NextResponse.json({ success: false, message: 'Failed to generate OTP. Check server logs.' }, { status: 500 });
    }

    // 4. Configure Nodemailer for Zoho
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.in',
      port: 465,
      secure: true,
      auth: {
        user: 'no-reply@consolegal.com',
        pass: 'nqgfuzimlkmjtvgt'
      }
    });

    // 5. Send the mail
    try {
      await transporter.sendMail({
        from: '"BizKit" <no-reply@consolegal.com>',
        to: email,
        subject: 'Your Password Reset OTP',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;"><h2>BizKit</h2></div>
            <p>Hello,</p>
            <p>You have requested a password reset. Use the following OTP to reset your password. This OTP is valid for 10 minutes.</p>
            <h1 style="text-align: center; margin: 30px 0; font-size: 32px; letter-spacing: 4px; color: #1e293b;">${otp}</h1>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
    } catch (mailError: any) {
      // Fallback to .com if .in fails
      const fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
          user: 'no-reply@consolegal.com',
          pass: 'nqgfuzimlkmjtvgt'
        }
      });
      await fallbackTransporter.sendMail({
        from: '"BizKit" <no-reply@consolegal.com>',
        to: email,
        subject: 'Your Password Reset OTP',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;"><h2>BizKit</h2></div>
            <p>Hello,</p>
            <p>You have requested a password reset. Use the following OTP to reset your password. This OTP is valid for 10 minutes.</p>
            <h1 style="text-align: center; margin: 30px 0; font-size: 32px; letter-spacing: 4px; color: #1e293b;">${otp}</h1>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully!' });

  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
