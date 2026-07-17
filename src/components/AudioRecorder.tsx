'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
}

export function AudioRecorder({ onSendAudio }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsSending(true);
    try {
      await onSendAudio(audioBlob);
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-surface-border">
        <span className="text-sm text-gray-300 w-12 text-center">{formatTime(recordingTime)}</span>
        <button
          onClick={cancelRecording}
          disabled={isSending}
          className="p-2 text-red-400 hover:bg-red-400/10 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center"
          title="Descartar áudio"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleSend}
          disabled={isSending}
          className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center"
          title="Enviar áudio"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 bg-red-500/10 p-2 rounded-lg border border-red-500/30">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-2" />
        <span className="text-sm text-red-400 font-medium w-12 text-center">{formatTime(recordingTime)}</span>
        <button
          onClick={stopRecording}
          className="p-2 text-red-400 hover:bg-red-400/20 rounded-full transition-colors flex items-center justify-center"
          title="Parar gravação"
        >
          <Square className="w-5 h-5" fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="p-3 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors flex items-center justify-center"
      title="Gravar Mensagem de Voz"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
