<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    public function render($request, Throwable $e)
    {
        // فقط للـ API requests
        if ($request->expectsJson()) {

            // أخطاء الـ Validation — رسائلها عربية لأنك حطيتيها يدوياً
            if ($e instanceof ValidationException) {
                return response()->json([
                    'message' => collect($e->errors())->flatten()->first(),
                ], 422);
            }

            // أخطاء متوقعة من الـ Service (RuntimeException)
            if ($e instanceof \RuntimeException || $e instanceof \InvalidArgumentException) {
                return response()->json([
                    'message' => $e->getMessage(),
                ], 400);
            }

            // route مش موجود
            if ($e instanceof NotFoundHttpException) {
                return response()->json([
                    'message' => 'المسار المطلوب غير موجود.',
                ], 404);
            }

            // أي خطأ تاني — بتخفي التفاصيل التقنية عن المستخدم
            return response()->json([
                'message' => 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.',
            ], 500);
        }

        return parent::render($request, $e);
    }
}