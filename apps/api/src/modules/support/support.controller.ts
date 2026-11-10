import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BrandingService } from '../settings/branding.service';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private brandingSvc: BrandingService) {}

  @Post()
  async send(@Body() body: { message: string }, @Req() req: any) {
    const user = req.user;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return { ok: false, error: 'Telegram chưa cấu hình' };

    const branding = await this.brandingSvc.get();
    const text = `🆘 *[WMS - ${branding.name}] Support*\n👤 ${user.fullName} (${user.email})\n\n${body.message}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    return { ok: data.ok };
  }
}
