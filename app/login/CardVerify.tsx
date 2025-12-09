// app/login/CardVerify.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

// 环境变量（后续配置到 .env.local）
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "你的API密钥";
const API_URL = "http://love.yqjxa.cn/api/verify.php";

export default function CardVerify() {
  const [cardKey, setCardKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [resultMsg, setResultMsg] = useState('');
  const [resultType, setResultType] = useState<'success' | 'error' | 'loading' | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 生成设备ID
  useEffect(() => {
    const generatedDeviceId = generateDeviceId();
    setDeviceId(generatedDeviceId);
  }, []);

  const generateDeviceId = () => {
    const fingerprint = [
      navigator.userAgent,
      `${screen.width}x${screen.height}`,
      navigator.language || '',
      new Date().getTimezoneOffset().toString(),
    ].join('|');
    return btoa(fingerprint).substring(0, 32);
  };

  // 卡密验证逻辑
  const verifyCard = async () => {
    if (!cardKey.trim()) {
      setResultMsg('请输入卡密！');
      setResultType('error');
      return;
    }

    setIsLoading(true);
    setResultMsg('验证中...');
    setResultType('loading');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
        body: JSON.stringify({ card_key: cardKey, device_id: deviceId }),
      });
      const resData = await response.json();

      if (resData.code === 0) {
        setResultMsg(resData.message + (resData.data.card_type === 'count' ? `，剩余次数：${resData.data.remaining_count}` : ''));
        setResultType('success');
        // 验证成功后跳转到游戏大厅
        setTimeout(() => router.push('/lobby'), 2000);
      } else {
        setResultMsg(resData.message || '卡密无效！');
        setResultType('error');
      }
    } catch (err) {
      setResultMsg('网络异常，请重试！');
      setResultType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-3">卡密验证</h3>
      <div className="mb-3">
        <label className="block mb-1">卡密</label>
        <input
          type="text"
          value={cardKey}
          onChange={(e) => setCardKey(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="输入卡密"
          disabled={isLoading}
        />
      </div>
      <div className="mb-3">
        <label className="block mb-1">设备ID</label>
        <input
          type="text"
          value={deviceId}
          readOnly
          className="w-full p-2 border rounded bg-gray-100"
        />
      </div>
      <button
        onClick={verifyCard}
        disabled={isLoading}
        className="w-full p-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {isLoading ? '验证中...' : '验证卡密'}
      </button>
      {resultMsg && (
        <div className={`mt-3 p-2 rounded ${resultType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {resultMsg}
        </div>
      )}
    </div>
  );
}
