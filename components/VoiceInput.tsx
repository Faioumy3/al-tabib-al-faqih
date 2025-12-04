import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isProcessing: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, isProcessing }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ar-SA'; // Arabic

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onTranscript(text);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (isProcessing) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  if (!recognitionRef.current) {
    return null; // Don't render if not supported
  }

  return (
    <button
      onClick={toggleListening}
      disabled={isProcessing}
      className={`relative p-4 rounded-full transition-all duration-300 shadow-lg ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse' 
          : isProcessing 
            ? 'bg-gray-200 text-gray-400' 
            : 'bg-[#0f766e] text-white hover:bg-[#0d655e] hover:scale-105'
      }`}
    >
      {isProcessing ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : isListening ? (
        <MicOff className="w-8 h-8" />
      ) : (
        <Mic className="w-8 h-8" />
      )}
      
      {/* Ripple effect when listening */}
      {isListening && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping inset-0"></span>
      )}
    </button>
  );
};
