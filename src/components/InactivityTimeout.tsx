import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const INACTIVITY_MS = 30 * 60 * 1000;  // 30 minutes
const WARNING_MS = 5 * 60 * 1000;       // 5 minutes to respond

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;

const InactivityTimeout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_MS / 1000);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoggedOut = useRef(false);

  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, []);

  const doLogout = useCallback(() => {
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;

    clearTimers();
    setShowWarning(false);
    logout();
    toast.info('Session ended due to inactivity.');
    navigate('/login');
  }, [logout, navigate, clearTimers]);

  const startCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsLeft(WARNING_MS / 1000);

    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }

    countdownTimer.current = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearTimers();
    hasLoggedOut.current = false;

    inactivityTimer.current = setTimeout(() => {
      startCountdown();
    }, INACTIVITY_MS);
  }, [clearTimers, startCountdown]);

  const handleContinue = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    startInactivityTimer();
  }, [clearTimers, startInactivityTimer]);

  // Separate effect to handle countdown reaching zero
  useEffect(() => {
    if (showWarning && secondsLeft <= 0) {
      doLogout();
    }
  }, [showWarning, secondsLeft, doLogout]);

  // Main effect for setting up inactivity detection
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    startInactivityTimer();

    const resetTimer = () => {
      if (!showWarning) {
        startInactivityTimer();
      }
    };

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, startInactivityTimer, clearTimers]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <>
      {children}
      <Dialog open={showWarning} onOpenChange={() => {}}>
        <DialogContent onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Session Timeout Warning</DialogTitle>
            <DialogDescription>
              You have been inactive for 30 minutes. Your session will end automatically to protect your data.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-2xl font-mono font-semibold tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">remaining</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={doLogout}>Sign Out Now</Button>
            <Button onClick={handleContinue}>Continue Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InactivityTimeout;
