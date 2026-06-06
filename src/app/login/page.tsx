'use client';
/**
 * ログインページ
 * - Path: /login
 * - 概要: メール・パスワードでログインし、JWT を保存してホームに遷移
 * - API: POST /api/users/login （成功時: { token } を localStorage に保存）
 * - Auth: 公開（未ログイン利用）
 */
import { PageContainer } from '@/Components/layouts/PageContainer';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';
import { LinkButton } from '@/Components/ui/LinkButton';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

type OfficeWithLocation = {
  id: number;
  code: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number | null;
};

const calculateDistanceMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) router.replace('/');
  }, [router]);

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('token', token);
        router.push('/');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'メールアドレスまたはパスワードが違います');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDistanceAlert = async () => {
    if (distanceLoading) return;
    if (!navigator.geolocation) {
      alert('このブラウザでは位置情報が利用できません');
      return;
    }

    setDistanceLoading(true);
    try {
      const officesResponse = await fetch(`${API_BASE_URL}/offices`);
      if (!officesResponse.ok) {
        throw new Error('failed to fetch offices');
      }

      const offices = (await officesResponse.json()) as OfficeWithLocation[];
      const targetOffices = offices.filter(
        office =>
          typeof office.latitude === 'number' && typeof office.longitude === 'number',
      );

      if (targetOffices.length === 0) {
        alert('距離計算に使えるオフィス位置情報がまだ登録されていません');
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const messages = targetOffices
        .map(office => {
          const distanceMeters = calculateDistanceMeters(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            {
              latitude: office.latitude as number,
              longitude: office.longitude as number,
            },
          );

          const radiusMeters = office.radiusMeters ?? 10;
          const status =
            distanceMeters <= radiusMeters ? '入室圏内です' : `圏外です（半径 ${radiusMeters}m）`;

          return {
            distanceMeters,
            text: `${office.name}: 約${Math.round(distanceMeters)}m - ${status}`,
          };
        })
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .map(item => item.text);

      alert(messages.join('\n'));
    } catch (error) {
      console.error('Failed to calculate office distance', error);
      alert('オフィスまでの距離を取得できませんでした。位置情報の許可をご確認ください。');
    } finally {
      setDistanceLoading(false);
    }
  };

  return (
    <PageContainer className='items-center justify-center gap-10 py-10 sm:py-0'>
      <form className='flex w-full max-w-sm flex-col gap-4' onSubmit={handleLogin}>
        <Input
          type='email'
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder='メールアドレス'
        />
        <Input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder='パスワード'
        />
        <Button type='submit' disabled={loading}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </Button>
        <Button type='button' variant='secondary' onClick={() => router.push('/register')}>
          新規登録
        </Button>
        <Button type='button' variant='ghost' onClick={handleDistanceAlert} disabled={distanceLoading}>
          {distanceLoading ? '距離を確認中...' : 'オフィスまでの距離を確認'}
        </Button>
      </form>
      <div className='mt-4 flex w-full max-w-sm flex-col gap-2'>
        <LinkButton href='/users' center>
          ユーザーリストを見る
        </LinkButton>
        <LinkButton href='/reset-password' center>
          パスワードをお忘れの方はこちら
        </LinkButton>
      </div>
    </PageContainer>
  );
}
