export interface EmailTemplate {
  subject: string;
  html: string;
}

const BRAND_COLOR = '#3B82F6';
const BG_COLOR = '#0a0a0f';
const CARD_BG = '#1a1a24';
const TEXT_PRIMARY = '#f8fafc';
const TEXT_SECONDARY = '#94a3b8';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="text-align:center;padding-bottom:24px;">
  <span style="font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Atlas Coach</span>
</td></tr>
<tr><td style="background:${CARD_BG};border-radius:12px;padding:32px;">
  ${content}
</td></tr>
<tr><td style="text-align:center;padding-top:24px;">
  <p style="color:${TEXT_SECONDARY};font-size:12px;margin:0;">
    Atlas Coach &bull; Learn physics through play<br/>
    <a href="https://atlascoach.com/settings" style="color:${TEXT_SECONDARY};">Unsubscribe</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:14px 32px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>`;
}

export function getTemplate(
  template: string,
  data: Record<string, string> = {}
): EmailTemplate {
  switch (template) {
    case 'welcome':
      return {
        subject: 'Welcome to Atlas Coach!',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Welcome aboard, ${data.name || 'Learner'}!</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            You now have access to 260+ interactive physics and engineering simulations.
            Each game teaches a real concept through hands-on play.
          </p>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 8px;"><strong style="color:${TEXT_PRIMARY};">Quick start tips:</strong></p>
          <ul style="color:${TEXT_SECONDARY};font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
            <li>Start with the Predict phase — guess before you simulate</li>
            <li>Explore the Transfer phase to connect concepts to real life</li>
            <li>Build a streak for spaced repetition benefits</li>
          </ul>
          <div style="text-align:center;">${button('Start Your First Game', 'https://atlascoach.com/games')}</div>
        `),
      };

    case 'subscription_confirmed':
      return {
        subject: 'Your Atlas Coach subscription is active!',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">You're all set!</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Your <strong style="color:${BRAND_COLOR};">${data.tier || 'Pro'}</strong> plan is now active.
            You have unlimited access to all games, AI coaching, and analytics.
          </p>
          <div style="text-align:center;">${button('Start Learning', 'https://atlascoach.com/games')}</div>
        `),
      };

    case 'subscription_canceled':
      return {
        subject: 'Your Atlas Coach subscription has been canceled',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">We're sorry to see you go</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Your subscription has been canceled. You'll still have access until the end of your current billing period.
            You can always come back — your progress is saved.
          </p>
          <div style="text-align:center;">${button('Resubscribe', 'https://atlascoach.com/pricing')}</div>
        `),
      };

    case 'payment_failed':
      return {
        subject: 'Action required: Payment failed for Atlas Coach',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Payment failed</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            We couldn't process your latest payment. Please update your payment method
            to avoid losing access to your subscription.
          </p>
          <div style="text-align:center;">${button('Update Payment Method', 'https://atlascoach.com/pricing')}</div>
        `),
      };

    case 'streak_reminder':
      return {
        subject: `Don't break your ${data.streakDays || ''}-day streak!`,
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Keep your streak alive!</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            You have a <strong style="color:${BRAND_COLOR};">${data.streakDays || '0'}-day streak</strong>.
            Play one game today to keep it going. It only takes 5 minutes!
          </p>
          <div style="text-align:center;">${button('Play Now', 'https://atlascoach.com/games')}</div>
        `),
      };

    default:
      return {
        subject: 'Atlas Coach',
        html: layout(`<p style="color:${TEXT_SECONDARY};font-size:15px;">${data.message || ''}</p>`),
      };
  }
}
