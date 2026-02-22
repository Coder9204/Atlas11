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
  <span style="font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">Coach Atlas</span>
</td></tr>
<tr><td style="background:${CARD_BG};border-radius:12px;padding:32px;">
  ${content}
</td></tr>
<tr><td style="text-align:center;padding-top:24px;">
  <p style="color:${TEXT_SECONDARY};font-size:12px;margin:0;">
    Coach Atlas &bull; Learn physics through play<br/>
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
        subject: 'Welcome to Coach Atlas!',
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
        subject: 'Your Coach Atlas subscription is active!',
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
        subject: 'Your Coach Atlas subscription has been canceled',
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
        subject: 'Action required: Payment failed for Coach Atlas',
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

    case 'email_verification':
      return {
        subject: `Your Coach Atlas verification code: ${data.code || ''}`,
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Verify your email</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 24px;">
            Hi ${data.name || 'there'}! Enter this code to verify your email address:
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;padding:16px 40px;background:${BG_COLOR};border:2px solid ${BRAND_COLOR};border-radius:12px;font-size:32px;font-weight:800;letter-spacing:8px;color:${TEXT_PRIMARY};">${data.code || '------'}</span>
          </div>
          <p style="color:${TEXT_SECONDARY};font-size:14px;line-height:1.6;margin:0 0 24px;">
            This code expires in 10 minutes. If you didn't create an Coach Atlas account, you can ignore this email.
          </p>
          <p style="color:${TEXT_SECONDARY};font-size:14px;line-height:1.6;margin:0 0 24px;">
            Or click the button below to verify instantly:
          </p>
          <div style="text-align:center;">${button('Verify Email', data.verifyUrl || 'https://atlascoach.com/verify')}</div>
        `),
      };

    case 'trial_started':
      return {
        subject: 'Your 7-day Pro trial has started!',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Your Pro trial is active!</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Welcome to Coach Atlas Pro, ${data.name || 'Learner'}! You have 7 days of full access to everything:
          </p>
          <ul style="color:${TEXT_SECONDARY};font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
            <li>All 340+ interactive games — unlimited</li>
            <li>AI voice coach for personalized guidance</li>
            <li>Offline mode & downloadable certificates</li>
            <li>Priority support & early access to new games</li>
          </ul>
          <div style="text-align:center;">${button('Start Exploring', 'https://atlascoach.com/games')}</div>
        `),
      };

    case 'trial_ending':
      return {
        subject: 'Your Coach Atlas trial ends in 2 days',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Your trial ends soon</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Hi ${data.name || 'there'}, your Pro trial ends in 2 days.
            Subscribe now to keep your unlimited access, AI coaching, and all your progress.
          </p>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 24px;">
            Plans start at just <strong style="color:${TEXT_PRIMARY};">$5.99/month</strong> for Plus,
            or <strong style="color:${TEXT_PRIMARY};">$11.99/month</strong> for Pro with offline mode and certificates.
          </p>
          <div style="text-align:center;">${button('Choose a Plan', 'https://atlascoach.com/pricing')}</div>
        `),
      };

    case 'upgrade_nudge':
      return {
        subject: 'Unlock unlimited games on Coach Atlas',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Ready for more?</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Hi ${data.name || 'there'}, you've played <strong style="color:${BRAND_COLOR};">${data.gamesPlayed || 'several'}</strong> games so far.
            Upgrade to unlock all 340+ games with unlimited access and AI coaching.
          </p>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 24px;">
            Plus starts at just <strong style="color:${TEXT_PRIMARY};">$5.99/month</strong> — less than a coffee.
          </p>
          <div style="text-align:center;">${button('See Plans', 'https://atlascoach.com/pricing')}</div>
        `),
      };

    case 'reactivation':
      return {
        subject: 'We miss you at Coach Atlas!',
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Come back and keep learning</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Hi ${data.name || 'there'}, it's been a while since your last visit.
            Your progress is saved and waiting for you — pick up right where you left off.
          </p>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 24px;">
            We've added <strong style="color:${BRAND_COLOR};">new games</strong> since your last session.
            Come check them out!
          </p>
          <div style="text-align:center;">${button('Resume Learning', 'https://atlascoach.com/games')}</div>
        `),
      };

    case 'milestone':
      return {
        subject: `Congrats! You hit a milestone on Coach Atlas`,
        html: layout(`
          <h1 style="color:${TEXT_PRIMARY};font-size:24px;margin:0 0 12px;">Achievement unlocked!</h1>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 20px;">
            Amazing work, ${data.name || 'Learner'}! You've reached a new milestone:
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <span style="display:inline-block;padding:16px 32px;background:${BG_COLOR};border:2px solid #22c55e;border-radius:12px;font-size:20px;font-weight:700;color:#22c55e;">${data.milestone || 'New Achievement'}</span>
          </div>
          <p style="color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;margin:0 0 24px;">
            Keep going — every game you complete builds deeper understanding.
          </p>
          <div style="text-align:center;">${button('Keep Playing', 'https://atlascoach.com/games')}</div>
        `),
      };

    default:
      return {
        subject: 'Coach Atlas',
        html: layout(`<p style="color:${TEXT_SECONDARY};font-size:15px;">${data.message || ''}</p>`),
      };
  }
}
