import { NextRequest, NextResponse } from 'next/server';

const OWNER_EMAIL = 'jiangnan027@gmail.com';

export async function POST(req: NextRequest) {
  const { subject, message, resourceType, resourceName } = await req.json();

  const resendKey = process.env.RESEND_API_KEY;

  // With Resend API key: send a real email
  if (resendKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);

      await resend.emails.send({
        from: 'TravelPanel <notifications@travelpanel.app>',
        to: OWNER_EMAIL,
        subject: subject ?? `[TravelPanel] Action required: ${resourceName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">TravelPanel needs your attention</h2>
            <p>${message}</p>
            ${resourceType === 'api_key' ? `
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <strong>Resource needed:</strong> ${resourceName}<br/>
                <small>Add this to your Vercel environment variables or .env.local</small>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>
            <small style="color: #9ca3af;">Sent by TravelPanel autonomous build system</small>
          </div>
        `,
      });

      return NextResponse.json({ sent: true, method: 'email' });
    } catch (err) {
      console.error('[notify] Resend failed:', err);
    }
  }

  // Without Resend key: return a mailto: fallback URL the client can open
  const mailto = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject ?? `[TravelPanel] ${resourceName} needed`)}&body=${encodeURIComponent(message ?? '')}`;
  return NextResponse.json({ sent: false, method: 'mailto', mailto });
}
