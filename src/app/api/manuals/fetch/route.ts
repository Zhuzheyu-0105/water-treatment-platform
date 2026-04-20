import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 允许的域名白名单（防止 SSRF 攻击）
const ALLOWED_DOMAINS = ['filmtec.com', 'dupont.com', 'dow.com', 'membranes.com', 'originwater.com'];

function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    return ALLOWED_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

// 获取FilmTec手册内容
export async function GET(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const filmtecUrl = request.nextUrl.searchParams.get('filmtecUrl');
    const ultrafiltUrl = request.nextUrl.searchParams.get('ultrafiltUrl');

    // URL 域名白名单验证
    if (filmtecUrl && !isUrlAllowed(filmtecUrl)) {
      return NextResponse.json(
        { success: false, error: '不允许的URL域名' },
        { status: 400 }
      );
    }
    if (ultrafiltUrl && !isUrlAllowed(ultrafiltUrl)) {
      return NextResponse.json(
        { success: false, error: '不允许的URL域名' },
        { status: 400 }
      );
    }

    let result: any = {};

    if (filmtecUrl) {
      const filmtecResponse = await client.fetch(filmtecUrl);
      if (filmtecResponse.status_code === 0) {
        const textContent = filmtecResponse.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
        result.filmtec = {
          title: filmtecResponse.title,
          content: textContent.substring(0, 50000), // 限制内容长度
          url: filmtecResponse.url
        };
      }
    }

    if (ultrafiltUrl) {
      const ultrafiltResponse = await client.fetch(ultrafiltUrl);
      if (ultrafiltResponse.status_code === 0) {
        const textContent = ultrafiltResponse.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
        result.ultrafilt = {
          title: ultrafiltResponse.title,
          content: textContent.substring(0, 50000),
          url: ultrafiltResponse.url
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取手册内容失败:', error);
    return NextResponse.json(
      { success: false, error: '获取手册内容失败' },
      { status: 500 }
    );
  }
}
