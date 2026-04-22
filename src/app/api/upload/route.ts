import { NextRequest, NextResponse } from 'next/server';
import { S3Storage, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      );
    }

    // 文件类型白名单
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，仅允许图片、PDF 和文本文件' },
        { status: 400 }
      );
    }

    // 文件大小限制：20MB
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: '文件过大，请上传 20MB 以内的文件' },
        { status: 400 }
      );
    }

    // 检查存储配置
    const endpointUrl = process.env.COS_ENDPOINT_URL || process.env.COZE_BUCKET_ENDPOINT_URL;
    const accessKey = process.env.COS_SECRET_ID || process.env.COZE_ACCESS_KEY;
    const secretKey = process.env.COS_SECRET_KEY || process.env.COZE_SECRET_KEY;
    const bucketName = process.env.COS_BUCKET_NAME || process.env.COZE_BUCKET_NAME;
    const region = process.env.COS_REGION || 'ap-guangzhou';

    if (!endpointUrl || !accessKey || !secretKey || !bucketName) {
      return NextResponse.json({
        success: false,
        error: 'Storage endpoint not configured: Please set COS_* environment variables. See .env.example for details.'
      }, { status: 500 });
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 初始化对象存储（腾讯云COS使用S3兼容API）
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const storage = new S3Storage({
      endpointUrl,
      accessKey,
      secretKey,
      bucketName,
      region,
    });

    // 上传文件
    const timestamp = Date.now();
    const fileName = `water-quality-reports/${timestamp}_${file.name}`;
    
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileName,
      contentType: file.type || 'application/octet-stream',
    });

    // 生成签名URL（有效期1小时）
    const signedUrl = await storage.generatePresignedUrl({
      key,
      expireTime: 3600,
    });

    return NextResponse.json({
      success: true,
      key,
      url: signedUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '上传失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}
