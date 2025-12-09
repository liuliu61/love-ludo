'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 从环境变量读取API密钥（需在.env.local配置）
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const API_URL = "http://love.yqjxa.cn/api/verify.php";

// TypeScript类型定义
interface VerifyResponse {
  code: number;
  message: string;
  data: {
    card_key: string;
    status: number;
    use_time: string;
    card_type: 'time' | 'count';
    expire_time?: string;
    duration?: number;
    remaining_count?: number;
    total_count?: number;
    device_id: string;
    allow_reverify: number;
  } | null;
}

export default function CardVerify() {
  const [cardKey, setCardKey] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [resultMsg, setResultMsg] = useState<string>('');
  const [resultType, setResultType] = useState<'success' | 'error' | 'loading' | ''>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  // 页面加载生成设备ID
  useEffect(() => {
    const generateDeviceId = () => {
      const fingerprint = [
        navigator.userAgent,
        `${screen.width}x${screen.height}`,
        navigator.language || '',
        new Date().getTimezoneOffset().toString(),
      ].join('|');
      return btoa(fingerprint).substring(0, 32);
    };
    setDeviceId(generateDeviceId());
  }, []);

  // 卡密验证核心逻辑
  const verifyCard = async () => {
    // 表单校验
    if (!cardKey.trim()) {
      setResultMsg('请输入卡密！');
      setResultType('error');
      return;
    }
    if (!deviceId) {
      setResultMsg('设备ID生成失败，请刷新页面！');
      setResultType('error');
      return;
    }
    if (!API_KEY) {
      setResultMsg('API密钥未配置，请联系管理员！');
      setResultType('error');
      return;
    }

    setIsLoading(true);
    setResultMsg('验证中，请稍候...');
    setResultType('loading');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: JSON.stringify({
          card_key: cardKey.trim(),
          device_id: deviceId,
        }),
        timeout: 8000,
      });

      if (!response.ok) {
        throw new Error(`接口请求失败：${response.status}`);
      }

      const resData: VerifyResponse = await response.json();

      if (resData.code === 0) {
        let successMsg = resData.message;
        // 补充卡密信息
        if (resData.data?.card_type === 'time') {
          successMsg += `<br>过期时间：${resData.data.expire_time || '永久有效'}`;
        } else if (resData.data?.card_type === 'count') {
          successMsg += `<br>剩余次数：${resData.data.remaining_count}/${resData.data.total_count}`;
        }
        setResultMsg(successMsg);
        setResultType('success');
        
        // 验证成功存储标识并跳转大厅
        localStorage.setItem('card_verified', 'true');
        document.cookie = 'card_verified=true; path=/; max-age=86400';
        setTimeout(() => router.push('/lobby'), 2000);
      } else {
        setResultMsg(resData.message || '卡密验证失败！');
        setResultType('error');
      }
    } catch (error) {
      const errMsg = (error as Error).message || '网络异常，请检查网络或接口！';
      setResultMsg(`验证失败：${errMsg}`);
      setResultType('error');
      console.error('卡密验证报错：', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 卡密输入框 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">卡密</label>
        <input
          type="text"
          value={cardKey}
          onChange={(e) => setCardKey(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-white/5 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-white placeholder:text-gray-500"
          placeholder="请输入您的卡密"
        />
      </div>

      {/* 设备ID输入框（只读） */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">设备ID（自动生成）</label>
        <input
          type="text"
          value={deviceId}
          readOnly
          className="w-full px-4 py-2 bg-white/5 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink text-white placeholder:text-gray-500 bg-gray-800/50"
        />
      </div>

      {/* 验证按钮 */}
      <button
        onClick={verifyCard}
        disabled={isLoading}
        className="w-full py-2 gradient-primary rounded-lg text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '验证中...' : '验证卡密'}
      </button>

      {/* 结果提示 */}
      {resultMsg && (
        <div
          className={`p-3 rounded-lg text-sm ${
            resultType === 'success' 
              ? 'bg-green-900/30 border border-green-500/30 text-green-400' 
              : resultType === 'error' 
                ? 'bg-red-900/30 border border-red-500/30 text-red-400' 
                : 'bg-gray-800/30 border border-gray-700/30 text-gray-400'
          }`}
          dangerouslySetInnerHTML={{ __html: resultMsg }}
        />
      )}
    </div>
  );
}
