import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToArrayBuffer, blobToBase64 } from '../utils/audioUtils';
import { Message, ConnectionState, Recording } from '../types';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Updated instruction for High Speed, Hindi, Real-time Demos, and Deep Music Theory
const SYSTEM_INSTRUCTION = `You are "FretMaster", a high-energy percussive fingerstyle guitar tutor.
Language: **HINDI** (Hinglish).

**EXPERT KNOWLEDGE BASE**:
-   **Scales & Modes**: All Major/Minor, Ionian to Locrian, Pentatonic, Blues.
-   **Theory**: Circle of Fifths, Chord Construction & Extensions (7ths, 9ths, 11ths, 13ths), CAGED System, Voice Leading.
-   **Composition**: Motivic development (call/response, variation, tension-release), Rhythmic phrasing.
-   **Technique**: Harmonic spacing (separating bass/melody), Artificial Harmonics, Rasgueados.
-   **Percussion**: Wrist thump (Bass), Thumb slap (Snare), Fretboard tapping, Body tapping.

**CRITICAL LATENCY RULES**:
1.  **Be Fast**: Speak immediately. Keep answers SHORT (under 10 words if possible).
2.  **No Fluff**: Skip pleasantries. Go straight to feedback.
3.  **Instant Demo**: If rhythm is wrong, IMMEDIATELY beatbox: "Dhum Tak...".

**Visual Analysis (Real-time)**:
-   You see the user's video live.
-   Identify their thumb (Angootha) position for Slaps.
-   Identify their wrist (Kalai) for Bass bumps.
-   If you don't see the guitar clearly, say "Guitar thoda upar karo".

**Teaching Style**:
-   Push them. "Aur tez!", "Tempo drop ho raha hai!".
-   If they stop playing, ask "Ruk kyun gaye? Bajao!".
`;

export const useLiveSession = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState<number>(0);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  // Connection management
  const isUserDisconnecting = useRef<boolean>(false);

  // Audio Contexts
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  
  // Stream References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcription Buffers
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  
  // Video Frame Loop
  const videoIntervalRef = useRef<number | null>(null);
  
  // Gemini Session Promise
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const cleanup = useCallback(() => {
    // Stop Video Loop
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    // Stop Audio Input
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    // Stop Audio Output
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Close Media Stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    sessionPromiseRef.current = null;
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      setStatus('error');
      setMessages(prev => [...prev, { role: 'model', text: 'API Key not found.', timestamp: new Date() }]);
      return;
    }

    isUserDisconnecting.current = false;

    try {
      setStatus('connecting');
      
      // Initialize Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Get User Media (Audio & Video)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }, 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        } 
      });
      mediaStreamRef.current = stream;

      // Set Video Source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const config = {
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {} 
        }
      };

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connection Opened');
            setStatus('connected');
            setMessages([]);
            
            // Start Audio Streaming
            if (!inputContextRef.current || !stream) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Visualizer Volume
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); 

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
            
            sourceNodeRef.current = source;
            processorRef.current = processor;

            // Start Video Streaming
            startVideoStream(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent;

            // Transcriptions
            if (serverContent?.inputTranscription) {
               currentInputTranscription.current += serverContent.inputTranscription.text;
            }
            if (serverContent?.outputTranscription) {
               currentOutputTranscription.current += serverContent.outputTranscription.text;
            }

            if (serverContent?.turnComplete) {
               const userText = currentInputTranscription.current.trim();
               const modelText = currentOutputTranscription.current.trim();
               
               if (userText || modelText) {
                   setMessages(prev => {
                       const newMsgs = [...prev];
                       if (userText) newMsgs.push({ role: 'user', text: userText, timestamp: new Date() });
                       if (modelText) newMsgs.push({ role: 'model', text: modelText, timestamp: new Date() });
                       return newMsgs;
                   });
               }
               currentInputTranscription.current = '';
               currentOutputTranscription.current = '';
            }

            // Audio Output
            const base64Audio = serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToArrayBuffer(base64Audio),
                ctx
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Interruption
            if (serverContent?.interrupted) {
              console.log('Model interrupted');
              sourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              if (audioContextRef.current) {
                nextStartTimeRef.current = audioContextRef.current.currentTime;
              }
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }
          },
          onclose: () => {
            console.log('Gemini Live Connection Closed');
            if (!isUserDisconnecting.current) {
                setStatus('disconnected');
            } else {
                setStatus('disconnected');
            }
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus('error');
    }
  }, [videoRef]);

  const startVideoStream = (currentSessionPromise: Promise<any>) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // INCREASED SPEED: 5 FPS (every 200ms)
    // LOWER LATENCY: Smaller image size (320px width)
    videoIntervalRef.current = window.setInterval(async () => {
      if (!ctx || !videoEl.videoWidth) return;
      
      const scale = 320 / videoEl.videoWidth;
      canvas.width = 320;
      canvas.height = videoEl.videoHeight * scale;
      
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const base64 = await blobToBase64(blob);
          currentSessionPromise.then(session => {
            session.sendRealtimeInput({
              media: {
                mimeType: 'image/jpeg',
                data: base64
              }
            });
          });
        }
      }, 'image/jpeg', 0.5); // 50% quality for speed
    }, 200); 
  };

  const sendTextMessage = useCallback((text: string) => {
    if (sessionPromiseRef.current) {
      setMessages(prev => [...prev, { role: 'user', text: text, timestamp: new Date() }]);
      sessionPromiseRef.current.then(session => {
        session.sendRealtimeInput({ 
            content: { parts: [{ text: text }] } 
        });
      });
    }
  }, []);

  // --- Recording Functions ---
  const startRecording = useCallback(() => {
    if (!mediaStreamRef.current) return;
    
    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(mediaStreamRef.current);
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
      
      setRecordings(prev => [{
        id: Date.now().toString(),
        url,
        timestamp: new Date(),
        duration
      }, ...prev]);
      
      setIsRecording(false);
    };

    recorder.start();
    recordingStartTimeRef.current = Date.now();
    setIsRecording(true);
    mediaRecorderRef.current = recorder;
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const disconnect = useCallback(() => {
    isUserDisconnecting.current = true;
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
        isUserDisconnecting.current = true;
        cleanup();
    };
  }, [cleanup]);

  return {
    connect,
    disconnect,
    status,
    messages,
    volume,
    isRecording,
    startRecording,
    stopRecording,
    recordings,
    sendTextMessage
  };
};