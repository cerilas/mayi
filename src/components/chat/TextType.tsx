'use client';

import { useEffect, useMemo, useState } from 'react';
import './TextType.css';

interface TextTypeProps {
  text: string | string[];
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  className?: string;
  showCursor?: boolean;
  cursorCharacter?: string;
  /** Duration of one blink half-cycle in seconds (default 0.5 → full blink = 1s) */
  cursorBlinkDuration?: number;
}

export default function TextType({
  text,
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  cursorCharacter = '|',
  cursorBlinkDuration = 0.5,
}: TextTypeProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const currentText = textArray[currentTextIndex];

    function tick() {
      if (isDeleting) {
        if (displayedText === '') {
          setIsDeleting(false);
          if (currentTextIndex === textArray.length - 1 && !loop) return;
          setCurrentTextIndex(prev => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
        } else {
          id = setTimeout(() => {
            setDisplayedText(prev => prev.slice(0, -1));
          }, deletingSpeed);
        }
      } else {
        if (currentCharIndex < currentText.length) {
          id = setTimeout(() => {
            setDisplayedText(prev => prev + currentText[currentCharIndex]);
            setCurrentCharIndex(prev => prev + 1);
          }, typingSpeed);
        } else {
          if (!loop && currentTextIndex === textArray.length - 1) return;
          id = setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      }
    }

    if (currentCharIndex === 0 && !isDeleting && displayedText === '') {
      id = setTimeout(tick, initialDelay);
    } else {
      tick();
    }

    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCharIndex, displayedText, isDeleting, currentTextIndex, textArray, loop, typingSpeed, deletingSpeed, pauseDuration, initialDelay]);

  return (
    <span className={`text-type ${className}`}>
      <span className="text-type__content">{displayedText}</span>
      {showCursor && (
        <span
          className="text-type__cursor"
          style={{ animationDuration: `${cursorBlinkDuration * 2}s` }}
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
}
