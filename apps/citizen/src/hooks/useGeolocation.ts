import { useCallback, useEffect, useRef, useState } from 'react';

interface Position {
  latitude: number;
  longitude: number;
  /** Raio de confiança em metros. É o que o usuário consegue julgar — o par
   *  de coordenadas em si não diz nada a ele. */
  accuracy: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Segundos desde o início da busca. O timeout é de 15s; sem contador, a
   *  espera parece travamento. */
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number>();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const capture = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Este aparelho não permite capturar a localização.');
      return;
    }
    setLoading(true);
    setError(null);
    setElapsed(0);

    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);

    const stop = () => {
      window.clearInterval(timer.current);
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        stop();
      },
      (err) => {
        // Mensagens por causa, não genéricas: a mais comum em campo é permissão
        // negada, e o usuário precisa saber que a correção está no aparelho.
        const messages: Record<number, string> = {
          1: 'Permissão de localização negada. Libere o acesso nas configurações do navegador.',
          2: 'Não foi possível obter o sinal de GPS. Tente novamente a céu aberto.',
          3: 'A busca pelo GPS demorou demais. Tente novamente.',
        };
        setError(messages[err.code] ?? 'Não foi possível obter a localização.');
        stop();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  return { position, loading, error, elapsed, capture };
}
