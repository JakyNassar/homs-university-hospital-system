<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إشعار مناوبة</title>
    <style>
        body {
            margin: 0;
            padding: 30px 15px;
            background-color: #f0f4f8;
            font-family: 'Segoe UI', Arial, sans-serif;
            direction: rtl;
        }
        .wrapper {
            max-width: 520px;
            margin: 0 auto;
        }
        .card {
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        .card-header {
            background: #1a73e8;
            padding: 24px 28px;
        }
        .card-header h2 {
            margin: 0;
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
        }
        .card-body {
            padding: 28px;
        }
        .card-body p {
            margin: 0 0 14px;
            color: #444444;
            font-size: 15px;
            line-height: 1.75;
        }
        .info-box {
            background: #f8f9ff;
            border-right: 4px solid #1a73e8;
            border-radius: 6px;
            padding: 14px 16px;
            margin: 18px 0;
            font-size: 14px;
            color: #333;
            line-height: 1.8;
        }
        .hint {
            font-size: 13px;
            color: #666;
            border-top: 1px solid #eee;
            margin-top: 20px;
            padding-top: 16px;
        }
        .footer {
            background: #f8f9fa;
            padding: 16px 28px;
            font-size: 12px;
            color: #999;
            text-align: center;
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">
        <div class="card-header">
            <h2>📅 {{ $greeting }}</h2>
        </div>
        <div class="card-body">
            <p>{{ $bodyLine }}</p>

            <div class="info-box">
                {{ $dateInfo }}
            </div>

            <p class="hint">
                يمكنك إضافة هذه المناوبة إلى تقويمك مباشرةً عبر المرفق في هذا البريد.<br>
                إذا لم يظهر تلقائياً، افتح ملف <strong>invite.ics</strong> المرفق.
            </p>
        </div>
        <div class="footer">
            فريق نظام إدارة المناوبات — {{ config('app.name') }}
        </div>
    </div>
</div>
</body>
</html>
