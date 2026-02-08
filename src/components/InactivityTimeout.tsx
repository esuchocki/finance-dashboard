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

  const doLogout = useCallback(() => {
    setShowWarning(false);
    clearTimers();
    logout();
    toast.info('Session ended due to inactivity.');
    navigate('/login');
  }, [logout, navigate]);

  const clearTimers = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    inactivityTimer.current = null;
    countdownTimer.current = null;
  };

  const startInactivityTimer = useCallback(() => {
    clearTimers();
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(WARNING_MS / 1000);
      countdownTimer.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            doLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_MS);
  }, [doLogout]);

  const handleContinue = () => {
    setShowWarning(false);
    startInactivityTimer();
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    startInactivityTimer();

    const resetTimer = () => {
      if (!showWarning) startInactivityTimer();
    };

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, startInactivityTimer, showWarning]);

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
