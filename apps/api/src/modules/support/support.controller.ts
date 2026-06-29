import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  @Post()
  async send(@Body() body: { message: string }, @Req() req: any) {
    const user = req.user;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return { ok: false, error: 'Telegram chưa cấu hình' };

    const text = `🆘 *[WMS - Mâm Vị] Support*\n👤 ${user.fullName} (${user.email})\n\n${body.message}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    return { ok: data.ok };
  }
}
